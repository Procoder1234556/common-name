import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkRateLimit, resetRateLimits } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    resetRateLimits();
    process.env.RATE_LIMIT_MAX = "3";
    process.env.RATE_LIMIT_WINDOW_MS = "60000";
  });

  afterEach(() => {
    resetRateLimits();
    delete process.env.RATE_LIMIT_MAX;
    delete process.env.RATE_LIMIT_WINDOW_MS;
  });

  it("allows up to max then returns 429 path", () => {
    const key = "10.0.0.1";
    expect(checkRateLimit(key).isAllowed).toBe(true);
    expect(checkRateLimit(key).isAllowed).toBe(true);
    expect(checkRateLimit(key).isAllowed).toBe(true);

    const blocked = checkRateLimit(key);
    expect(blocked.isAllowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });

  it("isolates keys", () => {
    expect(checkRateLimit("a").isAllowed).toBe(true);
    expect(checkRateLimit("b").isAllowed).toBe(true);
  });
});
