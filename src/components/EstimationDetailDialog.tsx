"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { EstimationRow, EstimationDetailItem } from './EstimationTable';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { generateId } from "@/lib/utils";

interface EstimationDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  rowData: EstimationRow | null;
  onSave: (updatedRow: EstimationRow) => void;
  projectId: string;
}

const formatCurrency = (value: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

const EstimationDetailDialog = ({ isOpen, onClose, rowData, onSave, projectId }: EstimationDetailDialogProps) => {
  const [comment, setComment] = useState('');
  const [details, setDetails] = useState<EstimationDetailItem[]>([]);

  useEffect(() => {
    if (rowData) {
      const initialComment = rowData.comment?.replace(' [Détail calculé]', '').trim() || '';
      setComment(initialComment);
      
      const fetchDetails = async () => {
        if (rowData.id) {
          const { data, error } = await supabase
            .from('estimation_detail_items')
            .select('*')
            .eq('estimation_row_id', rowData.id);

          if (error) {
            console.error("Error fetching estimation details:", error);
            showError("Erreur lors du chargement des détails d'estimation.");
            setDetails([]);
          } else {
            setDetails(data.map(item => ({
              id: item.id,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unit_price,
            })));
          }
        } else {
          setDetails([]);
        }
      };
      fetchDetails();
    }
  }, [rowData]);

  const totalDetails = useMemo(() => {
    return details.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  }, [details]);

  const handleSave = async () => {
    if (!rowData || !projectId) {
      showError("Données de ligne ou ID de projet manquants pour la sauvegarde.");
      return;
    }

    try {
      const isDetailUsed = details.length > 0;
      const finalComment = isDetailUsed ? `${comment} [Détail calculé]` : comment;

      let updatedRowData: EstimationRow;

      if (isDetailUsed) {
        updatedRowData = {
          ...rowData,
          comment: finalComment,
          unitPrice: totalDetails,
          quantity: 1,
          unit: 'ens',
        };
      } else {
        updatedRowData = {
          ...rowData,
          comment: finalComment,
        };
      }

      // Save/Update main estimation row (only comment, unit, quantity, unitPrice change)
      const { error: rowUpdateError } = await supabase
        .from('project_estimations')
        .update({
          unit: updatedRowData.unit,
          quantity: updatedRowData.quantity,
          unit_price: updatedRowData.unitPrice,
          comment: updatedRowData.comment,
        })
        .eq('id', updatedRowData.id);

      if (rowUpdateError) throw rowUpdateError;

      // Handle detail items deletion (items in DB but not in current state)
      const currentPersistedDetailIds = details
        .map(d => d.id)
        .filter(id => id && id.length === 36 && id.includes('-'));

      const { data: existingDbDetails, error: fetchDbError } = await supabase
        .from('estimation_detail_items')
        .select('id')
        .eq('estimation_row_id', rowData.id);

      if (fetchDbError) throw fetchDbError;

      const dbIds = new Set(existingDbDetails.map(d => d.id));
      const idsToDelete = Array.from(dbIds).filter(dbId => !currentPersistedDetailIds.includes(dbId));

      if (idsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('estimation_detail_items')
          .delete()
          .in('id', idsToDelete);

        if (deleteError) throw deleteError;
      }

      // Upsert is handled by onBlur for individual detail items now.
      // We only need to ensure the local state is saved to the parent.

      showSuccess("Détails d'estimation sauvegardés avec succès !");
      onSave(updatedRowData);
      onClose();
    } catch (error: any) {
      console.error("Error saving estimation details:", error);
      showError(`Échec de la sauvegarde des détails d'estimation: ${error.message || 'Erreur inconnue'}`);
    }
  };

  const handleAddDetailRow = () => {
    setDetails([...details, { id: generateId(), description: '', quantity: 1, unitPrice: 0 }]); 
  };

  const handleRemoveDetailRow = async (id: string) => {
    setDetails(details.filter(item => item.id !== id));
    
    // Delete from DB if it's a persisted ID
    if (id.length === 36 && id.includes('-')) {
      try {
        const { error } = await supabase
          .from('estimation_detail_items')
          .delete()
          .eq('id', id);
        if (error) throw error;
      } catch (error: any) {
        showError(`Échec de la suppression du détail: ${error.message || 'Erreur inconnue'}`);
      }
    }
  };

  const handleDetailChange = (id: string, field: keyof EstimationDetailItem, value: string | number) => {
    setDetails(details.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleDetailSaveOnBlur = async (id: string, field: keyof EstimationDetailItem, value: string | number) => {
    if (!rowData) return;
    const item = details.find(d => d.id === id);
    if (!item) return;

    const updatedItem = { ...item, [field]: value };

    try {
      const payload = {
        estimation_row_id: rowData.id,
        description: updatedItem.description,
        quantity: updatedItem.quantity,
        unit_price: updatedItem.unitPrice,
      };

      const isNew = updatedItem.id.startsWith('temp-') || updatedItem.id.length < 36;
      
      let dbOperation;
      if (isNew) {
        dbOperation = supabase.from('estimation_detail_items').insert([payload]).select();
      } else {
        dbOperation = supabase.from('estimation_detail_items').update({ [field === 'unitPrice' ? 'unit_price' : field]: value }).eq('id', id).select();
      }

      const { data, error } = await dbOperation;

      if (error) throw error;

      if (isNew && data && data.length > 0) {
        setDetails(prev => prev.map(d => d.id === id ? { ...d, id: data[0].id } : d));
      }
    } catch (error: any) {
      console.error("Error saving detail item on blur:", error);
      showError(`Échec de la sauvegarde du détail: ${error.message || 'Erreur inconnue'}`);
    }
  };

  if (!rowData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Détail de l'estimation : {rowData.description}</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div>
            <label htmlFor="comment" className="font-semibold">Commentaires</label>
            <Textarea 
              id="comment" 
              value={comment} 
              onChange={(e) => setComment(e.target.value)} 
              className="mt-2" 
              onBlur={handleSave} // Trigger full save on comment blur
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold">Détail du calcul</h3>
              <Button onClick={handleAddDetailRow} size="sm" className="bg-brand-yellow hover:bg-yellow-400 text-black">
                <Plus className="mr-2 h-4 w-4" /> Ajouter
              </Button>
            </div>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Description</TableHead><TableHead className="w-[100px]">Quantité</TableHead><TableHead className="w-[120px]">P.U.</TableHead><TableHead className="w-[120px] text-right">Total</TableHead><TableHead className="w-[50px]"></TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {details.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Input 
                          value={item.description} 
                          onChange={e => handleDetailChange(item.id, 'description', e.target.value)} 
                          onBlur={e => handleDetailSaveOnBlur(item.id, 'description', e.target.value)}
                          className="h-8" 
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          value={item.quantity} 
                          onChange={e => handleDetailChange(item.id, 'quantity', parseFloat(e.target.value) || 0)} 
                          onBlur={e => handleDetailSaveOnBlur(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="h-8" 
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          value={item.unitPrice} 
                          onChange={e => handleDetailChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)} 
                          onBlur={e => handleDetailSaveOnBlur(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="h-8" 
                        />
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(item.quantity * item.unitPrice)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveDetailRow(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow><TableCell colSpan={3} className="text-right font-bold">Total du détail</TableCell><TableCell className="text-right font-bold">{formatCurrency(totalDetails)}</TableCell><TableCell></TableCell></TableRow>
                </TableFooter>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Note : Si vous utilisez le détail du calcul, le "Total du détail" mettra à jour le "Prix Unitaire" de la ligne principale. La quantité sera mise à 1 et l'unité à "ens".
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSave}>Sauvegarder</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EstimationDetailDialog;