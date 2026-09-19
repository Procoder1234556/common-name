import { describe, expect, it } from "vitest";
import {
  isValidDistinctiveName,
  normalizeCompanyName,
  significantTokens,
} from "@/lib/normalize";

/** Table-driven cases — Phase 5 target ≥ 30 normalize fixtures. */
const NORMALIZE_CASES: Array<{ input: string; expected: string }> = [
  { input: "ACME Private Limited", expected: "acme" },
  { input: "ACME PVT LTD", expected: "acme" },
  { input: "Acme Private Limited", expected: "acme" },
  { input: "ACME Pvt. Ltd.", expected: "acme" },
  { input: "ACME P LTD", expected: "acme" },
  { input: "Tekno Solutions Pvt. Ltd.", expected: "tekno solutions" },
  { input: "Techno Solutions", expected: "techno solutions" },
  { input: "Horizon Quill Advisors LLP", expected: "horizon quill advisors" },
  {
    input: "Alpha Limited Liability Partnership",
    expected: "alpha",
  },
  { input: "Solo Craft OPC", expected: "solo craft" },
  { input: "Beta One Person Company", expected: "beta" },
  { input: "River Bend Company", expected: "river bend" },
  { input: "River Bend Co.", expected: "river bend" },
  { input: "River Bend Co", expected: "river bend" },
  { input: "River Bend Ltd", expected: "river bend" },
  { input: "River Bend Ltd.", expected: "river bend" },
  { input: "River Bend Limited", expected: "river bend" },
  { input: "  ACME   Private   Limited  ", expected: "acme" },
  { input: "A.C.M.E. Pvt. Ltd.", expected: "a c m e" },
  { input: "North Star Company Limited", expected: "north star" },
  {
    input: "Zephyr Quill Analytics Private Limited",
    expected: "zephyr quill analytics",
  },
  {
    input: "Xylophone Nebula Trading Works",
    expected: "xylophone nebula trading works",
  },
  {
    input: "Maple Drift Consulting Pvt Ltd",
    expected: "maple drift consulting",
  },
  { input: "INDIA FIRST BANK LIMITED", expected: "india first bank" },
  {
    input: "Foo & Bar Technologies Pvt. Ltd.",
    expected: "foo bar technologies",
  },
  { input: "Café Mocha Ventures", expected: "café mocha ventures" },
  { input: "Private Limited", expected: "" },
  { input: "PVT LTD", expected: "" },
  { input: "LLP", expected: "" },
  { input: "Limited", expected: "" },
  { input: "Co.", expected: "" },
  { input: "OPC", expected: "" },
  { input: "Company", expected: "" },
  { input: "One Person Company", expected: "" },
  { input: "Limited Liability Partnership", expected: "" },
];

describe("normalizeCompanyName", () => {
  it(`covers ${NORMALIZE_CASES.length} documented / edge fixtures`, () => {
    expect(NORMALIZE_CASES.length).toBeGreaterThanOrEqual(30);
    for (const { input, expected } of NORMALIZE_CASES) {
      expect(normalizeCompanyName(input), input).toBe(expected);
    }
  });

  it("is idempotent on already-normalized values", () => {
    const once = normalizeCompanyName("Techno Solutions Private Limited");
    expect(normalizeCompanyName(once)).toBe(once);
  });

  it("isValidDistinctiveName rejects empty", () => {
    expect(isValidDistinctiveName("acme")).toBe(true);
    expect(isValidDistinctiveName("")).toBe(false);
  });

  it("significantTokens filters short tokens", () => {
    expect(significantTokens("tekno solutions")).toEqual([
      "tekno",
      "solutions",
    ]);
    expect(significantTokens("ab cd ef")).toEqual([]);
    expect(significantTokens("abc")).toEqual(["abc"]);
  });
});
