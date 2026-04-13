"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';

interface LegalEntitySelectorProps {
  value: string;
  onChange: (name: string, details?: any) => void;
  placeholder?: string;
}

const LegalEntitySelector = ({ value, onChange, placeholder = "Sélectionner une entité..." }: LegalEntitySelectorProps) => {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [entities, setEntities] = useState<{ id: string; name: string; details: any }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchEntities = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('master_companies')
        .select('*')
        .order('raison_sociale');

      if (error) throw error;
      setEntities(data.map(item => ({ 
        id: item.id, 
        name: item.raison_sociale,
        details: item 
      })));
    } catch (error) {
      console.error("Error fetching entities:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchEntities();
  }, [open]);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleSelect = async (name: string) => {
    const existing = entities.find(e => e.name.toLowerCase() === name.toLowerCase());
    
    if (existing) {
      onChange(existing.name, existing.details);
    } else if (name.trim() !== "") {
      try {
        const { data, error } = await supabase
          .from('master_companies')
          .insert([{ raison_sociale: name }])
          .select();
        
        if (error) throw error;
        showSuccess(`"${name}" ajoutée au catalogue des entités.`);
        onChange(name, data[0]);
      } catch (err) {
        console.error("Error adding entity:", err);
      }
    }
    setOpen(false);
  };

  // Custom filtering function for strict search
  const filterFunction = useCallback((value: string, search: string) => {
    if (!search) return 1; // Show all if search is empty
    // Strict substring match (case insensitive)
    return value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn(
            "w-full h-9 justify-between bg-transparent border-0 focus-visible:ring-1 text-sm font-bold",
            !value && "bg-brand-yellow hover:bg-yellow-400"
          )}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (value || placeholder)}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command filter={filterFunction}>
          <CommandInput
            placeholder="Rechercher une entité..."
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty>
              <div
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent"
                onClick={() => handleSelect(inputValue)}
              >
                <Plus className="mr-2 h-4 w-4" /> Créer : "{inputValue}"
              </div>
            </CommandEmpty>
            <CommandGroup>
              {entities.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.name}
                  onSelect={() => handleSelect(item.name)}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === item.name ? "opacity-100" : "opacity-0")} />
                  {item.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default LegalEntitySelector;