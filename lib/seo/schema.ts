import {
  HOME_FAQS,
  SITE_DESCRIPTION,
  SITE_NAME,
  absoluteUrl,
  type FaqItem,
} from "@/lib/seo/site";

type JsonLd = Record<string, unknown>;

export function buildOrganizationSchema(): JsonLd {
  return {
    "@type": "Organization",
    "@id": `${absoluteUrl()}/#organization`,
    name: SITE_NAME,
    url: absoluteUrl(),
    description: SITE_DESCRIPTION,
    logo: absoluteUrl("/opengraph-image"),
  };
}

export function buildWebSiteSchema(): JsonLd {
  return {
    "@type": "WebSite",
    "@id": `${absoluteUrl()}/#website`,
    name: SITE_NAME,
    url: absoluteUrl(),
    description: SITE_DESCRIPTION,
    publisher: { "@id": `${absoluteUrl()}/#organization` },
    inLanguage: "en-IN",
  };
}

export function buildWebApplicationSchema(): JsonLd {
  return {
    "@type": "WebApplication",
    "@id": `${absoluteUrl()}/#app`,
    name: SITE_NAME,
    url: absoluteUrl(),
    description: SITE_DESCRIPTION,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
    },
    provider: { "@id": `${absoluteUrl()}/#organization` },
  };
}

export function buildFaqSchema(faqs: FaqItem[] = HOME_FAQS): JsonLd {
  return {
    "@type": "FAQPage",
    "@id": `${absoluteUrl()}/#faq`,
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function buildBreadcrumbSchema(
  items: { name: string; path: string }[],
): JsonLd {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function buildHomeGraph(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@graph": [
      buildOrganizationSchema(),
      buildWebSiteSchema(),
      buildWebApplicationSchema(),
      buildFaqSchema(),
      buildBreadcrumbSchema([{ name: "Home", path: "/" }]),
    ],
  };
}

export function buildAboutGraph(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@graph": [
      buildOrganizationSchema(),
      buildWebSiteSchema(),
      {
        "@type": "AboutPage",
        "@id": `${absoluteUrl("/about")}/#about`,
        name: `How ${SITE_NAME} works`,
        url: absoluteUrl("/about"),
        description:
          "How Common Name uses MCA Company Master open data, name-only policy, and why MCA remains authoritative.",
        isPartOf: { "@id": `${absoluteUrl()}/#website` },
        about: { "@id": `${absoluteUrl()}/#organization` },
      },
      buildBreadcrumbSchema([
        { name: "Home", path: "/" },
        { name: "About", path: "/about" },
      ]),
    ],
  };
}
