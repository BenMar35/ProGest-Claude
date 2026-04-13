"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { Mission } from "./StakeholdersDialog";
import MissionRowEditor from "./MissionRowEditor";
import { CompanyRow } from "./CompanyListingTable";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { generateId } from "@/lib/utils";

interface MissionTableProps {
  projectId: string;
  missions: Mission[];
  setMissions: (missions: Mission[]) => void;
  projectCompanies: CompanyRow[];
  onSaveSuccess: () => void;
}

const MissionTable = ({ projectId, missions, setMissions, projectCompanies, onSaveSuccess }: MissionTableProps) => {
  const [isAdding, setIsAdding] = useState(false);

  const handleAddRow = async () => {
    if (!projectId) {
      showError("ID du projet manquant.");
      return;
    }
    setIsAdding(true);
    
    const tempId = generateId();
    // État local temporaire
    const newRow: Mission = {
      id: tempId,
      mission: "",
      raisonSociale: "",
      contact: "",
      adresse: "",
      contactInfo: "",
    };

    setMissions(prev => [...(prev || []), newRow]);

    try {
      // INSERTION RÉELLE : On ne passe que le project_id car les noms sont dans les tables liées
      const { data, error } = await supabase
        .from('project_missions')
        .insert([{ project_id: projectId }])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        const newDbId = data[0].id;
        // On remplace l'ID temporaire par le vrai ID de la base
        setMissions(prev => prev.map(m => m.id === tempId ? { ...m, id: newDbId } : m));
        showSuccess("Ligne de mission créée.");
      }
    } catch (error: any) {
      console.error("Error adding mission row:", error);
      showError("Échec de la création de la ligne.");
      setMissions(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setIsAdding(false);
    }
  };

  const handleMissionChange = (updatedMission: Mission) => {
    setMissions(prev => prev.map(m => m.id === updatedMission.id ? updatedMission : m));
  };

  const handleMissionDelete = async (id: string) => {
    // Optimistic delete
    setMissions(prev => prev.filter(m => m.id !== id));
    try {
      await supabase.from('project_missions').delete().eq('id', id);
      showSuccess("Mission supprimée.");
      onSaveSuccess();
    } catch (error) {
      showError("Échec de la suppression.");
    }
  };

  return (
    <div className="flex flex-col flex-grow min-h-0 space-y-4">
      <div className="flex justify-between items-center flex-shrink-0">
        <h3 className="font-semibold text-lg">Missions du Projet</h3>
        <Button onClick={handleAddRow} className="bg-brand-yellow hover:bg-yellow-400 text-black" disabled={isAdding}>
          {isAdding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />} Ajouter une Mission
        </Button>
      </div>
      
      <div className="flex-grow overflow-y-auto space-y-2">
        {missions.map(mission => (
          <MissionRowEditor
            key={mission.id}
            mission={mission}
            projectId={projectId}
            companies={projectCompanies}
            onMissionChange={handleMissionChange}
            onMissionDelete={handleMissionDelete}
            onSaveSuccess={onSaveSuccess}
          />
        ))}
      </div>
    </div>
  );
};

export default MissionTable;