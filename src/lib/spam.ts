/**
 * Anonymous public forms are the highest-spam-risk setup there is. Three cheap
 * layers, none of which inconvenience a real reader:
 *   1. honeypot   — a field only a bot fills in
 *   2. dwell time — a form submitted in under 3s was not typed by a person
 *   3. heuristics — links and shouting hold a post for review rather than
 *                   rejecting it, so a false positive costs a delay, not a loss
 */
export interface Verdict { ok: boolean; hold: boolean; why?: string }

export function screen(o: { name: string; body: string; trap: string; elapsed: number }): Verdict {
  if (o.trap) return { ok: false, hold: false, why: "rejected" };
  if (!o.name.trim() || !o.body.trim()) return { ok: false, hold: false, why: "Name and message are both required." };
  if (o.name.length > 60) return { ok: false, hold: false, why: "That name is too long." };
  if (o.body.length > 4000) return { ok: false, hold: false, why: "That message is too long (4000 characters max)." };
  if (o.body.trim().length < 4) return { ok: false, hold: false, why: "That message is too short." };
  if (o.elapsed < 3000) return { ok: false, hold: false, why: "That was submitted very fast — try again." };

  const links = (o.body.match(/https?:\/\//g) ?? []).length;
  const letters = o.body.replace(/[^a-z]/gi, "");
  const shouty = letters.length > 24 && letters === letters.toUpperCase();
  const hold = links > 0 || shouty || /\b(casino|crypto|viagra|seo services)\b/i.test(o.body);
  return { ok: true, hold };
}
