import { HOME_FAQS, type FaqItem } from "@/lib/seo/site";

type FaqSectionProps = {
  faqs?: FaqItem[];
  heading?: string;
};

export function FaqSection({
  faqs = HOME_FAQS,
  heading = "Common questions",
}: FaqSectionProps) {
  return (
    <section
      aria-labelledby="faq-heading"
      className="mt-16 border-t border-neutral-200/80 pt-12"
    >
      <h2
        id="faq-heading"
        className="font-display text-2xl font-semibold text-neutral-900"
      >
        {heading}
      </h2>
      <p className="mt-2 max-w-prose text-base text-neutral-600">
        Direct answers founders and advisors ask before filing on MCA.
      </p>
      <dl className="mt-8 space-y-8">
        {faqs.map((faq) => (
          <div key={faq.question}>
            <dt>
              <h3 className="font-display text-lg font-semibold text-neutral-900">
                {faq.question}
              </h3>
            </dt>
            <dd className="mt-2 max-w-prose text-base leading-relaxed text-neutral-700">
              {faq.answer}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
