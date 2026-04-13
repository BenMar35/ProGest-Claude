"use client";

import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Minus, FileDown, Loader2 } from "lucide-react";
import { AllotmentRow } from "./AllotmentTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { cn, generateId } from "@/lib/utils";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { useOptimalColumnWidths } from "@/hooks/useOptimalColumnWidths";
import { generateTenderPdf } from "@/utils/pdfService";

export type TenderTrackingRow = {
  id: string;
  lot: string;
  projectCompanyId: string;
  raisonSociale: string;
  offres: string[];
  commentaires: string[];
  conformite: 'oui' | 'non' | 'none';
};

interface TenderTrackingTableProps {
  rows: TenderTrackingRow[];
  setRows: (rows: TenderTrackingRow[]) => void;
  allotmentRows: AllotmentRow[];
  numOffers: number;
  setNumOffers: (updater: (prev: number) => number) => void;
  manualMieuxDisantSelection: Record<string, string>;
  setManualMieuxDisantSelection: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  moinsDisantData: Map<string, { minOffer: number; companyName: string }>;
  mieuxDisantData: Map<string, { minOffer: number; companyName: string }>;
  onWidthChange: (width: number) => void;
  projectId: string;
}

const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return "";
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
};

const parseCurrency = (value: string): number | null => {
  if (!value) return null;
  const numberString = value
    .replace(/€/g, '')
    .replace(/\s/g, '')
    .replace(',', '.');
  const parsed = parseFloat(numberString);
  return isNaN(parsed) ? null : parsed;
};

const TenderTrackingTable = ({ 
  rows, 
  setRows, 
  allotmentRows, 
  numOffers, 
  setNumOffers, 
  manualMieuxDisantSelection, 
  setManualMieuxDisantSelection,
  moinsDisantData,
  mieuxDisantData,
  onWidthChange,
  projectId 
}: TenderTrackingTableProps) => {
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [rowToConfirm, setRowToConfirm] = useState<{ lot: string; rowId: string; isSelecting: boolean } | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  const { commentWidths, handleMouseDown } = useOptimalColumnWidths({ numOffers });

  const offerCountsByLot = useMemo(() => {
    const counts = new Map<string, number>();
    const uniqueLots = [...new Set(rows.map(r => r.lot))];

    uniqueLots.forEach(lot => {
      const companiesInLot = rows.filter(r => r.lot === lot);
      let offerCount = 0;
      companiesInLot.forEach(companyRow => {
        const hasOffer = companyRow.offres.some(offer => offer && offer.trim() !== "");
        if (hasOffer) {
          offerCount++;
        }
      });
      counts.set(lot, offerCount);
    });

    return counts;
  }, [rows]);

  const lotNameMap = useMemo(() => 
    new Map(
      (allotmentRows || []).filter(row => row.selectedNumber).map(row => [row.selectedNumber, row.selectedLot])
    ), 
    [allotmentRows]
  );

  const handleSelectionClick = (lot: string, rowId: string) => {
    const isCurrentlySelected = manualMieuxDisantSelection[lot] === rowId;
    setRowToConfirm({ lot, rowId, isSelecting: !isCurrentlySelected });
    setIsConfirmDialogOpen(true);
  };

  const handleConfirmSelection = () => {
    if (!rowToConfirm) return;
    const { lot, rowId, isSelecting } = rowToConfirm;

    setManualMieuxDisantSelection(prev => {
      const newSelection = { ...prev };
      if (isSelecting) {
        newSelection[lot] = rowId;
      } else {
        if (prev[lot] === rowId) {
          delete newSelection[lot];
        }
      }
      return newSelection;
    });

    setIsConfirmDialogOpen(false);
    setRowToConfirm(null);
  };

  const handleAddOfferColumn = async () => {
    setNumOffers(n => n + 1);
  };

  const handleRemoveOfferColumn = async (indexToRemove: number) => {
    if (numOffers < 1) return;
    
    const updatedRows = rows.map(row => {
      const newOffres = [...row.offres];
      const newCommentaires = [...row.commentaires];
      if (indexToRemove < newOffres.length) {
        newOffres.splice(indexToRemove, 1);
        newCommentaires.splice(indexToRemove, 1);
      }
      return { ...row, offres: newOffres, commentaires: newCommentaires };
    });
    setRows(updatedRows);
    setNumOffers(n => n - 1);

    try {
      const { error } = await supabase
        .from('tender_tracking_rows')
        .upsert(updatedRows.map(row => ({
          id: row.id,
          project_id: projectId,
          lot: row.lot,
          project_company_id: row.projectCompanyId,
          offres: row.offres,
          commentaires: row.commentaires,
          conformite: row.conformite,
        })), { onConflict: 'id' });
      if (error) throw error;
      showSuccess("Colonne d'offre supprimée et données mises à jour !");
    } catch (error: any) {
      console.error("Error removing offer column:", error);
      showError(`Échec de la suppression de la colonne d'offre: ${error.message || 'Erreur inconnue'}`);
    }
  };

  const updateRowInDb = useCallback(async (row: TenderTrackingRow) => {
    if (!projectId) return;
    try {
      const payload = {
        offres: row.offres,
        commentaires: row.commentaires,
        conformite: row.conformite,
      };

      const { error } = await supabase
        .from('tender_tracking_rows')
        .update(payload)
        .eq('id', row.id)
        .eq('project_id', projectId);

      if (error) throw error;
    } catch (error: any) {
      console.error("Error updating tender tracking row:", error);
      showError(`Échec de la sauvegarde: ${error.message || 'Erreur inconnue'}`);
    }
  }, [projectId]);

  const handleOfferChange = (id: string, index: number, value: string) => {
    setRows(prevRows => {
      const updatedRows = prevRows.map(row => {
        if (row.id === id) {
          const newOffres = [...row.offres];
          newOffres[index] = value;
          return { ...row, offres: newOffres };
        }
        return row;
      });
      return updatedRows;
    });
  };
  
  const handleCommentaireChange = (id: string, index: number, value: string) => {
    setRows(prevRows => {
      const updatedRows = prevRows.map(row => {
        if (row.id === id) {
          const newCommentaires = [...row.commentaires];
          newCommentaires[index] = value;
          return { ...row, commentaires: newCommentaires };
        }
        return row;
      });
      return updatedRows;
    });
  };

  const handleOfferBlur = (id: string, index: number, value: string) => {
    const numericValue = parseCurrency(value);
    const formattedValue = numericValue !== null ? formatCurrency(numericValue) : "";
    setRows(prevRows => {
      const updatedRows = prevRows.map(row => {
        if (row.id === id) {
          const newOffres = [...row.offres];
          newOffres[index] = formattedValue;
          const updatedRow = { ...row, offres: newOffres };
          updateRowInDb(updatedRow);
          return updatedRow;
        }
        return row;
      });
      return updatedRows;
    });
  };

  const handleCommentaireBlur = (id: string, index: number, value: string) => {
    setRows(prevRows => {
      const updatedRows = prevRows.map(row => {
        if (row.id === id) {
          const newCommentaires = [...row.commentaires];
          newCommentaires[index] = value;
          const updatedRow = { ...row, commentaires: newCommentaires };
          updateRowInDb(updatedRow);
          return updatedRow;
        }
      });
      return prevRows; // State update already happened in handleCommentaireChange
    });
  };

  const handleConformiteChange = (id: string, value: 'oui' | 'non' | 'none') => {
    setRows(prevRows => {
      const updatedRows = prevRows.map(row => {
        if (row.id === id) {
          const updatedRow = { ...row, conformite: value };
          updateRowInDb(updatedRow);
          return updatedRow;
        }
        return row;
      });
      return updatedRows;
    });
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.currentTarget.blur();
    }
  };

  const handlePdfGeneration = async () => {
    setIsGeneratingPdf(true);
    try {
      await generateTenderPdf({
        projectId,
        rows,
        numOffers,
        lotNames: Object.fromEntries(lotNameMap.entries()),
        moinsDisant: Object.fromEntries(Array.from(moinsDisantData.entries())),
        mieuxDisant: Object.fromEntries(Array.from(mieuxDisantData.entries())),
        offerCounts: Object.fromEntries(Array.from(offerCountsByLot.entries())),
      });
      showSuccess("PDF généré avec succès !");
    } catch (error: any) {
      showError(`Erreur lors de la génération : ${error.message}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const gridTemplateColumns = `minmax(100px, max-content) minmax(150px, max-content) ${commentWidths.map(w => `minmax(100px, max-content) minmax(100px, ${w}px)`).join(' ')} minmax(100px, max-content) minmax(100px, max-content) minmax(100px, max-content) minmax(100px, max-content) minmax(100px, max-content) minmax(100px, max-content)`;

  useEffect(() => {
    const fixedColumnsWidth = 100 + 150 + 100 + 100 + 100 + 100 + 100 + 100;
    const dynamicWidth = commentWidths.reduce((acc, width) => acc + 100 + width, 0);
    onWidthChange(fixedColumnsWidth + dynamicWidth);
  }, [commentWidths, onWidthChange]);

  return (
    <div className="p-2 bg-white border rounded-lg shadow-md w-full">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold">Analyse Appel d'Offres</h3>
        <Button 
          variant="outline" 
          size="sm" 
          className="bg-brand-yellow hover:bg-yellow-400 text-black border-none"
          onClick={handlePdfGeneration}
          disabled={isGeneratingPdf}
        >
          {isGeneratingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
          Export PDF (Playwright)
        </Button>
      </div>
      {/* Conteneur pour masquer la barre de défilement horizontale */}
      <div className="overflow-x-hidden">
        <div className="grid w-max" style={{ gridTemplateColumns, gridAutoRows: 'auto' }}>
          {/* HEADER ROW 1 */}
          <div className="font-bold p-1 text-center flex items-center justify-center bg-white min-h-[32px] whitespace-nowrap" style={{ gridColumn: 1, gridRow: 1 }}>Lot</div>
          <div className="font-bold p-1 text-center flex items-center justify-center bg-white min-h-[32px] whitespace-nowrap" style={{ gridColumn: 2, gridRow: 1 }}>Raison Sociale</div>
          <div className="font-bold p-1 text-center flex items-center justify-center bg-white min-h-[32px] whitespace-nowrap" style={{ gridColumn: `3 / span ${2 * numOffers}`, gridRow: 1 }}>
            <div className="flex items-center justify-center gap-2 whitespace-nowrap">
              Offre
              <Button onClick={handleAddOfferColumn} size="icon" className="bg-brand-yellow hover:bg-yellow-400 text-black h-6 w-6"><Plus className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="font-bold p-1 text-center flex items-center justify-center bg-white min-h-[32px] whitespace-nowrap" style={{ gridColumn: `${3 + 2 * numOffers}`, gridRow: 1 }}>Conformité</div>
          <div className="font-bold p-1 text-center flex items-center justify-center bg-white min-h-[32px] whitespace-nowrap" style={{ gridColumn: `${4 + 2 * numOffers} / span 2`, gridRow: 1 }}>Moins Disant</div>
          <div className="font-bold p-1 text-center flex items-center justify-center bg-white min-h-[32px] whitespace-nowrap" style={{ gridColumn: `${6 + 2 * numOffers} / span 2`, gridRow: 1 }}>Mieux Disant</div>
          <div className="font-bold p-1 text-center flex items-center justify-center bg-white min-h-[32px] whitespace-nowrap" style={{ gridColumn: `${8 + 2 * numOffers}`, gridRow: 1 }}>nbre offres</div>

          {/* HEADER ROW 2 */}
          <div className="bg-white border-b border-gray-300 min-h-[32px]" style={{ gridColumn: 1, gridRow: 2 }}></div>
          <div className="bg-white border-b border-gray-300 min-h-[32px]" style={{ gridColumn: 2, gridRow: 2 }}></div>
          {Array.from({ length: numOffers }).map((_, index) => {
            const subTitle = index === 0 ? "ouverture de plis" : `recalage ${index}`;
            return (
              <React.Fragment key={index}>
                <div className="p-1 bg-white border-b border-gray-300 flex items-center justify-center gap-1 min-h-[32px] whitespace-nowrap" style={{ gridColumn: 3 + index * 2, gridRow: 2 }}>
                  <span className="text-xs font-medium whitespace-nowrap">{subTitle}</span>
                  {index > 0 && (
                    <Button size="icon" className="bg-brand-yellow hover:bg-yellow-400 text-black h-5 w-5 flex-shrink-0" onClick={() => handleRemoveOfferColumn(index)}><Minus className="h-4 w-4" /></Button>
                  )}
                </div>
                <div className="relative p-1 bg-white border-b border-gray-300 flex items-center justify-center min-h-[32px] whitespace-nowrap" style={{ gridColumn: 4 + index * 2, gridRow: 2 }}>
                  <span className="text-xs font-medium whitespace-nowrap">Commentaire</span>
                  <div 
                    className="absolute top-0 right-0 w-2 h-full cursor-col-resize"
                    onMouseDown={(e) => handleMouseDown(index, e)}
                  />
                </div>
              </React.Fragment>
            );
          })}
          <div className="bg-white border-b border-gray-300 min-h-[32px]" style={{ gridColumn: `${3 + 2 * numOffers}`, gridRow: 2 }}></div>
          <div className="font-medium p-1 text-xs text-center flex items-center justify-center bg-white border-b border-gray-300 min-h-[32px] whitespace-nowrap" style={{ gridColumn: `${4 + 2 * numOffers}`, gridRow: 2 }}>Ets</div>
          <div className="font-medium p-1 text-xs text-center flex items-center justify-center bg-white border-b border-gray-300 min-h-[32px] whitespace-nowrap" style={{ gridColumn: `${5 + 2 * numOffers}`, gridRow: 2 }}>Offre</div>
          <div className="font-medium p-1 text-xs text-center flex items-center justify-center bg-white border-b border-gray-300 min-h-[32px] whitespace-nowrap" style={{ gridColumn: `${6 + 2 * numOffers}`, gridRow: 2 }}>Ets</div>
          <div className="font-medium p-1 text-xs text-center flex items-center justify-center bg-white border-b border-gray-300 min-h-[32px] whitespace-nowrap" style={{ gridColumn: `${7 + 2 * numOffers}`, gridRow: 2 }}>Offre</div>
          <div className="bg-white border-b border-gray-300 min-h-[32px]" style={{ gridColumn: `${8 + 2 * numOffers}`, gridRow: 2 }}></div>

          {/* BODY */}
          {rows.map((row, index) => {
            const isFirstInGroup = index === 0 || rows[index - 1].lot !== row.lot;
            const addTopBorder = isFirstInGroup && index > 0;
            const groupSize = isFirstInGroup ? rows.filter(r => r.lot === row.lot).length : 0;
            const lotName = lotNameMap.get(row.lot) || '';
            const gridRowStart = index + 3;
            const moinsData = moinsDisantData.get(row.lot);
            const mieuxData = mieuxDisantData.get(row.lot);
            const isManuallySelected = manualMieuxDisantSelection[row.lot] === row.id;
            const rowColorClass = index % 2 === 0 ? 'bg-brand-cream' : 'bg-brand-cream-light';

            return (
              <React.Fragment key={row.id}>
                {isFirstInGroup && (
                  <>
                    <div className={cn("p-1 text-center flex items-center justify-center bg-brand-cream-light whitespace-nowrap", { "border-t border-gray-300": addTopBorder })} style={{ gridColumn: 1, gridRow: `${gridRowStart} / span ${groupSize}` }}>
                      <div className="flex flex-col justify-center h-full">
                        <span className="font-bold text-sm leading-tight whitespace-nowrap">{row.lot}</span>
                        <span className="text-[10px] leading-tight text-muted-foreground whitespace-nowrap">{lotName}</span>
                      </div>
                    </div>
                    <div className={cn("p-1 text-xs flex items-center justify-center bg-brand-cream-light whitespace-nowrap", { "border-t border-gray-300": addTopBorder })} style={{ gridColumn: `${4 + 2 * numOffers}`, gridRow: `${gridRowStart} / span ${groupSize}` }}>{moinsData?.companyName || ''}</div>
                    <div className={cn("p-1 text-xs flex items-center justify-center bg-brand-cream-light whitespace-nowrap", { "border-t border-gray-300": addTopBorder })} style={{ gridColumn: `${5 + 2 * numOffers}`, gridRow: `${gridRowStart} / span ${groupSize}` }}>{formatCurrency(moinsData?.minOffer)}</div>
                    <div className={cn("p-1 text-xs flex items-center justify-center bg-brand-cream-light whitespace-nowrap", { "border-t border-gray-300": addTopBorder })} style={{ gridColumn: `${6 + 2 * numOffers}`, gridRow: `${gridRowStart} / span ${groupSize}` }}>{mieuxData?.companyName || ''}</div>
                    <div className={cn("p-1 text-xs flex items-center justify-center bg-brand-cream-light whitespace-nowrap", { "border-t border-gray-300": addTopBorder })} style={{ gridColumn: `${7 + 2 * numOffers}`, gridRow: `${gridRowStart} / span ${groupSize}` }}>{formatCurrency(mieuxData?.minOffer)}</div>
                    <div className={cn("p-1 text-xs flex items-center justify-center font-bold bg-brand-cream-light whitespace-nowrap", { "border-t border-gray-300": addTopBorder })} style={{ gridColumn: `${8 + 2 * numOffers}`, gridRow: `${gridRowStart} / span ${groupSize}` }}>
                      {offerCountsByLot.get(row.lot) || 0}
                    </div>
                  </>
                )}
                <div 
                  className={cn(
                    "p-1 cursor-pointer flex items-center h-8 whitespace-nowrap", 
                    rowColorClass,
                    { "border-t border-gray-300": addTopBorder },
                    { "bg-brand-yellow": isManuallySelected }
                  )} 
                  style={{ gridColumn: 2, gridRow: gridRowStart }}
                  onClick={() => handleSelectionClick(row.lot, row.id)}
                >
                  <span className={cn("text-xs whitespace-nowrap", { "font-bold": isManuallySelected })}>
                    {row.raisonSociale}
                  </span>
                </div>
                {Array.from({ length: numOffers }).map((_, i) => (
                  <React.Fragment key={i}>
                    <div className={cn("h-8", rowColorClass, { "border-t border-gray-300": addTopBorder })} style={{ gridColumn: 3 + i * 2, gridRow: gridRowStart }}>
                      <Input 
                        value={row.offres[i] || ''} 
                        onChange={(e) => handleOfferChange(row.id, i, e.target.value)} 
                        onBlur={(e) => handleOfferBlur(row.id, i, e.target.value)}
                        onKeyDown={handleInputKeyDown}
                        className="h-full w-full p-1 bg-transparent border-0 text-xs text-right whitespace-nowrap"
                      />
                    </div>
                    <div className={cn("h-8", rowColorClass, { "border-t border-gray-300": addTopBorder })} style={{ gridColumn: 4 + i * 2, gridRow: gridRowStart }}>
                      <Textarea 
                        value={row.commentaires[i] || ''} 
                        onChange={(e) => handleCommentaireChange(row.id, i, e.target.value)} 
                        onBlur={(e) => handleCommentaireBlur(row.id, i, e.target.value)}
                        className="h-full w-full p-1 bg-transparent border-0 text-xs resize-none whitespace-nowrap"
                      />
                    </div>
                  </React.Fragment>
                ))}
                <div className={cn("h-8 p-1 whitespace-nowrap", rowColorClass, { "border-t border-gray-300": addTopBorder })} style={{ gridColumn: 3 + 2 * numOffers, gridRow: gridRowStart }}>
                  <Select value={row.conformite} onValueChange={val => handleConformiteChange(row.id, val as 'oui' | 'non' | 'none')}>
                    <SelectTrigger className={cn(
                      "appearance-none h-full text-xs p-1 rounded-md text-black border-0 whitespace-nowrap",
                      {
                        'bg-green-200 hover:bg-green-300': row.conformite === 'oui',
                        'bg-orange-200 hover:bg-orange-300': row.conformite === 'non',
                        'bg-brand-yellow hover:bg-yellow-400': row.conformite === 'none',
                      }
                    )}>
                      <SelectValue placeholder="Choisir" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-</SelectItem>
                      <SelectItem value="oui">Oui</SelectItem>
                      <SelectItem value="non">Non</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmation</AlertDialogTitle>
            <AlertDialogDescription>
              {rowToConfirm?.isSelecting
                ? "Êtes-vous sûr de vouloir forcer la sélection de cette entreprise ?"
                : "Êtes-vous sûr d'annuler la sélection de cette entreprise ?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRowToConfirm(null)}>Non</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSelection}>Oui</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TenderTrackingTable;