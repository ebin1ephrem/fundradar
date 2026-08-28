/**
 * The single source of editorial language for FundRadar.
 *
 * Rules this file exists to enforce (Appendix B of the content spec):
 *   1. Signal, not noise — every sentence earns its place.
 *   2. Useful fact first — funding before history, deadline before biography.
 *   3. Never fabricate — if we don't know, we say "Not specified by provider".
 *   4. Never manufacture urgency — state the deadline plainly.
 *   5. Never manufacture certainty — don't say "perfect for you".
 *
 * No `server-only` import: client components read from here too.
 */

export const brand = {
  name: "FundRadar",
  lockup: "FundRadar by Merstra",
  parent: "Merstra",
  tagline: "Signal, not noise.",
  oneLine:
    "FundRadar cuts through the noise in startup funding — finding, reviewing and organising grants, incubation calls, funding programmes and other opportunities so founders see what's relevant before they miss it.",
  trustLine:
    "Every opportunity on FundRadar links to its official source. We review before we publish. We don't fabricate information we can't verify.",
  unknownValue: "Not specified by provider",
} as const;

/** Navigation, per Part 20. */
export const nav = {
  links: [
    { href: "/opportunities", label: "Open opportunities" },
    { href: "/opportunities?closing=7", label: "Closing soon" },
    { href: "/categories", label: "Categories" },
    { href: "/about", label: "About" },
  ],
  mobile: [
    { href: "/opportunities", label: "Opportunities" },
    { href: "/categories", label: "Categories" },
    { href: "/about", label: "About" },
  ],
  primaryCta: "See what's open",
  dashboardCta: "My dashboard",
} as const;

/** Part 2 — homepage. */
export const home = {
  hero: {
    eyebrow: "GRANTS · FUNDING · PROGRAMS · OPPORTUNITIES",
    headline: "Signal, not noise.",
    headlineSecond: "Find the startup funding that actually matters to you.",
    subline:
      "Grants, seed funds, incubation programmes, CSR funding, accelerators and open calls — collected from across the ecosystem, reviewed before we publish and organised so you can act on what's relevant before the deadline passes.",
    supporting:
      "Collected widely. Reviewed before we publish. Updated when things change.",
    primaryCta: "See what's open",
    secondaryCta: "Get the Weekly Signal",
  },
  search: {
    placeholder: "Search grants, programs, sectors or organisations...",
    chipsLabel: "Try:",
  },
  open: {
    eyebrow: "OPEN NOW",
    headline: "What's worth looking at right now.",
    subline: "Start with the opportunities you can still act on.",
    cta: "Browse all open opportunities",
  },
  closing: {
    eyebrow: "CLOSING SOON",
    headline: "Worth checking before the window closes.",
    subline: "Opportunities with approaching deadlines — sorted by urgency.",
    cta: "See closing soon",
  },
  categories: {
    eyebrow: "EXPLORE BY CATEGORY",
    headline: "Not every opportunity looks like a grant.",
    subline:
      "Explore funding and startup support across the categories that matter to you.",
    cta: "View all categories",
  },
  recent: {
    eyebrow: "RECENTLY ADDED",
    headline: "New on the radar.",
    subline: "Opportunities we've recently reviewed and published.",
  },
  howItWorks: {
    eyebrow: "HOW FUNDRADAR WORKS",
    headline: "We find it. We review it. You decide.",
    steps: [
      {
        title: "We scan.",
        body: "FundRadar monitors government portals, incubators, corporates, universities and ecosystem organisations for grants, funding programmes and startup opportunities.",
      },
      {
        title: "We review.",
        body: "Collected opportunities are not automatically published. They go through our review process before they appear on the platform.",
      },
      {
        title: "You search.",
        body: "Browse by category, industry, stage, location or funding type. Search for what matters to your startup.",
      },
      {
        title: "You act.",
        body: "See the eligibility, funding, deadline and application details — then go directly to the official source to apply.",
      },
      {
        title: "We keep watching.",
        body: "Deadlines change. New calls open. Programmes reopen. FundRadar keeps scanning so you don't have to.",
      },
    ],
  },
  trust: {
    eyebrow: "HOW WE WORK",
    headline: "Automation helps us look. People decide what gets published.",
    body: "FundRadar uses technology to discover and organise opportunities from across the ecosystem. But automatically collected information is not automatically published.",
    body2:
      "Before an opportunity appears on FundRadar, it goes through our review process. We check the source, verify the details and link back to the official page so you can confirm and apply directly.",
    body3:
      "The goal is not to give you more information. The goal is to give you information clear enough to act on.",
    pillars: [
      {
        title: "Official sources only",
        body: "Every record links to the provider's own page. Nothing is copied from another directory.",
      },
      {
        title: "Reviewed before publishing",
        body: "Automated extraction is a draft. A person verifies it before anyone sees it.",
      },
      {
        title: "Watched for changes",
        body: "Deadline moved? Funding changed? The change is detected, checked, then updated.",
      },
    ],
  },
  banner: {
    headline: "Don't miss the signal.",
    subline:
      "Get startup funding opportunities, incubation calls and deadline alerts delivered to you — curated around what matters to your startup.",
    cta: "Get on the radar",
  },
} as const;

/** Part 3 — about. */
export const about = {
  hero: {
    headline: "FundRadar exists because good opportunities are too easy to miss.",
    body: [
      "Startup support is spread across ministries, incubators, universities, corporations, foundations, investors and ecosystem organisations. The information exists — but it's scattered, inconsistent and often discovered too late.",
      "Founders shouldn't have to monitor all of them.",
      "We're building FundRadar to separate the signal from the noise.",
    ],
  },
  why: {
    eyebrow: "WHY FUNDRADAR",
    headline: "Built from the other side of the noise.",
    body: [
      "FundRadar comes from founders and ecosystem builders who have spent years working with startups, running programmes and watching good founders miss opportunities they could have used.",
      "Not because the opportunity didn't exist.",
      "Because it was announced on a government website nobody checks. Because the eligibility was written in language nobody could parse. Because the deadline was forwarded on WhatsApp three days too late. Because the founder had more urgent things to do than scan forty websites every week.",
      "We thought this part of building a startup should produce less noise and more signal.",
      "So we started building FundRadar.",
    ],
  },
  merstra: {
    eyebrow: "A MERSTRA INITIATIVE",
    headline: "Built inside the ecosystem, not outside it.",
    body: [
      "FundRadar is a Merstra initiative. It grew from something we kept seeing while working alongside founders, incubators and programme operators:",
      "There are opportunities. There are founders who need them. And far too often, the two don't connect at the right time.",
      "We've seen founders spend hours searching for funding that was listed on a page they didn't know existed. We've seen opportunities circulate inside small networks without reaching the startups that could benefit. We've seen founders discover calls after applications closed.",
      "And we've seen how much difference the right opportunity — discovered at the right moment — can make.",
      "FundRadar is our attempt to close that gap. Not with another pile of links. With a working signal filter.",
    ],
  },
  job: {
    eyebrow: "OUR JOB",
    headline: "Help founders see the signal early enough to act on it.",
    body: [
      "That means going beyond grants.",
      "A startup may need ₹25 lakh today. Six months later, the more valuable opportunity may be access to an incubator, a corporate pilot, a research collaboration, a market-access programme, cloud credits, an accelerator, a competition or the right introduction.",
      "Growth doesn't arrive through one type of opportunity. FundRadar reflects that.",
    ],
  },
  promise: {
    eyebrow: "THE FUNDRADAR PROMISE",
    items: [
      {
        title: "Find.",
        body: "We scan the places where startup opportunities actually appear — government portals, incubator sites, corporate innovation pages, university programmes, foundation announcements and ecosystem platforms.",
      },
      {
        title: "Review.",
        body: "What we collect is not automatically published. Opportunities go through our review process before they appear on FundRadar.",
      },
      {
        title: "Organise.",
        body: "One opportunity can be several things at once. A CSR-backed programme might also be: Grant + Incubation + ClimateTech. We organise opportunities around how founders actually search — not how bureaucracies file them.",
      },
      {
        title: "Surface.",
        body: "Funding, eligibility, deadlines and the details founders need to make a decision should be easy to find. Not buried. Not decorated. Just clear.",
      },
      {
        title: "Keep watching.",
        body: "Opportunities don't stop appearing. Deadlines change. Programmes reopen. New calls go live. FundRadar keeps scanning so you don't have to keep checking every source yourself.",
      },
    ],
  },
  not: {
    eyebrow: "WHAT WE'RE NOT",
    headline: "We're not trying to make every opportunity look good.",
    body: [
      "Not every programme is right for every founder. Not every ₹1 crore opportunity deserves your application. And a longer list is not automatically a better one.",
      "The founder's scarce resource is not information. It's time.",
      "Our job is to help you spend that time on the opportunities that actually matter — and skip the ones that don't.",
      "That's what separating signal from noise means in practice.",
    ],
  },
  trust: {
    headline: "Automation helps us look. People decide what gets published.",
    body: [
      "FundRadar uses technology to discover and organise opportunities from across the ecosystem. But automatically collected information is not automatically published.",
      "Before an opportunity appears on FundRadar, it goes through our review process. And wherever possible, we link directly to the original source so you can verify and apply yourself.",
      "The goal is not to give you more information. The goal is to give you information you can trust enough to act on.",
    ],
  },
} as const;

/** Part 4 — opportunity pages. */
export const opportunity = {
  cta: {
    apply: "Apply at official source",
    save: "Save this opportunity",
    saved: "Saved",
    remind: "Get deadline reminder",
    similar: "Find more like this",
    share: "Share",
    report: "Report an error",
    details: "See details",
    fullDetails: "See full details",
  },
  sections: {
    overview: "Overview",
    funding: "Funding",
    eligibility: "Eligibility",
    whoCanApply: "Who can apply",
    benefits: "Benefits",
    applicationProcess: "Application process",
    documents: "Required documents",
    selection: "Selection process",
    dates: "Important dates",
    source: "Official source",
    similar: "Similar opportunities",
  },
  related: {
    headline: "More signal in this space.",
    subline: "Other opportunities that may be relevant.",
  },
  trustFooter: {
    source: "Source",
    lastVerified: "Last verified",
    lastUpdated: "Last updated",
    prompt: "Something incorrect?",
  },
  verifiedTooltip:
    "Reviewed by FundRadar. Source verified against the official programme page.",
  disclaimer:
    "Information on FundRadar is collected from publicly available official sources and reviewed before publication. Details may change — always verify with the official programme page before applying.",
  locked: {
    label: "See full eligibility, application details and benefits.",
    cta: "See full details",
  },
} as const;

/** Part 6 — search and filters. */
export const search = {
  placeholder: "Search grants, programs, sectors or organisations...",
  chips: [
    { label: "AI", href: "/opportunities?q=AI" },
    { label: "Biotech", href: "/opportunities?q=biotech" },
    { label: "Women founders", href: "/opportunities?q=women+founders" },
    { label: "Prototype funding", href: "/opportunities?q=prototype+funding" },
    { label: "Kerala", href: "/opportunities?q=Kerala" },
    { label: "CSR", href: "/opportunities?q=CSR" },
    { label: "Manufacturing", href: "/opportunities?q=manufacturing" },
    { label: "ClimateTech", href: "/opportunities?q=climatetech" },
  ],
  filters: {
    category: "Category",
    industry: "Industry",
    stage: "Startup stage",
    fundingType: "Funding type",
    fundingAmount: "Funding amount",
    location: "Location",
    deadline: "Deadline",
    provider: "Provider",
    equityFree: "Equity-free",
    providerKind: "Government / Private",
    founderType: "Founder category",
    clear: "Clear filters",
  },
  sort: {
    newest: "Newest",
    closing: "Closing soon",
    largest: "Largest funding",
    updated: "Recently updated",
  },
  noResults: {
    headline: (q: string) => `No signal for "${q}" — yet.`,
    body: "We didn't find matching opportunities right now. Try broader terms, browse by category, or get on the radar and we'll notify you when something relevant appears.",
    browseCta: "Browse categories",
    radarCta: "Get on the radar",
  },
  emptyCategory: {
    headline: (name: string) => `No active opportunities in ${name} right now.`,
    body: "We're scanning for new opportunities in this space. Get on the radar and we'll send you the signal when something opens.",
    cta: "Get notified when something opens",
  },
} as const;

/** Part 7 — lead capture. */
export const leadCapture = {
  general: {
    headline: "Want us to keep finding the signal for you?",
    body: "Startup funding is scattered. We scan government portals, incubators, corporates and ecosystem organisations so you don't have to.",
    prompt: "Tell us where to send the signal:",
    bullets: [
      "New grants and funding programmes",
      "Incubation and acceleration calls",
      "CSR and corporate innovation opportunities",
      "Competitions and awards",
      "Deadline changes and extensions",
    ],
    footnote: "Plus a weekly digest of what's worth paying attention to.",
    cta: "Send me the signal",
  },
  contextual: (categoryName: string) => ({
    headline: `Looking for ${categoryName} opportunities?`,
    body: `We'll keep scanning for new ${categoryName} grants, programmes and funding calls — and send you the ones worth your attention.`,
    cta: "Keep me on the radar",
  }),
  afterViewing: {
    headline: "Want more opportunities like this?",
    body: "Tell us where to send them. We'll keep scanning for relevant funding and startup programmes while you get back to building.",
    cta: "Send me similar opportunities",
  },
  microReward: (count: number, categoryName: string) => ({
    headline: `We found ${count} active ${categoryName} opportunities.`,
    body: "Get the full list — plus new ones as they open.",
    cta: "Send me the list",
  }),
  deadline: (days: number) => ({
    headline: "Don't miss this deadline.",
    body: `This opportunity closes in ${days} ${days === 1 ? "day" : "days"}. Want a reminder — plus similar opportunities as they open?`,
    cta: "Remind me",
  }),
  fields: {
    name: "Name",
    email: "Email",
    whatsapp: "WhatsApp number",
    whatsappHint: "Get deadline alerts and urgent funding updates.",
    startup: "Startup name",
    optional: "optional",
  },
  consent: {
    email: "Send me relevant startup funding opportunities and deadline alerts.",
    whatsapp:
      "Send me urgent deadline reminders and important funding alerts via WhatsApp.",
  },
  confirmation: {
    headline: "You're on the radar.",
    body: "We'll keep scanning for relevant opportunities and send you the signal.",
    handoff: "Now, here's the information you were looking for.",
  },
} as const;

/** Part 8 — progressive profiling. */
export const profiling = {
  prompt: "Help us sharpen the signal for you.",
  industry: "What industry is your startup in?",
  stage: "What stage are you at?",
  location: "Where is your startup based?",
  cta: "Update my radar",
  matching: {
    intro: "To find the right opportunities, we need a few more details.",
    cta: "Find matching opportunities",
  },
  completion: {
    headline: "Sharpen your signal.",
    body: "The more we know about your startup, the better we can filter. A few quick details help us show you what's actually relevant.",
    cta: "Complete your profile",
    progress: (pct: number) => `Profile: ${pct}% complete`,
  },
} as const;

/** Part 9 — user dashboard. */
export const dashboard = {
  sections: {
    signal: "Your signal",
    signalHint: "Recommended opportunities based on your interests",
    saved: "Saved",
    savedHint: "Opportunities you've saved",
    closing: "Closing soon",
    closingHint: "Your saved opportunities with approaching deadlines",
    new: "New on the radar",
    newHint: "Recently published opportunities matching your interests",
    categories: "Your categories",
    alerts: "Alerts",
    alertsHint: "Your notification preferences",
    profile: "Profile",
    profileHint: "Your startup details",
  },
  empty: {
    saved: {
      headline: "No saved opportunities yet.",
      body: "When you find something worth tracking, save it here.",
      cta: "Browse open opportunities",
    },
    recommendations: {
      headline: "Nothing to recommend yet.",
      body: "Tell us a bit more about your startup and we'll start filtering the signal for you.",
      cta: "Update your profile",
    },
    alerts: {
      headline: "You're not following any categories yet.",
      body: "Follow the categories that matter to your startup and we'll send you the signal when new opportunities appear.",
      cta: "Choose categories",
    },
  },
  savedTabs: ["All", "Saved", "Interested", "Applied", "Not relevant"],
  noteePlaceholder:
    'Add a note — e.g. "Check eligibility for DPIIT requirement"',
  greeting: (name: string, count: number) =>
    count > 0
      ? `Welcome back, ${name}. ${count} new ${count === 1 ? "opportunity" : "opportunities"} since your last visit.`
      : `Welcome back, ${name}.`,
} as const;

/** Part 10 — the Weekly Signal. */
export const weeklySignal = {
  productName: "The Weekly Signal",
  eyebrow: "THE WEEKLY SIGNAL",
  headline: "The signal, delivered once a week.",
  body: "New grants. Incubation calls. CSR funding. Accelerators. Competitions. Deadline changes.",
  body2:
    "A short, useful scan of what opened, what's closing and what changed — so you don't have to spend the week checking every source.",
  cta: "Send me the Weekly Signal",
  supporting:
    "Choose the kinds of opportunities you care about. We'll sharpen the signal over time.",
  preferences: {
    headline: "What kind of signal do you want?",
    subline:
      "Select the categories that matter to your startup. We'll prioritise these in your Weekly Signal.",
    cta: "Save preferences",
  },
  sections: {
    new: "NEW ON THE RADAR",
    closing: "CLOSING SOON",
    changes: "DEADLINE CHANGES",
    worthALook: "WORTH A LOOK",
  },
  footer:
    "You're receiving this because you asked for startup funding updates from FundRadar.",
} as const;

/** Part 11 — action confirmations. */
export const confirmations = {
  saved: "Saved. You'll find it in your dashboard.",
  unsaved: "Removed from saved.",
  reminderSet: "Reminder set. We'll ping you before the deadline.",
  profileUpdated: "Updated. Your signal just got sharper.",
  preferencesSaved:
    "Saved. We'll prioritise these categories in your Weekly Signal.",
  errorReported: "Thanks. We'll check this and update the listing if needed.",
} as const;

/** Part 12 — errors and empty states. */
export const errors = {
  notFound: {
    headline: "This page isn't on the radar.",
    body: "The page you're looking for may have been moved or doesn't exist.",
    cta: "Back to open opportunities",
  },
  server: {
    headline: "Something went wrong on our end.",
    body: "We're looking into it. Try refreshing, or check back shortly.",
    cta: "Refresh",
  },
  opportunityNotFound: {
    headline: "This opportunity isn't available.",
    body: "It may have been closed, archived or removed. Here are other opportunities that might be relevant.",
  },
} as const;

/** Part 13 — report an error. */
export const reportError = {
  headline: "Something wrong with this listing?",
  body: "Help us keep FundRadar accurate. If you've noticed incorrect information, let us know.",
  // Values are the ErrorReportType enum members, so the form maps straight
  // onto the column with no translation table in between.
  reasons: [
    { value: "INCORRECT_DEADLINE", label: "Incorrect deadline" },
    { value: "BROKEN_APPLICATION_LINK", label: "Broken application link" },
    { value: "PROGRAMME_CLOSED", label: "Programme is closed" },
    { value: "INCORRECT_ELIGIBILITY", label: "Incorrect eligibility information" },
    { value: "INCORRECT_FUNDING_AMOUNT", label: "Incorrect funding amount" },
    { value: "OTHER", label: "Other" },
  ],
  detailsLabel: "Add details",
  detailsPlaceholder: "What did you notice?",
  cta: "Send report",
  confirmation: "Thanks. We'll check this and update the listing if needed.",
} as const;

/** Part 14 — SEO. */
export const seo = {
  home: {
    title:
      "FundRadar — Startup Grants, Funding Programs & Opportunities | Signal, Not Noise",
    description:
      "Find grants, seed funds, incubation programs, CSR funding, accelerators and startup opportunities — reviewed, organised and easier to act on. FundRadar by Merstra.",
  },
  about: {
    title: "About FundRadar — Signal, Not Noise in Startup Funding | By Merstra",
    description:
      "FundRadar finds, reviews and organises grants, funding programs and startup opportunities so founders can see what's relevant before they miss it. A Merstra initiative.",
  },
  opportunities: {
    title: "Open Startup Funding Opportunities | FundRadar",
    description:
      "Browse open grants, seed funds, incubation programs, accelerators, CSR funding and competitions for startups. Reviewed before we publish. FundRadar by Merstra.",
  },
  categories: {
    title: "Startup Funding Categories | FundRadar",
    description:
      "Browse startup funding by category — grants, seed funds, incubation, acceleration, CSR funding, competitions and more. FundRadar by Merstra.",
  },
  category: (name: string, count: number) => ({
    title: `${name} — Startup Funding Opportunities | FundRadar`,
    description: `Browse ${count} active ${name} ${count === 1 ? "opportunity" : "opportunities"} for startups. Grants, funding programs and support — reviewed and organised. FundRadar by Merstra.`,
  }),
  opportunity: (input: {
    title: string;
    provider: string;
    summary: string;
    amount: string | null;
    deadline: string | null;
  }) => ({
    title: `${input.title} — ${input.provider} | FundRadar`,
    description: [
      input.summary.replace(/\s+/g, " ").trim(),
      input.amount ? `Funding up to ${input.amount}.` : null,
      input.deadline ? `Deadline: ${input.deadline}.` : null,
      "View eligibility, application details and apply at the official source.",
    ]
      .filter(Boolean)
      .join(" ")
      .slice(0, 300),
  }),
} as const;

/** Part 16 — admin-facing language. */
export const admin = {
  reviewQueue: {
    new: "New opportunities",
    updates: "Updates",
    duplicates: "Possible duplicates",
    lowConfidence: "Low confidence",
    missing: "Missing information",
    brokenLinks: "Broken links",
    expired: "Expired opportunities",
    rejected: "Rejected",
  },
  reviewScreen: {
    leftTitle: "Original source",
    rightTitle: "Extracted information",
    openSource: "Open official page",
    sourceText: "Extracted source text",
  },
  confidence: {
    high: "High confidence",
    review: "Review recommended",
    manual: "Manual verification required",
    note: "Internal only. Confidence never appears publicly.",
  },
  actions: {
    publish: "Approve & publish",
    draft: "Save as draft",
    edit: "Edit",
    reExtract: "Request more extraction",
    openSource: "Open source",
    reScrape: "Re-scrape source",
    reject: "Reject",
    markDuplicate: "Mark as duplicate",
    merge: "Merge with existing",
    archive: "Archive",
  },
  checklist: {
    heading: "Before publishing, confirm:",
    cta: "Publish opportunity",
  },
  leadStatus: {
    ANONYMOUS: "Anonymous visitor",
    LEAD: "Lead",
    ENGAGED: "Engaged lead",
    REGISTERED: "Registered user",
    ACTIVE: "Active startup",
  },
  leadScore: [
    { min: 90, label: "Highly engaged" },
    { min: 70, label: "Hot lead" },
    { min: 50, label: "Engaged" },
    { min: 30, label: "Interested" },
    { min: 0, label: "New lead" },
  ],
  sourceStatus: {
    HEALTHY: "Healthy — source responding, no errors",
    STALE: "Stale — no changes detected in extended period",
    ERROR: "Error — source returning errors",
    BLOCKED: "Blocked — access restricted",
    MANUAL: "Manual review — requires human check",
  },
} as const;

/** Part 11 — the substitution table, kept so nothing regresses. */
export const cta = {
  register: "Get on the radar",
  submit: "Send me the signal",
  subscribe: "Send me the Weekly Signal",
  signUp: "Get the signal",
  explore: "See what's open",
  learnMore: "See details",
  viewOfficial: "View official call",
  recommended: "Worth a look",
  urgent: "Closing soon",
  createAccount: "Get started",
  logIn: "Continue",
  apply: "Apply at official source",
  viewMore: "See all",
  download: "Get the list",
  notify: "Keep me on the radar",
} as const;

export function leadScoreLabel(score: number): string {
  return admin.leadScore.find((b) => score >= b.min)?.label ?? "New lead";
}
