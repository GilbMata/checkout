import {
  extractBirthDateFromCURP,
  isTemporaryEmail,
  isValidCURP,
  isValidEmail,
} from "@/lib/curp";
import { describe, expect, it } from "vitest";

describe("lib/curp.ts", () => {
  describe("isValidCURP", () => {
    it("should accept valid CURP", () => {
      expect(isValidCURP("MAMC990101HNLRRR01")).toBe(true);
    });

    it("should accept lowercase CURP", () => {
      expect(isValidCURP("mamc990101hnlrrr01")).toBe(true);
    });

    it("should reject CURP with less than 18 characters", () => {
      expect(isValidCURP("MAMC990101")).toBe(false);
    });

    it("should reject CURP with more than 18 characters", () => {
      expect(isValidCURP("MAMC990101HNLRRR011")).toBe(false);
    });

    it("should reject CURP with invalid format", () => {
      expect(isValidCURP("INVALID1234567890")).toBe(false);
    });

    it("should reject CURP with numbers in first 4 letters", () => {
      expect(isValidCURP("12345678901234567890")).toBe(false);
    });
  });

  describe("extractBirthDateFromCURP", () => {
    it("should extract birth date from valid CURP", () => {
      const result = extractBirthDateFromCURP("MAMC990101HNLRRR01");
      expect(result).toBe("01011999");
    });

    it("should extract birth date with year 2000+", () => {
      const result = extractBirthDateFromCURP("MAMC050101HNLRRR01");
      expect(result).toBe("01012005");
    });

    it("should extract birth date with year 1900s", () => {
      const result = extractBirthDateFromCURP("MAMC850101HNLRRR01");
      expect(result).toBe("01011985");
    });

    it("should return null for invalid CURP", () => {
      expect(extractBirthDateFromCURP("INVALID")).toBeNull();
    });
  });

  describe("isTemporaryEmail", () => {
    it("should detect temporary email domains", () => {
      expect(isTemporaryEmail("test@yopmail.com")).toBe(true);
      expect(isTemporaryEmail("test@mailinator.com")).toBe(true);
      expect(isTemporaryEmail("test@tempmail.com")).toBe(true);
    });

    it("should return false for regular email domains", () => {
      expect(isTemporaryEmail("test@gmail.com")).toBe(false);
      expect(isTemporaryEmail("test@company.com")).toBe(false);
    });
  });

  describe("isValidEmail", () => {
    it("should accept valid email", () => {
      expect(isValidEmail("user@example.com")).toBe(true);
    });

    it("should reject email without @", () => {
      expect(isValidEmail("userexample.com")).toBe(false);
    });

    it("should reject email without domain", () => {
      expect(isValidEmail("user@")).toBe(false);
    });

    it("should reject temporary emails", () => {
      expect(isValidEmail("test@yopmail.com")).toBe(false);
    });
  });
});
