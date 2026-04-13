"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Upload, FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';
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

interface PdfUploadViewerProps {
  projectId: string;
  lot: string;
  projectCompanyId: string | null;
  documentType: 'marche' | 'avenant' | 'bp';
  documentIndex: number; // 0 for marche, 0,1,2... for avenant/bp
  currentFileUrl: string | null;
  currentFileName: string | null;
  onFileChange: (newFileUrl: string | null, newFileName: string | null) => void;
  disabled?: boolean;
  file?: File | null; // Added for PlanBox compatibility
}

const PdfUploadViewer = ({
  projectId,
  lot,
  projectCompanyId,
  documentType,
  documentIndex,
  currentFileUrl,
  currentFileName,
  onFileChange,
  disabled = false,
  file = null, // Default to null
}: PdfUploadViewerProps) => {
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
      if (isDialogOpen && currentFileUrl && projectId) {
        try {
          let filePath = currentFileUrl;
          // Case 1: URL is stored as 'supabase-storage://path/to/file'
          if (currentFileUrl.startsWith('supabase-storage://')) {
            filePath = currentFileUrl.replace('supabase-storage://', '');
          } 
          // Case 2: URL is a full public URL (e.g., from older entries in DB)
          else if (currentFileUrl.includes('/public/accounting-documents/')) {
            const pathSegments = currentFileUrl.split('/public/accounting-documents/');
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
            .from('accounting-documents')
            .createSignedUrl(filePath, 300); // 300 seconds = 5 minutes

          if (error) throw error;
          setSignedUrl(data.signedUrl);
          console.log("Generated Signed PDF URL (accounting-documents):", data.signedUrl);
        } catch (error) {
          console.error("Error generating signed URL for accounting-documents:", error);
          showError("Erreur lors de la génération de l'URL sécurisée pour le PDF.");
          setSignedUrl(null);
        }
      } else {
        setSignedUrl(null); // Clear signed URL when dialog closes or no file
      }
    };

    generateAndSetSignedUrl();
  }, [isDialogOpen, currentFileUrl, projectId]);

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

    // If projectId is empty, it means it's for PlanBox, handle locally
    if (!projectId) {
      onFileChange(URL.createObjectURL(selectedFile), selectedFile.name);
      showSuccess("Fichier PDF sélectionné localement !");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (!lot || documentType === undefined || documentIndex === undefined) {
      showError("Informations de document manquantes pour le téléversement.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(projectId)) {
      console.error("Invalid projectId format:", projectId);
      showError("L'ID du projet est invalide. Veuillez recharger la page ou contacter le support.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const sanitizedLot = lot.replace(/[^a-zA-Z0-9-_]/g, '_');
    const companyIdForPath = projectCompanyId || 'unassigned';
    const sanitizedFileName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');

    const filePath = `${projectId}/${sanitizedLot}/${companyIdForPath}/${documentType}-${documentIndex}-${sanitizedFileName}`;

    try {
      showSuccess("Téléchargement du fichier en cours...");
      
      const { data, error } = await supabase.storage
        .from('accounting-documents')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) throw error;

      // We no longer need getPublicUrl here, as we'll generate a signed URL for viewing
      const newFileUrl = `supabase-storage://${filePath}`; // Placeholder or internal reference
      const newFileName = selectedFile.name;
      
      const { data: dbData, error: dbError } = await supabase
        .from('accounting_documents')
        .upsert({
          project_id: projectId,
          lot: lot,
          project_company_id: projectCompanyId,
          document_type: documentType,
          document_index: documentIndex,
          file_url: newFileUrl, // Store the internal path or a reference, not the public URL
          file_name: newFileName,
        }, { onConflict: ['project_id', 'lot', 'project_company_id', 'document_type', 'document_index'] })
        .select();

      if (dbError) throw dbError;

      onFileChange(newFileUrl, newFileName);
      showSuccess("Fichier PDF téléversé et enregistré avec succès !");

    } catch (error: any) {
      console.error("Error uploading PDF:", error);
      showError(`Échec du téléversement du PDF: ${error.message || 'Erreur inconnue'}`);
      onFileChange(null, null);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const confirmDeleteFile = async () => {
    if (disabled) return;

    // If projectId is empty, it's for PlanBox, handle locally
    if (!projectId) {
      onFileChange(null, null);
      showSuccess("Fichier PDF supprimé localement !");
      setIsConfirmDialogOpen(false);
      return;
    }

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
        .from('accounting-documents')
        .remove([filePath]);

      if (error) throw error;

      const { error: dbError } = await supabase
        .from('accounting_documents')
        .delete()
        .eq('project_id', projectId)
        .eq('lot', lot)
        .eq('project_company_id', projectCompanyId)
        .eq('document_type', documentType)
        .eq('document_index', documentIndex);

      if (dbError) throw dbError;

      onFileChange(null, null);
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
    if (disabled || (!currentFileUrl && !file)) return;

    if (isMobile) {
      showError("La suppression de PDF n'est pas autorisée sur mobile.");
      return;
    } else {
      setIsConfirmDialogOpen(true);
    }
  };

  const displayFileUrl = projectId ? signedUrl : (file ? URL.createObjectURL(file) : null);
  const displayFileName = projectId ? currentFileName : (file ? file.name : null);

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
      {!currentFileUrl ? ( // Check currentFileUrl to determine if a file is associated
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
          <div className="relative group"> {/* Wrapper div to correctly position delete button */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-600 hover:text-blue-800"> {/* Removed 'relative' from here */}
                  <FileText className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl h-[90vh] flex flex-col bg-white p-0"> {/* Changed p-6 to p-0 */}
                <DialogHeader className="p-6 pb-4"> {/* Added padding to header */}
                  <DialogTitle>{displayFileName}</DialogTitle>
                </DialogHeader>
                <div className="flex-grow w-full">
                  {displayFileUrl && (
                    <iframe
                      src={displayFileUrl}
                      className="w-full h-full border-0"
                      title={displayFileName || "Document PDF"}
                    />
                  )}
                </div>
              </DialogContent>
            </Dialog>

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
          </div>

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

export default PdfUploadViewer;