"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from '@/lib/utils';
import { CompanyRow } from './CompanyListingTable';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

interface MissionContactComboboxProps {
  value: string; // Current contact name
  onChange: (value: string) => void;
  selectedCompanyName: string;
  companies: CompanyRow[];
  disabled?: boolean;
}

type Contact = {
  id: string;
  nom_contact: string;
};

const MissionContactCombobox: React.FC<MissionContactComboboxProps> = ({ value, onChange, selectedCompanyName, companies, disabled }) => {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [availableContacts, setAvailableContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const selectedCompany = companies.find(c => c.raison_sociale === selectedCompanyName);
  const companyId = selectedCompany?.id;

  const fetchContacts = useCallback(async () => {
    if (!companyId) {
      setAvailableContacts([]);
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('company_contacts')
        .select('id, nom_contact')
        .eq('company_id', companyId);

      if (error) throw error;

      setAvailableContacts(data as Contact[]);
    } catch (error: any) {
      console.error("Error fetching company contacts for mission:", error);
      showError("Erreur lors du chargement des contacts d'entreprise.");
      setAvailableContacts([]);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (open && companyId) {
      fetchContacts();
    }
  }, [open, companyId, fetchContacts]);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleSelect = (contactName: string) => {
    onChange(contactName);
    setInputValue(contactName);
    setOpen(false);
  };

  const options = availableContacts.map(c => ({
    value: c.nom_contact,
    label: c.nom_contact,
  }));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full h-8 justify-between bg-white border-brand-gray focus-visible:ring-1 focus-visible:ring-slate-400 text-xs font-normal min-w-[150px] p-1",
            value ? "bg-white hover:bg-gray-100" : "bg-brand-yellow hover:bg-yellow-400"
          )}
          disabled={disabled || !companyId || isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : value ? (
            value
          ) : (
            "Sélectionner un contact..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput
            placeholder="Rechercher ou saisir..."
            value={inputValue}
            onValueChange={setInputValue}
            disabled={disabled}
          />
          <CommandList>
            <CommandEmpty>
              {/* Allow creating a new contact name if no company is selected or if the name doesn't exist */}
              <div
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent"
                onClick={() => handleSelect(inputValue)}
              >
                Créer/Saisir : "{inputValue}"
              </div>
            </CommandEmpty>
            <CommandGroup>
              {options.map((item) => (
                <CommandItem
                  key={item.value}
                  value={item.value}
                  onSelect={(currentValue) => {
                    handleSelect(currentValue);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === item.value ? "opacity-100" : "opacity-0"
                    )}
                  />
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

export default MissionContactCombobox;