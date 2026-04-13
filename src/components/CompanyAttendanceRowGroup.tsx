"use client";

import React, { useState } from 'react';
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn, generateId } from '@/lib/utils';
import { FullContact } from '@/hooks/useCompanyContacts';
import { CompanyRow } from './CompanyListingTable';
import { AttendanceStatus, CompanyAttendance, ContactAttendanceState } from './ExecutionPhase';
import { Plus, Trash2 } from 'lucide-react';
import AttendanceColumns3 from './AttendanceColumns3';
import { Input } from './ui/input';
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
import ContactSmartSelector from './ContactSmartSelector';

interface CompanyAttendanceRowGroupProps {
  company: {
    id: string;
    lotNumber: string;
    lotName: string;
    raisonSociale: string;
    companyDetail: CompanyRow | undefined;
  };
  attendance: CompanyAttendance;
  contactMap: Map<string, FullContact>;
  index: number;
  handleCompanyContactSelection: (companyId: string, newContacts: SelectedContact[]) => void;
  handleCompanyAttendanceChange: (companyId: string, status: AttendanceStatus) => void;
  handleContactAttendanceChange: (companyId: string, contactId: string, field: keyof ContactAttendanceState, value: string | boolean) => void;
  handleAbsenceClick: (target: { type: 'company' | 'contact', id: string, name: string, contactId?: string }) => void;
  handleMouseDownAbsence: (target: { type: 'company' | 'contact', id: string, name: string, contactId?: string }, e: React.MouseEvent) => void;
  handleMouseUpAbsence: (e: React.MouseEvent) => void;
  onContactFieldChange?: (contactId: string, field: string, value: string) => void;
}

const CompanyAttendanceRowGroup = ({
  company,
  attendance,
  contactMap,
  index,
  handleCompanyContactSelection,
  handleCompanyAttendanceChange,
  handleContactAttendanceChange,
  handleAbsenceClick,
  handleMouseDownAbsence,
  handleMouseUpAbsence,
  onContactFieldChange,
}: CompanyAttendanceRowGroupProps) => {
  const [contactToRemove, setContactToRemove] = useState<string | null>(null);
  
  const companyDetails = company.companyDetail;
  const baseRowColorClass = index % 2 === 0 ? 'bg-brand-cream-light' : 'bg-white';
  
  const contactsToDisplay = attendance.selectedContacts.map(sc => contactMap.get(sc.id) || { id: sc.id, nom: sc.nom, role: sc.role, companyId: '', email: '', portable: '', adresse: '', codePostal: '', ville: '' });
  const companyAbsenceTarget = { type: 'company' as const, id: company.id, name: company.raisonSociale };

  const setContactStatus = (contactId: string, status: AttendanceStatus) => handleContactAttendanceChange(company.id, contactId, 'status', status);
  const setContactConvoque = (contactId: string, convoque: boolean) => handleContactAttendanceChange(company.id, contactId, 'convoque', convoque);

  const confirmRemoveContact = () => {
    if (contactToRemove) {
      const newSelection = attendance.selectedContacts.filter(c => c.id !== contactToRemove);
      handleCompanyContactSelection(company.id, newSelection);
      setContactToRemove(null);
    }
  };

  const handleAddBlankContact = () => {
    const newContacts = [...attendance.selectedContacts, { id: `temp-${generateId()}`, nom: '', role: '' }];
    handleCompanyContactSelection(company.id, newContacts);
  };

  const handleContactSelected = (contactId: string, name: string, details?: any) => {
    const newSelection = attendance.selectedContacts.map(c => {
        if (c.id === contactId) {
            return { id: details?.id || c.id, nom: name, role: details?.role || '' };
        }
        return c;
    });
    handleCompanyContactSelection(company.id, newSelection);
  };

  const inputStyle = "h-7 text-[10px] bg-transparent border-0 focus-visible:ring-1 p-1 w-full";

  return (
    <React.Fragment>
      <TableRow className="bg-[#ded3a4] hover:bg-[#ded3a4]/90 border-b border-gray-300">
        <TableCell colSpan={7} className="font-bold text-black py-1 px-3">
          <div className="flex items-center gap-3">
            <Button 
              onClick={handleAddBlankContact}
              size="icon" 
              className="h-6 w-6 bg-brand-yellow hover:bg-yellow-400 text-black border-none shadow-sm flex-shrink-0"
            >
              <Plus className="h-4 w-4" />
            </Button>

            <span className="whitespace-nowrap">
              Lot {company.lotNumber} -- {company.lotName} -- {company.raisonSociale}
            </span>
          </div>
        </TableCell>
      </TableRow>
      
      {attendance.selectedContacts.length === 0 ? (
        <TableRow key={company.id} className={baseRowColorClass}>
          <TableCell className="text-sm whitespace-nowrap p-1 py-1 pl-4">
            <span className="font-semibold text-muted-foreground italic text-xs">Aucun contact sélectionné.</span>
          </TableCell>
          <TableCell className="text-xs p-1">
            <div className="flex flex-col">
              <span className="whitespace-nowrap">{companyDetails?.adresse}</span>
              <span className="whitespace-nowrap text-muted-foreground">{companyDetails?.code_postal} {companyDetails?.ville}</span>
            </div>
          </TableCell>
          <TableCell className="text-xs p-1">{companyDetails?.telephone}</TableCell>
          <TableCell className="text-xs p-1">{companyDetails?.email}</TableCell>
          
          <AttendanceColumns3
            status={attendance.status}
            absences={attendance.absences}
            convoque={attendance.convoque}
            target={companyAbsenceTarget}
            onAttendanceChange={status => handleCompanyAttendanceChange(company.id, status)}
            onConvoqueChange={checked => handleCompanyAttendanceChange(company.id, checked ? 'Pres.' : 'Vide')}
            handleAbsenceClick={handleAbsenceClick}
            handleMouseDownAbsence={handleMouseDownAbsence}
            handleMouseUpAbsence={handleMouseUpAbsence}
          />
        </TableRow>
      ) : (
        contactsToDisplay.map((contactData) => {
          const contactId = contactData.id;
          const contactAttState = attendance.contactAttendance.find(c => c.contactId === contactId);
          const absenceTarget = { type: 'contact' as const, id: company.id, name: contactData.nom, contactId: contactId };

          return (
            <TableRow key={contactId} className={baseRowColorClass}>
              <TableCell className="text-sm whitespace-nowrap p-1 py-1 pl-4">
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setContactToRemove(contactId)}
                    className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <div className="flex-grow min-w-[150px]">
                    <ContactSmartSelector 
                      companyName={company.raisonSociale}
                      value={contactData.nom}
                      onChange={(name, details) => handleContactSelected(contactId, name, details)}
                    />
                  </div>
                </div>
              </TableCell>
              
              <TableCell className="text-xs p-1">
                <div className="flex flex-col gap-0.5">
                  <Input 
                    value={contactData.adresse} 
                    onChange={e => onContactFieldChange?.(contactId, 'adresse', e.target.value)}
                    placeholder="Saisir adresse..."
                    className={inputStyle}
                  />
                  <div className="flex gap-1">
                    <Input 
                      value={contactData.codePostal} 
                      onChange={e => onContactFieldChange?.(contactId, 'codePostal', e.target.value)}
                      placeholder="CP"
                      className={cn(inputStyle, "w-12")}
                    />
                    <Input 
                      value={contactData.ville} 
                      onChange={e => onContactFieldChange?.(contactId, 'ville', e.target.value)}
                      placeholder="Ville"
                      className={inputStyle}
                    />
                  </div>
                </div>
              </TableCell>

              <TableCell className="text-xs p-1">
                <Input 
                  value={contactData.portable} 
                  onChange={e => onContactFieldChange?.(contactId, 'portable', e.target.value)}
                  placeholder="Saisir portable..."
                  className={inputStyle}
                />
              </TableCell>

              <TableCell className="text-xs p-1">
                <Input 
                  value={contactData.email} 
                  onChange={e => onContactFieldChange?.(contactId, 'email', e.target.value)}
                  placeholder="Saisir email..."
                  className={inputStyle}
                />
              </TableCell>
              
              <AttendanceColumns3
                status={contactAttState?.status || 'Vide'}
                absences={contactAttState?.absences ?? null}
                convoque={contactAttState?.convoque ?? true}
                target={absenceTarget}
                onAttendanceChange={(status) => setContactStatus(contactId, status)}
                onConvoqueChange={(convoque) => setContactConvoque(contactId, convoque)}
                handleAbsenceClick={handleAbsenceClick}
                handleMouseDownAbsence={handleMouseDownAbsence}
                handleMouseUpAbsence={handleMouseUpAbsence}
              />
            </TableRow>
          );
        })
      )}

      <AlertDialog open={!!contactToRemove} onOpenChange={(open) => !open && setContactToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer ce contact ?</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous retirer cet intervenant de la liste des présences pour ce compte-rendu ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveContact} className="bg-red-600 hover:bg-red-700">
              Retirer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </React.Fragment>
  );
};

export default CompanyAttendanceRowGroup;