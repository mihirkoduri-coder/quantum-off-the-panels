/**
 * All GitHub API calls the admin panel needs: the OAuth token exchange,
 * an identity check, and committing files. Every admin "save" goes through
 * commitFile() rather than writing to disk — the deployed site never has
 * a writable filesystem anyway (Vercel serverless), and this keeps git as
 * the single source of truth: a save here is indistinguishable from a
 * hand-made commit, same history, same ability to revert.
 */

const REPO_OWNER = "mihirkoduri-coder";
const REPO_NAME = "quantum-off-the-panels";
const REPO_BRANCH = "main";

export async function exchangeCodeForToken(code: string): Promise<string> {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      client_id: import.meta.env.GITHUB_CLIENT_ID,
      client_secret: import.meta.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`GitHub token exchange failed: ${JSON.stringify(data)}`);
  }
  return data.access_token as string;
}

export async function fetchGithubLogin(accessToken: string): Promise<string> {
  const res = await fetch("https://api.github.com/user", {
    headers: { authorization: `Bearer ${accessToken}`, accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`GitHub user lookup failed: ${res.status}`);
  const data = await res.json();
  return data.login as string;
}

/** Read a file's current text straight from the repo (not the bundled
 *  build) — needed before any read-modify-write edit, so a save is always
 *  based on what's actually in git right now. Returns null if it doesn't
 *  exist yet (that's a normal case, not an error, for a not-yet-written post). */
export async function getFileContent(accessToken: string, path: string): Promise<string | null> {
  const res = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}?ref=${REPO_BRANCH}`,
    { headers: { authorization: `Bearer ${accessToken}`, accept: "application/vnd.github+json" } },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub file lookup failed: ${res.status}`);
  const data = await res.json();
  return Buffer.from(data.content, "base64").toString("utf-8");
}

/** Create or update one file in the repo as a real commit. */
export async function commitFile(opts: {
  accessToken: string;
  /** repo-relative, e.g. "src/content/posts/week-02-interference.mdx" */
  path: string;
  content: string;
  message: string;
}): Promise<void> {
  const { accessToken, path, content, message } = opts;
  const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`;
  const headers = {
    authorization: `Bearer ${accessToken}`,
    accept: "application/vnd.github+json",
  };

  // the contents API requires the current file's blob SHA to update it —
  // omitted only when the file doesn't exist yet (a genuinely new file).
  let sha: string | undefined;
  const existing = await fetch(`${apiUrl}?ref=${REPO_BRANCH}`, { headers });
  if (existing.ok) {
    sha = (await existing.json()).sha;
  } else if (existing.status !== 404) {
    throw new Error(`GitHub file lookup failed: ${existing.status}`);
  }

  const res = await fetch(apiUrl, {
    method: "PUT",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify({
      message,
      content: Buffer.from(content, "utf-8").toString("base64"),
      branch: REPO_BRANCH,
      ...(sha ? { sha } : {}),
    }),
  });
  if (!res.ok) {
    throw new Error(`GitHub commit failed: ${res.status} ${await res.text()}`);
  }
}
