/**
 * Every piece of sitewide UI text lives in site-copy.json, not scattered as
 * literals across components — that's what makes it editable from
 * /admin/copy without touching code. Identical repeated words ("Issue",
 * "ARC 1") are unified into one field under `labels` rather than copied
 * into every spot they appear, so editing one place can't leave the site
 * saying two different things for the same word.
 *
 * A few fields contain a `{placeholder}` — those are the only "templating"
 * this supports (no markdown, no logic): format() does plain substitution,
 * nothing else. Keep the `{name}` token somewhere in the string when
 * editing one of those, or the value it's supposed to carry just won't
 * show up.
 */
import raw from "../data/site-copy.json";

/** Named text styles — the "pick a style, don't hand-tune it" system.
 *  "plain" is always valid and always means "the component's own default
 *  styling, no modifier class." Right now only the logo (site.titleStyle)
 *  exposes a choice; add a field's name here + a matching CSS class in
 *  whichever component renders it to make another field stylable. */
export const TEXT_STYLES = ["plain", "comic"] as const;
export type TextStyle = (typeof TEXT_STYLES)[number];

export interface SiteCopy {
  site: {
    title: string;
    titleAccent: string;
    /** which of TEXT_STYLES the wordmark renders as */
    titleStyle: TextStyle;
    byline: string;
    description: string;
    footerNote: string;
  };
  nav: { compendium: string; simulations: string; rss: string };
  labels: { issue: string; arc: string; buildsOn: string; notOutYet: string };
  homepage: {
    headline: string;
    headlineAccent: string;
    subhead: string;
    ctaFirst: string;
    ctaLatest: string;
    progressTemplate: string;
  };
  conceptMap: { progressTemplate: string };
  compendium: { heading: string; intro: string; searchPlaceholder: string };
  sims: {
    heading: string;
    intro: string;
    unlockedLabel: string;
    resetButton: string;
    openButton: string;
    lockedText: string;
    notBuiltText: string;
    readPostLink: string;
  };
  simShell: { eyebrowLabel: string; watchForLabel: string; resetButton: string };
  predict: {
    eyebrowLabel: string;
    beforeYouRunIt: string;
    lockItInButton: string;
    nailedIt: string;
    nope: string;
    youSaidPrefix: string;
    itsActuallyPrefix: string;
    nudge: string;
  };
  violationExplainer: { youTriedToPrefix: string; trySomethingElse: string };
}

export const copy: SiteCopy = raw as SiteCopy;

/** Replaces every {key} in `template` with vars[key]. Plain substitution
 *  only — anything not found in `vars` is left as literal text. */
export function format(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => (key in vars ? String(vars[key]) : match));
}

/** Combined site title, e.g. "Quantum off the Panels" — the plain and
 *  accent parts are only split apart for the two-tone header/footer
 *  styling; anything that just needs the whole name uses this. */
export const fullSiteTitle = () => `${copy.site.title} ${copy.site.titleAccent}`;
