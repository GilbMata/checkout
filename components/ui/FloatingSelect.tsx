import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

export function FloatingSelect({
    value,
    onChange,
    label,
    children
}: any) {

    return (
        <div className="relative w-full">

            <Select
                value={value}
                onValueChange={onChange}
            >
                <SelectTrigger className="w-full h-12 border-0 border-b-2 rounded-none">
                    <SelectValue placeholder=" " />
                </SelectTrigger>

                <SelectContent>
                    {children}
                </SelectContent>
            </Select>

            <Label className="absolute text-sm -top-3 left-0 scale-75 text-muted-foreground">
                {label}
            </Label>

        </div>
    )
}