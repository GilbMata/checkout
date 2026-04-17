import {
  extractDomain,
  isDisposableDomain,
  validateEmail,
  validateEmailBulk,
} from "@/lib/email-validation";
import { describe, expect, it } from "vitest";

describe("lib/email-validation.ts", () => {
  describe("validateEmail", () => {
    it("should parse valid email format", () => {
      const result = validateEmail("user@example.com");
      expect(result.domain).toBe("example.com");
      expect(result.email).toBe("user@example.com");
    });

    it("should detect disposable email", () => {
      const result = validateEmail("test@yopmail.com");
      expect(result.isDisposable).toBe(true);
      expect(result.valid).toBe(false);
    });

    it("should reject email without domain", () => {
      const result = validateEmail("invalid");
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("Invalid email format");
    });

    it("should handle email with no @", () => {
      const result = validateEmail("userexample.com");
      expect(result.valid).toBe(false);
    });
  });

  describe("isDisposableDomain", () => {
    it("should detect disposable domain", () => {
      expect(isDisposableDomain("yopmail.com")).toBe(true);
      expect(isDisposableDomain("mailinator.com")).toBe(true);
    });

    it("should return false for regular domains", () => {
      expect(isDisposableDomain("gmail.com")).toBe(false);
      expect(isDisposableDomain("company.com")).toBe(false);
    });

    it("should be case insensitive", () => {
      expect(isDisposableDomain("YOPMAIL.COM")).toBe(true);
    });
  });

  describe("validateEmailBulk", () => {
    it("should validate multiple emails", () => {
      const results = validateEmailBulk([
        "user@gmail.com",
        "test@yopmail.com",
        "invalid",
      ]);
      expect(results).toHaveLength(3);
      expect(results[0].valid).toBe(true);
      expect(results[1].isDisposable).toBe(true);
      expect(results[2].valid).toBe(false);
    });
  });

  describe("extractDomain", () => {
    it("should extract domain from email", () => {
      expect(extractDomain("user@example.com")).toBe("example.com");
    });

    it("should be case insensitive", () => {
      expect(extractDomain("USER@EXAMPLE.COM")).toBe("example.com");
    });

    it("should return empty string for invalid email", () => {
      expect(extractDomain("invalid")).toBe("");
    });
  });
});
