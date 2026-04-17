import { describe, expect, it } from "vitest";

describe("Math utilities", () => {
  it("should add two numbers correctly", () => {
    const result = 2 + 3;
    expect(result).toBe(5);
  });

  it("should handle negative numbers", () => {
    const result = -5 + 10;
    expect(result).toBe(5);
  });
});
