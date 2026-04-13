"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { cn, generateId } from "@/lib/utils";
import { CompanyRow } from './CompanyListingTable';
import { CompanyContact } from './StakeholderCompanyTable';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ProjectCompanyContactsTableProps {
  projectId: string;
  projectCompanies: CompanyRow[];
}

const createEmptyContact = (masterCompanyId: string): CompanyContact => ({
  id: `temp-${generateId()}`,
  companyId: masterCompanyId,
  nom: "",
  role: "",
  email: "",
  portable: "",
});

const ProjectCompanyContactsTable = ({ projectId, projectCompanies }: ProjectCompanyContactsTableProps) => {
  const [contacts, setContacts] = useState<CompanyContact[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Mapping des entreprises du projet vers leurs IDs maîtres (Annuaire)
  const [companyMap, setCompanyMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const fetchMasterMapping = async () => {
      if (projectCompanies.length === 0) return;
      const names = projectCompanies.map(c => c.raison_sociale);
      const { data } = await supabase.from('master_companies').select('id, raison_sociale').in('raison_sociale', names);
      if (data) {
        const map = new Map();
        data.forEach(m => map.set(m.raison_sociale, m.id));
        setCompanyMap(map);
      }
    };
    fetchMasterMapping();
  }, [projectCompanies]);

  const fetchContacts = async () => {
    if (!projectId || projectCompanies.length === 0) {
      setContacts([]);
      return;
    }
    setIsLoading(true);
    try {
      // 1. Récupérer les IDs maîtres
      const names = projectCompanies.map(c => c.raison_sociale);
      const { data: masters } = await supabase.from('master_companies').select('id').in('raison_sociale', names);
      if (!masters || masters.length === 0) return;
      const masterIds = masters.map(m => m.id);

      // 2. Récupérer les contacts dans la table unifiée
      const { data, error } = await supabase
        .from('master_company_contacts')
        .select('*')
        .in('master_company_id', masterIds);

      if (error) throw error;
      setContacts(data.map(item => ({
        id: item.id,
        companyId: item.master_company_id,
        nom: item.nom_contact || '',
        role: item.role || '',
        email: item.email || '',
        portable: item.portable || '',
      })));
    } catch (error: any) {
      showError(`Échec du chargement : ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchContacts(); }, [projectId, projectCompanies.length]);

  const handleAddContact = () => {
    const names = projectCompanies.map(c => c.raison_sociale);
    const firstMasterId = companyMap.get(names[0]) || "";
    setContacts([...contacts, createEmptyContact(firstMasterId)]);
  };

  const handleInputChange = (id: string, field: keyof CompanyContact, value: string) => {
    setContacts(contacts.map(c => (c.id === id ? { ...c, [field]: value } : c)));
  };

  const handleSaveContacts = async () => {
    setIsLoading(true);
    try {
      const contactsToUpsert = contacts.map(c => ({
        id: c.id.startsWith('temp-') ? undefined : c.id,
        master_company_id: c.companyId,
        nom_contact: c.nom,
        role: c.role,
        email: c.email,
        portable: c.portable,
      }));

      if (contactsToUpsert.length > 0) {
        const { error } = await supabase.from('master_company_contacts').upsert(contactsToUpsert, { onConflict: 'id' });
        if (error) throw error;
      }
      showSuccess("Annuaire contacts mis à jour !");
      await fetchContacts();
    } catch (error: any) {
      showError(`Erreur: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-grow min-h-0 space-y-4">
      <div className="flex justify-between items-center flex-shrink-0">
        <h3 className="font-semibold text-lg">Contacts Unifiés (Annuaire)</h3>
        <Button onClick={handleAddContact} className="bg-brand-yellow hover:bg-yellow-400 text-black" disabled={isLoading || projectCompanies.length === 0}>
          <Plus className="mr-2 h-4 w-4" /> Ajouter Contact
        </Button>
      </div>
      
      <div className="flex-grow overflow-auto border rounded-md relative bg-white">
        <table className="min-w-max w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky top-0 z-20 min-w-[200px] px-4 py-3 bg-white border-b font-bold text-black text-left shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">Entité / Entreprise</th>
              <th className="sticky top-0 z-20 min-w-[150px] px-4 py-3 bg-white border-b font-bold text-black text-left shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">Nom</th>
              <th className="sticky top-0 z-20 min-w-[150px] px-4 py-3 bg-white border-b font-bold text-black text-left shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">Rôle</th>
              <th className="sticky top-0 z-20 min-w-[150px] px-4 py-3 bg-white border-b font-bold text-black text-left shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">Portable</th>
              <th className="sticky top-0 z-20 min-w-[250px] px-4 py-3 bg-white border-b font-bold text-black text-left shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">Email</th>
              <th className="sticky top-0 z-20 w-[80px] px-4 py-3 bg-white border-b text-center font-bold text-black shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">Action</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((contact, index) => (
              <tr key={contact.id} className={cn(index % 2 === 0 ? 'bg-brand-cream' : 'bg-brand-cream-light')}>
                <td className="p-1 border-b">
                  <Select value={contact.companyId} onValueChange={(v) => handleInputChange(contact.id, 'companyId', v)}>
                    <SelectTrigger className="h-9 text-sm bg-transparent border-0"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {projectCompanies.map(c => {
                         const mId = companyMap.get(c.raison_sociale);
                         return <SelectItem key={c.id} value={mId || ""}>{c.raison_sociale}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-1 border-b"><Input value={contact.nom} onChange={e => handleInputChange(contact.id, 'nom', e.target.value)} className="h-9 border-0 text-sm bg-transparent" /></td>
                <td className="p-1 border-b"><Input value={contact.role} onChange={e => handleInputChange(contact.id, 'role', e.target.value)} className="h-9 border-0 text-sm bg-transparent" /></td>
                <td className="p-1 border-b"><Input value={contact.portable} onChange={e => handleInputChange(contact.id, 'portable', e.target.value)} className="h-9 border-0 text-sm bg-transparent" /></td>
                <td className="p-1 border-b"><Input value={contact.email} onChange={e => handleInputChange(contact.id, 'email', e.target.value)} className="h-9 border-0 text-sm bg-transparent" /></td>
                <td className="p-1 border-b text-center">
                  <Button variant="ghost" size="icon" onClick={async () => {
                     if (!contact.id.startsWith('temp-')) await supabase.from('master_company_contacts').delete().eq('id', contact.id);
                     setContacts(contacts.filter(c => c.id !== contact.id));
                  }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button onClick={handleSaveContacts} className="bg-brand-yellow hover:bg-yellow-400 text-black w-full py-6 text-base font-bold shadow-lg flex-shrink-0" disabled={isLoading || projectCompanies.length === 0}>
        {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Sauvegarder dans l'annuaire"}
      </Button>
    </div>
  );
};

export default ProjectCompanyContactsTable;