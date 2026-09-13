import { useEffect, useRef, useState } from "react";
import { copy } from "../lib/site-copy";

/**
 * Public reader-participation UI: a submission form and a live comment thread.
 *
 * Every form carries a honeypot field and records how long it was open, so the
 * server (src/pages/api/submit.ts, src/lib/spam.ts) can reject bots without
 * making a real reader prove anything.
 */

function kindCopy(kind: "comment" | "letter" | "question") {
  if (kind === "letter") return { title: copy.involve.letterHeading, note: copy.involve.letterNote, cta: copy.involve.letterCta };
  if (kind === "question") return { title: copy.involve.questionHeading, note: copy.involve.questionNote, cta: copy.involve.questionCta };
  return { title: copy.involve.commentHeading, note: copy.involve.commentNote, cta: copy.involve.commentCta };
}

export function SubmitForm({ kind, slug = "" }: { kind: "comment" | "letter" | "question"; slug?: string }) {
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [trap, setTrap] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  const opened = useRef(Date.now());
  const c = kindCopy(kind);

  const send = async () => {
    setState("sending");
    try {
      const r = await fetch("/api/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, slug, name, body, website: trap, elapsed: Date.now() - opened.current }),
      });
      const d = await r.json();
      if (!r.ok) { setState("error"); setMsg(d.error ?? "Something went wrong."); return; }
      setState("done");
      setMsg(d.status === "approved" ? copy.involve.postedMessage : copy.involve.heldMessage);
      setName(""); setBody("");
    } catch {
      setState("error"); setMsg("Couldn't reach the server.");
    }
  };

  if (state === "done") {
    return (
      <div className="inv__done">
        <span className="sfx sfx--fire inv__thanks">{copy.involve.thanksHeading}</span>
        <p>{msg}</p>
        <button className="btn" onClick={() => { setState("idle"); opened.current = Date.now(); }}>
          {copy.involve.sendAnother}
        </button>
      </div>
    );
  }

  return (
    <div className="inv__form">
      <p className="inv__head">{c.title}</p>
      <p className="inv__note">{c.note}</p>

      <label className="inv__f"><span>{copy.involve.nameLabel}</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} /></label>
      <label className="inv__f"><span>{copy.involve.messageLabel}</span>
        <textarea rows={kind === "comment" ? 3 : 5} value={body}
          onChange={(e) => setBody(e.target.value)} maxLength={4000} /></label>

      {/* honeypot: off-screen, not hidden, so bots that check display still fill it */}
      <label className="inv__trap" aria-hidden="true">
        Website<input tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
      </label>

      <div className="row">
        <button className="btn btn--go" onClick={send} disabled={state === "sending" || !name.trim() || !body.trim()}>
          {state === "sending" ? "Sending…" : c.cta}
        </button>
        {state === "error" && <span className="inv__err">{msg}</span>}
      </div>
      <Styles />
    </div>
  );
}

interface Comment { id: number; name: string; body: string; reply: string | null; created_at: string }

export function Comments({ slug }: { slug: string }) {
  const [rows, setRows] = useState<Comment[] | null>(null);

  useEffect(() => {
    fetch(`/api/comments?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json()).then(setRows).catch(() => setRows([]));
  }, [slug]);

  return (
    <section className="inv">
      <p className="eyebrow"><span className="wk">{copy.involve.commentsEyebrow}</span><span className="sep">/</span>
        <span>{rows ? `${rows.length} ${rows.length === 1 ? "reply" : "replies"}` : "loading"}</span></p>

      {rows && rows.length > 0 && (
        <ul className="inv__list">
          {rows.map((c) => (
            <li key={c.id} className="inv__item">
              <p className="inv__who">{c.name}</p>
              <p className="inv__body">{c.body}</p>
              {c.reply && (
                <div className="inv__reply">
                  <span className="inv__replyWho">{copy.involve.replyLabel}</span>
                  <p>{c.reply}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {rows && rows.length === 0 && <p className="dim inv__empty">{copy.involve.commentsEmpty}</p>}

      <SubmitForm kind="comment" slug={slug} />
      <Styles />
    </section>
  );
}

function Styles() {
  return (
    <style>{`
      .inv { margin-top: 3.5rem; border-top: var(--panel-line) solid var(--gutter); padding-top: 1.5rem; }
      .inv__list { list-style: none; padding: 0; margin: 1.25rem 0; display: grid; gap: 1rem; }
      .inv__item { border-left: 3px solid var(--gutter); padding-left: 0.9rem; }
      .inv__who {
        font-family: var(--font-mono); font-size: 0.68rem; letter-spacing: 0.12em;
        text-transform: uppercase; color: var(--cyan); margin: 0 0 0.3rem;
      }
      .inv__body { margin: 0; white-space: pre-wrap; }
      .inv__reply {
        margin-top: 0.7rem; border-left: 3px solid var(--magenta);
        padding-left: 0.8rem; background: var(--ink-2); padding-block: 0.5rem;
      }
      .inv__replyWho {
        font-family: var(--font-mono); font-size: 0.6rem; letter-spacing: 0.14em;
        text-transform: uppercase; color: var(--magenta);
      }
      .inv__reply p { margin: 0.25rem 0 0; }
      .inv__empty { margin: 1.25rem 0; }
      .inv__form {
        border: var(--panel-line) solid var(--gutter); border-radius: var(--radius);
        background: var(--ink-2); padding: 1rem; margin-top: 1.5rem; max-width: 38rem;
      }
      .inv__head { font-family: var(--font-head); font-weight: 900; font-size: 1.05rem; margin: 0; }
      .inv__note { font-size: 0.85rem; color: var(--paper-dim); margin: 0.2rem 0 0.9rem; }
      .inv__f { display: grid; gap: 0.25rem; margin-bottom: 0.7rem; }
      .inv__f > span {
        font-family: var(--font-mono); font-size: 0.62rem; letter-spacing: 0.12em;
        text-transform: uppercase; color: var(--paper-dim);
      }
      .inv__f input, .inv__f textarea {
        background: var(--ink); color: var(--paper); width: 100%;
        border: var(--panel-line) solid var(--gutter); border-radius: var(--radius);
        padding: 0.55rem 0.65rem; font-family: var(--font-body); font-size: 1rem; resize: vertical;
      }
      .inv__f input:focus, .inv__f textarea:focus { border-color: var(--cyan); outline: none; }
      .inv__trap { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }
      .inv__err { color: var(--magenta); font-size: 0.85rem; }
      .inv__done {
        border: var(--panel-line) solid var(--cyan); border-radius: var(--radius);
        background: var(--ink-2); padding: 1.2rem; margin-top: 1.5rem; max-width: 38rem;
      }
      .inv__thanks { font-size: 1.6rem; display: block; margin-bottom: 0.6rem; }
    `}</style>
  );
}
