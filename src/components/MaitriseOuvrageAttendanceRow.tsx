"use client";

import React, { useState, useEffect } from 'react';
import { TableCell, TableRow } from "@/components/ui/table";
import { MaitriseOuvrage } from './StakeholdersDialog';
import { cn } from '@/lib/utils';
import AttendanceColumn1 from './AttendanceColumn1';
import { AttendanceStatus } from './ExecutionPhase';
import ContactSmartSelector from './ContactSmartSelector';
import { Input } from './ui/input';
import { Trash2 } from 'lucide-react';
import { Button } from './ui/button';
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

interface MaitriseOuvrageAttendanceRowProps {
  mo: MaitriseOuvrage;
  index: number;
  isPresent: boolean;
  onAttendanceChange: (moId: string, status: AttendanceStatus) => void;
  onContactChange: (moId: string, name: string, details?: any) => void;
  onFieldUpdate?: (moId: string, field: string, value: string) => void;
  onDelete?: (moId: string) => void;
}

const MaitriseOuvrageAttendanceRow = ({
  mo,
  index,
  isPresent,
  onAttendanceChange,
  onContactChange,
  onFieldUpdate,
  onDelete,
}: MaitriseOuvrageAttendanceRowProps) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  
  // États locaux pour une saisie fluide sans lag réseau
  const [localAdresse, setLocalAdresse] = useState(mo.adresse || '');
  const [localCP, setLocalCP] = useState(mo.codePostal || '');
  const [localVille, setLocalVille] = useState(mo.ville || '');
  const [localTel, setLocalTel] = useState(mo.coordonneesContact || '');
  const [localEmail, setLocalEmail] = useState(mo.email || '');

  // Synchronisation si les données changent de l'extérieur (ex: sélection contact)
  useEffect(() => {
    setLocalAdresse(mo.adresse || '');
    setLocalCP(mo.codePostal || '');
    setLocalVille(mo.ville || '');
    setLocalTel(mo.coordonneesContact || '');
    setLocalEmail(mo.email || '');
  }, [mo.adresse, mo.codePostal, mo.ville, mo.coordonneesContact, mo.email]);

  const handleBlur = (field: string, value: string) => {
    if (onFieldUpdate) onFieldUpdate(mo.id, field, value);
  };

  const baseRowColorClass = index % 2 === 0 ? 'bg-brand-cream-light' : 'bg-white';
  const inputStyle = "h-7 text-[10px] bg-transparent border-0 focus-visible:ring-1 p-1 w-full";

  return (
    <>
      <TableRow key={mo.id} className={baseRowColorClass}>
        <TableCell className="text-sm whitespace-nowrap p-1 py-1 pl-4 min-w-[250px]">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsConfirmOpen(true)}
              className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <div className="flex-grow">
              <ContactSmartSelector 
                companyName={mo.nom} 
                value={mo.contact}
                onChange={(name, details) => onContactChange(mo.id, name, details)}
              />
            </div>
          </div>
        </TableCell>
        
        <TableCell className="text-xs p-1 min-w-[300px]">
          <div className="flex flex-col gap-0.5">
            <Input 
              value={localAdresse} 
              onChange={e => setLocalAdresse(e.target.value)}
              onBlur={() => handleBlur('adresse', localAdresse)}
              placeholder="Saisir adresse..."
              className={inputStyle}
            />
            <div className="flex gap-1">
              <Input 
                value={localCP} 
                onChange={e => setLocalCP(e.target.value)}
                onBlur={() => handleBlur('codePostal', localCP)}
                placeholder="CP"
                className={cn(inputStyle, "w-16")}
              />
              <Input 
                value={localVille} 
                onChange={e => setLocalVille(e.target.value)}
                onBlur={() => handleBlur('ville', localVille)}
                placeholder="Ville"
                className={inputStyle}
              />
            </div>
          </div>
        </TableCell>

        <TableCell className="text-xs p-1 min-w-[150px] whitespace-nowrap">
          <Input 
            value={localTel} 
            onChange={e => setLocalTel(e.target.value)}
            onBlur={() => handleBlur('coordonneesContact', localTel)}
            placeholder="Saisir portable..."
            className={inputStyle}
          />
        </TableCell>

        <TableCell className="text-xs p-1 min-w-[150px] whitespace-nowrap">
          <Input 
            value={localEmail} 
            onChange={e => setLocalEmail(e.target.value)}
            onBlur={() => handleBlur('email', localEmail)}
            placeholder="Saisir email..."
            className={inputStyle}
          />
        </TableCell>
        
        <AttendanceColumn1 
          isPresent={isPresent} 
          onAttendanceChange={(status) => onAttendanceChange(mo.id, status)} 
        />
      </TableRow>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce contact ?</AlertDialogTitle>
            <AlertDialogDescription>Êtes-vous sûr de vouloir retirer ce contact Maîtrise d'Ouvrage du projet ?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                onDelete?.(mo.id);
                setIsConfirmOpen(false);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MaitriseOuvrageAttendanceRow;