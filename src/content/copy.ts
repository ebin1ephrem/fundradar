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
    "FundRadar brings together grants, programmes and startup opportunities so founders can find what could move their startup forward.",
  trustLine:
    "Curated opportunities for your next move.",
  unknownValue: "Not specified by provider",
} as const;

/** Navigation, per Part 20. */
export const nav = {
  links: [
    { href: "/opportunities", label: "Open opportunities" },
    { href: "/opportunities?closing=7", label: "Closing Soon" },
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
    eyebrow: "OPPORTUNITIES FOR FOUNDERS",
    headline: "Find what could move",
    headlineSecond: "your startup forward.",
    subline:
      "Grants, funding programmes, incubators, accelerators, corporate opportunities, competitions and more — curated in one place for founders who would rather spend their time building.",
    supporting: "Opportunities worth knowing about.",
    primaryCta: "See what's open",
    secondaryCta: "Get the Weekly Radar",
  },
  search: {
    placeholder: "Search grants, programs, sectors or organisations...",
    chipsLabel: "Try:",
  },
  open: {
    eyebrow: "OPEN NOW",
    headline: "What's on the Radar?",
    subline: "Explore opportunities open now across funding, programmes, partnerships and startup support.",
    cta: "See all opportunities",
  },
  closing: {
    eyebrow: "CLOSING SOON",
    headline: "Worth checking before they close.",
    subline: "Opportunities with approaching deadlines, so you can decide what deserves your time.",
    cta: "See closing soon",
  },
  categories: {
    eyebrow: "EXPLORE BY CATEGORY",
    headline: "What could help you move forward?",
    subline: "Explore opportunities across funding, programmes, partnerships and startup support.",
    cta: "View all categories",
  },
  recent: {
    eyebrow: "RECENTLY ADDED",
    headline: "New on the Radar",
    subline: "Recently added opportunities that may be worth a look.",
  },
  howItWorks: {
    eyebrow: "LESS SEARCHING. BETTER DECISIONS.",
    headline: "Built around your next move.",
    steps: [
      {
        title: "Find what matters.",
        body: "Explore funding, programmes and startup opportunities around what your company needs next.",
      },
      {
        title: "Understand it quickly.",
        body: "See the key information without spending hours working through pages of programme details.",
      },
      {
        title: "Choose where to spend your time.",
        body: "Not every opportunity deserves an application. Focus on the ones that fit what you are building.",
      },
      {
        title: "Act while it's open.",
        body: "Check the deadline, eligibility and next step, then go to the official programme page to apply.",
      },
      {
        title: "Keep moving.",
        body: "New opportunities keep appearing. Come back when your startup is ready for its next move.",
      },
    ],
  },
  trust: {
    eyebrow: "BUILT ON THE FOUNDER'S SIDE",
    headline: "We built FundRadar because we've been on this side of the search.",
    body: "Good opportunities are too easy to miss. Startup support is spread across ministries, incubators, universities, corporations, foundations, investors and ecosystem organisations. A useful opportunity might be sitting on a government portal, buried in an incubator page, shared by a corporate innovation team or circulating inside a network you are not part of yet.",
    body2:
      "Founders should not have to be everywhere to find what could help them move forward. FundRadar brings those opportunities together and makes them easier to understand, compare and act on.",
    body3:
      "Sometimes the right opportunity at the right moment can change what a startup does next.",
    pillars: [
      {
        title: "One place to look",
        body: "Find opportunities from across the startup support landscape without checking every source yourself.",
      },
      {
        title: "Clear enough to compare",
        body: "Understand what an opportunity offers, who it is for and when you need to act.",
      },
      {
        title: "Your decision",
        body: "Use the details to decide what is worth your time, then continue on the official programme page.",
      },
    ],
  },
  banner: {
    headline: "Let us keep an eye out while you keep building.",
    subline:
      "A short weekly selection of new opportunities, approaching deadlines and programmes worth a look.",
    cta: "Get the Weekly Radar",
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
    eyebrow: "BUILT FROM EXPERIENCE",
    headline: "Built by people who have felt the problem.",
    body: [
      "FundRadar comes from founders and ecosystem builders who have spent years working with startups, running programmes and watching good founders miss opportunities they could have used.",
      "Not because the opportunity did not exist.",
      "Because it was announced on a government website nobody checks. Because the eligibility was difficult to understand. Because the deadline arrived in a forwarded message three days too late. Because the founder had more urgent things to do than check dozens of websites every week.",
      "We thought this part of building a startup should take less searching and lead to better decisions.",
      "So we started building FundRadar.",
    ],
  },
  merstra: {
    eyebrow: "FUNDRADAR BY MERSTRA",
    headline: "FundRadar by Merstra",
    body: [
      "Merstra works with founders, incubators and programme operators across the startup ecosystem.",
      "FundRadar grew from something we kept seeing: there are opportunities, there are founders who need them, and too often the two do not connect at the right time.",
      "FundRadar is our attempt to make that connection easier.",
    ],
  },
  job: {
    eyebrow: "THE WIDER OPPORTUNITY LANDSCAPE",
    headline: "Because growth does not come from one kind of opportunity.",
    body: [
      "A grant can create room to build.",
      "An incubator can provide structure, facilities and a useful network.",
      "A corporate programme can lead to a pilot or partnership.",
      "An accelerator can sharpen the company and expand its reach.",
      "A competition can bring visibility, credibility or capital.",
      "An investor introduction can open a different path entirely.",
      "What matters next depends on the startup. FundRadar reflects that wider opportunity landscape.",
    ],
  },
  promise: {
    eyebrow: "BUILT AROUND YOUR NEXT MOVE",
    items: [
      {
        title: "Find what matters.",
        body: "Explore funding, programmes and startup opportunities around what your company needs next.",
      },
      {
        title: "Understand it quickly.",
        body: "See the key information without spending hours working through pages of programme details.",
      },
      {
        title: "Choose where to spend your time.",
        body: "Not every opportunity deserves an application. Focus on the ones that fit what you are building.",
      },
      {
        title: "Act while it's open.",
        body: "Check the deadline, eligibility and next step, then go to the official programme page to apply.",
      },
      {
        title: "Keep moving.",
        body: "New opportunities keep appearing. Come back when your startup is ready for its next move.",
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
    headline: "Whatever you're building, there is usually a next move.",
    body: [
      "It might be funding, a programme, a pilot, an introduction, a competition or access to a new market.",
      "FundRadar helps you see what is available and decide what could move your startup forward.",
    ],
    cta: "See what's on the Radar",
  },
} as const;

/** Part 4 — opportunity pages. */
export const opportunity = {
  cta: {
    apply: "Apply on official programme page",
    save: "Put this on your Radar",
    saved: "On your Radar",
    remind: "Get deadline reminder",
    similar: "Find more like this",
    share: "Share",
    report: "Report an error",
    details: "See details",
    fullDetails: "See full details",
  },
  sections: {
    overview: "What is it?",
    funding: "What could you get?",
    eligibility: "Who is it for?",
    whoCanApply: "Who can apply?",
    benefits: "What does the programme offer?",
    applicationProcess: "How to apply",
    documents: "What should you prepare?",
    selection: "What should you know?",
    dates: "Important dates",
    source: "Official programme page",
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
  verifiedTooltip: "Linked to the official programme page.",
  disclaimer: "Programme details can change. Check the official programme page before applying.",
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
    closing: "Closing Soon",
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
    body: "New opportunities keep appearing. Get on the radar and we'll let you know when something opens in this space.",
    cta: "Get notified when something opens",
  },
} as const;

/** Part 7 — lead capture. */
export const leadCapture = {
  general: {
    headline: "Let us keep an eye out while you keep building.",
    body: "Get a short selection of new opportunities, approaching deadlines and programmes worth a look.",
    prompt: "Tell us where to send the signal:",
    bullets: [
      "New grants and funding programmes",
      "Incubation and acceleration calls",
      "CSR and corporate innovation opportunities",
      "Competitions and awards",
      "Deadline changes and extensions",
    ],
    footnote: "One useful update each week.",
    cta: "Get the Weekly Radar",
  },
  contextual: (categoryName: string) => ({
    headline: `Looking for ${categoryName} opportunities?`,
    body: `We'll send you new ${categoryName} grants, programmes and funding calls that may be worth your attention.`,
    cta: "Keep me on the radar",
  }),
  afterViewing: {
    headline: "Want more opportunities like this?",
    body: "Tell us where to send them, then get back to building.",
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
    body: "We'll send you relevant opportunities and approaching deadlines.",
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
    signal: "Worth a Look",
    signalHint: "Recommended opportunities based on your interests",
    saved: "On your Radar",
    savedHint: "Opportunities you want to keep in view",
    closing: "Closing Soon",
    closingHint: "Opportunities on your Radar with approaching deadlines",
    new: "New on the Radar",
    newHint: "Recently added opportunities matching your interests",
    categories: "Your categories",
    alerts: "Alerts",
    alertsHint: "Your notification preferences",
    profile: "Profile",
    profileHint: "Your startup details",
  },
  empty: {
    saved: {
      headline: "Nothing on your Radar yet.",
      body: "When you find something worth tracking, put it on your Radar.",
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
  savedTabs: ["All", "On your Radar", "Interested", "Applied", "Not relevant"],
  noteePlaceholder:
    'Add a note — e.g. "Check eligibility for DPIIT requirement"',
  greeting: (name: string, count: number) =>
    count > 0
      ? `Welcome back, ${name}. ${count} new ${count === 1 ? "opportunity" : "opportunities"} since your last visit.`
      : `Welcome back, ${name}.`,
} as const;

/** Part 10 — the Weekly Radar. */
export const weeklySignal = {
  productName: "The Weekly Radar",
  eyebrow: "THE WEEKLY RADAR",
  headline: "Let us keep an eye out while you keep building.",
  body: "New grants. Incubation calls. CSR funding. Accelerators. Competitions. Deadline changes.",
  body2:
    "A short weekly selection of new opportunities, approaching deadlines and programmes worth a look.",
  cta: "Get the Weekly Radar",
  supporting:
    "Choose the kinds of opportunities you care about. We'll sharpen the signal over time.",
  preferences: {
    headline: "What kind of signal do you want?",
    subline:
      "Select the categories that matter to your startup. We'll prioritise these in your Weekly Radar.",
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
  saved: "Added to your Radar. You'll find it in your dashboard.",
  unsaved: "Removed from your Radar.",
  reminderSet: "Reminder set. We'll ping you before the deadline.",
  profileUpdated: "Updated. Your signal just got sharper.",
  preferencesSaved:
    "Saved. We'll prioritise these categories in your Weekly Radar.",
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
    title: "FundRadar — Curated Opportunities for Founders | Signal, Not Noise",
    description:
      "Find grants, funding programmes, incubators, accelerators, corporate opportunities and competitions curated for founders. FundRadar by Merstra.",
  },
  about: {
    title: "About FundRadar — Signal, Not Noise in Startup Funding | By Merstra",
    description:
      "FundRadar brings grants, programmes and startup opportunities together so founders can spend less time searching and make better decisions. A Merstra initiative.",
  },
  opportunities: {
    title: "Open Startup Funding Opportunities | FundRadar",
    description:
      "Browse open grants, seed funds, incubation programmes, accelerators, corporate opportunities and competitions for startups. FundRadar by Merstra.",
  },
  categories: {
    title: "Startup Funding Categories | FundRadar",
    description:
      "Browse startup funding by category — grants, seed funds, incubation, acceleration, CSR funding, competitions and more. FundRadar by Merstra.",
  },
  category: (name: string, count: number) => ({
    title: `${name} — Startup Funding Opportunities | FundRadar`,
    description: `Browse ${count} active ${name} ${count === 1 ? "opportunity" : "opportunities"} for startups across funding, programmes and support. FundRadar by Merstra.`,
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
      "View eligibility, application details and apply on the official programme page.",
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
  subscribe: "Get the Weekly Radar",
  signUp: "Get the signal",
  explore: "See what's open",
  learnMore: "See details",
  viewOfficial: "View official call",
  recommended: "Worth a Look",
  urgent: "Closing Soon",
  createAccount: "Get started",
  logIn: "Continue",
  apply: "Apply on official programme page",
  viewMore: "See all",
  download: "Get the list",
  notify: "Keep me on the radar",
} as const;

export function leadScoreLabel(score: number): string {
  return admin.leadScore.find((b) => score >= b.min)?.label ?? "New lead";
}
