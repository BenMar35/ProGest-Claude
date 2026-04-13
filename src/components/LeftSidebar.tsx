"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, FolderKanban, Users, ListTree, CalendarDays } from "lucide-react";
import ProjectInfoDialog from "@/components/ProjectInfoDialog";
import StakeholdersDialog, { MaitriseOuvrage, Mission } from "@/components/StakeholdersDialog";
import { showSuccess, showError } from "@/utils/toast";
import Papa from "papaparse";
import { CompanyRow } from "@/components/CompanyListingTable";
import { StakeholderCompany } from "@/components/StakeholderCompanyTable";
import { AllotmentRow } from "./AllotmentTable";
import { supabase } from "@/integrations/supabase/client";
import { generateId, resetFileInput, validateCSVRow } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SIDEBAR_CONTENT_WIDTH, BUTTON_WIDTH, BUTTON_HEIGHT } from "@/lib/constants"; // Importation des constantes

interface LeftSidebarProps {
  setLots: (lots: string[]) => void;
  setCompanies: (companies: CompanyRow[]) => void;
  onOpenPlanning: () => void;
  onOpenAllotmentPhase: () => void;
  stakeholderCompanies: StakeholderCompany[];
  setStakeholderCompanies: (companies: StakeholderCompany[]) => void;
  maitriseOuvrage: MaitriseOuvrage[];
  setMaitriseOuvrage: (mo: MaitriseOuvrage[]) => void;
  missions: Mission[];
  setMissions: (missions: Mission[]) => void;
  allotmentRows: AllotmentRow[];
  setAllotmentRows: (rows: AllotmentRow[]) => void;
  lots: string[];
  projectId: string;
  projectName: string; // NEW
  projectAddress: string; // NEW
  refreshMasterData: () => void;
  projectCompanies: CompanyRow[];
  onSaveSuccess: () => void;
  onSaveProjectCompanies: () => Promise<void>;
}

const LeftSidebar = ({ 
  setLots, 
  setCompanies, 
  onOpenPlanning,
  onOpenAllotmentPhase,
  stakeholderCompanies,
  setStakeholderCompanies,
  maitriseOuvrage,
  setMaitriseOuvrage,
  missions,
  setMissions,
  allotmentRows,
  setAllotmentRows,
  lots,
  projectId,
  projectName,
  projectAddress,
  refreshMasterData,
  projectCompanies,
  onSaveSuccess,
  onSaveProjectCompanies
}: LeftSidebarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isProjectInfoOpen, setIsProjectInfoOpen] = useState(false);
  const [isStakeholdersOpen, setIsStakeholdersOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const lotsFileInputRef = useRef<HTMLInputElement>(null);
  const companiesFileInputRef = useRef<HTMLInputElement>(null);
  const maitriseOuvrageFileInputRef = useRef<HTMLInputElement>(null);
  const missionsFileInputRef = useRef<HTMLInputElement>(null);

  const commonFileValidation = (file: File, expectedExtension: string, maxSizeMB: number): boolean => {
    if (!file.name.endsWith(expectedExtension)) {
      showError(`Format de fichier non supporté. Utilisez un fichier ${expectedExtension.toUpperCase()}.`);
      return false;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      showError(`Fichier trop volumineux (max ${maxSizeMB}MB).`);
      return false;
    }
    return true;
  };

  const handleLotsFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!commonFileValidation(file, '.csv', 5)) {
      resetFileInput(lotsFileInputRef);
      return;
    }

    setIsUploading(true);
    try {
      await new Promise<void>((resolve, reject) => {
        Papa.parse<string[]>(file, {
          skipEmptyLines: true,
          complete: async (results) => {
            const parsedLots = results.data.map(row => row[0]).filter(Boolean);
            if (parsedLots.length === 0) {
              showError("Le fichier CSV est vide ou mal formaté.");
              reject(new Error("Empty or malformed CSV"));
              return;
            }

            try {
              const { error } = await supabase
                .from('master_lots')
                .upsert(parsedLots.map(lotName => ({ name: lotName })), { onConflict: 'name' });

              if (error) throw error;

              showSuccess(`Fichier "${file.name}" chargé avec ${parsedLots.length} lots dans la liste maître.`);
              refreshMasterData();
              resolve();
            } catch (error: any) {
              console.error("Error uploading lots:", error);
              showError(`Échec de l'importation des lots: ${error.message || 'Erreur inconnue'}`);
              reject(error);
            }
          },
          error: (error) => {
            showError(`Erreur de lecture : ${error.message}`);
            reject(error);
          },
        });
      });
    } catch (error) {
      // Error already handled by showError inside the promise
    } finally {
      setIsUploading(false);
      resetFileInput(lotsFileInputRef);
    }
  };

  const handleCompaniesFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!commonFileValidation(file, '.csv', 5)) {
      resetFileInput(companiesFileInputRef);
      return;
    }

    setIsUploading(true);
    try {
      await new Promise<void>((resolve, reject) => {
        Papa.parse<string[]>(file, {
          skipEmptyLines: true,
          complete: async (results) => {
            // Expecting 8 columns now: Raison Sociale, Adresse, Code Postal, Ville, Téléphone, Email, Dept, SIRET
            const expectedColumns = 8;
            const newCompanies: StakeholderCompany[] = results.data
              .slice(1)
              .filter(row => validateCSVRow(row, expectedColumns))
              .map((row) => ({
                id: generateId(),
                raisonSociale: row[0] || "",
                adresse: row[1] || "",
                codePostal: row[2] || "",
                ville: row[3] || "",
                telephone: row[4] || "",
                email: row[5] || "",
                dept: row[6] || "",
                siret: row[7] || "",
              }));
            
            if (newCompanies.length === 0) {
              showError(`Le fichier CSV est vide ou mal formaté (vérifiez l'en-tête et les ${expectedColumns} colonnes).`);
              reject(new Error("Empty or malformed CSV"));
              return;
            }

            try {
              const { error } = await supabase
                .from('master_companies')
                .upsert(newCompanies.map(c => ({
                  raison_sociale: c.raisonSociale,
                  adresse: c.adresse,
                  code_postal: c.codePostal,
                  ville: c.ville,
                  telephone: c.telephone,
                  email: c.email,
                  dept: c.dept,
                  siret: c.siret,
                })), { onConflict: 'raison_sociale' });

              if (error) throw error;

              showSuccess(`Fichier "${file.name}" chargé avec ${newCompanies.length} entreprises dans la liste maître.`);
              refreshMasterData();
              resolve();
            } catch (error: any) {
              console.error("Error uploading companies:", error);
              showError(`Échec de l'importation des entreprises: ${error.message || 'Erreur inconnue'}`);
              reject(error);
            }
          },
          error: (error) => {
            showError(`Erreur de lecture : ${error.message}`);
            reject(error);
          },
        });
      });
    } catch (error) {
      // Error already handled by showError inside the promise
    } finally {
      setIsUploading(false);
      resetFileInput(companiesFileInputRef);
    }
  };

  const handleMaitriseOuvrageFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!commonFileValidation(file, '.csv', 5)) {
      resetFileInput(maitriseOuvrageFileInputRef);
      return;
    }

    setIsUploading(true);
    try {
      await new Promise<void>((resolve, reject) => {
        Papa.parse<string[]>(file, {
          skipEmptyLines: true,
          complete: (results) => {
            // Expecting 5 columns now: Nom / Client, Contact, Rôle / Poste, Adresse, Tél./Port./Courriel
            const newMO: MaitriseOuvrage[] = results.data
              .slice(1)
              .filter(row => validateCSVRow(row, 5))
              .map((row) => ({
                id: generateId(),
                nom: row[0] || "", // Raison Sociale
                contact: row[1] || "", // Contact
                rolePoste: row[2] || "",
                adresse: row[3] || "",
                codePostal: "", // Missing in CSV, default empty
                ville: "", // Missing in CSV, default empty
                coordonneesContact: row[4] || "", // Tél./Port./Courriel
              }));
            
            if (newMO.length > 0) {
              setMaitriseOuvrage(newMO);
              showSuccess(`Fichier "${file.name}" chargé avec ${newMO.length} intervenants.`);
              resolve();
            } else {
              showError("Le fichier CSV est vide ou mal formaté (vérifiez l'en-tête et les 5 colonnes).");
              reject(new Error("Empty or malformed CSV"));
            }
          },
          error: (error) => {
            showError(`Erreur de lecture : ${error.message}`);
            reject(error);
          },
        });
      });
    } catch (error) {
      // Error already handled by showError inside the promise
    } finally {
      setIsUploading(false);
      resetFileInput(maitriseOuvrageFileInputRef);
    }
  };

  const handleMissionsFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!commonFileValidation(file, '.csv', 5)) {
      resetFileInput(missionsFileInputRef);
      return;
    }

    setIsUploading(true);
    try {
      await new Promise<void>((resolve, reject) => {
        Papa.parse<string[]>(file, {
          skipEmptyLines: true,
          complete: (results) => {
            const newMissions: Mission[] = results.data
              .slice(1)
              .filter(row => validateCSVRow(row, 5))
              .map((row) => ({
                id: generateId(),
                mission: row[0] || "",
                raisonSociale: row[1] || "",
                contact: row[2] || "",
                adresse: row[3] || "",
                contactInfo: row[4] || "",
              }));
            
            if (newMissions.length > 0) {
              setMissions(newMissions);
              showSuccess(`Fichier "${file.name}" chargé avec ${newMissions.length} missions.`);
              resolve();
            } else {
              showError("Le fichier CSV est vide ou mal formaté (vérifiez l'en-tête et les 5 colonnes).");
              reject(new Error("Empty or malformed CSV"));
            }
          },
          error: (error) => {
            showError(`Erreur de lecture : ${error.message}`);
            reject(error);
          },
        });
      });
    } catch (error) {
      // Error already handled by showError inside the promise
    } finally {
      setIsUploading(false);
      resetFileInput(missionsFileInputRef);
    }
  };

  const handleLotsUploadClick = () => {
    lotsFileInputRef.current?.click();
  };

  const handleCompaniesClick = () => {
    companiesFileInputRef.current?.click();
  };

  const handleMaitriseOuvrageClick = () => {
    maitriseOuvrageFileInputRef.current?.click();
  };

  const handleMissionsClick = () => {
    missionsFileInputRef.current?.click();
  };

  return (
    <React.Fragment>
      {/* Sidebar Content Panel */}
      <div
        className={`fixed top-0 left-0 h-full bg-brand-cream text-black z-30 transition-transform duration-300 ease-in-out p-4 overflow-y-auto`}
        style={{
          width: SIDEBAR_CONTENT_WIDTH,
          transform: isOpen ? 'translateX(0)' : `translateX(-${SIDEBAR_CONTENT_WIDTH})` // Content slides fully out
        }}
      >
        <div className="border-b pb-2 mb-4 border-gray-400">
          <h2 className="text-2xl font-bold">INFO</h2>
        </div>
        <div className="flex flex-col items-center gap-6 pt-4">
          <div className="flex flex-col items-center gap-2 cursor-pointer" onClick={() => setIsProjectInfoOpen(true)}>
            <Button variant="ghost" size="icon" className="h-16 w-16 rounded-full bg-white/50 hover:bg-white/80">
              <FolderKanban className="h-8 w-8" />
            </Button>
            <span className="text-sm font-semibold">Projet</span>
          </div>
          <div className="flex flex-col items-center gap-2 cursor-pointer" onClick={() => setIsStakeholdersOpen(true)}>
            <Button variant="ghost" size="icon" className="h-16 w-16 rounded-full bg-white/50 hover:bg-white/80">
              <Users className="h-8 w-8" />
            </Button>
            <span className="text-sm font-semibold">Entreprises & Contacts</span>
          </div>
          <div className="flex flex-col items-center gap-2 cursor-pointer" onClick={onOpenPlanning}>
            <Button variant="ghost" size="icon" className="h-16 w-16 rounded-full bg-white/50 hover:bg-white/80">
              <CalendarDays className="h-8 w-8" />
            </Button>
            <span className="text-sm font-semibold">Planning</span>
          </div>
          <div className="flex flex-col items-center gap-2 cursor-pointer" onClick={onOpenAllotmentPhase}>
            <Button variant="ghost" size="icon" className="h-16 w-16 rounded-full bg-white/50 hover:bg-white/80">
              <ListTree className="h-8 w-8" />
            </Button>
            <span className="text-sm font-semibold">Allotissement</span>
          </div>
          <input
            type="file"
            ref={lotsFileInputRef}
            onChange={handleLotsFileChange}
            className="hidden"
            accept=".csv"
            disabled={isUploading}
          />
          <input
            type="file"
            ref={companiesFileInputRef}
            onChange={handleCompaniesFileChange}
            className="hidden"
            accept=".csv"
            disabled={isUploading}
          />
          <input
            type="file"
            ref={maitriseOuvrageFileInputRef}
            onChange={handleMaitriseOuvrageFileChange}
            className="hidden"
            accept=".csv"
            disabled={isUploading}
          />
          <input
            type="file"
            ref={missionsFileInputRef}
            onChange={handleMissionsFileChange}
            className="hidden"
            accept=".csv"
            disabled={isUploading}
          />
        </div>
      </div>

      {/* Toggle Button */}
      <Button
        variant="outline"
        size="icon"
        className={cn(
          "fixed top-[100px] bg-brand-yellow hover:bg-yellow-400 text-black rounded-md z-40", // Increased z-index to ensure it's on top
        )}
        style={{
          left: isOpen ? `calc(${SIDEBAR_CONTENT_WIDTH} - 6px)` : `calc(0px - ${BUTTON_WIDTH} + 6px)`, // Adjusted for 6px overlap
          transition: 'left 300ms ease-in-out',
          width: BUTTON_WIDTH, // Apply width from constants
          height: BUTTON_HEIGHT, // Apply height from constants
        }}
        onClick={() => setIsOpen(!isOpen)}
        disabled={isUploading}
      >
        {isOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
      </Button>

      <ProjectInfoDialog 
        isOpen={isProjectInfoOpen} 
        onClose={() => setIsProjectInfoOpen(false)} 
        projectId={projectId}
        projectName={projectName}
        projectAddress={projectAddress}
        maitriseOuvrage={maitriseOuvrage}
        setMaitriseOuvrage={setMaitriseOuvrage}
        onSaveSuccess={onSaveSuccess}
      />
      <StakeholdersDialog 
        isOpen={isStakeholdersOpen} 
        onClose={() => setIsStakeholdersOpen(false)}
        onUploadCompanies={handleCompaniesClick}
        masterStakeholderCompanies={stakeholderCompanies}
        setMasterStakeholderCompanies={setStakeholderCompanies}
        projectCompanies={projectCompanies}
        setProjectCompanies={setCompanies}
        onUploadMaitriseOuvrage={handleMaitriseOuvrageClick}
        maitriseOuvrage={maitriseOuvrage}
        setMaitriseOuvrage={setMaitriseOuvrage}
        onUploadMissions={handleMissionsClick}
        missions={missions}
        setMissions={setMissions}
        projectId={projectId}
        onSaveSuccess={onSaveSuccess}
        onSaveProjectCompanies={onSaveProjectCompanies}
      />
      {isUploading && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <Loader2 className="h-10 w-10 animate-spin text-brand-yellow" />
        </div>
      )}
    </React.Fragment>
  );
};

export default LeftSidebar;