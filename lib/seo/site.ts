/** Shared site URL + copy for SEO / AEO / GEO surfaces. */

export const SITE_NAME = "Common Name";

export const SITE_TAGLINE =
  "How unique is this company name in India’s MCA register?";

export const SITE_DESCRIPTION =
  "Check proposed Indian company names against an official MCA Company Master open-data snapshot. See exact and similar matches in seconds — not a substitute for MCA filing.";

export const SITE_KEYWORDS = [
  "Indian company name check",
  "MCA company name availability",
  "company name uniqueness India",
  "SPICe+ name check",
  "Company Master Data",
  "data.gov.in company master",
  "similar company names India",
] as const;

export type FaqItem = {
  question: string;
  answer: string;
};

/** Answer-first FAQ for AEO (featured snippets / AI citations). */
export const HOME_FAQS: FaqItem[] = [
  {
    question: "How do I check if a company name is available in India?",
    answer:
      "Common Name compares your proposed name to a local index built from MCA Company Master open data on data.gov.in. You get a uniqueness signal plus exact and similar registered names within seconds. Always verify on the official MCA portal before SPICe+ or name reservation — this tool is a snapshot signal, not live approval.",
  },
  {
    question: "Is Common Name the same as MCA name approval?",
    answer:
      "No. Common Name is a point-in-time uniqueness signal against an open-data snapshot. This server never fetches the live MCA website. MCA live search and SPICe+ approval remain authoritative. Use “Verify on MCA” before you file.",
  },
  {
    question: "What data does Common Name use?",
    answer:
      "Checks run against Company Master Data published on data.gov.in (MCA open government data). The app never scrapes the MCA portal. Without a confirmed OGD ingest, local development uses fixture companies only.",
  },
  {
    question: "Does Common Name store director or personal data?",
    answer:
      "No. The index holds company name–level fields only (CIN, registered name, optional status/class/state). Directors, DIN, emails, phones, and personal addresses are not stored or shown.",
  },
  {
    question: "What does “likely unique” mean?",
    answer:
      "“Likely unique” means no close matches appeared in the loaded snapshot for your query. It is not a reservation and not MCA approval. An empty index fails closed — you will see “index unavailable,” never a fake unique result.",
  },
];

export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  if (process.env.RENDER_EXTERNAL_URL) {
    return process.env.RENDER_EXTERNAL_URL.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

export function absoluteUrl(path = "/"): string {
  const base = getSiteUrl();
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
