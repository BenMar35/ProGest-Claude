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
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { generateId } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface CompanyContactManagerProps {
  isOpen: boolean;
  onClose: () => void;
  company: { id: string; raison_sociale: string };
}

export type UnifiedContact = {
  id: string;
  master_company_id: string;
  nom_contact: string;
  role: string;
  email: string;
  portable: string;
  adresse: string;
  code_postal: string;
  ville: string;
};

const createEmptyContact = (masterCompanyId: string): UnifiedContact => ({
  id: `temp-${generateId()}`,
  master_company_id: masterCompanyId,
  nom_contact: "",
  role: "",
  email: "",
  portable: "",
  adresse: "",
  code_postal: "",
  ville: "",
});

const CompanyContactManager = ({ isOpen, onClose, company }: CompanyContactManagerProps) => {
  const [contacts, setContacts] = useState<UnifiedContact[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && company.id) {
      fetchContacts();
    }
  }, [isOpen, company.id]);

  const fetchContacts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('master_company_contacts')
        .select('*')
        .eq('master_company_id', company.id)
        .order('nom_contact');

      if (error) throw error;
      setContacts(data || []);
    } catch (error: any) {
      console.error("Error fetching unified contacts:", error);
      showError("Erreur lors du chargement des contacts.");
      setContacts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddContact = () => {
    setContacts([...contacts, createEmptyContact(company.id)]);
  };

  const handleInputChange = (id: string, field: keyof UnifiedContact, value: string) => {
    setContacts(contacts.map(c => (c.id === id ? { ...c, [field]: value } : c)));
  };

  const handleSaveOnBlur = async (id: string, field: keyof UnifiedContact, value: string) => {
    const contact = contacts.find(c => c.id === id);
    if (!contact) return;

    try {
      const isNew = id.startsWith('temp-');
      const payload = {
        master_company_id: company.id,
        [field]: value
      };

      if (isNew) {
        if (field === 'nom_contact' && value.trim() !== "") {
          const { data, error } = await supabase
            .from('master_company_contacts')
            .insert([payload])
            .select();
          if (error) throw error;
          if (data) setContacts(prev => prev.map(c => c.id === id ? data[0] : c));
        }
      } else {
        const { error } = await supabase
          .from('master_company_contacts')
          .update({ [field]: value })
          .eq('id', id);
        if (error) throw error;
      }
    } catch (err) {
      console.error("Error saving unified contact:", err);
    }
  };

  const handleRemoveContact = async (id: string) => {
    if (id.startsWith('temp-')) {
      setContacts(contacts.filter(c => c.id !== id));
      return;
    }

    try {
      const { error } = await supabase.from('master_company_contacts').delete().eq('id', id);
      if (error) throw error;
      setContacts(contacts.filter(c => c.id !== id));
      showSuccess("Contact supprimé.");
    } catch (err) {
      showError("Erreur de suppression.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>Annuaire Contacts : {company.raison_sociale}</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 py-4">
          <div className="flex justify-end">
            <Button onClick={handleAddContact} className="bg-brand-yellow hover:bg-yellow-400 text-black">
              <Plus className="mr-2 h-4 w-4" /> Ajouter un contact
            </Button>
          </div>

          <div className="w-full overflow-x-auto border rounded-md">
            <Table className="min-w-max">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">Nom</TableHead>
                  <TableHead className="min-w-[150px]">Rôle</TableHead>
                  <TableHead className="min-w-[200px]">Adresse</TableHead>
                  <TableHead className="min-w-[80px]">CP</TableHead>
                  <TableHead className="min-w-[120px]">Ville</TableHead>
                  <TableHead className="min-w-[130px]">Portable</TableHead>
                  <TableHead className="min-w-[150px]">Email</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact, index) => (
                  <TableRow key={contact.id} className={cn(index % 2 === 0 ? 'bg-brand-cream' : 'bg-brand-cream-light')}>
                    <TableCell className="p-1">
                      <Input value={contact.nom_contact} onChange={e => handleInputChange(contact.id, 'nom_contact', e.target.value)} onBlur={e => handleSaveOnBlur(contact.id, 'nom_contact', e.target.value)} className="h-8 text-xs bg-white" placeholder="Nom..." />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input value={contact.role} onChange={e => handleInputChange(contact.id, 'role', e.target.value)} onBlur={e => handleSaveOnBlur(contact.id, 'role', e.target.value)} className="h-8 text-xs bg-white" />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input value={contact.adresse} onChange={e => handleInputChange(contact.id, 'adresse', e.target.value)} onBlur={e => handleSaveOnBlur(contact.id, 'adresse', e.target.value)} className="h-8 text-xs bg-white" />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input value={contact.code_postal} onChange={e => handleInputChange(contact.id, 'code_postal', e.target.value)} onBlur={e => handleSaveOnBlur(contact.id, 'code_postal', e.target.value)} className="h-8 text-xs bg-white" />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input value={contact.ville} onChange={e => handleInputChange(contact.id, 'ville', e.target.value)} onBlur={e => handleSaveOnBlur(contact.id, 'ville', e.target.value)} className="h-8 text-xs bg-white" />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input value={contact.portable} onChange={e => handleInputChange(contact.id, 'portable', e.target.value)} onBlur={e => handleSaveOnBlur(contact.id, 'portable', e.target.value)} className="h-8 text-xs bg-white" />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input value={contact.email} onChange={e => handleInputChange(contact.id, 'email', e.target.value)} onBlur={e => handleSaveOnBlur(contact.id, 'email', e.target.value)} className="h-8 text-xs bg-white" />
                    </TableCell>
                    <TableCell className="p-1">
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveContact(contact.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} className="bg-brand-yellow hover:bg-yellow-400 text-black">Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CompanyContactManager;