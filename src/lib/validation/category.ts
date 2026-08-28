import { z } from "zod";
import { CategoryType } from "@prisma/client";

const optionalText = z
  .string()
  .trim()
  .transform((v) => (v.length ? v : null))
  .nullable();

export const CategoryInput = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(90)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers and hyphens only",
    )
    .or(z.literal("")),
  categoryType: z.nativeEnum(CategoryType),
  parentId: z
    .string()
    .trim()
    .transform((v) => (v.length ? v : null))
    .nullable(),
  description: optionalText,
  icon: optionalText,
  displayOrder: z.coerce.number().int().min(0).max(9999).default(0),
  featured: z.coerce.boolean().default(false),
  showOnHomepage: z.coerce.boolean().default(false),
  active: z.coerce.boolean().default(true),
  seoTitle: optionalText,
  seoDescription: optionalText,
});

export type CategoryInputType = z.infer<typeof CategoryInput>;

/** FormData checkboxes arrive as "on" or absent. */
export function readCategoryForm(formData: FormData) {
  return {
    name: formData.get("name") ?? "",
    slug: formData.get("slug") ?? "",
    categoryType: formData.get("categoryType") ?? "OPPORTUNITY_TYPE",
    parentId: formData.get("parentId") ?? "",
    description: formData.get("description") ?? "",
    icon: formData.get("icon") ?? "",
    displayOrder: formData.get("displayOrder") ?? 0,
    featured: formData.get("featured") === "on",
    showOnHomepage: formData.get("showOnHomepage") === "on",
    active: formData.get("active") === "on",
    seoTitle: formData.get("seoTitle") ?? "",
    seoDescription: formData.get("seoDescription") ?? "",
  };
}

export const CATEGORY_TYPE_LABEL: Record<CategoryType, string> = {
  OPPORTUNITY_TYPE: "Opportunity Type",
  INDUSTRY: "Industry",
  STARTUP_STAGE: "Startup Stage",
  FOUNDER_TYPE: "Founder Type",
  PROVIDER_TYPE: "Provider Type",
  GEOGRAPHY: "Geography",
};

export const CATEGORY_TYPE_HINT: Record<CategoryType, string> = {
  OPPORTUNITY_TYPE: "What kind of funding this is — grant, accelerator, challenge.",
  INDUSTRY: "The sector a startup works in. Kept separate from opportunity type.",
  STARTUP_STAGE: "How far along a startup is.",
  FOUNDER_TYPE: "Founder eligibility, used only where the provider states it.",
  PROVIDER_TYPE: "What kind of organisation runs the programme.",
  GEOGRAPHY: "Where the opportunity applies.",
};

export const CATEGORY_TYPES = Object.keys(CATEGORY_TYPE_LABEL) as CategoryType[];
