/**
 * Shared shapes for admin-editable settings. No server-only import, so client
 * components can use the labels and types without pulling in Prisma.
 */
export const GATEABLE_SECTIONS = [
  { key: "fullDescription", label: "Full description" },
  { key: "eligibility", label: "Detailed eligibility" },
  { key: "applicationProcess", label: "Application process" },
  { key: "requiredDocuments", label: "Required documents" },
  { key: "benefits", label: "Benefits" },
  { key: "selectionProcess", label: "Selection process" },
  { key: "importantNotes", label: "Important notes" },
  { key: "applicationUrl", label: "Official application link" },
  { key: "relatedOpportunities", label: "Similar opportunities" },
] as const;

export type GateableSection = (typeof GATEABLE_SECTIONS)[number]["key"];

export type LeadGateSettings = {
  enabled: boolean;
  opportunityViewsBeforePrompt: number;
  promptOnUnlockAction: boolean;
};

export const DEFAULT_GATE: LeadGateSettings = {
  enabled: true,
  opportunityViewsBeforePrompt: 3,
  promptOnUnlockAction: true,
};

export const DEFAULT_GATED_SECTIONS: GateableSection[] = [
  "fullDescription",
  "eligibility",
  "applicationProcess",
  "requiredDocuments",
  "benefits",
  "selectionProcess",
  "importantNotes",
  "applicationUrl",
  "relatedOpportunities",
];
