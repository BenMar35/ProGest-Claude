"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { DatePickerButton } from './DatePickerButton';
import { generateId } from "@/lib/utils";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import DocumentVersionUploader from './DocumentVersionUploader'; // New component for file handling

export type DocumentVersion = {
  id: string;
  index: string;
  date: string;
  fileUrl: string | null;
  fileName: string | null;
};

export type DocumentPlan = {
  id: string;
  name: string;
  versions: DocumentVersion[];
};

interface DocumentBoxProps {
  projectId: string;
  plans: DocumentPlan[];
  setPlans: React.Dispatch<React.SetStateAction<DocumentPlan[]>>;
}

const DocumentBox = ({ projectId, plans, setPlans }: DocumentBoxProps) => {

  const handleAddPlan = async () => {
    if (!projectId) {
      showError("ID du projet manquant pour ajouter un plan.");
      return;
    }
    const newPlanId = generateId();
    const newVersionId = generateId();
    const newPlan: DocumentPlan = {
      id: newPlanId,
      name: 'Nouveau Plan',
      versions: [{ id: newVersionId, index: 'A', date: '', fileUrl: null, fileName: null }]
    };

    try {
      const { error } = await supabase
        .from('project_documents')
        .insert([{
          project_id: projectId, // Corrected: Use the actual projectId from props
          plan_id: newPlan.id,
          version_id: newPlan.versions[0].id,
          plan_name: newPlan.name,
          version_index: newPlan.versions[0].index,
          version_date: newPlan.versions[0].date || null,
          file_url: newPlan.versions[0].fileUrl,
          file_name: newPlan.versions[0].fileName,
        }]);

      if (error) throw error;
      setPlans([...plans, newPlan]);
      showSuccess("Plan ajouté avec succès !");
    } catch (error: any) {
      console.error("Error adding plan:", error);
      showError(`Échec de l'ajout du plan: ${error.message || 'Erreur inconnue'}`);
    }
  };

  const handleRemovePlan = async (planId: string) => {
    if (!projectId) {
      showError("ID du projet manquant pour supprimer un plan.");
      return;
    }
    try {
      const { error } = await supabase
        .from('project_documents')
        .delete()
        .eq('project_id', projectId)
        .eq('plan_id', planId);

      if (error) throw error;
      setPlans(plans.filter(p => p.id !== planId));
      showSuccess("Plan supprimé avec succès !");
    } catch (error: any) {
      console.error("Error removing plan:", error);
      showError(`Échec de la suppression du plan: ${error.message || 'Erreur inconnue'}`);
    }
  };

  const handlePlanNameChange = async (planId: string, name: string) => {
    setPlans(plans.map(p => p.id === planId ? { ...p, name } : p));
    try {
      const { error } = await supabase
        .from('project_documents')
        .update({ plan_name: name }) // plan_name is already snake_case
        .eq('project_id', projectId)
        .eq('plan_id', planId);

      if (error) throw error;
    } catch (error: any) {
      console.error("Error updating plan name:", error);
      showError(`Échec de la mise à jour du nom du plan: ${error.message || 'Erreur inconnue'}`);
    }
  };

  const handleAddVersion = async (planId: string) => {
    if (!projectId) {
      showError("ID du projet manquant pour ajouter une version.");
      return;
    }
    const newVersionId = generateId();
    const newVersion: DocumentVersion = {
      id: newVersionId,
      index: '',
      date: '',
      fileUrl: null,
      fileName: null
    };

    setPlans(plans.map(p => {
      if (p.id === planId) {
        const updatedVersions = [...p.versions, newVersion];
        return { ...p, versions: updatedVersions };
      }
      return p;
    }));

    try {
      const plan = plans.find(p => p.id === planId);
      if (!plan) throw new Error("Plan not found");

      const { error } = await supabase
        .from('project_documents')
        .insert([{
          project_id: projectId, // Corrected: Use the actual projectId from props
          plan_id: plan.id,
          version_id: newVersion.id,
          plan_name: plan.name,
          version_index: newVersion.index,
          version_date: newVersion.date || null,
          file_url: newVersion.fileUrl,
          file_name: newVersion.fileName,
        }]);

      if (error) throw error;
      showSuccess("Version ajoutée avec succès !");
    } catch (error: any) {
      console.error("Error adding version:", error);
      showError(`Échec de l'ajout de la version: ${error.message || 'Erreur inconnue'}`);
    }
  };

  const handleRemoveVersion = async (planId: string, versionId: string) => {
    if (!projectId) {
      showError("ID du projet manquant pour supprimer une version.");
      return;
    }
    const plan = plans.find(p => p.id === planId);
    if (!plan || plan.versions.length <= 1) {
      showError("Impossible de supprimer la dernière version d'un plan.");
      return;
    }

    try {
      const { error } = await supabase
        .from('project_documents')
        .delete()
        .eq('project_id', projectId)
        .eq('plan_id', planId)
        .eq('version_id', versionId);

      if (error) throw error;
      setPlans(plans.map(p => {
        if (p.id === planId) {
          return { ...p, versions: p.versions.filter(v => v.id !== versionId) };
        }
        return p;
      }));
      showSuccess("Version supprimée avec succès !");
    } catch (error: any) {
      console.error("Error removing version:", error);
      showError(`Échec de la suppression de la version: ${error.message || 'Erreur inconnue'}`);
    }
  };

  const handleVersionChange = async (planId: string, versionId: string, field: keyof DocumentVersion, value: string | null) => {
    setPlans(plans.map(p => {
      if (p.id === planId) {
        const updatedVersions = p.versions.map(v => v.id === versionId ? { ...v, [field]: value } : v);
        return { ...p, versions: updatedVersions };
      }
      return p;
    }));

    try {
      const dbFieldName = (f: keyof DocumentVersion) => {
        switch (f) {
          case 'index': return 'version_index';
          case 'date': return 'version_date';
          case 'fileUrl': return 'file_url';
          case 'fileName': return 'file_name';
          default: return f; // Should not happen for these fields
        }
      };

      const updatePayload: Record<string, string | null> = {
        [dbFieldName(field)]: value
      };

      const { error } = await supabase
        .from('project_documents')
        .update(updatePayload)
        .eq('project_id', projectId)
        .eq('plan_id', planId)
        .eq('version_id', versionId);

      if (error) throw error;
    } catch (error: any) {
      console.error(`Error updating version ${field}:`, error);
      showError(`Échec de la mise à jour du champ ${field} de la version: ${error.message || 'Erreur inconnue'}`);
    }
  };

  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Boîte à Documents</h3>
        <Button onClick={handleAddPlan} className="bg-brand-yellow hover:bg-yellow-400 text-black">
          <Plus className="mr-2 h-4 w-4" /> Ajouter un plan
        </Button>
      </div>
      {plans.map(plan => (
        <Card key={plan.id} className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between py-2 px-3">
            <CardTitle className="text-base">
              <Input 
                value={plan.name} 
                onChange={(e) => handlePlanNameChange(plan.id, e.target.value)}
                className="text-base font-bold border-0 focus-visible:ring-1 min-w-[150px]"
              />
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => handleRemovePlan(plan.id)}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </CardHeader>
          <CardContent className="p-1">
            <div className="w-full"> {/* Removed overflow-x-auto here */}
              <Table className="min-w-max"> {/* Changed w-full to min-w-max */}
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-8 whitespace-nowrap min-w-[80px]">Indice</TableHead>
                    <TableHead className="h-8 whitespace-nowrap min-w-[150px]">Date</TableHead>
                    <TableHead className="h-8 whitespace-nowrap min-w-[150px]">Fichier</TableHead>
                    <TableHead className="h-8 whitespace-nowrap min-w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plan.versions.map((version, index) => {
                    const isLatest = index === plan.versions.length - 1;
                    return (
                      <TableRow key={version.id}>
                        <TableCell className="p-1 whitespace-nowrap">
                          <Input 
                            value={version.index} 
                            onChange={(e) => handleVersionChange(plan.id, version.id, 'index', e.target.value)}
                            className="h-8 min-w-[80px]"
                            readOnly={!isLatest}
                          />
                        </TableCell>
                        <TableCell className="p-1 whitespace-nowrap">
                          <DatePickerButton 
                            date={version.date} 
                            setDate={(date) => handleVersionChange(plan.id, version.id, 'date', date)}
                            disabled={!isLatest}
                          />
                        </TableCell>
                        <TableCell className="p-1 whitespace-nowrap">
                          <DocumentVersionUploader
                            projectId={projectId}
                            planId={plan.id}
                            versionId={version.id}
                            planName={plan.name}
                            versionIndex={version.index}
                            versionDate={version.date}
                            currentFileUrl={version.fileUrl}
                            currentFileName={version.fileName}
                            onFileChange={(url, name) => handleVersionChange(plan.id, version.id, 'fileUrl', url).then(() => handleVersionChange(plan.id, version.id, 'fileName', name))}
                            disabled={!isLatest}
                          />
                        </TableCell>
                        <TableCell className="p-1 whitespace-nowrap">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleRemoveVersion(plan.id, version.id)}
                            disabled={!isLatest || plan.versions.length <= 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardFooter className="py-2 px-3">
            <Button variant="outline" size="sm" onClick={() => handleAddVersion(plan.id)}>
              <Plus className="mr-2 h-4 w-4" /> Ajouter une version
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};

export default DocumentBox;