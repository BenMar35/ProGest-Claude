"use client";

import React, { useState, useEffect } from 'react';
import { ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from '@/lib/utils';

interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const defaultWorkItems = [
  { value: "installation chantier", label: "Installation chantier" },
  { value: "travaux 01", label: "Travaux 01" },
  { value: "travaux 02", label: "Travaux 02" },
];

const EstimationCombobox: React.FC<ComboboxProps> = ({ value, onChange, disabled }) => {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    if (open) {
      setInputValue(value);
    }
  }, [open, value]);

  const handleSelect = (newValue: string) => {
    onChange(newValue);
    setInputValue(newValue);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full h-7 justify-between bg-transparent border-0 focus-visible:ring-1 focus-visible:ring-slate-400 text-xs font-normal min-w-[150px]"
          disabled={disabled}
        >
          {value
            ? defaultWorkItems.find((item) => item.value === value)?.label || value
            : "Sélectionner ou saisir..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0">
        <Command>
          <CommandInput
            placeholder="Rechercher ou créer..."
            value={inputValue}
            onValueChange={setInputValue}
            disabled={disabled}
          />
          <CommandList>
            <CommandEmpty>
              <div
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent"
                onClick={() => handleSelect(inputValue)}
              >
                Créer : "{inputValue}"
              </div>
            </CommandEmpty>
            <CommandGroup>
              {defaultWorkItems.map((item) => (
                <CommandItem
                  key={item.value}
                  value={item.value}
                  onSelect={(currentValue) => {
                    handleSelect(currentValue);
                  }}
                >
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default EstimationCombobox;