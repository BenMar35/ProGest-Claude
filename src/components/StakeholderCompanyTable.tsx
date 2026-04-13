"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { showError, showSuccess } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';

export type StakeholderCompany = {
  id: string;
  raisonSociale: string;
  adresse: string;
  codePostal: string;
  ville: string;
  telephone: string;
  email: string;
  siret: string;
};

interface StakeholderCompanyTableProps {
  projectId: string;
  companies: StakeholderCompany[];
  setCompanies: (companies: StakeholderCompany[]) => void;
  onRefresh?: () => void;
}

const StakeholderCompanyTable = ({ projectId, companies, setCompanies, onRefresh }: StakeholderCompanyTableProps) => {
  const [selectedMasterIds, setSelectedMasterIds] = useState<Set<string>>(new Set());
  const [isLoadingLinks, setIsLoadingLinks] = useState(false);

  const fetchProjectPresence = useCallback(async () => {
    if (!projectId) return;
    setIsLoadingLinks(true);
    try {
      const { data, error } = await supabase
        .from('project_selections')
        .select('entity_id')
        .eq('project_id', projectId);

      if (error) throw error;
      setSelectedMasterIds(new Set(data.map(item => item.entity_id)));
    } catch (error: any) {
      console.error("Error fetching project presence:", error);
    } finally {
      setIsLoadingLinks(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProjectPresence();
  }, [fetchProjectPresence]);

  const handleToggleSelection = async (entityId: string, isChecked: boolean) => {
    try {
      if (isChecked) {
        const { error } = await supabase
          .from('project_selections')
          .insert([{ project_id: projectId, entity_id: entityId }]);
        
        if (error) throw error;
        setSelectedMasterIds(prev => new Set(prev).add(entityId));
        showSuccess(`Entreprise ajoutée au projet`);
      } else {
        const { error } = await supabase
          .from('project_selections')
          .delete()
          .eq('project_id', projectId)
          .eq('entity_id', entityId);
        
        if (error) throw error;
        setSelectedMasterIds(prev => {
          const next = new Set(prev);
          next.delete(entityId);
          return next;
        });
        showSuccess(`Entreprise retirée du projet`);
      }
      if (onRefresh) onRefresh();
    } catch (error: any) {
      showError(`Erreur : ${error.message}`);
    }
  };

  const handleAddMasterRow = async () => {
    try {
      const { data, error } = await supabase.from('a_1point61_entities').insert([{
        type: 'entreprise',
        name_raison_sociale: "Nouvelle Entreprise",
      }]).select();
      
      if (error) throw error;
      if (data) {
        setCompanies([...companies, {
          id: data[0].id,
          raisonSociale: data[0].name_raison_sociale,
          adresse: '', codePostal: '', ville: '', telephone: '', email: data[0].email_generique || '', siret: ''
        }]);
      }
    } catch (error: any) {
      showError(error.message);
    }
  };

  const handleMasterInputChange = async (id: string, field: string, value: string) => {
    setCompanies(companies.map(c => (c.id === id ? { ...c, [field]: value } : c)));
    const dbField = field === 'raisonSociale' ? 'name_raison_sociale' : 
                   field === 'email' ? 'email_generique' : field;
    await supabase.from('a_1point61_entities').update({ [dbField]: value }).eq('id', id);
  };

  return (
    <div className="flex flex-col flex-grow min-h-0 space-y-2">
      <div className="flex justify-between items-center flex-shrink-0">
        <p className="text-xs text-gray-500 italic">Cochez les entreprises pour les lier au projet.</p>
        <Button onClick={handleAddMasterRow} size="sm" className="bg-brand-yellow hover:bg-yellow-400 text-black">
          <Plus className="mr-2 h-4 w-4" /> Ajouter à l'Annuaire
        </Button>
      </div>
      
      <div className="flex-grow overflow-auto border rounded-md relative bg-white">
        <table className="min-w-max w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky top-0 z-20 w-[50px] px-4 py-3 bg-white border-b font-bold text-center shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">Listing</th>
              <th className="sticky top-0 z-20 min-w-[200px] px-4 py-3 bg-white border-b font-bold text-black text-left shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">Raison Sociale</th>
              <th className="sticky top-0 z-20 min-w-[250px] px-4 py-3 bg-white border-b font-bold text-black text-left shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">Adresse</th>
              <th className="sticky top-0 z-20 min-w-[150px] px-4 py-3 bg-white border-b font-bold text-black text-left shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">Ville</th>
              <th className="sticky top-0 z-20 w-[80px] px-4 py-3 bg-white border-b font-bold text-center shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company, index) => (
              <tr key={company.id} className={cn(index % 2 === 0 ? 'bg-brand-cream' : 'bg-brand-cream-light')}>
                <td className="p-1 border-b text-center">
                  <Checkbox 
                    checked={selectedMasterIds.has(company.id)} 
                    onCheckedChange={(checked) => handleToggleSelection(company.id, !!checked)}
                    disabled={isLoadingLinks}
                  />
                </td>
                <td className="p-1 border-b">
                  <Input value={company.raisonSociale} onChange={e => handleMasterInputChange(company.id, 'raisonSociale', e.target.value)} className="h-8 border-0 bg-transparent text-xs" />
                </td>
                <td className="p-1 border-b">
                  <Input value={company.adresse} onChange={e => handleMasterInputChange(company.id, 'adresse', e.target.value)} className="h-8 border-0 bg-transparent text-xs" />
                </td>
                <td className="p-1 border-b">
                  <Input value={company.ville} onChange={e => handleMasterInputChange(company.id, 'ville', e.target.value)} className="h-8 border-0 bg-transparent text-xs" />
                </td>
                <td className="p-1 border-b text-center">
                  <Button variant="ghost" size="icon" onClick={() => {}} className="h-8 w-8 text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StakeholderCompanyTable;