import { getAgeLabel } from "@/lib/getAgeLabel";
import { describe, expect, it } from "vitest";

describe("getAgeLabel", () => {
  it("should return null when no birthDate provided", () => {
    expect(getAgeLabel()).toBeNull();
    expect(getAgeLabel(undefined)).toBeNull();
  });

  it("should return null for invalid date", () => {
    expect(getAgeLabel("invalid-date")).toBeNull();
  });

  it("should calculate age correctly", () => {
    const today = new Date();
    const birthDate = new Date(
      today.getFullYear() - 25,
      today.getMonth(),
      today.getDate(),
    );
    const result = getAgeLabel(birthDate.toISOString());
    expect(result).toContain("25 año");
  });

  it("should handle months correctly", () => {
    const today = new Date();
    const birthDate = new Date(
      today.getFullYear() - 25,
      today.getMonth() - 6,
      today.getDate(),
    );
    const result = getAgeLabel(birthDate.toISOString());
    expect(result).toContain("25 año");
    expect(result).toContain("6 mes");
  });

  it("should handle singular/plural correctly", () => {
    const today = new Date();

    // 1 año
    const oneYear = new Date(
      today.getFullYear() - 1,
      today.getMonth(),
      today.getDate(),
    );
    expect(getAgeLabel(oneYear.toISOString())).toContain("1 año");

    // 1 mes
    const oneMonth = new Date(
      today.getFullYear(),
      today.getMonth() - 1,
      today.getDate(),
    );
    expect(getAgeLabel(oneMonth.toISOString())).toContain("1 mes");
  });
});
