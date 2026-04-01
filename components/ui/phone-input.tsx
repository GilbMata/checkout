import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { CheckIcon, ChevronDown, Phone } from "lucide-react";
import * as React from "react";
import * as RPNInput from "react-phone-number-input";
import flags from "react-phone-number-input/flags";

type PhoneInputProps = Omit<
  React.ComponentProps<"input">,
  "onChange" | "value" | "ref"
> &
  Omit<RPNInput.Props<typeof RPNInput.default>, "onChange"> & {
    onChange?: (value: RPNInput.Value) => void;
  };

const PhoneInput: React.ForwardRefExoticComponent<PhoneInputProps> =
  React.forwardRef<React.ElementRef<typeof RPNInput.default>, PhoneInputProps>(
    ({ className, onChange, value, ...props }, ref) => {
      return (
        <div className={cn("relative w-full", className)}>
          <RPNInput.default
            international
            defaultCountry="MX"
            ref={ref}
            className="flex items-center w-full"
            flagComponent={FlagComponent}
            countrySelectComponent={CountrySelect}
            inputComponent={InputComponent}
            smartCaret={false}
            value={value || undefined}
            /**
             * Handles the onChange event.
             *
             * react-phone-number-input might trigger the onChange event as undefined
             * when a valid phone number is not entered. To prevent this,
             * the value is coerced to an empty string.
             *
             * @param {E164Number | undefined} value - The entered value
             */
            onChange={(value) => onChange?.(value || ("" as RPNInput.Value))}
            {...props}
          />
          {/* Phone icon indicator */}
          <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
      );
    },
  );
PhoneInput.displayName = "PhoneInput";

const InputComponent = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(({ className, value, ...props }, ref) => {
  const [isFocused, setIsFocused] = React.useState(false);
  const stringValue = typeof value === "string" ? value : "";
  const hasValue = stringValue.length > 0;

  return (
    <div className="relative w-full">
      {/* Input field */}
      <input
        ref={ref}
        {...props}
        value={value}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={cn(
          "peer w-full text-white border-0 border-b-2 bg-transparent px-0 py-3 h-11 text-sm outline-none transition-all placeholder:text-transparent",
          "border-muted-foreground/30 focus:border-primary",
          className,
        )}
        placeholder=" "
        autoComplete="tel"
      />

      {/* Floating label */}
      <label
        className={cn(
          "absolute left-0 transition-all duration-200 text-white cursor-text",
          hasValue || isFocused
            ? "-top-2 text-xs text-primary"
            : "top-3 text-sm text-muted-foreground",
          "peer-focus:-top-2 peer-focus:text-xs peer-focus:text-primary",
        )}
      >
        Teléfono *
      </label>

      {/* Pattern hint */}
      {hasValue && !isFocused && (
        <span className="absolute right-0 -bottom-5 text-xs text-muted-foreground/60">
          Formato: (XXX) XXX-XXXX
        </span>
      )}
    </div>
  );
});
InputComponent.displayName = "InputComponent";

type CountryEntry = { label: string; value: RPNInput.Country | undefined };

type CountrySelectProps = {
  disabled?: boolean;
  value: RPNInput.Country;
  options: CountryEntry[];
  onChange: (country: RPNInput.Country) => void;
};

const CountrySelect = ({
  disabled,
  value: selectedCountry,
  options: countryList,
  onChange,
}: CountrySelectProps) => {
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const [searchValue, setSearchValue] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Popover
      open={isOpen}
      modal
      onOpenChange={(open) => {
        setIsOpen(open);
        open && setSearchValue("");
      }}
    >
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className="
              flex items-center gap-1
              h-11 min-w-[70px]
              border-0 border-b-2 rounded-none
              bg-transparent px-2
              hover:bg-transparent hover:border-primary
              transition-all duration-200
            "
            disabled={disabled}
          >
            <FlagComponent
              country={selectedCountry}
              countryName={selectedCountry}
            />
            <span className="text-white text-sm font-medium">
              +{RPNInput.getCountryCallingCode(selectedCountry)}
            </span>
            <ChevronDown
              className={cn(
                "size-3 text-muted-foreground transition-transform",
                isOpen && "rotate-180",
                disabled ? "hidden" : "",
              )}
            />
          </Button>
        }
      />
      <PopoverContent className="w-80 p-0 bg-[#1e1e1e] border-zinc-700">
        <Command className="bg-[#1e1e1e]">
          <CommandInput
            value={searchValue}
            onValueChange={(value) => {
              setSearchValue(value);
              setTimeout(() => {
                if (scrollAreaRef.current) {
                  const viewportElement = scrollAreaRef.current.querySelector(
                    "[data-radix-scroll-area-viewport]",
                  );
                  if (viewportElement) {
                    viewportElement.scrollTop = 0;
                  }
                }
              }, 0);
            }}
            placeholder="Buscar país..."
            className="border-b border-zinc-700"
          />
          <CommandList>
            <ScrollArea ref={scrollAreaRef} className="h-72">
              <CommandEmpty className="text-zinc-400">
                No se encontró ningún país.
              </CommandEmpty>
              <CommandGroup>
                {countryList.map(({ value, label }) =>
                  value ? (
                    <CountrySelectOption
                      key={value}
                      country={value}
                      countryName={label}
                      selectedCountry={selectedCountry}
                      onChange={onChange}
                      onSelectComplete={() => setIsOpen(false)}
                    />
                  ) : null,
                )}
              </CommandGroup>
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

interface CountrySelectOptionProps extends RPNInput.FlagProps {
  selectedCountry: RPNInput.Country;
  onChange: (country: RPNInput.Country) => void;
  onSelectComplete: () => void;
}

const CountrySelectOption = ({
  country,
  countryName,
  selectedCountry,
  onChange,
  onSelectComplete,
}: CountrySelectOptionProps) => {
  const handleSelect = () => {
    onChange(country);
    onSelectComplete();
  };

  return (
    <CommandItem
      className="gap-2 cursor-pointer hover:bg-zinc-700! data-[selected=true]:bg-orange-500/20"
      onSelect={handleSelect}
    >
      <FlagComponent country={country} countryName={countryName} />
      <span className="flex-1 text-sm text-white">{countryName}</span>
      <span className="text-sm text-zinc-400">{`+${RPNInput.getCountryCallingCode(country)}`}</span>
      <CheckIcon
        className={`ml-auto size-4 ${country === selectedCountry ? "text-orange-500 opacity-100" : "opacity-0"}`}
      />
    </CommandItem>
  );
};

const FlagComponent = ({ country, countryName }: RPNInput.FlagProps) => {
  const Flag = flags[country];

  return (
    <span className="flex  w-6 overflow-hidden bg-foreground/20 [&_svg:not([class*='size-'])]:size-full">
      {Flag && <Flag title={countryName} />}
    </span>
  );
};

export { PhoneInput };
