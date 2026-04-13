"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";

type UrbainRow = {
  id: number;
  critere: string;
  analyse: string;
};

const AnalyseUrbaineTable = () => {
  const [rows, setRows] = useState<UrbainRow[]>([
    { id: 1, critere: 'Accès', analyse: '' },
    { id: 2, critere: 'Voisinage', analyse: '' },
    { id: 3, critere: 'Règlementation', analyse: '' },
  ]);

  const handleAddRow = () => {
    setRows([...rows, { id: Date.now(), critere: '', analyse: '' }]);
  };

  const handleRemoveRow = (id: number) => {
    setRows(rows.filter(row => row.id !== id));
  };

  const handleInputChange = (id: number, field: keyof UrbainRow, value: string) => {
    setRows(rows.map(row => (row.id === id ? { ...row, [field]: value } : row)));
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Analyse Urbaine</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full"> {/* Removed overflow-x-auto here */}
          <Table className="min-w-max">
            <TableHeader className="sticky top-0 bg-white">
              <TableRow>
                <TableHead className="py-1 px-2 whitespace-nowrap min-w-[150px]">Critère</TableHead>
                <TableHead className="whitespace-nowrap min-w-[200px]">Analyse</TableHead>
                <TableHead className="py-1 px-2 whitespace-nowrap min-w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(row => (
                <TableRow key={row.id}>
                  <TableCell className="p-1 whitespace-nowrap">
                    <Input
                      value={row.critere}
                      onChange={(e) => handleInputChange(row.id, 'critere', e.target.value)}
                      className="h-8 min-w-[150px]"
                    />
                  </TableCell>
                  <TableCell className="p-1 whitespace-nowrap">
                    <Textarea
                      value={row.analyse}
                      onChange={(e) => handleInputChange(row.id, 'analyse', e.target.value)}
                      className="h-8 resize-none min-w-[200px]"
                    />
                  </TableCell>
                  <TableCell className="p-1 whitespace-nowrap">
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveRow(row.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="mt-2 flex justify-end">
          <Button onClick={handleAddRow} size="sm" className="bg-brand-yellow hover:bg-yellow-400 text-black">
            <Plus className="mr-2 h-4 w-4" /> Ajouter un critère
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AnalyseUrbaineTable;