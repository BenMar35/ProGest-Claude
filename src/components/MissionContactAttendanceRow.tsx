"use client";

import React, { useState, useEffect } from 'react';
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import ContactSmartSelector from './ContactSmartSelector';
import AttendanceColumn1 from './AttendanceColumn1';
import { FullContact } from '@/hooks/useCompanyContacts';
import { AttendanceStatus } from './ExecutionPhase';

interface MissionContactAttendanceRowProps {
  contactLink: { id: string; nom: string; role: string };
  contactData: FullContact | undefined;
  isPresent: boolean;
  raisonSociale: string;
  baseRowColorClass: string;
  onRemove: (id: string) => void;
  onContactSelected: (id: string, name: string, details?: any) => void;
  onFieldUpdate: (contactId: string, field: string, value: string) => void;
  onStatusChange: (id: string, status: AttendanceStatus) => void;
}

const MissionContactAttendanceRow = ({
  contactLink,
  contactData,
  isPresent,
  raisonSociale,
  baseRowColorClass,
  onRemove,
  onContactSelected,
  onFieldUpdate,
  onStatusChange,
}: MissionContactAttendanceRowProps) => {
  
  const [localAdresse, setLocalAdresse] = useState(contactData?.adresse || '');
  const [localCP, setLocalCP] = useState(contactData?.codePostal || '');
  const [localVille, setLocalVille] = useState(contactData?.ville || '');
  const [localPortable, setLocalPortable] = useState(contactData?.portable || '');
  const [localEmail, setLocalEmail] = useState(contactData?.email || '');

  useEffect(() => {
    setLocalAdresse(contactData?.adresse || '');
    setLocalCP(contactData?.codePostal || '');
    setLocalVille(contactData?.ville || '');
    setLocalPortable(contactData?.portable || '');
    setLocalEmail(contactData?.email || '');
  }, [contactData]);

  const isPersisted = contactLink.id && !contactLink.id.startsWith('temp-');

  const handleBlur = (field: string, value: string) => {
    if (isPersisted) {
      onFieldUpdate(contactLink.id, field, value);
    }
  };

  const inputStyle = "h-7 text-[10px] bg-transparent border-0 focus-visible:ring-1 p-1 w-full disabled:opacity-50";

  return (
    <TableRow className={baseRowColorClass}>
      <TableCell className="text-[10px] font-semibold pl-4 py-1">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onRemove(contactLink.id)}
            className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <div className="flex-grow min-w-[150px]">
              <ContactSmartSelector 
                companyName={raisonSociale}
                value={contactLink.nom}
                onChange={(name, details) => onContactSelected(contactLink.id, name, details)}
              />
          </div>
        </div>
      </TableCell>
      
      <TableCell className="text-xs p-1">
        <div className="flex flex-col gap-0.5">
          <Input 
            value={localAdresse} 
            onChange={e => setLocalAdresse(e.target.value)}
            onBlur={() => handleBlur('adresse', localAdresse)}
            placeholder="Saisir adresse..."
            className={inputStyle}
            disabled={!isPersisted}
          />
          <div className="flex gap-1">
            <Input 
              value={localCP} 
              onChange={e => setLocalCP(e.target.value)}
              onBlur={() => handleBlur('codePostal', localCP)}
              placeholder="CP"
              className={cn(inputStyle, "w-12")}
              disabled={!isPersisted}
            />
            <Input 
              value={localVille} 
              onChange={e => setLocalVille(e.target.value)}
              onBlur={() => handleBlur('ville', localVille)}
              placeholder="Ville"
              className={inputStyle}
              disabled={!isPersisted}
            />
          </div>
        </div>
      </TableCell>

      <TableCell className="text-[10px] py-1">
        <Input 
          value={localPortable} 
          onChange={e => setLocalPortable(e.target.value)}
          onBlur={() => handleBlur('portable', localPortable)}
          placeholder="Saisir portable..."
          className={inputStyle}
          disabled={!isPersisted}
        />
      </TableCell>

      <TableCell className="text-[10px] py-1">
        <Input 
          value={localEmail} 
          onChange={e => setLocalEmail(e.target.value)}
          onBlur={() => handleBlur('email', localEmail)}
          placeholder="Saisir email..."
          className={inputStyle}
          disabled={!isPersisted}
        />
      </TableCell>
      
      <AttendanceColumn1 
        isPresent={isPresent} 
        onAttendanceChange={(status) => onStatusChange(contactLink.id, status)} 
      />
    </TableRow>
  );
};

export default MissionContactAttendanceRow;