"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ColumnDefinition<T> = {
  key: keyof T;
  label: string;
  width: string; 
};

interface GenericStakeholderTableProps<T extends { id: string }> {
  data: T[];
  setData: (data: T[]) => void;
  columns: ColumnDefinition<T>[];
  createEmptyRow: () => T;
  addRowButtonText: string;
}

const GenericStakeholderTable = <T extends { id: string },>({
  data,
  setData,
  columns,
  createEmptyRow,
  addRowButtonText,
}: GenericStakeholderTableProps<T>) => {
  
  const handleAddRow = () => {
    setData([...(data || []), createEmptyRow()]);
  };

  const handleRemoveRow = (id: string) => {
    if (!data) return;
    setData(data.filter(item => item.id !== id));
  };

  const handleInputChange = (id: string, field: keyof T, value: string) => {
    setData(
      data.map(item => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  return (
    <div className="flex flex-col flex-grow min-h-0 space-y-2">
      <div className="flex justify-end flex-shrink-0">
        <Button onClick={handleAddRow} className="bg-brand-yellow hover:bg-yellow-400 text-black">
          <Plus className="mr-2 h-4 w-4" /> {addRowButtonText}
        </Button>
      </div>
      
      {/* SEUL conteneur de défilement autorisé */}
      <div className="flex-grow overflow-auto border rounded-md relative bg-white">
        <table className="min-w-max w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              {columns.map(col => (
                <th 
                  key={String(col.key)} 
                  className={cn(
                    "sticky top-0 z-20 whitespace-nowrap px-4 py-3 bg-white border-b font-bold text-black text-left shadow-[0_1px_0_0_rgba(0,0,0,0.1)]", 
                    col.width
                  )}
                >
                  {col.label}
                </th>
              ))}
              <th className="sticky top-0 z-20 w-[80px] px-4 py-3 text-center bg-white border-b font-bold text-black shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {(!data || data.length === 0) ? (
              <tr>
                <td colSpan={columns.length + 1} className="h-24 text-center text-muted-foreground">
                  Aucun intervenant ajouté.
                </td>
              </tr>
            ) : (
              data.map((item, rowIndex) => (
                <tr
                  key={item.id}
                  className={cn(
                    "transition-colors hover:bg-muted/50",
                    rowIndex % 2 === 0 ? 'bg-brand-cream' : 'bg-brand-cream-light'
                  )}
                >
                  {columns.map(col => (
                    <td key={String(col.key)} className="p-1 border-b">
                      <Input
                        value={item[col.key] as string}
                        onChange={(e) => handleInputChange(item.id, col.key, e.target.value)}
                        className="h-9 bg-transparent border-0 focus-visible:ring-1 focus-visible:ring-slate-400 text-sm w-full"
                      />
                    </td>
                  ))}
                  <td className="p-1 text-center border-b">
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveRow(item.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GenericStakeholderTable;