"use client";

import { cn } from "@/lib/utils";
import * as React from "react";

export interface FloatingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: React.ReactNode;
}

const FloatingInput = React.forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ label, error, icon, className, ...props }, ref) => {
    const hasValue = props.value && props.value !== "";
    return (
      <div className="relative w-full">
        {/* Input */}
        <input
          ref={ref}
          {...props}
          // placeholder="‎"
          aria-invalid={!!error}
          className={cn(
            "peer w-full text-white border-0 border-b-2 bg-transparent px-0 py-3 text-sm outline-none",
            error
              ? "border-destructive focus:border-destructive"
              : "border-muted-foreground/30 focus:border-primary",
            className,
          )}
        />

        {/* Icon */}
        {icon && (
          <div className="absolute left-0 top-3 text-muted-foreground">
            {icon}
          </div>
        )}

        {/* Floating Label */}
        <label
          className={cn(
            "absolute left-0 transition-all duration-200 ease-in-out  focus:shadow-[0_0_0_1px_rgba(249,115,22,0.5)]",
            hasValue ? "-top-2 text-xs" : "top-4 text-sm text-muted-foreground",
            "peer-focus:-top-2 peer-focus:text-xs",
            error
              ? "text-destructive"
              : "text-muted-foreground peer-focus:text-primary",
          )}
        >
          {label}
        </label>
        {/* <label
          className={cn(
            "absolute left-0 top-3 text-sm transition-all ",
            "peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:text-muted-foreground",
            "peer-focus:-top-2 peer-focus:text-xs",
            "peer-not-placeholder-shown:-top-2 peer-not-placeholder-shown:text-xs",
            error
              ? "text-destructive!"
              : "text-muted-foreground peer-focus:text-primary",
          )}
        >
          {label}
        </label> */}

        {/* Línea animada */}
        {/* <span
          className={cn(
            "absolute bottom-0 left-0 h-0.5 w-full origin-left scale-x-0 transition-transform duration-300",
            error ? "bg-destructive" : "bg-primary",
            "peer-focus:scale-x-100"
          )}
        /> */}

        {/* Error */}
        {error && (
          <p className="mt-1 text-xs text-destructive animate-in fade-in slide-in-from-top-1">
            {error}
          </p>
        )}
      </div>
    );
  },
);

FloatingInput.displayName = "FloatingInput";

export { FloatingInput };
