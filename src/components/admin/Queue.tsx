import { useState } from "react";

interface Row {
  id: number; kind: string; post_slug: string; name: string; body: string;
  status: string; reply: string | null; featured: boolean; created_at: string;
}

/** The moderation queue. Every action re-authorises on the server (middleware.ts
 *  gates /api/admin/* regardless of what this UI shows or hides). */
export default function Queue({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState(initial);
  const [filter, setFilter] = useState<"pending" | "approved" | "all">("pending");
  const [busy, setBusy] = useState<number | null>(null);
  const [draft, setDraft] = useState<Record<number, string>>({});

  const act = async (id: number, action: string, value?: unknown) => {
    setBusy(id);
    try {
      const r = await fetch("/api/admin/moderate", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, id, value }),
      });
      if (!r.ok) { alert("That didn't work — try signing in again."); return; }
      setRows((rs) =>
        action === "delete" ? rs.filter((x) => x.id !== id)
        : rs.map((x) => x.id !== id ? x
          : action === "reply" ? { ...x, reply: String(value ?? "") }
          : action === "feature" ? { ...x, featured: Boolean(value) }
          : { ...x, status: action === "approve" ? "approved" : action === "reject" ? "rejected" : "pending" }));
    } finally { setBusy(null); }
  };

  const shown = rows.filter((r) => filter === "all" || r.status === filter);
  const counts = {
    pending: rows.filter((r) => r.status === "pending").length,
    approved: rows.filter((r) => r.status === "approved").length,
  };

  return (
    <div className="q">
      <div className="row q__filters">
        {(["pending", "approved", "all"] as const).map((f) => (
          <button key={f} className={`btn btn--sm${filter === f ? " is-on" : ""}`} onClick={() => setFilter(f)}>
            {f}{f !== "all" ? ` (${counts[f]})` : ""}
          </button>
        ))}
      </div>

      {shown.length === 0 && <p className="dim">Nothing here.</p>}

      <ul className="q__list">
        {shown.map((r) => (
          <li key={r.id} className={`q__item is-${r.status}`}>
            <div className="q__meta">
              <span className="q__kind">{r.kind}</span>
              <span className="q__name">{r.name}</span>
              {r.post_slug && <span className="q__slug">{r.post_slug}</span>}
              <span className="q__when">{new Date(r.created_at).toLocaleDateString()}</span>
              {r.featured && <span className="q__star">featured</span>}
            </div>
            <p className="q__body">{r.body}</p>

            <textarea className="q__reply" rows={2} placeholder="Your reply (printed under the letter)"
              value={draft[r.id] ?? r.reply ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, [r.id]: e.target.value }))} />

            <div className="row q__ops">
              <button className="btn btn--sm btn--go" disabled={busy === r.id} onClick={() => act(r.id, "approve")}>Approve</button>
              <button className="btn btn--sm" disabled={busy === r.id} onClick={() => act(r.id, "pend")}>Hold</button>
              <button className="btn btn--sm" disabled={busy === r.id} onClick={() => act(r.id, "reply", draft[r.id] ?? "")}>Save reply</button>
              <button className="btn btn--sm" disabled={busy === r.id} onClick={() => act(r.id, "feature", !r.featured)}>
                {r.featured ? "Unfeature" : "Feature"}
              </button>
              <button className="btn btn--sm btn--break" disabled={busy === r.id} onClick={() => act(r.id, "reject")}>Reject</button>
              <button className="btn btn--sm btn--break" disabled={busy === r.id}
                onClick={() => confirm("Delete permanently?") && act(r.id, "delete")}>Delete</button>
            </div>
          </li>
        ))}
      </ul>

      <style>{`
        .q__filters { margin-bottom: 1rem; }
        .btn--sm { font-size: 0.72rem; padding: 0.4rem 0.6rem; min-height: 34px; }
        .btn.is-on { background: var(--cyan); color: var(--ink); border-color: var(--cyan); }
        .q__list { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.9rem; }
        .q__item {
          border: var(--panel-line) solid var(--gutter); border-radius: var(--radius);
          background: var(--ink-2); padding: 0.9rem;
        }
        .q__item.is-pending { border-color: var(--yellow); }
        .q__item.is-rejected { opacity: 0.45; }
        .q__meta {
          display: flex; gap: 0.7rem; flex-wrap: wrap; align-items: baseline;
          font-family: var(--font-mono); font-size: 0.64rem; letter-spacing: 0.1em;
          text-transform: uppercase; color: var(--paper-dim); margin-bottom: 0.5rem;
        }
        .q__kind { color: var(--cyan); }
        .q__name { color: var(--paper); }
        .q__star { color: var(--yellow); }
        .q__body { margin: 0 0 0.7rem; white-space: pre-wrap; }
        .q__reply {
          width: 100%; background: var(--ink); color: var(--paper);
          border: var(--panel-line) solid var(--gutter); border-radius: var(--radius);
          padding: 0.5rem 0.6rem; font-family: var(--font-body); font-size: 0.95rem;
          margin-bottom: 0.6rem; resize: vertical;
        }
        .q__ops { gap: 0.35rem; }
      `}</style>
    </div>
  );
}
