"use client";

import React, { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Loader2, User, Mail, Phone } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { CompanyRow } from './CompanyListingTable';
import { cn } from '@/lib/utils';

interface CompanyContactPopoverProps {
  company: CompanyRow;
  children: React.ReactNode;
}

type Contact = {
  id: string;
  nom: string;
  role: string;
  email: string;
  portable: string;
};

const CompanyContactPopover = ({ company, children }: CompanyContactPopoverProps) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen && company.id) {
      fetchContacts();
    }
  }, [isOpen, company.id]);

  const fetchContacts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('company_contacts')
        .select('id, nom_contact, role, email, portable')
        .eq('company_id', company.id);

      if (error) throw error;

      const fetchedContacts: Contact[] = data.map(item => ({
        id: item.id,
        nom: item.nom_contact || 'N/A',
        role: item.role || '',
        email: item.email || 'N/A',
        portable: item.portable || 'N/A',
      }));
      setContacts(fetchedContacts);
    } catch (error: any) {
      console.error("Error fetching contacts for popover:", error);
      showError("Erreur lors du chargement des contacts.");
      setContacts([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {/* The trigger is the Raison Sociale cell content */}
        <div className="cursor-pointer h-full w-full flex items-center p-0">
          {children}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2 bg-white shadow-lg border border-gray-200">
        <h4 className="font-bold text-sm mb-2 border-b pb-1 truncate" title={company.raison_sociale}>
          Contacts: {company.raison_sociale}
        </h4>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-brand-yellow" />
          </div>
        ) : contacts.length === 0 ? (
          <p className="text-xs text-muted-foreground p-2">
            Aucun contact enregistré.
          </p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {contacts.map((contact) => (
              <div key={contact.id} className="p-2 border rounded-md bg-brand-cream-light text-xs">
                <div className="flex items-center font-semibold mb-1">
                  <User className="h-3 w-3 mr-1 text-blue-600" />
                  {contact.nom}
                  {contact.role && <span className="ml-2 text-gray-500 font-normal italic">({contact.role})</span>}
                </div>
                <div className="flex flex-col space-y-0.5">
                  {contact.portable && (
                    <a href={`tel:${contact.portable}`} className="flex items-center text-gray-700 hover:text-black">
                      <Phone className="h-3 w-3 mr-1" />
                      {contact.portable}
                    </a>
                  )}
                  {contact.email && (
                    <a href={`mailto:${contact.email}`} className="flex items-center text-gray-700 hover:text-black truncate">
                      <Mail className="h-3 w-3 mr-1" />
                      {contact.email}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-2 pt-2 border-t">
          <Button 
            variant="link" 
            size="sm" 
            className="h-6 text-xs p-0 text-blue-600"
            onClick={() => {
              setIsOpen(false);
              // Note: We cannot directly open the CompanyContactManager from here 
              // as it's managed by the parent (CompanyListingTable). 
              // We'll rely on the user opening the main Stakeholders dialog.
              showError("Veuillez utiliser l'icône 'Utilisateurs' dans la colonne 'Contacts' pour gérer les contacts.");
            }}
          >
            Gérer les contacts (via l'icône)
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default CompanyContactPopover;