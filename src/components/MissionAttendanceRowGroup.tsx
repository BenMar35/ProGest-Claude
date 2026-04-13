"use client";

import React, { useState } from 'react';
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { generateId } from '@/lib/utils';
import { FullContact } from '@/hooks/useCompanyContacts';
import { CompanyRow } from './CompanyListingTable';
import { AttendanceStatus, ContactAttendanceState } from './ExecutionPhase';
import { Plus, Trash2 } from 'lucide-react';
import CatalogueMissionCombobox from './CatalogueMissionCombobox';
import LegalEntitySelector from './LegalEntitySelector';
import AttendanceColumn1 from './AttendanceColumn1';
import MissionContactAttendanceRow from './MissionContactAttendanceRow';
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
import { SelectedContact } from './CompanyContactSelectorPopover';

interface MissionAttendanceRowGroupProps {
  mission: {
    id: string;
    missionName: string;
    raisonSociale: string;
    companyDetail: CompanyRow | undefined;
  };
  attendance: {
    id: string;
    status: AttendanceStatus;
    selectedContacts: SelectedContact[];
    contactAttendance: ContactAttendanceState[];
  };
  contactMap: Map<string, FullContact>;
  index: number;
  handleCompanyContactSelection: (companyId: string, newContacts: SelectedContact[]) => void;
  handleContactAttendanceChange: (companyId: string, contactId: string, field: keyof ContactAttendanceState, value: string | boolean) => void;
  onMissionNameChange?: (companyId: string, name: string) => void; 
  onRaisonSocialeChange?: (companyId: string, name: string, details?: any) => void;
  onContactFieldChange?: (contactId: string, field: string, value: string) => void;
  onDeleteMission?: (id: string) => void;
}

const MissionAttendanceRowGroup = ({
  mission,
  attendance,
  contactMap,
  index,
  handleCompanyContactSelection,
  handleContactAttendanceChange,
  onMissionNameChange,
  onRaisonSocialeChange,
  onContactFieldChange,
  onDeleteMission,
}: MissionAttendanceRowGroupProps) => {
  const [contactToRemove, setContactToRemove] = useState<string | null>(null);
  const [isMissionConfirmOpen, setIsMissionConfirmOpen] = useState(false);
  
  const baseRowColorClass = index % 2 === 0 ? 'bg-brand-cream-light' : 'bg-white';
  
  const confirmRemoveContact = () => {
    if (contactToRemove) {
      const newSelection = attendance.selectedContacts.filter(c => c.id !== contactToRemove);
      handleCompanyContactSelection(mission.id, newSelection);
      setContactToRemove(null);
    }
  };

  const handleAddBlankContact = () => {
    const newContacts = [...attendance.selectedContacts, { id: `temp-${generateId()}`, nom: '', role: '' }];
    handleCompanyContactSelection(mission.id, newContacts);
  };

  const handleContactSelected = (contactId: string, name: string, details?: any) => {
    const newSelection = attendance.selectedContacts.map(c => {
        if (c.id === contactId) {
            return { id: details?.id || c.id, nom: name, role: details?.role || '' };
        }
        return c;
    });
    handleCompanyContactSelection(mission.id, newSelection);
  };

  return (
    <React.Fragment>
      <TableRow className="bg-[#ded3a4] hover:bg-[#ded3a4]/90 border-b border-gray-300">
        <TableCell colSpan={5} className="font-bold text-black py-0.5 px-3">
          <div className="flex items-center gap-2">
            <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsMissionConfirmOpen(true)}
                className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
            >
                <Trash2 className="h-4 w-4" />
            </Button>

            <Button 
                onClick={handleAddBlankContact}
                size="icon" 
                className="h-7 w-7 bg-brand-yellow hover:bg-yellow-400 text-black border-none shadow-sm flex-shrink-0"
            >
                <Plus className="h-4 w-4" />
            </Button>

            <CatalogueMissionCombobox value={mission.missionName} onChange={(name) => onMissionNameChange?.(mission.id, name)} />
            <span className="text-gray-600">-</span>
            <div className="min-w-[200px]">
                <LegalEntitySelector value={mission.raisonSociale} onChange={(name, details) => onRaisonSocialeChange?.(mission.id, name, details)} />
            </div>
          </div>
        </TableCell>
      </TableRow>
      
      {attendance.selectedContacts.length === 0 ? (
        <TableRow className={baseRowColorClass}>
          <TableCell colSpan={4} className="text-[10px] text-muted-foreground italic px-4 py-1">Sélectionnez ou créez un contact pour afficher ses coordonnées</TableCell>
          <AttendanceColumn1 isPresent={false} onAttendanceChange={() => {}} />
        </TableRow>
      ) : (
        attendance.selectedContacts.map((contactLink) => {
          const contactData = contactMap.get(contactLink.id);
          const contactAttState = attendance.contactAttendance.find(c => c.contactId === contactLink.id);
          const isPresent = contactAttState?.status === 'Pres.';

          return (
            <MissionContactAttendanceRow
              key={contactLink.id}
              contactLink={contactLink}
              contactData={contactData}
              isPresent={isPresent}
              raisonSociale={mission.raisonSociale}
              baseRowColorClass={baseRowColorClass}
              onRemove={setContactToRemove}
              onContactSelected={handleContactSelected}
              onFieldUpdate={(id, field, val) => onContactFieldChange?.(id, field, val)}
              onStatusChange={(id, status) => handleContactAttendanceChange(mission.id, id, 'status', status)}
            />
          );
        })
      )}

      <AlertDialog open={!!contactToRemove} onOpenChange={(open) => !open && setContactToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer ce contact ?</AlertDialogTitle>
            <AlertDialogDescription>Voulez-vous retirer cet intervenant de la liste pour ce compte-rendu ?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveContact} className="bg-red-600 hover:bg-red-700">Retirer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isMissionConfirmOpen} onOpenChange={setIsMissionConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette mission ?</AlertDialogTitle>
            <AlertDialogDescription>Ceci retirera définitivement la mission de la liste des intervenants du projet.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => onDeleteMission?.(mission.id)} className="bg-red-600 hover:bg-red-700">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </React.Fragment>
  );
};

export default MissionAttendanceRowGroup;