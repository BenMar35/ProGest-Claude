"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import StakeholderCompanyTable, { StakeholderCompany } from "./StakeholderCompanyTable";
import GenericStakeholderTable, { ColumnDefinition } from "./GenericStakeholderTable";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { CompanyRow } from "./CompanyListingTable";
import { generateId } from "@/lib/utils";
import ProjectCompanyContactsTable from "./ProjectCompanyContactsTable";
import MaitriseOuvrageTable from "./MaitriseOuvrageTable";
import MissionTable from "./MissionTable";

export type MaitriseOuvrage = {
  id: string;
  nom: string; // Raison Sociale
  contact: string;
  adresse: string;
  codePostal: string;
  ville: string;
  coordonneesContact: string; // Utilisé pour le téléphone
  email: string;
};

export type Mission = {
  id: string;
  missionId?: string; // Relation master_missions
  entityId?: string;  // Relation master_companies
  contactId?: string; // Relation company_contacts
  mission: string;
  raisonSociale: string;
  contact: string;
  adresse: string;
  contactInfo: string;
};

interface StakeholdersDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadCompanies: () => void;
  masterStakeholderCompanies: StakeholderCompany[];
  setMasterStakeholderCompanies: (companies: StakeholderCompany[]) => void;
  projectCompanies: CompanyRow[];
  setProjectCompanies: (companies: CompanyRow[]) => void;
  onUploadMaitriseOuvrage: () => void;
  maitriseOuvrage: MaitriseOuvrage[];
  setMaitriseOuvrage: (mo: MaitriseOuvrage[]) => void;
  onUploadMissions: () => void;
  missions: Mission[];
  setMissions: (missions: Mission[]) => void;
  projectId: string;
  onSaveSuccess: () => void;
  onSaveProjectCompanies: () => Promise<void>;
}

const StakeholdersDialog = ({ 
  isOpen, 
  onClose, 
  onUploadCompanies,
  masterStakeholderCompanies,
  setMasterStakeholderCompanies,
  projectCompanies,
  setProjectCompanies,
  onUploadMaitriseOuvrage,
  maitriseOuvrage,
  setMaitriseOuvrage,
  onUploadMissions,
  missions,
  setMissions,
  projectId,
  onSaveSuccess,
  onSaveProjectCompanies
}: StakeholdersDialogProps) => {

  const handleAddCompanyToProject = async (company: StakeholderCompany) => {
    if (!projectId) return;
    if (projectCompanies.some(pc => pc.raison_sociale === company.raisonSociale)) {
      showError(`"${company.raisonSociale}" est déjà ajoutée.`);
      return;
    }
    try {
      const { data, error } = await supabase.from('project_companies').insert([{
        project_id: projectId,
        raison_sociale: company.raisonSociale,
        adresse: company.adresse,
        code_postal: company.codePostal,
        ville: company.ville,
        telephone: company.telephone,
        email: company.email,
        siret: company.siret,
        ao_lots: [],
        compta_lots: []
      }]).select();
      if (error) throw error;
      if (data && data.length > 0) {
        setProjectCompanies([...projectCompanies, data[0] as unknown as CompanyRow]);
        showSuccess(`"${company.raisonSociale}" ajoutée au projet.`);
        onSaveSuccess(); 
      }
    } catch (error: any) {
      showError(`Erreur: ${error.message}`);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col p-6">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Gestion des Intervenants</DialogTitle>
          <DialogDescription>
            Gérez les contacts et les rôles des participants au projet.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="entreprises" className="w-full mt-4 flex-grow flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-4 flex-shrink-0">
            <TabsTrigger value="entreprises">Entreprises Maîtres</TabsTrigger>
            <TabsTrigger value="contacts-entreprises">Contacts Projet</TabsTrigger>
            <TabsTrigger value="maitrise-ouvrage">Maîtrise d'Ouvrage</TabsTrigger>
            <TabsTrigger value="missions">Missions</TabsTrigger>
          </TabsList>
          
          <TabsContent value="entreprises" className="flex-grow flex flex-col mt-4 min-h-0">
            <div className="flex flex-col gap-4 flex-grow min-h-0">
              <Button onClick={onUploadCompanies} className="bg-brand-yellow hover:bg-yellow-400 text-black w-fit flex-shrink-0">
                <Plus className="mr-2 h-4 w-4" /> Importer des entreprises (.csv)
              </Button>
              <StakeholderCompanyTable 
                projectId={projectId}
                companies={masterStakeholderCompanies}
                setCompanies={setMasterStakeholderCompanies}
                onRefresh={onSaveSuccess}
              />
              <Button onClick={onSaveProjectCompanies} className="bg-brand-yellow hover:bg-yellow-400 text-black w-full flex-shrink-0">
                Sauvegarder les entreprises du projet
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="contacts-entreprises" className="flex-grow flex flex-col mt-4 min-h-0">
            <ProjectCompanyContactsTable 
              projectId={projectId}
              projectCompanies={projectCompanies}
            />
          </TabsContent>
          
          <TabsContent value="maitrise-ouvrage" className="flex-grow flex flex-col mt-4 min-h-0">
            <div className="flex flex-col gap-4 flex-grow min-h-0">
              <Button onClick={onUploadMaitriseOuvrage} className="bg-brand-yellow hover:bg-yellow-400 text-black w-fit flex-shrink-0">
                <Plus className="mr-2 h-4 w-4" /> Importer MO (.csv)
              </Button>
              <MaitriseOuvrageTable 
                projectId={projectId}
                maitriseOuvrage={maitriseOuvrage}
                setMaitriseOuvrage={setMaitriseOuvrage}
                onSaveSuccess={onSaveSuccess}
              />
            </div>
          </TabsContent>

          <TabsContent value="missions" className="flex-grow flex flex-col mt-4 min-h-0">
            <MissionTable
              projectId={projectId}
              missions={missions}
              setMissions={setMissions}
              projectCompanies={projectCompanies}
              onSaveSuccess={onSaveSuccess}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default StakeholdersDialog;