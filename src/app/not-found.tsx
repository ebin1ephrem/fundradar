import Link from "next/link";
import { errors } from "@/content/copy";

export default function NotFound() {
  return (
    <div className="page-shell py-24 lg:py-32">
      <p className="eyebrow">404</p>
      <h1 className="display-lg mt-4 max-w-[18ch]">{errors.notFound.headline}</h1>
      <p className="lede mt-4 max-w-[48ch]">{errors.notFound.body}</p>
      <Link href="/opportunities" className="btn btn-primary mt-8">
        {errors.notFound.cta}
      </Link>
    </div>
  );
}
