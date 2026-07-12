import { describe, expect, it } from "vitest";
import { isUniqueViolation, pgErrorCode } from "./db-errors";

describe("pgErrorCode", () => {
  it("reads a code on the error itself", () => {
    expect(pgErrorCode({ code: "23505" })).toBe("23505");
  });

  it("reads a code wrapped on `cause` (how drizzle surfaces driver errors)", () => {
    const wrapped = Object.assign(new Error("Failed query: insert ..."), {
      cause: { code: "23505" },
    });
    expect(pgErrorCode(wrapped)).toBe("23505");
  });

  it("returns undefined for non-objects and codeless errors", () => {
    expect(pgErrorCode(null)).toBeUndefined();
    expect(pgErrorCode("nope")).toBeUndefined();
    expect(pgErrorCode(new Error("boom"))).toBeUndefined();
  });
});

describe("isUniqueViolation", () => {
  it("is true for a 23505 whether direct or wrapped", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
    expect(
      isUniqueViolation(Object.assign(new Error(), { cause: { code: "23505" } }))
    ).toBe(true);
  });

  it("is false for other Postgres codes", () => {
    expect(isUniqueViolation({ code: "53300" })).toBe(false);
    expect(isUniqueViolation(new Error("boom"))).toBe(false);
  });
});
