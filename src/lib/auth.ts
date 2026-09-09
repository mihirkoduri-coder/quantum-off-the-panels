/**
 * Admin session handling. One admin, one GitHub account, no database —
 * the session cookie itself carries the GitHub access token (HMAC-signed
 * so it can't be forged or edited client-side; httpOnly so JS can't read
 * it either). That token IS the credential used to commit content changes
 * via the GitHub API (see lib/github.ts) — logging in and being allowed
 * to publish are the same act, which is the whole point of this scheme.
 *
 * Trade-off worth naming: a stolen cookie is a standing write credential to
 * the repo for as long as it stays valid. This app doesn't refresh tokens —
 * if GitHub expires or revokes the one baked into a session (observed in
 * practice: a request to the GitHub API starts 401ing well into a session
 * that was working fine earlier), the fix is logging out and back in to
 * mint a new one; see lib/github.ts's githubApiError for how that surfaces.
 * Acceptable for a single-editor personal blog; would need server-side
 * session storage (and therefore a database) to do better.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "qp_session";
export const OAUTH_STATE_COOKIE = "qp_oauth_state";
/** Non-httpOnly, readable by client JS, set alongside the real session
 *  cookie. Carries zero privilege on its own — it's not signed, not
 *  checked by any save endpoint, just a hint the public pages' edit-mode
 *  script uses to decide whether it's worth even asking "am I logged in?"
 *  Real authorization always happens server-side via SESSION_COOKIE. */
export const ADMIN_HINT_COOKIE = "qp_admin_hint";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

/** The only GitHub account allowed past the /admin gate. Not a secret —
 *  it's public on the repo regardless — just the access-control check. */
export const ADMIN_GITHUB_LOGIN = "mihirkoduri-coder";

export interface SessionPayload {
  login: string;
  accessToken: string;
  issuedAt: number;
}

function sign(data: string): string {
  const secret = import.meta.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return createHmac("sha256", secret).update(data).digest("base64url");
}

export function createSessionCookie(payload: Pick<SessionPayload, "login" | "accessToken">): string {
  const full: SessionPayload = { ...payload, issuedAt: Date.now() };
  const data = Buffer.from(JSON.stringify(full), "utf-8").toString("base64url");
  return `${data}.${sign(data)}`;
}

/** Verifies signature, expiry, and that the login is still the allowed one.
 *  Returns null on any failure — callers just treat that as "not logged in." */
export function verifySessionCookie(value: string | undefined): SessionPayload | null {
  if (!value) return null;
  const [data, sig] = value.split(".");
  if (!data || !sig) return null;

  const expected = sign(data);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(data, "base64url").toString("utf-8"));
  } catch {
    return null;
  }

  const ageSeconds = (Date.now() - payload.issuedAt) / 1000;
  if (ageSeconds > SESSION_MAX_AGE_SECONDS || ageSeconds < 0) return null;
  if (payload.login !== ADMIN_GITHUB_LOGIN) return null;

  return payload;
}
