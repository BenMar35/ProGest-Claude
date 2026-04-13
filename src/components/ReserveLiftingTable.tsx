"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DatePickerButton } from './DatePickerButton';
import { AllotmentRow } from './AllotmentTable';
import { showSuccess } from '@/utils/toast';
import { FileText } from 'lucide-react';

interface ReserveLiftingTableProps {
  allotmentRows: AllotmentRow[];
}

const ReserveLiftingTable = ({ allotmentRows }: ReserveLiftingTableProps) => {
  const [dates, setDates] = useState<Record<string, string>>({});

  const handleDateChange = (lotId: string, date: string) => {
    setDates(prev => ({ ...prev, [lotId]: date }));
  };

  const handleGeneratePdf = (lotName: string) => {
    showSuccess(`Génération du PV de levée de réserves pour ${lotName} lancée.`);
  };

  const lots = allotmentRows.filter(r => r.selectedLot && r.selectedNumber);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Levée des Réserves</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full"> {/* Removed overflow-x-auto here */}
          <Table className="min-w-max"> {/* Changed w-full to min-w-max */}
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Lot</TableHead>
                <TableHead className="whitespace-nowrap">Date de levée</TableHead>
                <TableHead className="whitespace-nowrap">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lots.map(lot => (
                <TableRow key={lot.id}>
                  <TableCell className="whitespace-nowrap">{`Lot ${lot.selectedNumber} - ${lot.selectedLot}`}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <DatePickerButton 
                      date={dates[String(lot.id)] || ''} 
                      setDate={(d) => handleDateChange(String(lot.id), d)} 
                    />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Button size="sm" onClick={() => handleGeneratePdf(`Lot ${lot.selectedNumber}`)}>
                      <FileText className="mr-2 h-4 w-4" /> Générer PV Levée
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReserveLiftingTable;