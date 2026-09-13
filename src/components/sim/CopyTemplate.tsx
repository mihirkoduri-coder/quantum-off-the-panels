import { format } from "../../lib/site-copy";

/**
 * A copy-editable string with one or more live values spliced in — the same
 * data-copy-template convention the homepage's ARC progress line already
 * uses (see src/pages/index.astro), just packaged so a sim doesn't repeat
 * the same four attributes inline every time a caption needs "|{outcome}⟩"
 * or "{pct}%" baked into otherwise-editable text. admin-edit.js swaps in
 * the raw `{token}` template to edit, then re-interpolates with whatever
 * `vars` were current at save time — the interpolation logic never has to
 * live anywhere but here and in admin-edit.js's own `format()`.
 */
export default function CopyTemplate({
  keyPath,
  template,
  vars,
}: {
  keyPath: string;
  template: string;
  vars: Record<string, string | number>;
}) {
  return (
    <span
      data-copy-key={keyPath}
      data-copy-template="true"
      data-copy-raw={template}
      data-copy-vars={JSON.stringify(vars)}
    >
      {format(template, vars)}
    </span>
  );
}
