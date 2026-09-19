import type { Metadata } from "next";
import { NameCheckForm } from "@/components/check/name-check-form";
import { FaqSection } from "@/components/seo/faq-section";
import { JsonLd } from "@/components/seo/json-ld";
import { buildHomeGraph } from "@/lib/seo/schema";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
  absoluteUrl,
} from "@/lib/seo/site";

export const metadata: Metadata = {
  title: {
    absolute: `${SITE_NAME} — Check Indian company name uniqueness`,
  },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: absoluteUrl("/"),
  },
  openGraph: {
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    url: absoluteUrl("/"),
  },
};

export default function HomePage() {
  return (
    <>
      <JsonLd data={buildHomeGraph()} />
      <main
        id="main"
        className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-12"
      >
        <div className="flex flex-1 flex-col justify-center">
          <p className="font-display text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl">
            {SITE_NAME}
          </p>
          <h1 className="font-display mt-4 text-2xl leading-tight font-medium text-balance text-neutral-800 sm:text-3xl">
            Check how unique your company name is in India’s MCA register
          </h1>
          <p className="mt-3 max-w-prose text-base leading-relaxed text-neutral-600 sm:text-lg">
            Common Name compares your proposed name to an official MCA Company
            Master{" "}
            <strong className="font-semibold text-neutral-800">
              open-data snapshot
            </strong>{" "}
            and returns exact plus similar matches in seconds. Not live MCA
            approval — always verify on MCA before filing.
          </p>
          <div className="mt-8">
            <NameCheckForm />
          </div>
        </div>
        <FaqSection />
      </main>
    </>
  );
}
