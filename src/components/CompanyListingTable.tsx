"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, generateId } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import React from "react";

export type CompanyRow = {
  id: string;
  project_id: string;
  ao_lots: string[];
  compta_lots: string[];
  raison_sociale: string;
  adresse: string;
  code_postal: string;
  ville: string;
  telephone: string;
  email: string;
  siret: string;
};

interface CompanyListingTableProps {
  availableLots: string[];
  rows: CompanyRow[];
  setRows: (rows: CompanyRow[]) => void;
  projectId: string;
}

const CompanyListingTable = ({ availableLots, rows, setRows, projectId }: CompanyListingTableProps) => {

  const createEmptyRow = (): CompanyRow => ({
    id: generateId(),
    project_id: projectId,
    ao_lots: [],
    compta_lots: [],
    raison_sociale: "",
    adresse: "",
    code_postal: "",
    ville: "",
    telephone: "",
    email: "",
    siret: "",
  });

  const handleAddRow = async () => {
    if (!projectId) {
      showError("ID du projet manquant pour ajouter une entreprise.");
      return;
    }
    const newCompany = createEmptyRow();
    try {
      const { data, error } = await supabase
        .from('project_companies')
        .insert([{
          project_id: newCompany.project_id,
          raison_sociale: newCompany.raison_sociale,
          adresse: newCompany.adresse,
          code_postal: newCompany.code_postal,
          ville: newCompany.ville,
          telephone: newCompany.telephone,
          email: newCompany.email,
          siret: newCompany.siret,
          ao_lots: newCompany.ao_lots,
          compta_lots: newCompany.compta_lots,
        }])
        .select();

      if (error) throw error;
      if (data && data.length > 0) {
        setRows([...rows, data[0] as unknown as CompanyRow]);
        showSuccess("Entreprise ajoutée au projet !");
      }
    } catch (error: any) {
      console.error("Error adding company:", error);
      showError(`Échec de l'ajout de l'entreprise: ${error.message || 'Erreur inconnue'}`);
    }
  };

  const handleRemoveRow = async (id: string) => {
    try {
      const { error } = await supabase
        .from('project_companies')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setRows(rows.filter(row => row.id !== id));
      showSuccess("Entreprise supprimée du projet !");
    } catch (error: any) {
      console.error("Error removing company:", error);
      showError(`Échec de la suppression de l'entreprise: ${error.message || 'Erreur inconnue'}`);
    }
  };

  const handleInputChange = (id: string, field: keyof CompanyRow, value: string) => {
    setRows(rows.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const handleSaveOnBlur = async (id: string, field: keyof CompanyRow, value: string) => {
    try {
      const updateData: Partial<CompanyRow> = { [field]: value };
      const { error } = await supabase
        .from('project_companies')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      console.error(`Error updating company ${field}:`, error);
      showError(`Échec de la mise à jour du champ ${field}: ${error.message || 'Erreur inconnue'}`);
    }
  };

  const handleAOLotSelection = async (id: string, lot: string) => {
    const updatedRows = rows.map(row => {
      if (row.id === id) {
        const newAOLots = row.ao_lots.includes(lot)
          ? row.ao_lots.filter(l => l !== lot)
          : [...row.ao_lots, lot];
        return { ...row, ao_lots: newAOLots };
      }
      return row;
    });
    setRows(updatedRows);

    const currentRow = updatedRows.find(row => row.id === id);
    if (currentRow) {
      try {
        const { error } = await supabase
          .from('project_companies')
          .update({ ao_lots: currentRow.ao_lots })
          .eq('id', id);

        if (error) throw error;
      } catch (error: any) {
        console.error("Error updating AO lots:", error);
        showError(`Échec de la mise à jour des lots AO: ${error.message || 'Erreur inconnue'}`);
      }
    }
  };
  
  const inputClasses = "h-full bg-transparent border-0 text-xs p-1 w-full";

  const gridTemplateColumns = `
    minmax(120px, max-content) /* Lot AO */
    minmax(200px, 1fr) /* Raison Sociale */
    minmax(250px, 1.5fr) /* Adresse */
    minmax(100px, max-content) /* Code Postal */
    minmax(150px, 1fr) /* Ville */
    minmax(150px, max-content) /* Téléphone */
    minmax(200px, 1fr) /* Email */
    minmax(150px, max-content) /* SIRET */
    minmax(50px, max-content) /* Action */
  `;

  const headerClasses = "font-bold p-1 text-center flex items-center justify-center bg-white min-h-[32px] border-b border-gray-300 whitespace-nowrap";
  const cellClasses = (rowIndex: number) => cn(
    "h-full",
    rowIndex % 2 === 0 ? 'bg-brand-cream' : 'bg-brand-cream-light'
  );

  return (
    <div className="p-2 bg-white border rounded-lg shadow-md w-full">
      
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold">Listing des Entreprises</h3>
        <div className="flex gap-2">
          <Button onClick={handleAddRow} className="bg-brand-yellow hover:bg-yellow-400 text-black">
            <Plus className="mr-2 h-4 w-4" /> Ajouter une entreprise
          </Button>
        </div>
      </div>
      
      <div className="w-full overflow-x-auto">
        <div className="grid w-max" style={{ gridTemplateColumns, gridAutoRows: 'auto' }}>
          {/* HEADER ROW */}
          <div className={headerClasses} style={{ gridColumn: 1, gridRow: 1 }}>Lot AO</div>
          <div className={headerClasses} style={{ gridColumn: 2, gridRow: 1 }}>Raison Sociale</div>
          <div className={headerClasses} style={{ gridColumn: 3, gridRow: 1 }}>Adresse</div>
          <div className={headerClasses} style={{ gridColumn: 4, gridRow: 1 }}>Code Postal</div>
          <div className={headerClasses} style={{ gridColumn: 5, gridRow: 1 }}>Ville</div>
          <div className={headerClasses} style={{ gridColumn: 6, gridRow: 1 }}>Téléphone</div>
          <div className={headerClasses} style={{ gridColumn: 7, gridRow: 1 }}>Email</div>
          <div className={headerClasses} style={{ gridColumn: 8, gridRow: 1 }}>SIRET</div>
          <div className={headerClasses} style={{ gridColumn: 9, gridRow: 1 }}>Action</div>

          {/* BODY ROWS */}
          {rows.map((row, rowIndex) => {
            const gridRowStart = rowIndex + 2;
            return (
              <React.Fragment key={row.id}>
                {/* Lot AO */}
                <div className={cn(cellClasses(rowIndex), "p-1 pt-2 flex flex-wrap gap-1 items-start")} style={{ gridColumn: 1, gridRow: gridRowStart }}>
                  {availableLots.map(lot => (
                    <Button
                      key={lot}
                      variant="outline"
                      size="icon"
                      onClick={() => handleAOLotSelection(row.id, lot)}
                      className={cn(
                        "h-6 w-6 text-xs rounded-md border-gray-400",
                        row.ao_lots.includes(lot)
                          ? "bg-brand-yellow hover:bg-yellow-400 text-black"
                          : "bg-white hover:bg-gray-200"
                      )}
                    >
                      {lot}
                    </Button>
                  ))}
                </div>
                {/* Raison Sociale */}
                <div className={cn(cellClasses(rowIndex), "p-0")} style={{ gridColumn: 2, gridRow: gridRowStart }}>
                  <Input 
                    value={row.raison_sociale} 
                    onChange={(e) => handleInputChange(row.id, 'raison_sociale', e.target.value)} 
                    onBlur={(e) => handleSaveOnBlur(row.id, 'raison_sociale', e.target.value)}
                    className={inputClasses} 
                  />
                </div>
                {/* Adresse */}
                <div className={cn(cellClasses(rowIndex), "p-0")} style={{ gridColumn: 3, gridRow: gridRowStart }}>
                  <Input 
                    value={row.adresse} 
                    onChange={(e) => handleInputChange(row.id, 'adresse', e.target.value)} 
                    onBlur={(e) => handleSaveOnBlur(row.id, 'adresse', e.target.value)}
                    className={inputClasses} 
                  />
                </div>
                {/* Code Postal */}
                <div className={cn(cellClasses(rowIndex), "p-0")} style={{ gridColumn: 4, gridRow: gridRowStart }}>
                  <Input 
                    value={row.code_postal} 
                    onChange={(e) => handleInputChange(row.id, 'code_postal', e.target.value)} 
                    onBlur={(e) => handleSaveOnBlur(row.id, 'code_postal', e.target.value)}
                    className={inputClasses} 
                  />
                </div>
                {/* Ville */}
                <div className={cn(cellClasses(rowIndex), "p-0")} style={{ gridColumn: 5, gridRow: gridRowStart }}>
                  <Input 
                    value={row.ville} 
                    onChange={(e) => handleInputChange(row.id, 'ville', e.target.value)} 
                    onBlur={(e) => handleSaveOnBlur(row.id, 'ville', e.target.value)}
                    className={inputClasses} 
                  />
                </div>
                {/* Téléphone */}
                <div className={cn(cellClasses(rowIndex), "p-0")} style={{ gridColumn: 6, gridRow: gridRowStart }}>
                  <Input 
                    value={row.telephone} 
                    onChange={(e) => handleInputChange(row.id, 'telephone', e.target.value)} 
                    onBlur={(e) => handleSaveOnBlur(row.id, 'telephone', e.target.value)}
                    className={inputClasses} 
                  />
                </div>
                {/* Email */}
                <div className={cn(cellClasses(rowIndex), "p-0")} style={{ gridColumn: 7, gridRow: gridRowStart }}>
                  <Input 
                    value={row.email} 
                    onChange={(e) => handleInputChange(row.id, 'email', e.target.value)} 
                    onBlur={(e) => handleSaveOnBlur(row.id, 'email', e.target.value)}
                    className={inputClasses} 
                  />
                </div>
                {/* SIRET */}
                <div className={cn(cellClasses(rowIndex), "p-0")} style={{ gridColumn: 8, gridRow: gridRowStart }}>
                  <Input 
                    value={row.siret} 
                    onChange={(e) => handleInputChange(row.id, 'siret', e.target.value)} 
                    onBlur={(e) => handleSaveOnBlur(row.id, 'siret', e.target.value)}
                    className={inputClasses} 
                  />
                </div>
                {/* Action */}
                <div className={cn(cellClasses(rowIndex), "p-1 flex items-center justify-center")} style={{ gridColumn: 9, gridRow: gridRowStart }}>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveRow(row.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CompanyListingTable;