"use client";

import { errors } from "@/content/copy";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <div className="page-shell py-24 lg:py-32">
      <p className="eyebrow">Error</p>
      <h1 className="display-lg mt-4 max-w-[20ch]">{errors.server.headline}</h1>
      <p className="lede mt-4 max-w-[48ch]">{errors.server.body}</p>
      <button type="button" onClick={reset} className="btn btn-primary mt-8">
        {errors.server.cta}
      </button>
    </div>
  );
}
