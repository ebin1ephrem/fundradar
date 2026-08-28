import Link from "next/link";

export default function Home() {
  return (
    <main className="page-shell section-y">
      <p className="eyebrow">FundRadar</p>
      <h1 className="display-lg mt-3 max-w-[18ch]">
        Grants and funding for startups.
      </h1>
      <p className="lede mt-4 max-w-[52ch]">
        The public directory is built in phase 2. The publishing console is
        already live.
      </p>
      <Link href="/admin" className="btn btn-primary mt-7">
        Open the admin console
      </Link>
    </main>
  );
}
