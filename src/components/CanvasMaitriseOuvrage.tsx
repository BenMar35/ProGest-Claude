"use client";

import React from 'react';
import MaitriseOuvrageTable from "./MaitriseOuvrageTable";
import { MaitriseOuvrage } from "./StakeholdersDialog";

interface CanvasMaitriseOuvrageProps {
  projectId: string;
  maitriseOuvrage: MaitriseOuvrage[];
  setMaitriseOuvrage: (mo: MaitriseOuvrage[]) => void;
  onSaveSuccess: () => void;
}

const CanvasMaitriseOuvrage = ({
  projectId,
  maitriseOuvrage,
  setMaitriseOuvrage,
  onSaveSuccess,
}: CanvasMaitriseOuvrageProps) => {
  return (
    <div className="p-2 bg-white border rounded-lg shadow-md w-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Maîtrise d'Ouvrage</h3>
      </div>
      <MaitriseOuvrageTable 
        projectId={projectId}
        maitriseOuvrage={maitriseOuvrage}
        setMaitriseOuvrage={setMaitriseOuvrage}
        onSaveSuccess={onSaveSuccess}
      />
    </div>
  );
};

export default CanvasMaitriseOuvrage;