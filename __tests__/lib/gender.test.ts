import {
  genderFromEvo,
  genderLabel,
  genderToEvo,
  normalizeGender,
} from "@/lib/gender";
import { describe, expect, it } from "vitest";

describe("lib/gender.ts", () => {
  describe("normalizeGender", () => {
    it("should normalize male variants", () => {
      expect(normalizeGender("male")).toBe("male");
      expect(normalizeGender("Masculino")).toBe("male");
      expect(normalizeGender("HOMBRE")).toBe("male");
    });

    it("should normalize female variants", () => {
      expect(normalizeGender("female")).toBe("female");
      expect(normalizeGender("Femenino")).toBe("female");
      expect(normalizeGender("MUJER")).toBe("female");
    });

    it("should normalize other variants", () => {
      expect(normalizeGender("other")).toBe("other");
      expect(normalizeGender("Prefiero no decir")).toBe("other");
      expect(normalizeGender("No binario")).toBe("other");
    });

    it("should return null for unknown values", () => {
      expect(normalizeGender("unknown")).toBeNull();
      expect(normalizeGender("")).toBeNull();
      expect(normalizeGender(null)).toBeNull();
      expect(normalizeGender(undefined)).toBeNull();
    });
  });

  describe("genderToEvo", () => {
    it("should map canonical values to Evo format", () => {
      expect(genderToEvo("male")).toBe("M");
      expect(genderToEvo("female")).toBe("F");
      expect(genderToEvo("other")).toBe("P");
    });

    it("should normalize input before mapping", () => {
      expect(genderToEvo("Masculino")).toBe("M");
      expect(genderToEvo("Femenino")).toBe("F");
    });

    it("should return undefined for missing or unknown values", () => {
      expect(genderToEvo(null)).toBeUndefined();
      expect(genderToEvo(undefined)).toBeUndefined();
      expect(genderToEvo("unknown")).toBeUndefined();
    });
  });

  describe("genderFromEvo", () => {
    it("should map Evo M/F to canonical values", () => {
      expect(genderFromEvo("M")).toBe("male");
      expect(genderFromEvo("F")).toBe("female");
    });

    it("should handle full words from Evo", () => {
      expect(genderFromEvo("Male")).toBe("male");
      expect(genderFromEvo("Female")).toBe("female");
      expect(genderFromEvo("Masculino")).toBe("male");
      expect(genderFromEvo("Femenino")).toBe("female");
    });

    it("should return null for missing or unknown values", () => {
      expect(genderFromEvo(null)).toBeNull();
      expect(genderFromEvo(undefined)).toBeNull();
      expect(genderFromEvo("P")).toBeNull();
      expect(genderFromEvo("X")).toBeNull();
    });
  });

  describe("genderLabel", () => {
    it("should return Spanish labels for canonical values", () => {
      expect(genderLabel("male")).toBe("Hombre");
      expect(genderLabel("female")).toBe("Mujer");
      expect(genderLabel("other")).toBe("Prefiero no decir");
    });

    it("should normalize input before labeling", () => {
      expect(genderLabel("Masculino")).toBe("Hombre");
      expect(genderLabel("Femenino")).toBe("Mujer");
    });

    it("should return original value for unknown inputs", () => {
      expect(genderLabel("unknown")).toBe("unknown");
      expect(genderLabel("")).toBe("");
      expect(genderLabel(null)).toBe("");
    });
  });
});
