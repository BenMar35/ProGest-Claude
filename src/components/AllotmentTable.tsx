"use client";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { cn, generateId } from "@/lib/utils"; // Import generateId

export type AllotmentRow = {
  id: string; // Changé de 'number' à 'string'
  selectedLot: string;
  selectedNumber: string;
};

interface AllotmentTableProps {
  rows: AllotmentRow[];
  setRows: (rows: AllotmentRow[]) => void;
  lots: string[];
}

const AllotmentTable = ({ rows, setRows, lots }: AllotmentTableProps) => {
  // handleAddRow et le bouton sont déplacés vers CanvasAllotment

  const handleRemoveRow = (id: string) => {
    if (!rows) return;
    setRows(rows.filter(row => row.id !== id));
  };

  const handleLotChange = (id: string, value: string) => {
    if (!rows) return;
    setRows(
      rows.map((row) => (row.id === id ? { ...row, selectedLot: value } : row))
    );
  };

  const handleNumberChange = (id: string, value: string) => {
    if (!rows) return;
    setRows(
      rows.map((row) =>
        row.id === id ? { ...row, selectedNumber: value } : row
      )
    );
  };

  const numbers = Array.from({ length: 99 }, (_, i) => (i + 1).toString().padStart(2, '0'));

  return (
    <div className="w-full">
      {/* Bouton Ajouter une ligne retiré d'ici */}
      <div className="w-full"> {/* Removed overflow-x-auto here */}
        <Table className="min-w-max"> {/* Changed w-full to min-w-max */}
          <TableHeader className="sticky top-0 bg-white z-10">
            <TableRow className="hover:bg-transparent">
              <TableHead className="py-1 px-2 border-r whitespace-nowrap min-w-[120px]">N°</TableHead>
              <TableHead className="py-1 px-2 whitespace-nowrap min-w-[200px]">Lot</TableHead>
              <TableHead className="py-1 px-2 whitespace-nowrap min-w-[50px]">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-brand-cream">
            {rows && rows.map((row) => (
              <TableRow key={row.id} className="border-b-0 hover:bg-transparent">
                <TableCell className="p-1 border-r whitespace-nowrap">
                  <Select
                    onValueChange={(value) => handleNumberChange(row.id, value)}
                    value={row.selectedNumber}
                  >
                    <SelectTrigger className={cn(
                      "h-8 text-black border-0 focus:ring-0 focus:ring-offset-0 rounded-md min-w-[100px]",
                      row.selectedNumber ? "bg-brand-cream-light hover:bg-brand-cream" : "bg-brand-yellow hover:bg-yellow-400"
                    )}>
                      <SelectValue placeholder="Choisir" />
                    </SelectTrigger>
                    <SelectContent>
                      {numbers.map((number) => (
                        <SelectItem key={number} value={number}>
                          {number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="p-1 whitespace-nowrap">
                  <Select
                    onValueChange={(value) => handleLotChange(row.id, value)}
                    value={row.selectedLot}
                  >
                    <SelectTrigger className={cn(
                      "h-8 text-black border-0 focus:ring-0 focus:ring-offset-0 rounded-md min-w-[150px]",
                      row.selectedLot ? "bg-brand-cream-light hover:bg-brand-cream" : "bg-brand-yellow hover:bg-yellow-400"
                    )}>
                      <SelectValue placeholder="Sélectionner un lot" />
                    </SelectTrigger>
                    <SelectContent>
                      {lots && lots.length > 0 ? (
                        lots.map((lot) => (
                          <SelectItem key={lot} value={lot}>
                            {lot}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="disabled" disabled>
                          Chargez un fichier de lots
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="p-1 whitespace-nowrap">
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveRow(row.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AllotmentTable;