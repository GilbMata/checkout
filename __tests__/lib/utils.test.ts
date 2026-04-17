import { cn } from "@/lib/utils";
import { describe, expect, it } from "vitest";

describe("cn utility", () => {
  it("should merge class names correctly", () => {
    const result = cn("class1", "class2");
    expect(result).toBe("class1 class2");
  });

  it("should handle conditional classes", () => {
    const isActive = true;
    const result = cn("base", isActive && "active");
    expect(result).toBe("base active");
  });

  it("should handle falsy values", () => {
    const result = cn("base", false && "hidden", null, undefined);
    expect(result).toBe("base");
  });

  it("should merge tailwind classes with tailwind-merge", () => {
    const result = cn("px-2 px-4", "py-1 py-2");
    expect(result).toBe("px-4 py-2");
  });
});
