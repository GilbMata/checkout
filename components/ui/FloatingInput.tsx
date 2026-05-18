"use client";

import { cn } from "@/lib/utils";
import * as React from "react";
import { get, useFormContext } from "react-hook-form";

interface FloatingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name?: string;
  icon?: React.ReactNode;
  error?: string;
  classNameL?: string;
}

const FloatingInput = React.forwardRef<HTMLInputElement, FloatingInputProps>(
  (
    {
      label,
      name,
      icon,
      className,
      classNameL,
      value: externalValue,
      error: externalError,
      ...props
    },
    ref,
  ) => {
    const { formState, getValues } = useFormContext();

    // Obtener error automáticamente del form o usar el externo
    const formError = name ? get(formState.errors, name) : null;
    const error = externalError || formError;

    // Obtener valor del form si tiene name, sino usar valor externo
    const internalValue = name ? getValues(name) : externalValue;
    const hasValue = internalValue !== undefined && internalValue !== "" && internalValue !== null;

    return (
      <div className="relative w-full">
        {/* Input */}
        <input
          ref={ref}
          name={name}
          value={internalValue ?? ""}
          {...props}
          aria-invalid={!!error}
          className={cn(
            "peer w-full text-white border-0 border-b-2 bg-transparent px-0 py-3 h-11 text-sm outline-none transition-all",
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

        {/* Label */}
        <label
          className={cn(
            "absolute left-0 transition-all duration-200 text-white",
            hasValue
              ? name == "phone"
                ? "-top-2 -left-12 text-xs"
                : "-top-2 text-xs"
              : "top-3 text-sm text-muted-foreground",
            "peer-focus:-top-2 peer-focus:text-xs",
            error ? "text-destructive" : "peer-focus:text-primary",
            classNameL,
          )}
        >
          {label}
        </label>

        {/* Error message inline (opcional) */}
        {error?.message && (
          <p className="mt-1 text-xs text-destructive">
            {String(error.message)}
          </p>
        )}
      </div>
    );
  },
);

FloatingInput.displayName = "FloatingInput";

export { FloatingInput };
