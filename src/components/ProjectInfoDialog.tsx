"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import MaitriseOuvrageTable from "./MaitriseOuvrageTable";
import { MaitriseOuvrage } from "./StakeholdersDialog";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { useState, useEffect } from "react";

interface ProjectInfoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  projectAddress: string;
  maitriseOuvrage: MaitriseOuvrage[];
  setMaitriseOuvrage: (mo: MaitriseOuvrage[]) => void;
  onSaveSuccess: () => void;
}

const ProjectInfoDialog = ({ 
  isOpen, 
  onClose, 
  projectId,
  projectName: initialProjectName,
  projectAddress: initialProjectAddress,
  maitriseOuvrage,
  setMaitriseOuvrage,
  onSaveSuccess
}: ProjectInfoDialogProps) => {
  const [projectName, setProjectName] = useState(initialProjectName);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setProjectName(initialProjectName);
  }, [initialProjectName]);

  const handleSaveProjectName = async () => {
    if (!projectId) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({ 
          name: projectName, 
        })
        .eq('id', projectId);

      if (error) throw error;
      showSuccess("Nom du projet sauvegardé !");
      onSaveSuccess();
    } catch (error: any) {
      console.error("Error saving project info:", error);
      showError(`Échec de la sauvegarde du nom du projet: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Informations du Projet</DialogTitle>
          <DialogDescription>
            Remplissez ou modifiez les détails de votre projet et la Maîtrise d'Ouvrage.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-6 py-4 flex-grow overflow-y-auto">
          {/* Project Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name" className="text-sm font-medium">Nom du projet</Label>
              <Input 
                id="name" 
                value={projectName} 
                onChange={(e) => setProjectName(e.target.value)} 
                onBlur={handleSaveProjectName}
                className="mt-1 bg-brand-cream border-brand-gray text-black" 
              />
            </div>
            <div className="text-sm text-muted-foreground flex items-end pb-2">
              {/* Placeholder for address or other project info */}
            </div>
          </div>

          {/* Maitrise d'Ouvrage Table */}
          <MaitriseOuvrageTable 
            projectId={projectId}
            maitriseOuvrage={maitriseOuvrage}
            setMaitriseOuvrage={setMaitriseOuvrage}
            onSaveSuccess={onSaveSuccess}
          />
        </div>
        {/* DialogFooter supprimé car la sauvegarde est automatique */}
      </DialogContent>
    </Dialog>
  );
};

export default ProjectInfoDialog;