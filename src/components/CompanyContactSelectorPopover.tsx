"use client";

import React, { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, User } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export type SelectedContact = {
  id: string;
  nom: string;
  role: string;
};

interface CompanyContactSelectorPopoverProps {
  companyId: string;
  companyName: string;
  selectedContacts: SelectedContact[];
  onSelectionChange: (newContacts: SelectedContact[]) => void;
  children: React.ReactNode;
}

type Contact = {
  id: string;
  nom: string;
  role: string;
};

const CompanyContactSelectorPopover = ({ 
  companyId, 
  companyName, 
  selectedContacts, 
  onSelectionChange, 
  children 
}: CompanyContactSelectorPopoverProps) => {
  const [availableContacts, setAvailableContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen && companyId) {
      fetchContacts();
    }
  }, [isOpen, companyId]);

  const fetchContacts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('company_contacts')
        .select('id, nom_contact, role')
        .eq('company_id', companyId);

      if (error) throw error;

      const fetchedContacts: Contact[] = data.map(item => ({
        id: item.id,
        nom: item.nom_contact || 'N/A',
        role: item.role || '',
      }));
      setAvailableContacts(fetchedContacts);
    } catch (error: any) {
      console.error("Error fetching contacts:", error);
      showError("Erreur lors du chargement des contacts.");
      setAvailableContacts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const isContactSelected = (contactId: string) => {
    return selectedContacts.some(c => c.id === contactId);
  };

  const handleToggleContact = (contact: Contact, isChecked: boolean) => {
    let newSelection: SelectedContact[];
    if (isChecked) {
      newSelection = [...selectedContacts, { id: contact.id, nom: contact.nom, role: contact.role }];
    } else {
      newSelection = selectedContacts.filter(c => c.id !== contact.id);
    }
    onSelectionChange(newSelection);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2 bg-white shadow-lg border border-gray-200 z-[100]">
        <h4 className="font-bold text-sm mb-2 border-b pb-1 truncate" title={companyName}>
          Contacts présents
        </h4>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-brand-yellow" />
          </div>
        ) : availableContacts.length === 0 ? (
          <p className="text-xs text-muted-foreground p-2">
            Aucun contact enregistré.
          </p>
        ) : (
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {availableContacts.map((contact) => (
              <div 
                key={contact.id} 
                className={cn(
                  "flex items-center justify-between p-1 rounded-md cursor-pointer",
                  isContactSelected(contact.id) ? "bg-brand-yellow/50" : "hover:bg-gray-100"
                )}
                onClick={() => handleToggleContact(contact, !isContactSelected(contact.id))}
              >
                <div className="flex items-center text-xs">
                  <User className="h-3 w-3 mr-2 text-blue-600" />
                  {contact.nom}
                </div>
                <Checkbox 
                  checked={isContactSelected(contact.id)}
                  onCheckedChange={(checked) => handleToggleContact(contact, !!checked)}
                  onClick={(e) => e.stopPropagation()} 
                />
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default CompanyContactSelectorPopover;