"use client";

import React, { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';

interface ContactSmartSelectorProps {
  companyName: string;
  value: string;
  onChange: (name: string, details?: any) => void;
  disabled?: boolean;
}

const ContactSmartSelector = ({ companyName, value, onChange, disabled }: ContactSmartSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const fetchContacts = async () => {
    if (!companyName) return;
    setIsLoading(true);
    try {
      const { data: companyData } = await supabase
        .from('master_companies')
        .select('id')
        .eq('raison_sociale', companyName)
        .maybeSingle();

      if (companyData) {
        const { data, error } = await supabase
          .from('master_company_contacts')
          .select('*')
          .eq('master_company_id', companyData.id)
          .order('nom_contact');

        if (error) throw error;
        setContacts(data || []);
      } else {
        setContacts([]);
      }
    } catch (error) {
      console.error("Error fetching unified contacts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchContacts();
  }, [open, companyName]);

  const handleSelect = async (name: string) => {
    // Si on clique sur un contact existant
    const existing = contacts.find(c => c.nom_contact && c.nom_contact.toLowerCase() === name.toLowerCase());
    
    if (existing) {
      onChange(existing.nom_contact, existing);
      setOpen(false);
      return;
    }

    // Sinon, création d'un nouveau contact
    if (name.trim() !== "" && companyName) {
      setIsLoading(true);
      try {
        const { data: comp } = await supabase
          .from('master_companies')
          .select('id')
          .eq('raison_sociale', companyName)
          .maybeSingle();
          
        if (!comp) {
            showError("L'entreprise n'existe pas dans l'annuaire.");
            return;
        }

        const { data, error } = await supabase
          .from('master_company_contacts')
          .insert([{ nom_contact: name, master_company_id: comp.id }])
          .select();
          
        if (error) throw error;
        if (data) {
          showSuccess(`Nouveau contact "${name}" ajouté.`);
          setContacts(prev => [...prev, data[0]]);
          onChange(name, data[0]);
          setOpen(false);
        }
      } catch (err) {
        showError("Erreur de création du contact.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full h-8 justify-between bg-white border-brand-gray text-xs font-normal",
            !value && "bg-brand-yellow hover:bg-yellow-400"
          )}
        >
          {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : (value || "Choisir un contact...")}
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
        <Command>
          <CommandInput 
            placeholder="Chercher un contact..." 
            value={inputValue} 
            onValueChange={setInputValue} 
          />
          <CommandList>
            <CommandEmpty className="p-0">
                <Button 
                    variant="ghost" 
                    className="w-full justify-start text-xs h-9 px-2 rounded-none hover:bg-brand-yellow" 
                    onClick={() => handleSelect(inputValue)}
                >
                    <UserPlus className="h-3 w-3 mr-2" /> Créer : "{inputValue}"
                </Button>
            </CommandEmpty>
            <CommandGroup>
              {contacts.map((c) => (
                <CommandItem 
                    key={c.id} 
                    value={c.nom_contact} 
                    onSelect={() => handleSelect(c.nom_contact)}
                    className="text-xs"
                >
                  <Check className={cn("mr-2 h-3 w-3", value === c.nom_contact ? "opacity-100" : "opacity-0")} />
                  <div className="flex flex-col">
                    <span>{c.nom_contact}</span>
                    {c.role && <span className="text-[9px] text-muted-foreground">{c.role}</span>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default ContactSmartSelector;