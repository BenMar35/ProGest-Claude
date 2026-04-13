"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Upload, FileText, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DocumentVersionUploaderProps {
  projectId: string;
  planId: string;
  versionId: string;
  planName: string;
  versionIndex: string;
  versionDate: string;
  currentFileUrl: string | null;
  currentFileName: string | null;
  onFileChange: (newFileUrl: string | null, newFileName: string | null) => Promise<void>;
  disabled?: boolean;
}

const DocumentVersionUploader = ({
  projectId,
  planId,
  versionId,
  planName,
  versionIndex,
  versionDate,
  currentFileUrl,
  currentFileName,
  onFileChange,
  disabled = false,
}: DocumentVersionUploaderProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false); // Keep isMobile for delete button logic
  const [signedUrl, setSignedUrl] = useState<string | null>(null); // New state for signed URL
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // Tailwind's 'md' breakpoint
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Effect to generate signed URL when dialog opens or currentFileUrl changes
  useEffect(() => {
    const generateAndSetSignedUrl = async () => {
      if (isDialogOpen && currentFileUrl && projectId && planId && versionId) {
        try {
          let filePath = currentFileUrl;
          // Case 1: URL is stored as 'supabase-storage://path/to/file'
          if (currentFileUrl.startsWith('supabase-storage://')) {
            filePath = currentFileUrl.replace('supabase-storage://', '');
          } 
          // Case 2: URL is a full public URL (e.g., from older entries in DB)
          else if (currentFileUrl.includes('/public/project-documents/')) {
            const pathSegments = currentFileUrl.split('/public/project-documents/');
            if (pathSegments.length > 1) {
              filePath = pathSegments[1];
            } else {
              console.error("Invalid public URL format for signed URL generation:", currentFileUrl);
              setSignedUrl(null);
              return;
            }
          } else {
            console.error("Unrecognized currentFileUrl format for signed URL generation:", currentFileUrl);
            setSignedUrl(null);
            return;
          }

          const { data, error } = await supabase.storage
            .from('project-documents')
            .createSignedUrl(filePath, 300); // 300 seconds = 5 minutes

          if (error) throw error;
          setSignedUrl(data.signedUrl);
          console.log("Generated Signed PDF URL (project-documents):", data.signedUrl);
        } catch (error) {
          console.error("Error generating signed URL for project-documents:", error);
          showError("Erreur lors de la génération de l'URL sécurisée pour le PDF.");
          setSignedUrl(null);
        }
      } else {
        setSignedUrl(null); // Clear signed URL when dialog closes or no file
      }
    };

    generateAndSetSignedUrl();
  }, [isDialogOpen, currentFileUrl, projectId, planId, versionId]);

  const handleUploadClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null;
    if (!selectedFile) return;

    if (selectedFile.type !== "application/pdf") {
      showError("Veuillez sélectionner un fichier PDF.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (!projectId || !planId || !versionId) {
      showError("Informations de document manquantes pour le téléversement.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(projectId) || !uuidRegex.test(planId) || !uuidRegex.test(versionId)) {
      console.error("Invalid ID format:", { projectId, planId, versionId });
      showError("L'ID du projet, plan ou version est invalide. Veuillez recharger la page ou contacter le support.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const sanitizedFileName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${projectId}/${planId}/${versionId}/${sanitizedFileName}`;

    try {
      showSuccess("Téléchargement du fichier en cours...");
      
      const { data, error } = await supabase.storage
        .from('project-documents') // Use the new bucket
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) throw error;

      // We no longer need getPublicUrl here, as we'll generate a signed URL for viewing
      const newFileUrl = `supabase-storage://${filePath}`; // Store the internal path or a reference
      const newFileName = selectedFile.name;

      // Update the project_documents table
      const { error: dbError } = await supabase
        .from('project_documents')
        .update({
          file_url: newFileUrl, // Store the internal path
          file_name: newFileName,
        })
        .eq('project_id', projectId)
        .eq('plan_id', planId)
        .eq('version_id', versionId);

      if (dbError) throw dbError;

      await onFileChange(newFileUrl, newFileName);
      showSuccess("Fichier PDF téléversé et enregistré avec succès !");

    } catch (error: any) {
      console.error("Error uploading PDF:", error);
      showError(`Échec du téléversement du PDF: ${error.message || 'Erreur inconnue'}`);
      await onFileChange(null, null);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const confirmDeleteFile = async () => {
    if (disabled) return;
    if (!currentFileUrl || !currentFileName) return;

    // Extract the file path from the stored URL (which is now an internal reference)
    const filePath = currentFileUrl.replace('supabase-storage://', '');
    if (!filePath) {
      showError("Chemin de fichier invalide pour la suppression.");
      return;
    }

    try {
      showSuccess("Suppression du fichier en cours...");
      
      const { error } = await supabase.storage
        .from('project-documents')
        .remove([filePath]);

      if (error) throw error;

      // Update the project_documents table
      const { error: dbError } = await supabase
        .from('project_documents')
        .update({
          file_url: null,
          file_name: null,
        })
        .eq('project_id', projectId)
        .eq('plan_id', planId)
        .eq('version_id', versionId);

      if (dbError) throw dbError;

      await onFileChange(null, null);
      showSuccess("Fichier PDF supprimé avec succès !");

    } catch (error: any) {
      console.error("Error deleting PDF:", error);
      showError(`Échec de la suppression du PDF: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setIsConfirmDialogOpen(false);
    }
  };

  const handleDeleteFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || !currentFileUrl) return;

    if (isMobile) {
      showError("La suppression de PDF n'est pas autorisée sur mobile.");
      return;
    } else {
      setIsConfirmDialogOpen(true);
    }
  };

  return (
    <div className="flex items-center justify-center h-full">
      <input
        type="file"
        accept="application/pdf"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />
      {!currentFileUrl ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-gray-500 hover:text-black"
          onClick={handleUploadClick}
          disabled={disabled}
        >
          <Upload className="h-4 w-4" />
        </Button>
      ) : (
        <>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-600 hover:text-blue-800 relative group">
                <FileText className="h-4 w-4" />
                {!disabled && !isMobile && (
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-4 w-4 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={handleDeleteFile}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col bg-white p-0"> {/* Changed p-6 to p-0 */}
              <DialogHeader className="p-6 pb-4"> {/* Added padding to header */}
                <DialogTitle>{currentFileName}</DialogTitle>
              </DialogHeader>
              <div className="flex-grow w-full">
                {signedUrl && ( // Use signedUrl for iframe src
                  <iframe
                    src={signedUrl}
                    className="w-full h-full border-0"
                    title={currentFileName || "Document PDF"}
                  />
                )}
              </div>
            </DialogContent>
          </Dialog>

          <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                <AlertDialogDescription>
                  Êtes-vous sûr de vouloir supprimer ce document PDF ? Cette action est irréversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDeleteFile}>Supprimer</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
};

export default DocumentVersionUploader;