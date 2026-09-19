import type { Metadata } from "next";
import Link from "next/link";
import { FileQuestion } from "lucide-react";

export const metadata: Metadata = {
  title: "Page not found",
  description: "This page does not exist on Common Name.",
};

/**
 * App Router 404 — Server Component (awesome-cursorrules / Context7 not-found.tsx).
 * Empty-state pattern: message + clear actions (ui-ux-pro-max).
 */
export default function NotFound() {
  return (
    <main
      id="main"
      className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-16 sm:px-6"
    >
      <FileQuestion
        className="size-10 text-neutral-400"
        aria-hidden
        strokeWidth={1.75}
      />
      <p className="font-display mt-6 text-sm font-medium tracking-wide text-neutral-500 uppercase">
        404
      </p>
      <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
        Page not found
      </h1>
      <p className="mt-3 max-w-prose text-base leading-relaxed text-neutral-600 sm:text-lg">
        That URL is not part of Common Name. Check a proposed company name on
        the home page, or read how the OGD snapshot works.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
        <Link
          href="/"
          className="bg-primary-500 hover:bg-primary-600 focus-visible:ring-primary-500 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg px-5 py-2.5 text-base font-medium text-white transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Check a name
        </Link>
        <Link
          href="/about"
          className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-neutral-300 bg-white px-5 py-2.5 text-base font-medium text-neutral-800 transition-colors duration-200 hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          How it works
        </Link>
      </div>
    </main>
  );
}
