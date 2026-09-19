type JsonLdProps = {
  data: Record<string, unknown>;
};

/**
 * Server-safe JSON-LD. Data must be trusted (our own schema builders).
 * Escapes `<` so user-controlled strings cannot break out of the script tag.
 */
export function JsonLd({ data }: JsonLdProps) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
