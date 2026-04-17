import { buttonVariants } from "@/components/ui/button";
import { describe, expect, it } from "vitest";

describe("buttonVariants", () => {
  describe("variants", () => {
    it("should have default variant classes", () => {
      const classes = buttonVariants({ variant: "default" });
      expect(classes).toContain("bg-primary");
    });

    it("should have outline variant classes", () => {
      const classes = buttonVariants({ variant: "outline" });
      expect(classes).toContain("border-border");
      expect(classes).toContain("bg-background");
    });

    it("should have secondary variant classes", () => {
      const classes = buttonVariants({ variant: "secondary" });
      expect(classes).toContain("bg-secondary");
    });

    it("should have destructive variant classes", () => {
      const classes = buttonVariants({ variant: "destructive" });
      expect(classes).toContain("bg-destructive");
      expect(classes).toContain("text-destructive");
    });

    it("should have ghost variant classes", () => {
      const classes = buttonVariants({ variant: "ghost" });
      expect(classes).toContain("hover:bg-muted");
    });

    it("should have link variant classes", () => {
      const classes = buttonVariants({ variant: "link" });
      expect(classes).toContain("text-primary");
      expect(classes).toContain("underline-offset-4");
    });
  });

  describe("sizes", () => {
    it("should have default size classes", () => {
      const classes = buttonVariants({ size: "default" });
      expect(classes).toContain("h-8");
    });

    it("should have xs size classes", () => {
      const classes = buttonVariants({ size: "xs" });
      expect(classes).toContain("h-6");
    });

    it("should have sm size classes", () => {
      const classes = buttonVariants({ size: "sm" });
      expect(classes).toContain("h-7");
    });

    it("should have lg size classes", () => {
      const classes = buttonVariants({ size: "lg" });
      expect(classes).toContain("h-9");
    });

    it("should have icon size classes", () => {
      const classes = buttonVariants({ size: "icon" });
      expect(classes).toContain("size-8");
    });

    it("should have icon-xs size classes", () => {
      const classes = buttonVariants({ size: "icon-xs" });
      expect(classes).toContain("size-6");
    });

    it("should have icon-sm size classes", () => {
      const classes = buttonVariants({ size: "icon-sm" });
      expect(classes).toContain("size-7");
    });

    it("should have icon-lg size classes", () => {
      const classes = buttonVariants({ size: "icon-lg" });
      expect(classes).toContain("size-9");
    });
  });

  describe("default values", () => {
    it("should use default variant and size when not specified", () => {
      const classes = buttonVariants({});
      expect(classes).toContain("bg-primary");
      expect(classes).toContain("h-8");
    });
  });

  describe("with className", () => {
    it("should merge custom className", () => {
      const classes = buttonVariants({ className: "custom-class" });
      expect(classes).toContain("custom-class");
    });
  });
});
