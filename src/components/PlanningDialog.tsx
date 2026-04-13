"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AllotmentRow } from "@/components/AllotmentTable";
import { addDays, format, startOfWeek, isToday, getWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { MaitriseOuvrage, Mission } from "@/components/StakeholdersDialog";

interface PlanningDialogProps {
  isOpen: boolean;
  onClose: () => void;
  allotmentRows: AllotmentRow[];
  maitriseOuvrage: MaitriseOuvrage[];
  missions: Mission[];
}

const DAY_COLUMN_WIDTH = 60; // Largeur fixe pour une colonne de jour en pixels

const PlanningDialog = ({ isOpen, onClose, allotmentRows, maitriseOuvrage, missions }: PlanningDialogProps) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60000); // Met à jour toutes les minutes

    return () => {
      clearInterval(timer);
    };
  }, []);

  const today = now;
  const startOfThisWeek = startOfWeek(today, { weekStartsOn: 1 });
  const startDate = addDays(startOfThisWeek, -7); // Commence une semaine avant la semaine actuelle

  const days = Array.from({ length: 28 }, (_, i) => addDays(startDate, i));
  const todayIndex = days.findIndex(day => isToday(day));

  let timePercentageOfDay = 0;
  if (todayIndex !== -1) {
    const hours = now.getHours();
    const minutes = now.getMinutes();
    timePercentageOfDay = (hours * 60 + minutes) / (24 * 60);
  }

  const planningRows = [
    ...maitriseOuvrage.map(mo => ({ id: mo.id, name: `${mo.nomClient} (${mo.rolePoste})`, type: 'MO' })),
    ...missions.map(m => ({ id: m.id, name: `${m.mission} - ${m.raisonSociale}`, type: 'Missions' })),
    ...allotmentRows
      .filter(row => row.selectedLot && row.selectedNumber)
      .map(row => ({
        id: row.id,
        name: `Lot ${row.selectedNumber} - ${row.selectedLot}`,
        type: 'Lot'
      }))
  ];

  const getWeekNumber = (date: Date) => getWeek(date, { weekStartsOn: 1, firstWeekContainsDate: 4 });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Planning du Projet</DialogTitle>
          <DialogDescription>
            Visualisation du planning sur 4 semaines : semaine précédente, semaine en cours, et deux semaines à venir.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-auto relative pr-4">
          <div className="grid gap-px bg-gray-200" style={{ gridTemplateColumns: `250px repeat(28, ${DAY_COLUMN_WIDTH}px)` }}>
            {/* Header - Week Names */}
            <div className="sticky top-0 z-20 bg-white p-2"></div>
            <div className="sticky top-0 z-20 bg-slate-100 p-1 text-center font-semibold" style={{ gridColumn: '2 / span 7' }}>Semaine {getWeekNumber(days[0])} (Précédente)</div>
            <div className="sticky top-0 z-20 bg-blue-100 p-1 text-center font-semibold" style={{ gridColumn: '9 / span 7' }}>Semaine {getWeekNumber(days[7])} (Actuelle)</div>
            <div className="sticky top-0 z-20 bg-slate-100 p-1 text-center font-semibold" style={{ gridColumn: '16 / span 7' }}>Semaine {getWeekNumber(days[14])}</div>
            <div className="sticky top-0 z-20 bg-slate-100 p-1 text-center font-semibold" style={{ gridColumn: '23 / span 7' }}>Semaine {getWeekNumber(days[21])}</div>

            {/* Header - Day Names */}
            <div className="sticky top-9 z-20 bg-white p-2 font-semibold">Intervenants / Lots</div>
            {days.map((day, index) => (
              <div key={index} className={cn("sticky top-9 z-20 p-1 text-center text-xs", isToday(day) ? "bg-brand-yellow text-black" : "bg-white")}>
                <div className="font-bold">{format(day, 'eee', { locale: fr })}</div>
                <div>{format(day, 'dd')}</div>
              </div>
            ))}

            {/* Planning Rows */}
            {planningRows.map(row => (
              <React.Fragment key={row.id}>
                <div className="sticky left-0 z-10 bg-white p-2 text-sm font-medium truncate" title={row.name}>{row.name}</div>
                {days.map((day, index) => (
                  <div key={index} className={cn("h-10", isToday(day) ? "bg-yellow-100" : "bg-brand-cream")}>
                    {/* Future content for tasks will go here */}
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
          {/* Today Marker Line */}
          {todayIndex !== -1 && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-brand-yellow z-30"
              style={{
                left: `calc(250px + ${todayIndex * DAY_COLUMN_WIDTH}px + ${timePercentageOfDay * DAY_COLUMN_WIDTH}px)`
              }}
            ></div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlanningDialog;