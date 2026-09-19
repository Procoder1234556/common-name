"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MatchList } from "@/components/check/match-list";
import { SignalBlock } from "@/components/check/signal-block";
import { normalizeCompanyName } from "@/lib/normalize";
import type { CheckErrorDto, CheckSuccessDto } from "@/lib/types/check";

type FormErrorKind =
  "validation" | "index" | "rate" | "server" | "offline" | "network";

interface FormError {
  kind: FormErrorKind;
  message: string;
  field?: string;
  retryAfterSeconds?: number;
}

function validateName(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length < 2) {
    return "Enter at least 2 characters";
  }
  if (trimmed.length > 120) {
    return "Name must be 120 characters or fewer";
  }
  if (!normalizeCompanyName(trimmed)) {
    return "Enter a distinctive name, not only a legal ending";
  }
  return null;
}

export function NameCheckForm() {
  const formId = useId();
  const inputId = `${formId}-name`;
  const unlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [name, setName] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckSuccessDto | null>(null);
  const [formError, setFormError] = useState<FormError | null>(null);
  const [offline, setOffline] = useState(false);
  const [rateLocked, setRateLocked] = useState(false);

  useEffect(() => {
    function onOnline() {
      setOffline(false);
    }
    function onOffline() {
      setOffline(true);
    }
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      if (unlockTimerRef.current) {
        clearTimeout(unlockTimerRef.current);
      }
    };
  }, []);

  const lockRateLimit = useCallback((seconds: number) => {
    setRateLocked(true);
    if (unlockTimerRef.current) {
      clearTimeout(unlockTimerRef.current);
    }
    unlockTimerRef.current = setTimeout(() => {
      setRateLocked(false);
      unlockTimerRef.current = null;
    }, seconds * 1000);
  }, []);

  const runCheck = useCallback(async () => {
    const validation = validateName(name);
    if (validation) {
      setFieldError(validation);
      setFormError(null);
      setResult(null);
      return;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setOffline(true);
      setFormError({
        kind: "offline",
        message: "You appear offline. Reconnect, then try again.",
      });
      return;
    }

    setFieldError(undefined);
    setFormError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      const payload = (await response.json()) as
        CheckSuccessDto | CheckErrorDto;

      if (response.status === 429) {
        const retryHeader = response.headers.get("Retry-After");
        const retryAfterSeconds = retryHeader
          ? Number.parseInt(retryHeader, 10)
          : 60;
        const seconds = Number.isFinite(retryAfterSeconds)
          ? retryAfterSeconds
          : 60;
        lockRateLimit(seconds);
        setResult(null);
        setFormError({
          kind: "rate",
          message: "Too many checks. Wait a minute and try again.",
          retryAfterSeconds: seconds,
        });
        return;
      }

      if (response.status === 503) {
        setResult(null);
        setFormError({
          kind: "index",
          message:
            "Company name index unavailable. Snapshot not loaded. This is not a uniqueness result.",
        });
        return;
      }

      if (response.status === 400 && "error" in payload) {
        setResult(null);
        setFieldError(payload.error.message);
        return;
      }

      if (!response.ok || "error" in payload) {
        setResult(null);
        setFormError({
          kind: "server",
          message: "Something went wrong. Try again.",
        });
        return;
      }

      setResult(payload);
      setFormError(null);
    } catch {
      setResult(null);
      setFormError({
        kind: "network",
        message: "Something went wrong. Try again.",
      });
    } finally {
      setLoading(false);
    }
  }, [lockRateLimit, name]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runCheck();
  }

  function handleNameChange(value: string) {
    setName(value);
    if (fieldError) setFieldError(undefined);
    if (value.trim() === "" && result) {
      setResult(null);
      setFormError(null);
    }
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          id={inputId}
          label="Proposed company name"
          name="name"
          type="text"
          autoComplete="organization"
          placeholder="e.g. Zephryn Analytic Works"
          value={name}
          onChange={(event) => handleNameChange(event.target.value)}
          disabled={loading || rateLocked}
          error={fieldError}
          hint="Leave off “Pvt Ltd” if you want — we normalize legal endings."
        />
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <Button
            type="submit"
            className="w-full md:w-auto"
            loading={loading}
            disabled={rateLocked || offline}
          >
            {loading ? "Checking…" : "Check uniqueness"}
          </Button>
        </div>
      </form>

      {offline ? (
        <Alert className="mt-6" title="You appear offline" tone="warning">
          Form data is kept. Retry when the connection returns.
        </Alert>
      ) : null}

      <div
        id="results"
        className="mt-8 min-h-48"
        aria-busy={loading || undefined}
        aria-live="polite"
      >
        {loading ? (
          <div className="space-y-3" aria-hidden>
            <div className="h-16 animate-pulse rounded-lg bg-neutral-200/70" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-neutral-200/60" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-neutral-200/60" />
          </div>
        ) : null}

        {!loading && formError?.kind === "index" ? (
          <div className="animate-fade-in space-y-4">
            <SignalBlock
              code="UNAVAILABLE"
              message="Company name index unavailable"
            />
            <Alert title="Snapshot not loaded">
              <p>{formError.message}</p>
              <p className="mt-2">
                See{" "}
                <Link
                  href="/about"
                  className="text-primary-700 font-medium underline-offset-2 hover:underline"
                >
                  How it works
                </Link>{" "}
                for fixture vs OGD setup.
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={() => void runCheck()}
              >
                Retry
              </Button>
            </Alert>
          </div>
        ) : null}

        {!loading && formError && formError.kind !== "index" ? (
          <div className="animate-fade-in">
            <Alert
              title={
                formError.kind === "rate"
                  ? "Too many checks"
                  : formError.kind === "offline"
                    ? "Offline"
                    : "Check failed"
              }
              tone={formError.kind === "rate" ? "warning" : "error"}
            >
              <p>{formError.message}</p>
              {formError.kind !== "rate" && formError.kind !== "offline" ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={() => void runCheck()}
                >
                  Retry
                </Button>
              ) : null}
            </Alert>
          </div>
        ) : null}

        {!loading && result ? (
          <div className="animate-fade-in space-y-5">
            <SignalBlock
              code={result.signal.code}
              message={result.signal.message}
            />

            <p className="text-sm text-neutral-600">
              Exact: {result.signal.exactCount} · Similar:{" "}
              {result.signal.similarCount}
              {" · "}
              Snapshot {result.meta.snapshotLabel}
              {result.meta.snapshotAt ? ` (${result.meta.snapshotAt})` : ""}
            </p>

            <MatchList matches={result.matches} />

            <aside
              className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3"
              aria-label="Disclaimer"
            >
              <p className="text-sm leading-relaxed text-neutral-700">
                {result.disclaimer}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                This tool never calls the live MCA website. Cache and SQLite
                results are from our OGD snapshot only — MCA remains the
                authority for reservation and filing.
              </p>
            </aside>

            <a
              href={result.links.mcaVerify}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="mca-verify-link"
              className="bg-primary-500 hover:bg-primary-600 focus-visible:ring-primary-500 inline-flex min-h-12 w-full cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-lg px-4 py-3 text-base font-medium text-white transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:w-auto"
            >
              Verify on MCA (official)
              <ExternalLink className="size-4" aria-hidden strokeWidth={2} />
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}
