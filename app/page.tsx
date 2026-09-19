import { NameCheckForm } from "@/components/check/name-check-form";

export default function HomePage() {
  return (
    <main
      id="main"
      className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-12 sm:px-6"
    >
      <p className="font-display text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl">
        Common Name
      </p>
      <h1 className="font-display mt-4 text-2xl leading-tight font-medium text-neutral-800 sm:text-3xl">
        See how unique your company name is in India’s register
      </h1>
      <p className="mt-3 max-w-prose text-lg leading-relaxed text-neutral-600">
        Snapshot from official MCA company master open data — not a reservation
      </p>
      <div className="mt-8">
        <NameCheckForm />
      </div>
    </main>
  );
}
