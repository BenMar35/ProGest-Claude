"use client";

import React, { useState, useMemo, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Info, ChevronDown, ChevronRight } from "lucide-react";
import { AllotmentRow } from './AllotmentTable';
import { cn, generateId } from '@/lib/utils';
import EstimationDetailDialog from './EstimationDetailDialog';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import EstimationCombobox from './EstimationCombobox';

export type EstimationDetailItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
};

export type EstimationRow = {
  id: string;
  lotId: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  comment: string;
  details: EstimationDetailItem[];
  isDetailed: boolean;
};

interface EstimationTableProps {
  allotmentRows: AllotmentRow[];
  estimationRows: EstimationRow[];
  setEstimationRows: React.Dispatch<React.SetStateAction<EstimationRow[]>>;
  projectId: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
};

const EstimationTable: React.FC<EstimationTableProps> = ({ allotmentRows, estimationRows, setEstimationRows, projectId }) => {
  const [editingRow, setEditingRow] = useState<EstimationRow | null>(null);
  const [collapsedLots, setCollapsedLots] = useState<Record<string, boolean>>({});
  
  const rowsWithDetailFlag = useMemo(() => {
    return estimationRows.map(row => {
      const isDetailed = row.unit === 'ens' && row.quantity === 1 && row.comment.includes('Détail calculé');
      return { ...row, isDetailed };
    });
  }, [estimationRows]);


  const toggleLotCollapse = (lotId: string) => {
    setCollapsedLots(prev => ({
      ...prev,
      [lotId]: !prev[lotId]
    }));
  };

  const handleAddRow = async (lotId: string) => {
    if (!projectId) {
      showError("ID du projet manquant pour ajouter une ligne d'estimation.");
      return;
    }
    try {
      const newRowData = {
        project_id: projectId,
        lot_id: lotId,
        description: '',
        unit: 'u',
        quantity: 1,
        unit_price: 0,
        comment: '',
      };
      const { data, error } = await supabase
        .from('project_estimations')
        .insert([newRowData])
        .select();

      if (error) throw error;
      if (data && data.length > 0) {
        const newRow: EstimationRow = {
          id: data[0].id,
          lotId: data[0].lot_id,
          description: data[0].description,
          unit: data[0].unit,
          quantity: data[0].quantity,
          unitPrice: data[0].unit_price,
          comment: data[0].comment,
          details: [],
          isDetailed: false,
        };
        setEstimationRows(prev => [...prev, newRow]);
        showSuccess("Ligne d'estimation ajoutée !");
      }
    } catch (error: any) {
      console.error("Error adding estimation row:", error);
      showError(`Échec de l'ajout de la ligne d'estimation: ${error.message || 'Erreur inconnue'}`);
    }
  };

  const handleRemoveRow = async (id: string) => {
    try {
      const { error } = await supabase
        .from('project_estimations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setEstimationRows(prev => prev.filter(row => row.id !== id));
      showSuccess("Ligne d'estimation supprimée !");
    } catch (error: any) {
      console.error("Error removing estimation row:", error);
      showError(`Échec de la suppression de la ligne d'estimation: ${error.message || 'Erreur inconnue'}`);
    }
  };

  const handleInputChange = (id: string, field: keyof EstimationRow, value: string | number) => {
    setEstimationRows(
      estimationRows.map(row => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const handleSaveOnBlur = async (id: string, field: keyof EstimationRow, value: string | number) => {
    try {
      const updateData: Partial<Omit<EstimationRow, 'id' | 'lotId' | 'details' | 'isDetailed'>> = {};
      if (field === 'description') updateData.description = value as string;
      else if (field === 'unit') updateData.unit = value as string;
      else if (field === 'quantity') updateData.quantity = value as number;
      else if (field === 'unitPrice') updateData.unit_price = value as number;
      else if (field === 'comment') updateData.comment = value as string;

      const { error } = await supabase
        .from('project_estimations')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      console.error("Error updating estimation row:", error);
      showError(`Échec de la mise à jour de la ligne d'estimation: ${error.message || 'Erreur inconnue'}`);
    }
  };

  const handleSaveDetail = (updatedRow: EstimationRow) => {
    setEstimationRows(estimationRows.map(row => {
      if (row.id === updatedRow.id) {
        const isDetailed = updatedRow.unit === 'ens' && updatedRow.quantity === 1;
        return { ...updatedRow, isDetailed };
      }
      return row;
    }));
    setEditingRow(null);
  };

  const lotTotals = useMemo(() => {
    const totals = new Map<string, number>();
    rowsWithDetailFlag.forEach(row => {
      const total = row.quantity * row.unitPrice;
      totals.set(row.lotId, (totals.get(row.lotId) || 0) + total);
    });
    return totals;
  }, [rowsWithDetailFlag]);

  const grandTotal = useMemo(() => {
    return Array.from(lotTotals.values()).reduce((acc, total) => acc + total, 0);
  }, [lotTotals]);

  const lotsToDisplay = allotmentRows.filter(lot => lot.selectedLot && lot.selectedNumber);

  return (
    <div className="p-2 bg-white border rounded-lg shadow-md w-full">
      <div className="w-full">
        <Table className="min-w-max">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="whitespace-nowrap min-w-[40px]"></TableHead>
              <TableHead className="whitespace-nowrap min-w-[400px]">Travaux</TableHead>
              <TableHead className="text-center whitespace-nowrap min-w-[80px]">Unité</TableHead>
              <TableHead className="text-center whitespace-nowrap min-w-[100px]">Quantité</TableHead>
              <TableHead className="text-right whitespace-nowrap min-w-[120px]">Prix Unitaire</TableHead>
              <TableHead className="text-right whitespace-nowrap min-w-[120px]">Total</TableHead>
              <TableHead className="whitespace-nowrap min-w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lotsToDisplay.map(lot => {
              const isCollapsed = collapsedLots[lot.id];
              return (
                <React.Fragment key={lot.id}>
                  <TableRow className="bg-[#ded3a4] hover:bg-[#ded3a4]/90">
                    <TableCell colSpan={6} className="font-bold text-black py-1 px-2 whitespace-nowrap">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Button variant="ghost" size="icon" onClick={() => toggleLotCollapse(lot.id)} className="h-7 w-7 mr-2">
                            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                          <span>Lot {lot.selectedNumber} - {lot.selectedLot}</span>
                        </div>
                        <span>{formatCurrency(lotTotals.get(lot.id) || 0)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right py-1 px-2 whitespace-nowrap">
                      <Button size="icon" onClick={() => handleAddRow(lot.id)} className="h-7 w-7 bg-brand-yellow hover:bg-yellow-400 text-black">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  
                  {!isCollapsed && rowsWithDetailFlag.filter(row => row.lotId === lot.id).map((row, rowIndex) => {
                    const isDetailed = row.isDetailed;
                    return (
                      <TableRow 
                        key={row.id} 
                        className={cn(rowIndex % 2 === 0 ? 'bg-brand-cream-light' : 'bg-brand-cream', "hover:bg-brand-cream")}
                      >
                        <TableCell className="p-1 text-center whitespace-nowrap min-w-[40px]">
                          <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditingRow(row); }} className="h-7 w-7">
                            <Info className={cn("h-4 w-4", isDetailed ? "text-blue-600" : "text-gray-500")} />
                          </Button>
                        </TableCell>
                        <TableCell className="p-1 whitespace-nowrap min-w-[400px]">
                          <EstimationCombobox
                            value={row.description}
                            onChange={(value) => handleInputChange(row.id, 'description', value)}
                            disabled={isDetailed}
                          />
                          <Input
                            value={row.description}
                            onChange={(e) => handleInputChange(row.id, 'description', e.target.value)}
                            onBlur={(e) => handleSaveOnBlur(row.id, 'description', e.target.value)}
                            className="h-7 bg-transparent border-0 focus-visible:ring-1 focus-visible:ring-slate-400 text-xs text-left hidden" // Hidden input for onBlur save of combobox value
                            disabled={isDetailed}
                          />
                        </TableCell>
                        <TableCell className="p-1 whitespace-nowrap min-w-[80px]">
                          <Input
                            value={row.unit}
                            onChange={(e) => handleInputChange(row.id, 'unit', e.target.value)}
                            onBlur={(e) => handleSaveOnBlur(row.id, 'unit', e.target.value)}
                            className="h-7 bg-transparent border-0 focus-visible:ring-1 focus-visible:ring-slate-400 text-xs text-center min-w-[80px]"
                            disabled={isDetailed}
                          />
                        </TableCell>
                        <TableCell className="p-1 whitespace-nowrap min-w-[100px]">
                          <Input
                            type="number"
                            value={row.quantity}
                            onChange={(e) => handleInputChange(row.id, 'quantity', parseFloat(e.target.value) || 0)}
                            onBlur={(e) => handleSaveOnBlur(row.id, 'quantity', parseFloat(e.target.value) || 0)}
                            className="h-7 bg-transparent border-0 focus-visible:ring-1 focus-visible:ring-slate-400 text-xs text-center min-w-[100px]"
                            disabled={isDetailed}
                          />
                        </TableCell>
                        <TableCell className="p-1 whitespace-nowrap min-w-[120px]">
                          <Input
                            type="number"
                            value={row.unitPrice}
                            onChange={(e) => handleInputChange(row.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                            onBlur={(e) => handleSaveOnBlur(row.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="h-7 bg-transparent border-0 focus-visible:ring-1 focus-visible:ring-slate-400 text-xs text-right min-w-[120px]"
                            disabled={isDetailed}
                          />
                        </TableCell>
                        <TableCell className="text-right text-xs font-medium whitespace-nowrap min-w-[120px]">
                          {formatCurrency(row.quantity * row.unitPrice)}
                        </TableCell>
                        <TableCell className="p-1 text-center whitespace-nowrap min-w-[50px]">
                          <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); handleRemoveRow(row.id); }} className="h-7 w-7">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </React.Fragment>
              )
            })}
          </TableBody>
          <TableFooter>
            <TableRow className="bg-brand-yellow hover:bg-yellow-400 text-black">
              <TableCell colSpan={6} className="text-right text-base font-bold py-1 px-2 whitespace-nowrap">Total Général HT</TableCell>
              <TableCell className="text-right text-base font-bold py-1 px-2 whitespace-nowrap">{formatCurrency(grandTotal)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
      {editingRow && (
        <EstimationDetailDialog
          isOpen={!!editingRow}
          onClose={() => setEditingRow(null)}
          rowData={editingRow}
          onSave={handleSaveDetail}
          projectId={projectId}
        />
      )}
    </div>
  );
};

export default EstimationTable;