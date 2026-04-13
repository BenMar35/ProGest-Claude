"use client";

import React from 'react';
import { TableCell } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';
import { AttendanceStatus } from './ExecutionPhase';

interface AbsenceTarget {
  type: 'company' | 'contact';
  id: string;
  name: string;
  contactId?: string;
}

interface AttendanceColumns3Props {
  status: AttendanceStatus;
  absences: number | null;
  convoque: boolean;
  target: AbsenceTarget;
  onAttendanceChange: (status: AttendanceStatus) => void;
  onConvoqueChange: (convoque: boolean) => void;
  handleAbsenceClick: (target: AbsenceTarget) => void;
  handleMouseDownAbsence: (target: AbsenceTarget, e: React.MouseEvent) => void;
  handleMouseUpAbsence: (e: React.MouseEvent) => void;
}

const AttendanceColumns3 = ({
  status,
  absences,
  convoque,
  target,
  onAttendanceChange,
  onConvoqueChange,
  handleAbsenceClick,
  handleMouseDownAbsence,
  handleMouseUpAbsence,
}: AttendanceColumns3Props) => {
  const isPresent = status === 'Pres.';
  const currentAbsences = absences ?? null;

  return (
    <>
      {/* P (Présent) */}
      <TableCell className="text-center p-1">
        <Checkbox 
          checked={isPresent} 
          onCheckedChange={checked => onAttendanceChange(checked ? 'Pres.' : 'Vide')} 
          className="h-3 w-3" 
        />
      </TableCell>
      {/* A (Absences) */}
      <TableCell className="text-center p-1">
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-6 w-6 text-xs p-0 rounded-md text-black border-0",
            currentAbsences !== null && currentAbsences > 0 ? "bg-brand-yellow hover:bg-yellow-400" : "bg-brand-cream-light hover:bg-brand-cream"
          )}
          onClick={() => handleAbsenceClick(target)}
          onMouseDown={(e) => handleMouseDownAbsence(target, e)}
          onMouseUp={handleMouseUpAbsence}
          onMouseLeave={handleMouseUpAbsence}
        >
          {currentAbsences !== null && currentAbsences > 0 ? currentAbsences : ''}
        </Button>
      </TableCell>
      {/* C (Convoqué) */}
      <TableCell className="text-center p-1">
        <Checkbox 
          checked={convoque} 
          onCheckedChange={checked => onConvoqueChange(!!checked)} 
          className="h-3 w-3" 
        />
      </TableCell>
    </>
  );
};

export default AttendanceColumns3;