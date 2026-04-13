"use client";

import React, { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface MissionComboboxProps {
  value: string;
  onChange: (value: string) => void;
  projectId: string;
  disabled?: boolean;
}

const MissionCombobox: React.FC<MissionComboboxProps> = ({
  value,
  onChange,
  projectId,
  disabled,
}) => {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [missions, setMissions] = useState<{ value: string; label: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMissions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("master_missions")
        .select("mission_name")
        .order("mission_name");

      if (error) throw error;
      setMissions(data.map((m) => ({ value: m.mission_name, label: m.mission_name })));
    } catch (err) {
      console.error("Error fetching master_missions:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchMissions();
  }, [open]);

  const handleSelect = async (newValue: string) => {
    // On assure juste que la mission existe dans le catalogue maître
    await supabase
      .from("master_missions")
      .upsert({ mission_name: newValue }, { onConflict: "mission_name" });

    // On délègue la sauvegarde de l'ID au parent (MissionRowEditor)
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
          className={cn(
            "h-8 justify-between bg-white border-brand-gray text-xs font-normal min-w-[150px] p-2",
            !value && "bg-brand-yellow hover:bg-yellow-400"
          )}
          disabled={disabled || isLoading}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (value || "Choisir une mission...")}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput
            placeholder="Rechercher ou saisir..."
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty>
              <div
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent"
                onClick={() => handleSelect(inputValue)}
              >
                Ajouter au catalogue : "{inputValue}"
              </div>
            </CommandEmpty>
            <CommandGroup>
              {missions.map((item) => (
                <CommandItem
                  key={item.value}
                  value={item.value}
                  onSelect={(currentValue) => handleSelect(currentValue)}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === item.value ? "opacity-100" : "opacity-0")} />
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

export default MissionCombobox;