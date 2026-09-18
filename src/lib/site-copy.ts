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

export interface SiteCopy {
  site: {
    title: string;
    titleAccent: string;
    byline: string;
    description: string;
    footerNote: string;
  };
  nav: { home: string; compendium: string; simulations: string; about: string; stamps: string };
  labels: { issue: string; arc: string; buildsOn: string; notOutYet: string };
  homepage: {
    headline: string;
    headlineAccent: string;
    subhead: string;
    ctaFirst: string;
    ctaLatest: string;
    progressTemplate: string;
    introLabel: string;
  };
  conceptMap: { progressTemplate: string };
  compendium: { heading: string; intro: string; searchPlaceholder: string };
  about: { heading: string; photoUrl: string; photoPlaceholder: string; bioP1: string; bioP2: string };
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
  involve: {
    commentsEyebrow: string; commentsEmpty: string;
    commentHeading: string; commentNote: string; commentCta: string;
    letterHeading: string; letterNote: string; letterCta: string;
    questionHeading: string; questionNote: string; questionCta: string;
    nameLabel: string; messageLabel: string; sendAnother: string;
    thanksHeading: string; postedMessage: string; heldMessage: string; replyLabel: string;
    genericError: string; networkError: string; sendingLabel: string; loadingLabel: string;
    replySingular: string; replyPlural: string; honeypotLabel: string;
  };
  write: { heading: string; intro: string; footerLink: string };
  stamps: {
    heading: string; intro: string; markCaption: string; collectedSuffix: string;
    gotLabel: string; goEarnLabel: string; notIssuedLabel: string; downloadSticker: string;
  };
  /** Per-sim narrative/UI text — separate from `sims` above (the gallery
   *  page's own chrome) since these are keyed one object per sim slug.
   *  `{placeholder}` fields here follow the same format()-only templating
   *  as everywhere else. */
  simCopy: {
    amplitudeDial: {
      title: string;
      predict: { question: string; choiceSwap: string; choiceShift: string; choiceNone: string; choiceEven: string; because: string };
      watchForLive: string; watchForCollapsed: string;
      controls: { tiltLabel: string; phaseLabel: string; measureButton: string; peekButton: string; lockedNote: string };
      captions: {
        peeking: string; failing: string; lockedTemplate: string; phaseTurns: string;
        near0: string; near1: string; middle: string; leaning0: string; leaning1: string;
      };
      speech: {
        who: string; failing1: string; failing2: string;
        lockedTemplate1: string; lockedTemplate2: string; locked3: string;
      };
      violation: { sfx: string; law: string; attempted: string; why: string };
      dial: {
        sphereCollapsed: string; sphereLive: string; histCollapsed: string; histLive: string;
        pocketLabel: string; pocketP1: string; pocketP2: string;
      };
      readout: { p0: string; p1: string; outcome: string };
      peek: { reading: string; stateIntact: string; destabilising: string };
    };
    watchersQuestion: {
      title: string;
      predict: { question: string; choiceLeft: string; choiceRight: string; choiceCoin: string; choiceNone: string; because: string };
      watchFor: string;
      questions: { upDown: string; diagonal: string; leftRight: string };
      eyesCaption: { seenEnough: string; looking: string; refuses: string; notLooking: string };
      ending: { line1: string; kicker: string; hint: string };
      askPrompt: string;
      watchOnlyButton: string;
      readout: { panels: string; certainAbout: string; nothing: string };
      ledger: { heading: string; sureLabel: string; note: string };
      frames: { firstCaption: string; firstSub: string; alreadyKnew: string; oddsWereTemplate: string; emptyHint: string };
      pocket: { label: string; p1: string; p2: string; p3: string; p4: string };
      violation: { sfx: string; law: string; attempted: string; why: string };
    };
    twoPathInterference: {
      title: string;
      predict: { question: string; choiceNothing: string; choiceSwap: string; choiceSwing: string; choiceRandom: string; because: string };
      watchForLive: string; watchForTagged: string; watchForLocked: string;
      controls: { phaseLabel: string; measureButton: string; tagButton: string; untagButton: string; lockedNote: string };
      captions: {
        lockedTemplate: string; tagged: string; frontDoor: string; backDoor: string;
        bothDoors: string; mostlyFront: string; mostlyBack: string;
      };
      readout: { pA: string; pB: string; outcome: string };
      diagram: { source: string; tagged: string };
      pocket: { label: string; p1: string; p2: string };
      violation: { sfx: string; law: string; attempted: string; why: string };
    };
  };
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
