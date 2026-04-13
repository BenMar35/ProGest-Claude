"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { cn, generateId } from "@/lib/utils";
import { MaitriseOuvrage } from "./StakeholdersDialog";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import LegalEntitySelector from './LegalEntitySelector';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface MaitriseOuvrageTableProps {
  projectId: string;
  maitriseOuvrage: MaitriseOuvrage[];
  setMaitriseOuvrage: (mo: MaitriseOuvrage[]) => void;
  onSaveSuccess: () => void;
}

const createEmptyMaitriseOuvrage = (): MaitriseOuvrage => ({
  id: `temp-${generateId()}`,
  nom: "",
  contact: "",
  adresse: "",
  codePostal: "",
  ville: "",
  coordonneesContact: "",
  email: "",
});

const MaitriseOuvrageTable = ({ projectId, maitriseOuvrage, setMaitriseOuvrage, onSaveSuccess }: MaitriseOuvrageTableProps) => {
  const [isAdding, setIsAdding] = useState(false);

  const isPermanentId = (id: string) => id && id.length === 36 && id.includes('-') && !id.startsWith('temp-');

  const handleAddRow = () => {
    setMaitriseOuvrage([...(maitriseOuvrage || []), createEmptyMaitriseOuvrage()]);
  };

  const handleRemoveRow = async (id: string) => {
    setMaitriseOuvrage(maitriseOuvrage.filter(mo => mo.id !== id));
    
    if (isPermanentId(id)) {
      try {
        const { error } = await supabase
          .from('project_maitrise_ouvrage')
          .delete()
          .eq('id', id);
        if (error) throw error;
        showSuccess("Contact MO supprimé.");
        onSaveSuccess();
      } catch (error: any) {
        showError(`Échec de la suppression: ${error.message || 'Erreur inconnue'}`);
      }
    }
  };

  const handleInputChange = (id: string, field: keyof MaitriseOuvrage, value: string) => {
    setMaitriseOuvrage(
      maitriseOuvrage.map(mo => (mo.id === id ? { ...mo, [field]: value } : mo))
    );
  };

  const handleSaveOnBlur = async (id: string, field: keyof MaitriseOuvrage, value: string) => {
    if (!isPermanentId(id) || !projectId) return;

    try {
      const fieldMapping: Record<string, string> = {
        nom: 'nom_client',
        contact: 'contact_nom',
        adresse: 'adresse',
        codePostal: 'code_postal',
        ville: 'Ville',
        coordonneesContact: 'telephone',
        email: 'email',
      };
      
      const dbField = fieldMapping[field];
      if (!dbField) return;

      const { error } = await supabase
        .from('project_maitrise_ouvrage')
        .update({ [dbField]: value })
        .eq('id', id);

      if (error) throw error;
      onSaveSuccess();
    } catch (error: any) {
      console.error("Error updating MO field:", error);
    }
  };

  const handleEntitySelect = async (id: string, name: string, details: any) => {
    const mo = maitriseOuvrage.find(m => m.id === id);
    if (!mo || !projectId) return;

    setIsAdding(true);
    
    const updatedMo: MaitriseOuvrage = {
      ...mo,
      nom: name,
      adresse: details?.adresse || mo.adresse,
      codePostal: details?.code_postal || mo.codePostal,
      ville: details?.ville || mo.ville,
    };

    try {
      const isNew = !isPermanentId(id);
      const payload = {
        project_id: projectId,
        nom_client: updatedMo.nom,
        contact_nom: updatedMo.contact,
        adresse: updatedMo.adresse,
        code_postal: updatedMo.codePostal,
        Ville: updatedMo.ville,
        telephone: updatedMo.coordonneesContact,
        email: updatedMo.email,
      };

      let dbOperation;
      if (isNew) {
        dbOperation = supabase.from('project_maitrise_ouvrage').insert([payload]).select();
      } else {
        dbOperation = supabase.from('project_maitrise_ouvrage').update(payload).eq('id', id).select();
      }

      const { data, error } = await dbOperation;
      if (error) throw error;

      if (isNew && data && data.length > 0) {
        setMaitriseOuvrage(maitriseOuvrage.map(m => m.id === id ? { ...updatedMo, id: data[0].id } : m));
        showSuccess("Entité MO sauvegardée.");
      } else {
        setMaitriseOuvrage(maitriseOuvrage.map(m => m.id === id ? updatedMo : m));
      }
      
      onSaveSuccess();
    } catch (error: any) {
      console.error("Error saving MO entity:", error);
      showError(`Échec de la sauvegarde: ${error.message}`);
    } finally {
      setIsAdding(false);
    }
  };

  const inputClasses = "h-9 bg-transparent border-0 focus-visible:ring-1 focus-visible:ring-slate-400 text-sm w-full p-1";

  return (
    <div className="flex flex-col flex-grow min-h-0 space-y-2">
      <div className="flex justify-end flex-shrink-0">
        <Button onClick={handleAddRow} size="icon" className="bg-brand-yellow hover:bg-yellow-400 text-black h-8 w-8" disabled={isAdding}>
          {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
      </div>
      
      <div className="flex-grow overflow-auto border rounded-md relative bg-white">
        <Table className="min-w-max w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky top-0 z-20 min-w-[250px] px-4 py-3 bg-white border-b font-bold text-black text-left shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">Raison Sociale</th>
              <th className="sticky top-0 z-20 min-w-[150px] px-4 py-3 bg-white border-b font-bold text-black text-left shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">Contact Nom</th>
              <th className="sticky top-0 z-20 min-w-[250px] px-4 py-3 bg-white border-b font-bold text-black text-left shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">Adresse</th>
              <th className="sticky top-0 z-20 min-w-[100px] px-4 py-3 bg-white border-b font-bold text-black text-left shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">CP / Ville</th>
              <th className="sticky top-0 z-20 min-w-[150px] px-4 py-3 bg-white border-b font-bold text-black text-left shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">Téléphone</th>
              <th className="sticky top-0 z-20 min-w-[200px] px-4 py-3 bg-white border-b font-bold text-black text-left shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">Email</th>
              <th className="sticky top-0 z-20 w-[80px] px-4 py-3 bg-white border-b text-center font-bold text-black shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">Action</th>
            </tr>
          </thead>
          <tbody>
            {(maitriseOuvrage || []).map((mo, rowIndex) => (
              <tr key={mo.id} className={cn("transition-colors hover:bg-muted/50", rowIndex % 2 === 0 ? 'bg-brand-cream' : 'bg-brand-cream-light')}>
                <TableCell className="p-1 border-b">
                  <LegalEntitySelector value={mo.nom} onChange={(name, details) => handleEntitySelect(mo.id, name, details)} placeholder="Sélectionner ou créer..." />
                </TableCell>
                <TableCell className="p-1 border-b">
                  <Input value={mo.contact} onChange={(e) => handleInputChange(mo.id, 'contact', e.target.value)} onBlur={(e) => handleSaveOnBlur(mo.id, 'contact', e.target.value)} className={inputClasses} />
                </TableCell>
                <TableCell className="p-1 border-b">
                  <Input value={mo.adresse} onChange={(e) => handleInputChange(mo.id, 'adresse', e.target.value)} onBlur={(e) => handleSaveOnBlur(mo.id, 'adresse', e.target.value)} className={inputClasses} />
                </TableCell>
                <TableCell className="p-1 border-b">
                  <div className="flex gap-1">
                    <Input value={mo.codePostal} onChange={(e) => handleInputChange(mo.id, 'codePostal', e.target.value)} onBlur={(e) => handleSaveOnBlur(mo.id, 'codePostal', e.target.value)} className={cn(inputClasses, "w-1/3")} placeholder="CP" />
                    <Input value={mo.ville} onChange={(e) => handleInputChange(mo.id, 'ville', e.target.value)} onBlur={(e) => handleSaveOnBlur(mo.id, 'ville', e.target.value)} className={cn(inputClasses, "w-2/3")} placeholder="Ville" />
                  </div>
                </TableCell>
                <TableCell className="p-1 border-b">
                  <Input value={mo.coordonneesContact} onChange={(e) => handleInputChange(mo.id, 'coordonneesContact', e.target.value)} onBlur={(e) => handleSaveOnBlur(mo.id, 'coordonneesContact', e.target.value)} className={inputClasses} />
                </TableCell>
                <TableCell className="p-1 border-b">
                  <Input value={mo.email} onChange={(e) => handleInputChange(mo.id, 'email', e.target.value)} onBlur={(e) => handleSaveOnBlur(mo.id, 'email', e.target.value)} className={inputClasses} />
                </TableCell>
                <TableCell className="p-1 text-center border-b">
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveRow(mo.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </TableCell>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </div>
  );
};

export default MaitriseOuvrageTable;