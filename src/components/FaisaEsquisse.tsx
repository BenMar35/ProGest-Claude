"use client";

import React from 'react';
import AnalyseUrbaineTable from './AnalyseUrbaineTable';
import InspirationBoard from './InspirationBoard';
import CroquisBoard from './CroquisBoard';

const FaisaEsquisse = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start w-full"> {/* Changed to w-full */}
      <div>
        <AnalyseUrbaineTable />
      </div>
      <div className="flex flex-col gap-6">
        <InspirationBoard />
        <InspirationBoard />
        <CroquisBoard />
      </div>
    </div>
  );
};

export default FaisaEsquisse;