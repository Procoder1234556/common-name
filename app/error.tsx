"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(
      JSON.stringify({
        level: "error",
        code: "APP_ERROR",
        digest: error.digest ?? null,
        message: error.message,
      }),
    );
  }, [error]);

  return (
    <main
      id="main"
      className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-16 sm:px-6"
    >
      <h1 className="font-display text-3xl font-semibold text-neutral-900">
        Something went wrong
      </h1>
      <p className="mt-3 text-base leading-relaxed text-neutral-600">
        An unexpected error occurred. Try again, or return home to check a name.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          onClick={reset}
          className="min-h-11 cursor-pointer"
        >
          Try again
        </Button>
        <Link
          href="/"
          className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-neutral-300 bg-white px-5 py-2.5 font-medium text-neutral-800 transition-colors hover:bg-neutral-50"
        >
          Home
        </Link>
      </div>
    </main>
  );
}
