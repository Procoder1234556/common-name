import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { buildAboutGraph } from "@/lib/seo/schema";
import { absoluteUrl } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "How it works — MCA snapshot vs live approval",
  description:
    "How Common Name checks Indian company names: MCA Company Master open data on data.gov.in, name-only policy, fail-closed empty index, and why MCA remains authoritative.",
  alternates: {
    canonical: absoluteUrl("/about"),
  },
  openGraph: {
    title: "How Common Name works",
    description:
      "OGD Company Master snapshot, name-only policy, and MCA as live authority.",
    url: absoluteUrl("/about"),
  },
};

export default function AboutPage() {
  const ogdUrl =
    process.env.NEXT_PUBLIC_OGD_CATALOG_URL ??
    "https://data.gov.in/catalog/company-master-data";
  const mcaUrl =
    process.env.NEXT_PUBLIC_MCA_VERIFY_URL ??
    "https://www.mca.gov.in/content/mca/global/en/mca/fo-llp-services/company-llp-name-search.html";

  return (
    <>
      <JsonLd data={buildAboutGraph()} />
      <main
        id="main"
        className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:px-6"
      >
        <h1 className="font-display text-3xl font-semibold text-neutral-900">
          How Common Name works
        </h1>
        <p className="mt-3 text-lg text-neutral-600">
          Common Name is a snapshot uniqueness signal against MCA Company Master
          open data — not live MCA name approval. MCA filing remains
          authoritative.
        </p>

        <div className="mt-10 space-y-10 text-base leading-relaxed text-neutral-700">
          <section className="space-y-3">
            <h2 className="font-display text-xl font-semibold text-neutral-900">
              What data source does Common Name use?
            </h2>
            <p>
              Checks run against a local index built from{" "}
              <strong className="font-semibold text-neutral-900">
                Company Master Data
              </strong>{" "}
              published on data.gov.in (MCA open government data). We never
              scrape the MCA portal.
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <a
                  href={ogdUrl}
                  className="text-primary-700 font-medium underline-offset-2 hover:underline"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Company Master Data on data.gov.in
                </a>
              </li>
              <li>
                <a
                  href={mcaUrl}
                  className="text-primary-700 font-medium underline-offset-2 hover:underline"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Ministry of Corporate Affairs (official)
                </a>
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-semibold text-neutral-900">
              What geographic scope does the index cover?
            </h2>
            <p>
              Checks only cover companies in the{" "}
              <strong className="font-semibold text-neutral-900">
                loaded OGD snapshot
              </strong>
              . The public Render deploy ships with a{" "}
              <strong className="font-semibold text-neutral-900">Goa</strong>{" "}
              Company Master sample (~7k names) until a larger nationwide SQLite
              file is uploaded to persistent disk.
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="font-semibold text-neutral-900">
                  Goa-only
                </strong>{" "}
                — baked seed or single-state CSV; misses companies registered in
                other states.
              </li>
              <li>
                <strong className="font-semibold text-neutral-900">
                  Multi-state / all-India
                </strong>{" "}
                — download state CSVs from data.gov.in in your browser, ingest
                locally, copy{" "}
                <code className="font-mono text-sm text-neutral-800">
                  companies.sqlite
                </code>{" "}
                to{" "}
                <code className="font-mono text-sm text-neutral-800">
                  /var/data
                </code>{" "}
                on Render. No Supabase required.
              </li>
            </ul>
            <p>
              Result rows show index size and snapshot label. This is never live
              MCA — only the snapshot you loaded.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-semibold text-neutral-900">
              Does Common Name store director or personal data?
            </h2>
            <p>
              No. The index holds company name–level fields only (CIN,
              registered name, optional status/class/state). We do{" "}
              <strong className="font-semibold text-neutral-900">not</strong>{" "}
              store directors, DIN, emails, phones, or personal addresses.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-semibold text-neutral-900">
              Is a Common Name result the same as MCA approval?
            </h2>
            <p>
              No. Results are a point-in-time uniqueness <em>signal</em> against
              the loaded snapshot — not a name reservation and not SPICe+
              approval. MCA live search and filing remain authoritative. Always
              use{" "}
              <a
                href={mcaUrl}
                className="text-primary-700 font-medium underline-offset-2 hover:underline"
                rel="noopener noreferrer"
                target="_blank"
              >
                Verify on MCA
              </a>{" "}
              before you file.
            </p>
            <p className="rounded-lg border border-neutral-200 bg-white/80 px-4 py-3 text-sm text-neutral-600 shadow-sm">
              This is a snapshot uniqueness signal from MCA Company Master open
              data. MCA live search and SPICe+ approval are authoritative — this
              server never fetches the MCA website.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-semibold text-neutral-900">
              What happens if the company index is empty?
            </h2>
            <p>
              Without a confirmed OGD ingest, the app uses fixture companies (
              <code className="font-mono text-sm text-neutral-800">
                pnpm db:fixture
              </code>
              ). An empty index fails closed — you will see “index unavailable,”
              never a fake “likely unique.”
            </p>
          </section>

          <p>
            <Link
              href="/"
              className="bg-primary-500 hover:bg-primary-600 focus-visible:ring-primary-500 inline-flex min-h-11 items-center rounded-lg px-5 py-2.5 font-medium text-white transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Check a name
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
