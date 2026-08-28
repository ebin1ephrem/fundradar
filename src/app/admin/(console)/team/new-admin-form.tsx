"use client";

import { useActionState } from "react";
import { Field, FormError } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { createAdminAction, type TeamFormState } from "./actions";

export function NewAdminForm() {
  const [state, action] = useActionState<TeamFormState, FormData>(
    createAdminAction,
    {},
  );

  return (
    <form action={action} className="grid gap-4">
      <FormError message={state.error} />
      <Field label="Name" htmlFor="admin-name" required>
        <input id="admin-name" name="name" className="field" required />
      </Field>
      <Field label="Email" htmlFor="admin-email" required>
        <input id="admin-email" name="email" type="email" className="field" required />
      </Field>
      <Field
        label="Temporary password"
        htmlFor="admin-password"
        required
        hint="At least 12 characters. Share it over a secure channel."
      >
        <input
          id="admin-password"
          name="password"
          type="text"
          minLength={12}
          className="field"
          required
        />
      </Field>
      <Field label="Role" htmlFor="admin-role">
        <select id="admin-role" name="role" className="field" defaultValue="ADMIN">
          <option value="ADMIN">Admin — review and publish</option>
          <option value="SUPER_ADMIN">Super admin — also manages people and deletes</option>
        </select>
      </Field>
      <SubmitButton pendingLabel="Creating…">Create admin</SubmitButton>
    </form>
  );
}
