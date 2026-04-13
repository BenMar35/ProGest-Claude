"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { StakeholderCompany, CompanyContact } from './StakeholderCompanyTable';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { generateId } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface MasterCompanyContactManagerProps {
  isOpen: boolean;
  onClose: () => void;
  company: StakeholderCompany;
}

// Reusing CompanyContact type structure
const createEmptyContact = (companyId: string): CompanyContact => ({
  id: generateId(),
  companyId: companyId,
  nom: "",
  role: "",
  email: "",
  portable: "",
});

const MasterCompanyContactManager = ({ isOpen, onClose, company }: MasterCompanyContactManagerProps) => {
  const [contacts, setContacts] = useState<CompanyContact[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch contacts on dialog open
  useEffect(() => {
    if (isOpen && company.id) {
      fetchContacts();
    }
  }, [isOpen, company.id]);

  const fetchContacts = async () => {
    setIsLoading(true);
    try {
      // Assuming a new table 'master_company_contacts' exists with FK 'master_company_id'
      const { data, error } = await supabase
        .from('master_company_contacts')
        .select('*')
        .eq('master_company_id', company.id);

      if (error) throw error;

      const fetchedContacts: CompanyContact[] = data.map(item => ({
        id: item.id,
        companyId: item.master_company_id,
        nom: item.nom_contact || '',
        role: item.role || '',
        email: item.email || '',
        portable: item.portable || '',
      }));
      setContacts(fetchedContacts);
    } catch (error: any) {
      console.error("Error fetching master contacts:", error);
      showError(`Échec du chargement des contacts maîtres: ${error.message || 'Erreur inconnue'}`);
      setContacts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddContact = () => {
    setContacts([...contacts, createEmptyContact(company.id)]);
  };

  const handleRemoveContact = (id: string) => {
    setContacts(contacts.filter(c => c.id !== id));
  };

  const handleInputChange = (id: string, field: keyof CompanyContact, value: string) => {
    setContacts(
      contacts.map(c => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const handleSaveContacts = async () => {
    if (!company.id) return;
    setIsLoading(true);

    try {
      // 1. Determine IDs to keep ( existing contacts)
      const existingIds = new Set(contacts.filter(c => !c.id.startsWith('temp-')).map(c => c.id));
      
      // 2. Delete removed contacts from DB
      const { data: existingDbContacts, error: fetchError } = await supabase
        .from('master_company_contacts')
        .select('id')
        .eq('master_company_id', company.id);

      if (fetchError) throw fetchError;

      const dbIds = new Set(existingDbContacts.map(c => c.id));
      const idsToDelete = Array.from(dbIds).filter(id => !existingIds.has(id) && !contacts.some(c => c.id === id));

      if (idsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('master_company_contacts')
          .delete()
          .in('id', idsToDelete);
        if (deleteError) throw deleteError;
      }

      // 3. Upsert current contacts
      const contactsToUpsert = contacts.map(c => ({
        id: c.id.startsWith('temp-') ? undefined : c.id, // Let Supabase generate ID for new items
        master_company_id: company.id, // Use master_company_id FK
        nom_contact: c.nom,
        role: c.role,
        email: c.email,
        portable: c.portable,
      }));

      if (contactsToUpsert.length > 0) {
        const { error: upsertError } = await supabase
          .from('master_company_contacts')
          .upsert(contactsToUpsert, { onConflict: 'id' });
        if (upsertError) throw upsertError;
      }

      showSuccess("Contacts maîtres sauvegardés avec succès !");
      onClose();
    } catch (error: any) {
      console.error("Error saving master contacts:", error);
      showError(`Échec de la sauvegarde des contacts maîtres: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Gestion des Contacts Maîtres pour {company.raisonSociale}</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 py-4">
          <div className="flex justify-end">
            <Button onClick={handleAddContact} className="bg-brand-yellow hover:bg-yellow-400 text-black" disabled={isLoading}>
              <Plus className="mr-2 h-4 w-4" /> Ajouter un contact
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-brand-yellow" />
            </div>
          ) : (
            <div className="w-full overflow-x-auto border rounded-md">
              <Table className="min-w-max">
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Nom</TableHead>
                    <TableHead className="min-w-[150px]">Rôle</TableHead>
                    <TableHead className="min-w-[200px]">Email</TableHead>
                    <TableHead className="min-w-[150px]">Portable</TableHead>
                    <TableHead className="min-w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact, index) => (
                    <TableRow key={contact.id} className={cn(index % 2 === 0 ? 'bg-brand-cream' : 'bg-brand-cream-light')}>
                      <TableCell className="p-1">
                        <Input value={contact.nom} onChange={(e) => handleInputChange(contact.id, 'nom', e.target.value)} className="h-8 text-xs" />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input value={contact.role} onChange={(e) => handleInputChange(contact.id, 'role', e.target.value)} className="h-8 text-xs" />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input value={contact.email} onChange={(e) => handleInputChange(contact.id, 'email', e.target.value)} className="h-8 text-xs" />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input value={contact.portable} onChange={(e) => handleInputChange(contact.id, 'portable', e.target.value)} className="h-8 text-xs" />
                      </TableCell>
                      <TableCell className="p-1">
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveContact(contact.id)} disabled={isLoading}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Annuler</Button>
          <Button onClick={handleSaveContacts} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sauvegarder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MasterCompanyContactManager;