import { Client } from "pg";

/**
 * Letters, questions and comments are structurally identical — a name, a body,
 * a status, an optional reply — so they share one table with a `kind`
 * discriminator. One schema, one moderation queue, one set of queries.
 */
export type Kind = "letter" | "question" | "comment";
export type Status = "pending" | "approved" | "rejected";

export interface Submission {
  id: number;
  kind: Kind;
  post_slug: string;
  name: string;
  body: string;
  status: Status;
  reply: string | null;
  featured: boolean;
  created_at: string;
}

/**
 * Plain `pg` over a direct TCP+TLS connection, not @vercel/postgres. That
 * package only speaks Neon's WebSocket proxy protocol (it's a thin wrapper
 * around @neondatabase/serverless) — built for edge runtimes that can't
 * open a raw socket at all. This project's API routes run as ordinary Node
 * serverless functions, which can, and hitting that proxy live threw a
 * flat "Unexpected server response: 404" (a version-skew symptom between
 * the wrapper and Neon's current proxy, not a config problem this app can
 * fix). Neon is a real Postgres underneath — POSTGRES_URL works with any
 * standard client — so `pg` sidesteps the whole proxy-compatibility
 * question rather than chasing it further.
 *
 * One request, one short-lived connection: a serverless invocation has no
 * persistent process to usefully share a pool across anyway.
 */
async function withClient<T>(fn: (sql: SqlTag) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: process.env.POSTGRES_URL });
  await client.connect();
  try {
    return await fn(makeSqlTag(client));
  } finally {
    await client.end();
  }
}

/** A tagged-template wrapper over pg's positional ($1, $2, …) parameters,
 *  so the query bodies below read the same as they would against any
 *  tagged-template Postgres client — each interpolation becomes its own
 *  placeholder, in order, exactly like `${x}` used twice becomes two
 *  separate (identically-valued) parameters rather than one reused. */
type SqlTag = <T = Record<string, unknown>>(
  strings: TemplateStringsArray, ...values: unknown[]
) => Promise<{ rows: T[] }>;

function makeSqlTag(client: Client): SqlTag {
  return async (strings, ...values) => {
    let text = strings[0];
    for (let i = 0; i < values.length; i++) text += `$${i + 1}${strings[i + 1]}`;
    const result = await client.query(text, values as unknown[]);
    return { rows: result.rows };
  };
}

let ready: Promise<void> | null = null;

/** Create tables on first use. Cheap, idempotent, avoids a migration step. */
export function init() {
  if (!ready) {
    ready = withClient(async (sql) => {
      await sql`CREATE TABLE IF NOT EXISTS submissions (
        id SERIAL PRIMARY KEY,
        kind TEXT NOT NULL,
        post_slug TEXT NOT NULL DEFAULT '',
        name TEXT NOT NULL,
        body TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        reply TEXT,
        featured BOOLEAN NOT NULL DEFAULT FALSE,
        ip_hash TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await sql`CREATE INDEX IF NOT EXISTS sub_lookup ON submissions (kind, status, post_slug)`;
      await sql`CREATE INDEX IF NOT EXISTS sub_rate ON submissions (ip_hash, created_at)`;
      // analytics kept as daily aggregates: no rows per visitor, nothing personal
      await sql`CREATE TABLE IF NOT EXISTS events (
        day DATE NOT NULL,
        name TEXT NOT NULL,
        slug TEXT NOT NULL DEFAULT '',
        count INT NOT NULL DEFAULT 0,
        PRIMARY KEY (day, name, slug)
      )`;
    });
  }
  return ready;
}

export async function listSubmissions(opts: {
  kind?: Kind; status?: Status; slug?: string; limit?: number;
}): Promise<Submission[]> {
  await init();
  const { kind, status, slug, limit = 200 } = opts;
  return withClient(async (sql) => {
    const { rows } = await sql<Submission>`
      SELECT id, kind, post_slug, name, body, status, reply, featured, created_at::text AS created_at
      FROM submissions
      WHERE (${kind ?? null}::text  IS NULL OR kind   = ${kind ?? null})
        AND (${status ?? null}::text IS NULL OR status = ${status ?? null})
        AND (${slug ?? null}::text   IS NULL OR post_slug = ${slug ?? null})
      ORDER BY created_at DESC
      LIMIT ${limit}`;
    return rows;
  });
}

export async function addSubmission(s: {
  kind: Kind; post_slug: string; name: string; body: string; status: Status; ip_hash: string;
}) {
  await init();
  return withClient(async (sql) => {
    const { rows } = await sql<{ id: number }>`
      INSERT INTO submissions (kind, post_slug, name, body, status, ip_hash)
      VALUES (${s.kind}, ${s.post_slug}, ${s.name}, ${s.body}, ${s.status}, ${s.ip_hash})
      RETURNING id`;
    return rows[0]?.id;
  });
}

export async function setStatus(id: number, status: Status) {
  await init();
  await withClient((sql) => sql`UPDATE submissions SET status = ${status} WHERE id = ${id}`);
}

export async function setReply(id: number, reply: string) {
  await init();
  await withClient((sql) => sql`UPDATE submissions SET reply = ${reply} WHERE id = ${id}`);
}

export async function setFeatured(id: number, featured: boolean) {
  await init();
  await withClient((sql) => sql`UPDATE submissions SET featured = ${featured} WHERE id = ${id}`);
}

export async function removeSubmission(id: number) {
  await init();
  await withClient((sql) => sql`DELETE FROM submissions WHERE id = ${id}`);
}

/** submissions from this hashed IP in the last 10 minutes — the rate limiter */
export async function recentCount(ip_hash: string) {
  await init();
  return withClient(async (sql) => {
    const { rows } = await sql<{ n: number }>`
      SELECT COUNT(*)::int AS n FROM submissions
      WHERE ip_hash = ${ip_hash} AND created_at > NOW() - INTERVAL '10 minutes'`;
    return rows[0]?.n ?? 0;
  });
}

export async function bump(name: string, slug = "") {
  await init();
  await withClient((sql) => sql`
    INSERT INTO events (day, name, slug, count) VALUES (CURRENT_DATE, ${name}, ${slug}, 1)
    ON CONFLICT (day, name, slug) DO UPDATE SET count = events.count + 1`);
}

export async function eventTotals(days = 30) {
  await init();
  return withClient(async (sql) => {
    const { rows } = await sql<{ name: string; slug: string; total: number }>`
      SELECT name, slug, SUM(count)::int AS total FROM events
      WHERE day > CURRENT_DATE - ${days}::int
      GROUP BY name, slug ORDER BY total DESC LIMIT 100`;
    return rows;
  });
}

export async function eventDaily(days = 30) {
  await init();
  return withClient(async (sql) => {
    const { rows } = await sql<{ day: string; total: number }>`
      SELECT day::text AS day, SUM(count)::int AS total FROM events
      WHERE day > CURRENT_DATE - ${days}::int AND name = 'view'
      GROUP BY day ORDER BY day`;
    return rows;
  });
}
