"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import PdfUploadViewer from './PdfUploadViewer';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { CompanyRow } from './CompanyListingTable';

type AccountingRow = {
  lot: string;
  raisonSociale: string;
  projectCompanyId: string | null;
  marche: number;
  marcheFileUrl: string | null;
  marcheFileName: string | null;
  avenants: (number | null)[];
  avenantFileUrls: (string | null)[];
  avenantFileNames: (string | null)[];
  bps: (number | null)[];
  bpFileUrls: (string | null)[];
  bpFileNames: (string | null)[];
};

interface AccountingSummaryTableProps {
  projectId: string;
  mieuxDisantData: Map<string, { minOffer: number; companyName: string }>;
  projectCompanies: CompanyRow[];
}

const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return "";
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
};

const parseCurrency = (value: string): number | null => {
  if (!value) return null;
  const numberString = value.replace(/€/g, '').replace(/\s/g, '').replace(',', '.');
  const parsed = parseFloat(numberString);
  return isNaN(parsed) ? null : parsed;
};

const AccountingSummaryTable = ({ projectId, mieuxDisantData, projectCompanies }: AccountingSummaryTableProps) => {
  const [rows, setRows] = useState<AccountingRow[]>([]);
  const [numAvenants, setNumAvenants] = useState(0);
  const [numBPs, setNumBPs] = useState(1);

  const companyNameToIdMap = useCallback(() => {
    const map = new Map<string, string>();
    projectCompanies.forEach(pc => {
      map.set(pc.raison_sociale, pc.id);
    });
    return map;
  }, [projectCompanies]);

  const fetchAccountingDocuments = useCallback(async () => {
    if (!projectId) return [];

    const { data, error } = await supabase
      .from('accounting_documents')
      .select('*')
      .eq('project_id', projectId);

    if (error) {
      console.error("Error fetching accounting documents:", error);
      showError("Erreur lors du chargement des documents comptables.");
      return [];
    }
    return data;
  }, [projectId]);

  useEffect(() => {
    const initializeRows = async () => {
      const fetchedDocs = await fetchAccountingDocuments();
      const docsMap = new Map<string, any>();
      fetchedDocs.forEach(doc => {
        docsMap.set(`${doc.lot}-${doc.project_company_id}-${doc.document_type}-${doc.document_index}`, doc);
      });

      setRows(currentRows => {
        const currentDataMap = new Map(currentRows.map(r => [r.lot, r]));
        const newRows: AccountingRow[] = [];
        const companyIdMap = companyNameToIdMap();

        mieuxDisantData.forEach((data, lot) => {
          const existingData = currentDataMap.get(lot);
          const projectCompanyId = companyIdMap.get(data.companyName) || null;

          const avenants = existingData ? [...existingData.avenants] : [];
          const avenantFileUrls = existingData ? [...existingData.avenantFileUrls] : [];
          const avenantFileNames = existingData ? [...existingData.avenantFileNames] : [];
          while (avenants.length < numAvenants) {
            avenants.push(null);
            avenantFileUrls.push(null);
            avenantFileNames.push(null);
          }

          const bps = existingData ? [...existingData.bps] : [];
          const bpFileUrls = existingData ? [...existingData.bpFileUrls] : [];
          const bpFileNames = existingData ? [...existingData.bpFileNames] : [];
          while (bps.length < numBPs) {
            bps.push(null);
            bpFileUrls.push(null);
            bpFileNames.push(null);
          }

          const marcheDoc = docsMap.get(`${lot}-${projectCompanyId}-marche-0`);
          const initialMarcheFileUrl = marcheDoc?.file_url || (existingData ? existingData.marcheFileUrl : null);
          const initialMarcheFileName = marcheDoc?.file_name || (existingData ? existingData.marcheFileName : null);

          for (let i = 0; i < numAvenants; i++) {
            const avenantDoc = docsMap.get(`${lot}-${projectCompanyId}-avenant-${i}`);
            avenantFileUrls[i] = avenantDoc?.file_url || avenantFileUrls[i];
            avenantFileNames[i] = avenantDoc?.file_name || avenantFileNames[i];
          }
          for (let i = 0; i < numBPs; i++) {
            const bpDoc = docsMap.get(`${lot}-${projectCompanyId}-bp-${i}`);
            bpFileUrls[i] = bpDoc?.file_url || bpFileUrls[i];
            bpFileNames[i] = bpDoc?.file_name || bpFileNames[i];
          }

          newRows.push({
            lot,
            raisonSociale: data.companyName,
            projectCompanyId,
            marche: existingData ? existingData.marche : data.minOffer,
            marcheFileUrl: initialMarcheFileUrl,
            marcheFileName: initialMarcheFileName,
            avenants: avenants.slice(0, numAvenants),
            avenantFileUrls: avenantFileUrls.slice(0, numAvenants),
            avenantFileNames: avenantFileNames.slice(0, numAvenants),
            bps: bps.slice(0, numBPs),
            bpFileUrls: bpFileUrls.slice(0, numBPs),
            bpFileNames: bpFileNames.slice(0, numBPs),
          });
        });

        newRows.sort((a, b) => parseInt(a.lot, 10) - parseInt(b.lot, 10));
        
        if (JSON.stringify(currentRows) === JSON.stringify(newRows)) {
          return currentRows;
        }
        
        return newRows;
      });
    };

    initializeRows();
  }, [projectId, mieuxDisantData, numAvenants, numBPs, projectCompanies, fetchAccountingDocuments, companyNameToIdMap]);

  const handleAddAvenant = () => setNumAvenants(n => n + 1);
  const handleRemoveAvenant = (indexToRemove: number) => {
    setRows(currentRows => currentRows.map(row => {
        const newAvenants = [...row.avenants];
        const newAvenantFileUrls = [...row.avenantFileUrls];
        const newAvenantFileNames = [...row.avenantFileNames];
        newAvenants.splice(indexToRemove, 1);
        newAvenantFileUrls.splice(indexToRemove, 1);
        newAvenantFileNames.splice(indexToRemove, 1);
        return { ...row, avenants: newAvenants, avenantFileUrls: newAvenantFileUrls, avenantFileNames: newAvenantFileNames };
    }));
    setNumAvenants(n => n - 1);
  };

  const handleAddBP = () => setNumBPs(n => n + 1);
  const handleRemoveBP = (indexToRemove: number) => {
    setRows(currentRows => currentRows.map(row => {
        const newBPs = [...row.bps];
        const newBPFileUrls = [...row.bpFileUrls];
        const newBPFileNames = [...row.bpFileNames];
        newBPs.splice(indexToRemove, 1);
        newBPFileUrls.splice(indexToRemove, 1);
        newBPFileNames.splice(indexToRemove, 1);
        return { ...row, bps: newBPs, bpFileUrls: newBPFileUrls, bpFileNames: newBPFileNames };
    }));
    setNumBPs(n => n - 1);
  };

  const handleValueChange = (lot: string, type: 'marche' | 'avenant' | 'bp', index: number, value: string) => {
    const numericValue = parseCurrency(value);
    setRows(rows.map(row => {
      if (row.lot === lot) {
        if (type === 'marche') return { ...row, marche: numericValue ?? 0 };
        if (type === 'avenant') {
          const newAvenants = [...row.avenants];
          newAvenants[index] = numericValue;
          return { ...row, avenants: newAvenants };
        }
        const newBPs = [...row.bps];
        newBPs[index] = numericValue;
        return { ...row, bps: newBPs };
      }
      return row;
    }));
  };

  const handleFileChange = (lot: string, type: 'marche' | 'avenant' | 'bp', index: number, newFileUrl: string | null, newFileName: string | null) => {
    setRows(rows.map(row => {
      if (row.lot === lot) {
        if (type === 'marche') return { ...row, marcheFileUrl: newFileUrl, marcheFileName: newFileName };
        if (type === 'avenant') {
          const newAvenantFileUrls = [...row.avenantFileUrls];
          const newAvenantFileNames = [...row.avenantFileNames];
          newAvenantFileUrls[index] = newFileUrl;
          newAvenantFileNames[index] = newFileName;
          return { ...row, avenantFileUrls: newAvenantFileUrls, avenantFileNames: newAvenantFileNames };
        }
        const newBPFileUrls = [...row.bpFileUrls];
        const newBPFileNames = [...row.bpFileNames];
        newBPFileUrls[index] = newFileUrl;
        newBPFileNames[index] = newFileName;
        return { ...row, bpFileUrls: newBPFileUrls, bpFileNames: newBPFileNames };
      }
      return row;
    }));
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') event.currentTarget.blur();
  };

  const gridTemplateColumns = `minmax(80px, max-content) minmax(100px, max-content) minmax(100px, max-content) minmax(40px, max-content) ${Array(numAvenants).fill('minmax(100px, max-content) minmax(40px, max-content)').join(' ')} minmax(100px, max-content) ${Array(numBPs).fill('minmax(100px, max-content) minmax(40px, max-content)').join(' ')} minmax(100px, max-content) minmax(100px, max-content)`;

  return (
    <div className="p-2 bg-white border rounded-lg shadow-md w-full">
      <h3 className="text-lg font-semibold mb-2">Bilan Compta</h3>
      <div className="w-full"> {/* Removed overflow-x-auto here */}
        <div className="grid w-max" style={{ gridTemplateColumns, gridAutoRows: 'auto' }}> {/* Changed w-full to w-max */}
          {/* HEADER ROW 1 */}
          <div className="font-bold p-1 text-center flex items-center justify-center bg-white min-h-[32px] border-b whitespace-nowrap" style={{ gridColumn: 1, gridRow: '1 / span 2' }}>Lot</div>
          <div className="font-bold p-1 flex items-center bg-white min-h-[32px] border-b whitespace-nowrap" style={{ gridColumn: 2, gridRow: '1 / span 2' }}>Raison Sociale</div>
          <div className="font-bold p-1 text-center flex items-center justify-center bg-white min-h-[32px] border-b whitespace-nowrap" style={{ gridColumn: `3 / span ${2 + numAvenants * 2}`, gridRow: 1 }}>
            <div className="flex items-center justify-center gap-2 whitespace-nowrap">Offre<Button onClick={handleAddAvenant} size="icon" className="bg-brand-yellow hover:bg-yellow-400 text-black h-6 w-6"><Plus className="h-4 w-4" /></Button></div>
          </div>
          <div className="font-bold p-1 text-center flex items-center justify-center bg-white min-h-[32px] border-b whitespace-nowrap" style={{ gridColumn: 5 + numAvenants * 2, gridRow: '1 / span 2' }}>Total</div>
          <div className="font-bold p-1 text-center flex items-center justify-center bg-white min-h-[32px] border-b whitespace-nowrap" style={{ gridColumn: `${6 + numAvenants * 2} / span ${numBPs * 2}`, gridRow: 1 }}>
            <div className="flex items-center justify-center gap-2 whitespace-nowrap">Bons de Paiement<Button onClick={handleAddBP} size="icon" className="bg-brand-yellow hover:bg-yellow-400 text-black h-6 w-6"><Plus className="h-4 w-4" /></Button></div>
          </div>
          <div className="font-bold p-1 text-center flex items-center justify-center bg-white min-h-[32px] border-b whitespace-nowrap" style={{ gridColumn: 6 + numAvenants * 2 + numBPs * 2, gridRow: '1 / span 2' }}>Total Paiement</div>
          <div className="font-bold p-1 text-center flex items-center justify-center bg-white min-h-[32px] border-b whitespace-nowrap" style={{ gridColumn: 7 + numAvenants * 2 + numBPs * 2, gridRow: '1 / span 2' }}>Reste à Payer</div>

          {/* HEADER ROW 2 */}
          <div className="bg-white border-b" style={{ gridColumn: 1, gridRow: 2 }}></div>
          <div className="bg-white border-b" style={{ gridColumn: 2, gridRow: 2 }}></div>
          <div className="font-medium p-1 text-xs text-center flex items-center justify-center bg-white border-b whitespace-nowrap" style={{ gridColumn: 3, gridRow: 2 }}>Marché</div>
          <div className="bg-white border-b" style={{ gridColumn: 4, gridRow: 2 }}></div>
          {Array.from({ length: numAvenants }).map((_, i) => (
            <React.Fragment key={`avenant-header-${i}`}>
              <div className="font-medium p-1 text-xs text-center flex items-center justify-center bg-white border-b whitespace-nowrap" style={{ gridColumn: 5 + i * 2, gridRow: 2 }}>
                <div className="flex items-center justify-center gap-1 whitespace-nowrap">Avenant {i + 1}<Button onClick={() => handleRemoveAvenant(i)} size="icon" className="bg-brand-yellow hover:bg-yellow-400 text-black h-5 w-5"><Minus className="h-4 w-4" /></Button></div>
              </div>
              <div className="bg-white border-b" style={{ gridColumn: 6 + i * 2, gridRow: 2 }}></div>
            </React.Fragment>
          ))}
          {Array.from({ length: numBPs }).map((_, i) => (
            <React.Fragment key={`bp-header-${i}`}>
              <div className="font-medium p-1 text-xs text-center flex items-center justify-center bg-white border-b whitespace-nowrap" style={{ gridColumn: 6 + numAvenants * 2 + i * 2, gridRow: 2 }}>
                <div className="flex items-center justify-center gap-1 whitespace-nowrap">BP {i + 1}{i > 0 && <Button onClick={() => handleRemoveBP(i)} size="icon" className="bg-brand-yellow hover:bg-yellow-400 text-black h-5 w-5"><Minus className="h-4 w-4" /></Button>}</div>
              </div>
              <div className="bg-white border-b" style={{ gridColumn: 7 + numAvenants * 2 + i * 2, gridRow: 2 }}></div>
            </React.Fragment>
          ))}

          {/* BODY */}
          {rows.map((row, rowIndex) => {
            const totalMarche = (row.marche || 0) + row.avenants.reduce((acc, val) => acc + (val || 0), 0);
            const totalPaiement = row.bps.reduce((acc, val) => acc + (val || 0), 0);
            const resteAPayer = totalMarche - totalPaiement;
            const gridRowStart = rowIndex + 3;
            const rowColorClass = rowIndex % 2 === 0 ? 'bg-brand-cream' : 'bg-brand-cream-light';

            return (
              <React.Fragment key={row.lot}>
                <div className={cn("p-1 text-xs flex items-center justify-center whitespace-nowrap", rowColorClass)} style={{ gridColumn: 1, gridRow: gridRowStart }}>{row.lot}</div>
                <div className={cn("p-1 text-xs flex items-center whitespace-nowrap", rowColorClass)} style={{ gridColumn: 2, gridRow: gridRowStart }}>{row.raisonSociale}</div>
                <div className={rowColorClass} style={{ gridColumn: 3, gridRow: gridRowStart }}><Input value={formatCurrency(row.marche)} onChange={(e) => handleValueChange(row.lot, 'marche', 0, e.target.value)} onBlur={(e) => handleValueChange(row.lot, 'marche', 0, e.target.value)} onKeyDown={handleInputKeyDown} className="h-full w-full p-1 bg-transparent border-0 text-xs text-right whitespace-nowrap" /></div>
                <div className={cn(rowColorClass, "flex items-center justify-center whitespace-nowrap")} style={{ gridColumn: 4, gridRow: gridRowStart }}>
                  <PdfUploadViewer 
                    projectId={projectId}
                    lot={row.lot}
                    projectCompanyId={row.projectCompanyId}
                    documentType="marche"
                    documentIndex={0}
                    currentFileUrl={row.marcheFileUrl}
                    currentFileName={row.marcheFileName}
                    onFileChange={(url, name) => handleFileChange(row.lot, 'marche', 0, url, name)} 
                  />
                </div>
                
                {Array.from({ length: numAvenants }).map((_, i) => (
                  <React.Fragment key={`avenant-cell-${i}`}>
                    <div className={rowColorClass} style={{ gridColumn: 5 + i * 2, gridRow: gridRowStart }}><Input placeholder={`Avenant ${i + 1}`} value={formatCurrency(row.avenants[i])} onChange={(e) => handleValueChange(row.lot, 'avenant', i, e.target.value)} onBlur={(e) => handleValueChange(row.lot, 'avenant', i, e.target.value)} onKeyDown={handleInputKeyDown} className="h-full w-full p-1 bg-transparent border-0 text-xs text-right whitespace-nowrap" /></div>
                    <div className={cn(rowColorClass, "flex items-center justify-center whitespace-nowrap")} style={{ gridColumn: 6 + i * 2, gridRow: gridRowStart }}>
                      <PdfUploadViewer 
                        projectId={projectId}
                        lot={row.lot}
                        projectCompanyId={row.projectCompanyId}
                        documentType="avenant"
                        documentIndex={i}
                        currentFileUrl={row.avenantFileUrls[i]}
                        currentFileName={row.avenantFileNames[i]}
                        onFileChange={(url, name) => handleFileChange(row.lot, 'avenant', i, url, name)} 
                      />
                    </div>
                  </React.Fragment>
                ))}

                <div className={cn("p-1 text-xs flex items-center justify-end font-bold whitespace-nowrap", rowColorClass)} style={{ gridColumn: 5 + numAvenants * 2, gridRow: gridRowStart }}>{formatCurrency(totalMarche)}</div>
                
                {Array.from({ length: numBPs }).map((_, i) => (
                  <React.Fragment key={`bp-cell-${i}`}>
                    <div className={rowColorClass} style={{ gridColumn: 6 + numAvenants * 2 + i * 2, gridRow: gridRowStart }}><Input placeholder={`BP ${i + 1}`} value={formatCurrency(row.bps[i])} onChange={(e) => handleValueChange(row.lot, 'bp', i, e.target.value)} onBlur={(e) => handleValueChange(row.lot, 'bp', i, e.target.value)} onKeyDown={handleInputKeyDown} className="h-full w-full p-1 bg-transparent border-0 text-xs text-right whitespace-nowrap" /></div>
                    <div className={cn(rowColorClass, "flex items-center justify-center whitespace-nowrap")} style={{ gridColumn: 7 + numAvenants * 2 + i * 2, gridRow: gridRowStart }}>
                      <PdfUploadViewer 
                        projectId={projectId}
                        lot={row.lot}
                        projectCompanyId={row.projectCompanyId}
                        documentType="bp"
                        documentIndex={i}
                        currentFileUrl={row.bpFileUrls[i]}
                        currentFileName={row.bpFileNames[i]}
                        onFileChange={(url, name) => handleFileChange(row.lot, 'bp', i, url, name)} 
                      />
                    </div>
                  </React.Fragment>
                ))}

                <div className={cn("p-1 text-xs flex items-center justify-end font-bold whitespace-nowrap", rowColorClass)} style={{ gridColumn: 6 + numAvenants * 2 + numBPs * 2, gridRow: gridRowStart }}>{formatCurrency(totalPaiement)}</div>
                <div className={cn("p-1 text-xs flex items-center justify-end font-bold whitespace-nowrap", rowColorClass)} style={{ gridColumn: 7 + numAvenants * 2 + numBPs * 2, gridRow: gridRowStart }}>{formatCurrency(resteAPayer)}</div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AccountingSummaryTable;