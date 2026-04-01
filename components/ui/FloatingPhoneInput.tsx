import * as React from "react"
import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PatternFormat, NumberFormatValues } from "react-number-format"
import { cn } from "@/lib/utils"
import { Control, FieldPath, FieldValues } from "react-hook-form"

interface FloatingPhoneInputProps<T extends FieldValues> {
    control: Control<T>
    name: FieldPath<T>
    label: string
}

export function FloatingPhoneInput<T extends FieldValues>({
    control,
    name,
    label
}: FloatingPhoneInputProps<T>) {

    return (
        <FormField
            control={control}
            name={name}
            render={({ field, fieldState }) => (

                <FormItem>

                    <FormControl>

                        <div className="group relative w-full">

                            {/* Prefijo país */}
                            <div className="absolute left-0 top-0 h-12 flex items-center px-3 text-sm text-muted-foreground border-b-2 border-muted">
                                +52
                            </div>

                            <PatternFormat
                                customInput={Input}
                                format="(##) #### ####"
                                mask="_"
                                allowEmptyFormatting
                                value={field.value ?? ""}
                                onValueChange={(v: NumberFormatValues) =>
                                    field.onChange(v.value)
                                }
                                placeholder=" "
                                className={cn(
                                    "peer block w-full border-0 border-b-2 bg-transparent px-0 py-2.5 pl-12 text-sm transition-all",
                                    "focus:outline-none focus:ring-0 rounded-none",
                                    fieldState.error
                                        ? "border-destructive focus:border-destructive"
                                        : "border-muted focus:border-primary"
                                )}
                            />

                            {/* Label flotante */}
                            <Label
                                className={cn(
                                    "absolute left-12 top-3 -z-10 origin-left -translate-y-6 scale-75 transform text-sm duration-300",
                                    "peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100",
                                    "peer-focus:-translate-y-6 peer-focus:scale-75",
                                    fieldState.error
                                        ? "text-destructive"
                                        : "text-muted-foreground peer-focus:text-primary"
                                )}
                            >
                                {label}
                            </Label>

                        </div>

                    </FormControl>

                    <FormMessage />

                </FormItem>

            )}
        />
    )
}