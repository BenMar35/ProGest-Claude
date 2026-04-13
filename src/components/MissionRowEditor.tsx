"use client";

import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { Mission } from "./StakeholdersDialog";
import MissionCombobox from "./MissionCombobox";
import { CompanyRow } from "./CompanyListingTable";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import MissionContactCombobox from './MissionContactCombobox';
import LegalEntitySelector from './LegalEntitySelector';

interface MissionRowEditorProps {
  mission: Mission;
  projectId: string;
  companies: CompanyRow[];
  onMissionChange: (updatedMission: Mission) => void;
  onMissionDelete: (id: string) => void;
  onSaveSuccess: () => void;
}

const MissionRowEditor = ({ 
  mission, 
  projectId, 
  companies, 
  onMissionChange, 
  onMissionDelete,
  onSaveSuccess
}: MissionRowEditorProps) => {
  const [isSaving, setIsSaving] = useState(false);

  // Fonction pour mettre à jour un champ ID en base de données
  const updateDbField = async (field: string, value: string | null) => {
    // On ignore les IDs temporaires ou invalides (chaîne vide pour un UUID)
    if (!mission.id || mission.id.startsWith('temp-')) return;
    
    // Si la valeur est une chaîne vide, on passe null pour respecter le type UUID
    const cleanValue = value === "" ? null : value;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('project_missions')
        .update({ [field]: cleanValue })
        .eq('id', mission.id);

      if (error) throw error;
      onSaveSuccess(); 
    } catch (error: any) {
      console.error(`Erreur lors de la mise à jour de ${field}:`, error);
      showError("Erreur de sauvegarde.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMissionTypeChange = async (name: string) => {
    if (!name) {
      onMissionChange({ ...mission, mission: "", missionId: undefined });
      await updateDbField('mission_id', null);
      return;
    }

    // On utilise maybeSingle pour éviter l'erreur 406 si non trouvé
    const { data: masterData, error } = await supabase
      .from('master_missions')
      .select('id')
      .eq('mission_name', name)
      .maybeSingle();

    if (masterData?.id) {
      onMissionChange({ ...mission, mission: name, missionId: masterData.id });
      await updateDbField('mission_id', masterData.id);
    }
  };

  const handleEntityChange = async (name: string, details?: any) => {
    const entityId = details?.id || null;
    
    onMissionChange({ 
      ...mission, 
      raisonSociale: name,
      entityId: entityId,
      adresse: details?.adresse || mission.adresse,
      // On réinitialise le contact si l'entreprise change
      contact: "",
      contactId: undefined,
      contactInfo: ""
    });

    await updateDbField('entity_id', entityId);
  };

  const handleContactChange = async (contactName: string) => {
    if (!contactName || !mission.entityId) {
      onMissionChange({ ...mission, contact: "", contactId: undefined, contactInfo: "" });
      await updateDbField('contact_id', null);
      return;
    }

    const { data: contactData } = await supabase
        .from('company_contacts')
        .select('id, email, portable')
        .eq('nom_contact', contactName)
        .eq('company_id', mission.entityId)
        .maybeSingle();

    const contactId = contactData?.id || null;
    onMissionChange({ 
        ...mission, 
        contact: contactName, 
        contactId: contactId || undefined,
        contactInfo: contactData?.email || contactData?.portable || ''
    });

    await updateDbField('contact_id', contactId);
  };

  return (
    <div className="grid grid-cols-[minmax(150px,1fr)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(200px,1fr)_50px] gap-2 p-2 border rounded-md bg-brand-cream-light relative">
      {isSaving && (
        <div className="absolute top-1 right-1">
          <Loader2 className="h-3 w-3 animate-spin text-brand-yellow" />
        </div>
      )}
      
      <div className="col-span-5 flex items-center gap-4 border-b pb-2 mb-2">
        <div className="w-1/3">
          <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Type de Mission</label>
          <MissionCombobox
            value={mission.mission}
            onChange={handleMissionTypeChange}
            projectId={projectId}
          />
        </div>
        <div className="flex-grow">
          <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Entité / Raison Sociale</label>
          <LegalEntitySelector
            value={mission.raisonSociale}
            onChange={handleEntityChange}
            placeholder="Sélectionner l'entreprise..."
          />
        </div>
      </div>

      <div className="col-span-1">
        <label className="text-xs font-medium text-gray-600">Contact</label>
        <MissionContactCombobox
          value={mission.contact}
          onChange={handleContactChange}
          selectedCompanyName={mission.raisonSociale}
          companies={companies}
        />
      </div>

      <div className="col-span-1">
        <label className="text-xs font-medium text-gray-600">Adresse de l'entité</label>
        <div className="h-8 text-xs bg-white/50 border border-brand-gray rounded flex items-center px-2 truncate text-gray-500">
          {mission.adresse || "-"}
        </div>
      </div>

      <div className="col-span-2">
        <label className="text-xs font-medium text-gray-600">Coordonnées Contact</label>
        <div className="h-8 text-xs bg-white/50 border border-brand-gray rounded flex items-center px-2 truncate text-gray-500">
          {mission.contactInfo || "-"}
        </div>
      </div>
      
      <div className="col-span-1 flex items-end justify-center">
        <Button variant="ghost" size="icon" onClick={() => onMissionDelete(mission.id)} className="h-8 w-8">
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>
    </div>
  );
};

export default MissionRowEditor;