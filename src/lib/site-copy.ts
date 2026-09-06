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

/** The comic-text style system: instead of one named preset, three
 *  independent toggles compose freely (tilt, shadow, backsplash), plus a
 *  process-ink color choice for the parts that carry color. Right now only
 *  the wordmark exposes this (site.titleStyle) — apply the same TitleStyle
 *  shape + a matching set of CSS classes to make another field stylable. */
export const PROCESS_COLORS = ["cyan", "magenta", "yellow"] as const;
export type ProcessColor = (typeof PROCESS_COLORS)[number];

export const BACKSPLASH_OPTIONS = ["none", "dots", "burst"] as const;
export type Backsplash = (typeof BACKSPLASH_OPTIONS)[number];

export interface TitleStyle {
  tilt: boolean;
  shadow: boolean;
  shadowColor: ProcessColor;
  backsplash: Backsplash;
  backsplashColor: ProcessColor;
}

/** The two logo forms the header can show. "text" renders the wordmark
 *  (styled per TitleStyle above); "braket" renders the ⟨Q|P⟩ mark instead.
 *  The plain-text site name (site.title + site.titleAccent) still shows up
 *  elsewhere regardless — footer, page titles, RSS — this only picks what
 *  the header itself displays. */
export const LOGO_VARIANTS = ["text", "braket"] as const;
export type LogoVariant = (typeof LOGO_VARIANTS)[number];

export interface SiteCopy {
  site: {
    title: string;
    titleAccent: string;
    logoVariant: LogoVariant;
    titleStyle: TitleStyle;
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
