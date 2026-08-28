"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { Category, CategoryType } from "@prisma/client";
import { Field, Fieldset, FormError, Row } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { Icon, ICON_NAMES } from "@/components/admin/icon";
import {
  CATEGORY_TYPES,
  CATEGORY_TYPE_HINT,
  CATEGORY_TYPE_LABEL,
} from "@/lib/validation/category";
import { slugify } from "@/lib/utils";
import type { CategoryFormState } from "./actions";

type ParentOption = Pick<Category, "id" | "name" | "categoryType">;

export function CategoryForm({
  action,
  category,
  parents,
  defaultType,
}: {
  action: (
    state: CategoryFormState,
    formData: FormData,
  ) => Promise<CategoryFormState>;
  category?: Category;
  parents: ParentOption[];
  defaultType?: CategoryType;
}) {
  const [state, formAction] = useActionState<CategoryFormState, FormData>(
    action,
    {},
  );
  const [type, setType] = useState<CategoryType>(
    category?.categoryType ?? defaultType ?? "OPPORTUNITY_TYPE",
  );
  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [icon, setIcon] = useState(category?.icon ?? "");
  const err = state.fieldErrors ?? {};

  const parentChoices = parents.filter(
    (p) => p.categoryType === type && p.id !== category?.id,
  );

  return (
    <form action={formAction} className="grid max-w-[720px] gap-7">
      {category ? <input type="hidden" name="id" value={category.id} /> : null}
      <FormError message={state.error} />

      <div className="grid gap-5">
        <Row>
          <Field label="Category name" htmlFor="name" required error={err.name}>
            <input
              id="name"
              name="name"
              className="field"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!category) setSlug(slugify(e.target.value));
              }}
              placeholder="CSR Funding"
            />
          </Field>

          <Field
            label="Slug"
            htmlFor="slug"
            error={err.slug}
            hint={`Page will be /categories/${slug || "…"}`}
          >
            <input
              id="slug"
              name="slug"
              className="field"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="csr-funding"
            />
          </Field>
        </Row>

        <Row>
          <Field
            label="Category type"
            htmlFor="categoryType"
            required
            error={err.categoryType}
            hint={CATEGORY_TYPE_HINT[type]}
          >
            <select
              id="categoryType"
              name="categoryType"
              className="field"
              value={type}
              onChange={(e) => setType(e.target.value as CategoryType)}
            >
              {CATEGORY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {CATEGORY_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Parent category"
            htmlFor="parentId"
            error={err.parentId}
            hint="Optional. Only categories of the same type can be a parent."
          >
            <select
              id="parentId"
              name="parentId"
              className="field"
              defaultValue={category?.parentId ?? ""}
            >
              <option value="">No parent — top level</option>
              {parentChoices.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
        </Row>

        <Field
          label="Description"
          htmlFor="description"
          hint="Shown on the category landing page. Write something original — it is public-facing copy."
        >
          <textarea
            id="description"
            name="description"
            className="field"
            rows={3}
            defaultValue={category?.description ?? ""}
            placeholder="Funding and startup support programmes offered through corporate social responsibility initiatives."
          />
        </Field>
      </div>

      <Fieldset
        title="Presentation"
        description="Controls where this category appears and in what order."
      >
        <Row cols={3}>
          <Field label="Icon" htmlFor="icon" hint="Shown beside the category name.">
            <div className="flex items-center gap-2">
              <span className="grid size-[48px] shrink-0 place-items-center rounded-[8px] border border-line bg-subtle">
                <Icon name={icon || undefined} className="size-4" />
              </span>
              <select
                id="icon"
                name="icon"
                className="field"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
              >
                <option value="">No icon</option>
                {ICON_NAMES.map((iconName) => (
                  <option key={iconName} value={iconName}>
                    {iconName}
                  </option>
                ))}
              </select>
            </div>
          </Field>

          <Field
            label="Display order"
            htmlFor="displayOrder"
            hint="Lower numbers first."
          >
            <input
              id="displayOrder"
              name="displayOrder"
              type="number"
              min={0}
              className="field"
              defaultValue={category?.displayOrder ?? 100}
            />
          </Field>
        </Row>

        <div className="grid gap-2.5 sm:grid-cols-3">
          <ToggleCard
            name="active"
            label="Active"
            description="Inactive categories disappear from the public site."
            defaultChecked={category?.active ?? true}
          />
          <ToggleCard
            name="featured"
            label="Featured"
            description="Highlighted in category listings."
            defaultChecked={category?.featured ?? false}
          />
          <ToggleCard
            name="showOnHomepage"
            label="Show on homepage"
            description="Appears in the homepage category grid."
            defaultChecked={category?.showOnHomepage ?? false}
          />
        </div>
      </Fieldset>

      <Fieldset
        title="Search engine listing"
        description="Optional. Falls back to the category name and description."
      >
        <Field label="SEO title" htmlFor="seoTitle">
          <input
            id="seoTitle"
            name="seoTitle"
            className="field"
            defaultValue={category?.seoTitle ?? ""}
            placeholder="CSR Funding for Startups in India"
          />
        </Field>
        <Field label="SEO description" htmlFor="seoDescription">
          <textarea
            id="seoDescription"
            name="seoDescription"
            className="field"
            rows={2}
            defaultValue={category?.seoDescription ?? ""}
          />
        </Field>
      </Fieldset>

      <div className="flex items-center gap-3 border-t border-line pt-6">
        <SubmitButton pendingLabel="Saving…">
          {category ? "Save changes" : "Create category"}
        </SubmitButton>
        <Link href="/admin/categories" className="btn btn-ghost">
          Cancel
        </Link>
      </div>
    </form>
  );
}

function ToggleCard({
  name,
  label,
  description,
  defaultChecked,
}: {
  name: string;
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-[10px] border border-line bg-canvas p-3.5 transition-colors duration-200 hover:border-line-strong has-checked:border-ink">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 size-4 shrink-0 accent-ink"
      />
      <span>
        <span className="block text-[13.5px] font-medium">{label}</span>
        <span className="mt-0.5 block text-[12px] leading-snug text-muted">
          {description}
        </span>
      </span>
    </label>
  );
}
