"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import AllotmentTable, { AllotmentRow } from "./AllotmentTable";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { generateId } from "@/lib/utils";

interface CanvasAllotmentProps {
  allotmentRows: AllotmentRow[];
  setAllotmentRows: (rows: AllotmentRow[]) => void;
  lots: string[];
  projectId: string;
  refreshMasterData: () => void;
  onSaveSuccess: () => void;
  onUploadLots: () => void; // Prop pour déclencher l'upload depuis le sidebar
}

const CanvasAllotment = ({
  allotmentRows,
  setAllotmentRows,
  lots,
  projectId,
  refreshMasterData,
  onSaveSuccess,
  onUploadLots,
}: CanvasAllotmentProps) => {

  useEffect(() => {
    refreshMasterData(); // Rafraîchit les lots maîtres à l'ouverture de la phase
  }, [refreshMasterData]);

  const handleAddRow = () => {
    const newRows = allotmentRows ? [...allotmentRows] : [];
    setAllotmentRows([...newRows, { id: generateId(), selectedLot: "", selectedNumber: "" }]);
  };

  const handleSaveAllotments = async () => {
    if (!projectId) {
      showError("ID du projet manquant pour sauvegarder les allotissements.");
      return;
    }

    try {
      // Delete existing allotments for this project
      const { error: deleteError } = await supabase
        .from('allotments')
        .delete()
        .eq('project_id', projectId);

      if (deleteError) throw deleteError;

      // Insert current allotments
      const allotmentsToInsert = (allotmentRows || []).map(row => ({
        project_id: projectId,
        selected_lot: row.selectedLot,
        selected_number: row.selectedNumber,
      }));

      let updatedAllotmentRows: AllotmentRow[] = [];

      if (allotmentsToInsert.length > 0) {
        const { data: insertedData, error: insertError } = await supabase
          .from('allotments')
          .insert(allotmentsToInsert)
          .select('id, selected_lot, selected_number');

        if (insertError) throw insertError;

        if (insertedData) {
          updatedAllotmentRows = insertedData.map(item => ({
            id: item.id,
            selectedLot: item.selected_lot,
            selectedNumber: item.selected_number,
          }));
          setAllotmentRows(updatedAllotmentRows);
        }
      } else {
        setAllotmentRows([]);
      }

      showSuccess("Allotissements sauvegardés avec succès !");
      onSaveSuccess();
    } catch (error: any) {
      console.error("Error saving allotments:", error);
      showError(`Échec de la sauvegarde des allotissements: ${error.message || 'Erreur inconnue'}`);
    }
  };

  return (
    <div className="p-2 bg-white border rounded-lg shadow-md w-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Gestion de l'Allotissement</h3>
        <Button onClick={handleAddRow} size="sm" className="bg-brand-yellow hover:bg-yellow-400 text-black h-8">
          <Plus className="mr-2 h-4 w-4" /> Ajouter une ligne
        </Button>
      </div>
      <div className="flex flex-col items-start gap-4 mt-4">
        {/* Bouton masqué visuellement (conservé pour la mécanique) */}
        <Button onClick={onUploadLots} className="bg-brand-yellow hover:bg-yellow-400 text-black hidden">
          <Plus className="mr-2 h-4 w-4" /> Importer une liste de lots (.csv)
        </Button>
        {/* Texte informatif supprimé */}
        <div className="w-full">
          <AllotmentTable
            rows={allotmentRows}
            setRows={setAllotmentRows}
            lots={lots}
          />
        </div>
        <Button onClick={handleSaveAllotments} className="bg-brand-yellow hover:bg-yellow-400 text-black w-full">
          Sauvegarder les allotissements
        </Button>
      </div>
    </div>
  );
};

export default CanvasAllotment;