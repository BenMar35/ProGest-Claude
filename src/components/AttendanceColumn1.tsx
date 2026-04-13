"use client";

import React from 'react';
import { TableCell } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { AttendanceStatus } from './ExecutionPhase';

interface AttendanceColumn1Props {
  isPresent: boolean;
  onAttendanceChange: (status: AttendanceStatus) => void;
}

const AttendanceColumn1 = ({ isPresent, onAttendanceChange }: AttendanceColumn1Props) => {
  return (
    <TableCell className="text-center p-1">
      <Checkbox 
        checked={isPresent} 
        onCheckedChange={checked => onAttendanceChange(checked ? 'Pres.' : 'Vide')} 
        className="h-3 w-3" 
      />
    </TableCell>
  );
};

export default AttendanceColumn1;