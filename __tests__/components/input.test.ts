import { cn } from "@/lib/utils";
import { describe, expect, it } from "vitest";

describe("Input component classes", () => {
  it("should have base input classes", () => {
    const baseClasses =
      "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none";
    expect(baseClasses).toContain("h-8");
    expect(baseClasses).toContain("border-input");
    expect(baseClasses).toContain("rounded-lg");
  });

  it("should have focus-visible classes", () => {
    const focusClasses =
      "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
    expect(focusClasses).toContain("focus-visible:ring-3");
  });

  it("should have disabled classes", () => {
    const disabledClasses =
      "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50";
    expect(disabledClasses).toContain("disabled:pointer-events-none");
    expect(disabledClasses).toContain("disabled:opacity-50");
  });

  it("should have invalid classes", () => {
    const invalidClasses =
      "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20";
    expect(invalidClasses).toContain("aria-invalid:border-destructive");
  });

  it("should merge className correctly using cn", () => {
    const result = cn(
      "h-8 w-full min-w-0 rounded-lg border border-input",
      "custom-class",
    );
    expect(result).toContain("custom-class");
  });
});
