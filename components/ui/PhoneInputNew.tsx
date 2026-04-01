"use client";

import { cn } from "@/lib/utils";
import { Input, Listbox, Transition } from "@headlessui/react";
import { format, useMask as useMaskVanilla } from "@react-input/mask";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { countryList, type CountryConfig } from "./countryList";

interface PhoneInputNewProps {
  value?: string;
  onChange?: (value: string) => void;
  name?: string;
  label?: string;
  error?: string;
}

const useMask = ({ mask }: { mask: string }) => {
  const options = useMemo(
    () => ({
      mask,
      replacement: { _: /\d/ },
    }),
    [mask],
  );

  const inputRef = useMaskVanilla(options);

  const hasEmptyMask = mask.split("").every((char) => char === "_");

  return { options, inputRef, hasEmptyMask };
};

const useCountrySelect = ({
  value,
  onChange,
  countryList,
}: {
  value: string;
  onChange: (value: string) => void;
  countryList: CountryConfig[];
}) => {
  const [selected, setSelected] = useState(value);

  useEffect(() => {
    setSelected(value);
  }, [value]);

  const handleSelect = useCallback(
    (selectedCode: string) => {
      onChange(selectedCode);
      setSelected(selectedCode);
    },
    [onChange],
  );

  const selectedFlag = useMemo(
    () => countryList.find(({ code }) => code === selected)?.flag,
    [countryList, selected],
  );

  const selectedCountry = useMemo(
    () => countryList.find(({ code }) => code === selected),
    [countryList, selected],
  );

  return { selected, handleSelect, selectedFlag, selectedCountry };
};

const useCountryFilter = (countryList: CountryConfig[]) => {
  const [filteredList, setFilteredList] = useState(countryList);

  useEffect(() => {
    setFilteredList(countryList);
  }, [countryList]);

  const [filter, setFilterState] = useState("");

  const setFilter = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setFilterState(event.target.value);
      const nextCountries = countryList.filter(({ name }) =>
        name.toLowerCase().includes(event.target.value.toLowerCase()),
      );
      if (event.target.value !== "") {
        setFilteredList(nextCountries);
      } else {
        setFilteredList(countryList);
      }
    },
    [countryList],
  );

  return { filter, setFilter, filteredList };
};

export function PhoneInputNew({
  value,
  onChange,
  name = "phone",
  label = "Teléfono *",
  error,
}: PhoneInputNewProps) {
  // Extract country code from full phone number if available
  const getInitialCountryCode = () => {
    if (!value) return "+52";
    // Check if value starts with a known country code
    for (const country of countryList) {
      if (value.startsWith(country.code)) {
        return country.code;
      }
    }
    return "+52";
  };

  const [countryCode, setCountryCode] = useState(getInitialCountryCode());
  const [phoneNumber, setPhoneNumber] = useState("");

  // Update phone number when value changes externally
  useEffect(() => {
    if (value) {
      // Remove country code from value to get just the number
      const phoneWithoutCode = countryList.reduce((acc, country) => {
        return value.startsWith(country.code)
          ? value.slice(country.code.length)
          : acc;
      }, value);
      setPhoneNumber(phoneWithoutCode);
    }
  }, [value]);

  const { selected, handleSelect, selectedFlag, selectedCountry } =
    useCountrySelect({
      value: countryCode,
      onChange: setCountryCode,
      countryList,
    });

  const { filter, setFilter, filteredList } = useCountryFilter(countryList);

  const mask = selectedCountry?.mask || "(___) ___-____";
  const { options, inputRef, hasEmptyMask } = useMask({ mask });

  const handlePhoneChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = format(event.target.value, options);
      setPhoneNumber(formatted);
      onChange?.(countryCode + formatted);
    },
    [countryCode, onChange, options],
  );

  const handleCountryCodeChange = useCallback(
    (newCode: string) => {
      handleSelect(newCode);
      // Clear phone number when country changes
      setPhoneNumber("");
      onChange?.(newCode);
    },
    [handleSelect, onChange],
  );

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm text-white font-medium">{label}</label>
      )}
      <div className="flex gap-2">
        {/* Country Code Selector */}
        <div className="w-24 shrink-0">
          <Listbox value={selected} onChange={handleCountryCodeChange}>
            <div className="relative">
              <Listbox.Button
                className={cn(
                  "relative w-full rounded-md bg-zinc-900 border-0 border-b-2 px-2 py-2.5 text-sm text-white",
                  "flex items-center gap-1",
                  "focus:outline-none focus:border-primary transition-colors",
                  error && "border-destructive",
                )}
              >
                <span className="text-lg">{selectedFlag}</span>
                <span className="ml-auto grow-0 text-sm">{selected}</span>
                <ChevronDownIcon
                  className={cn(
                    "size-3.5 shrink-0 text-muted-foreground transition-transform",
                  )}
                />
              </Listbox.Button>
              <Transition
                as={Fragment}
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Listbox.Options className="absolute z-50 mt-1 max-h-60 w-56 overflow-auto rounded-md bg-[#1e1e1e] border border-zinc-700 p-1 shadow-lg focus:outline-none">
                  {filteredList.length > 5 && (
                    <div className="border-b border-zinc-700 p-2">
                      <Input
                        value={filter}
                        onChange={setFilter}
                        placeholder="Buscar país..."
                        className={cn(
                          "w-full rounded-full bg-zinc-800 px-3 py-1.5 text-sm text-white placeholder:text-zinc-500",
                          "focus:outline-none focus:ring-1 focus:ring-primary",
                        )}
                      />
                    </div>
                  )}
                  <div className="max-h-48 overflow-auto">
                    {filteredList.length === 0 ? (
                      <div className="py-2 text-center text-sm text-zinc-400">
                        No se encontró ningún país.
                      </div>
                    ) : (
                      filteredList.map(({ code, flag, name: countryName }) => (
                        <Listbox.Option
                          key={code}
                          value={code}
                          className={({ active }) =>
                            cn(
                              "group flex cursor-pointer select-none items-center gap-2 rounded-md p-2",
                              active
                                ? "bg-orange-500/20 text-white"
                                : "text-zinc-300",
                            )
                          }
                        >
                          {({ selected }) => (
                            <>
                              <span className="text-lg">{flag}</span>
                              <div className="w-12 shrink-0 text-right text-sm tabular-nums">
                                {code}
                              </div>
                              <div className="truncate text-sm flex-1">
                                {countryName}
                              </div>
                              <CheckIcon
                                className={cn(
                                  "ml-auto size-4 shrink-0",
                                  selected
                                    ? "text-orange-500 opacity-100"
                                    : "opacity-0",
                                )}
                              />
                            </>
                          )}
                        </Listbox.Option>
                      ))
                    )}
                  </div>
                </Listbox.Options>
              </Transition>
            </div>
          </Listbox>
        </div>

        {/* Phone Number Input */}
        <div className="flex-1">
          <Input
            ref={inputRef}
            type="tel"
            name={name}
            value={phoneNumber}
            onChange={handlePhoneChange}
            placeholder={hasEmptyMask ? "Número de teléfono" : mask}
            className={cn(
              "w-full rounded-md bg-transparent border-0 border-b-2 px-0 py-2.5 h-11 text-sm tabular-nums text-white",
              "focus:outline-none focus:border-primary transition-colors placeholder:text-zinc-500",
              error && "border-destructive focus:border-destructive",
            )}
          />
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
