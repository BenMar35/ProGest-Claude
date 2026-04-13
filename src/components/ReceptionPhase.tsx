"use client";

import React from 'react';
import { AllotmentRow } from './AllotmentTable';
import ReceptionTasksTable from './ReceptionTasksTable';
import ReserveLiftingTable from './ReserveLiftingTable';
import { TaskGroup } from './ExecutionPhase';

interface ReceptionPhaseProps {
  taskGroups: TaskGroup[];
  allotmentRows: AllotmentRow[];
}

const ReceptionPhase = ({ taskGroups, allotmentRows }: ReceptionPhaseProps) => {
  return (
    <div className="flex flex-row items-start gap-6 w-full"> {/* Changed to w-full */}
      <ReceptionTasksTable initialTaskGroups={taskGroups} allotmentRows={allotmentRows} />
      <ReserveLiftingTable allotmentRows={allotmentRows} />
    </div>
  );
};

export default ReceptionPhase;