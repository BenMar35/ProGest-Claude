"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { CompanyRow } from '@/components/CompanyListingTable';

export type FullContact = {
  id: string;
  companyId: string;
  nom: string;
  role: string;
  email: string;
  portable: string;
  adresse: string;
  codePostal: string;
  ville: string;
};

export const useCompanyContacts = (projectId: string, projectCompanies: CompanyRow[]) => {
  const [allContacts, setAllContacts] = useState<FullContact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);

  const fetchContacts = useCallback(async () => {
    // On récupère d'abord les IDs maîtres des entreprises du projet
    if (!projectId || projectCompanies.length === 0) {
      setAllContacts([]);
      return;
    }
    
    setIsLoadingContacts(true);
    try {
      // 1. On cherche les entreprises maîtres correspondantes
      const names = projectCompanies.map(c => c.raison_sociale);
      const { data: masterCompanies } = await supabase
        .from('master_companies')
        .select('id, raison_sociale')
        .in('raison_sociale', names);

      if (!masterCompanies) return;
      const masterIds = masterCompanies.map(m => m.id);

      // 2. On récupère tous les contacts de ces entreprises dans la table unifiée
      const { data, error } = await supabase
        .from('master_company_contacts')
        .select('*')
        .in('master_company_id', masterIds);

      if (error) throw error;

      const fetchedContacts: FullContact[] = data.map(item => ({
        id: item.id,
        companyId: item.master_company_id,
        nom: item.nom_contact || '',
        role: item.role || '',
        email: item.email || '',
        portable: item.portable || '',
        adresse: item.adresse || '',
        codePostal: item.code_postal || '',
        ville: item.ville || '',
      }));
      setAllContacts(fetchedContacts);
    } catch (error: any) {
      console.error("Error fetching all unified project contacts:", error);
      setAllContacts([]);
    } finally {
      setIsLoadingContacts(false);
    }
  }, [projectId, projectCompanies]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const contactMap = new Map(allContacts.map(c => [c.id, c]));

  return { allContacts, contactMap, isLoadingContacts, fetchContacts };
};