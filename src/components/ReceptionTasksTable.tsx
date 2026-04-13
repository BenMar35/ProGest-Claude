"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FileText } from "lucide-react";
import { Task, TaskGroup } from './ExecutionPhase';
import { AllotmentRow } from './AllotmentTable';
import { showSuccess } from '@/utils/toast';
import { Textarea } from './ui/textarea';
import { generateId } from "@/lib/utils";

interface ReceptionTasksTableProps {
  initialTaskGroups: TaskGroup[];
  allotmentRows: AllotmentRow[];
}

const ReceptionTasksTable = ({ initialTaskGroups, allotmentRows }: ReceptionTasksTableProps) => {
  const [receptionTaskGroups, setReceptionTaskGroups] = useState<TaskGroup[]>([]);

  useEffect(() => {
    const inProgressGroups = initialTaskGroups.map(group => ({
      ...group,
      tasks: group.tasks.filter(task => !['OK', 'NON', 'Vide'].includes(task.status))
    })).filter(group => group.tasks.length > 0);
    setReceptionTaskGroups(inProgressGroups);
  }, [initialTaskGroups]);

  const handleAddTask = (intervenantId: string) => {
    setReceptionTaskGroups(groups => groups.map(group => {
      if (group.intervenantId === intervenantId) {
        const newTask: Task = {
          id: generateId(),
          comment: '',
          provisionalDate: '',
          completionDate: '',
          status: 'Encours',
          color: 'black',
        };
        return { ...group, tasks: [...group.tasks, newTask] };
      }
      return group;
    }));
  };

  const handleTaskCommentChange = (intervenantId: string, taskId: string, comment: string) => {
    setReceptionTaskGroups(groups => groups.map(group => {
      if (group.intervenantId === intervenantId) {
        const updatedTasks = group.tasks.map(task => 
          task.id === taskId ? { ...task, comment } : task
        );
        return { ...group, tasks: updatedTasks };
      }
      return group;
    }));
  };

  const handleGeneratePdf = (lotInfo: string) => {
    showSuccess(`Génération du PV de levée de réserves pour ${lotInfo} lancée.`);
  };

  const lotNameMap = new Map(allotmentRows.map(r => [r.selectedNumber, r.selectedLot]));

  const lotsInReception = [...new Set(receptionTaskGroups.map(g => g.lotInfo?.match(/Lot (\d+)/)?.[1]).filter(Boolean))];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Réception des Travaux</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {lotsInReception.map(lotNumber => (
            <div key={lotNumber}>
              <div className="flex justify-between items-center bg-gray-100 p-2 rounded-t-md">
                <h4 className="font-bold whitespace-nowrap">{`Lot ${lotNumber} - ${lotNameMap.get(lotNumber) || ''}`}</h4>
                <Button size="sm" onClick={() => handleGeneratePdf(`Lot ${lotNumber}`)}>
                  <FileText className="mr-2 h-4 w-4" /> Générer PV Réception
                </Button>
              </div>
              <div className="w-full"> {/* Removed overflow-x-auto here */}
                <Table className="min-w-max">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Intervenant</TableHead>
                      <TableHead className="whitespace-nowrap">Tâche / Réserve</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receptionTaskGroups.filter(g => g.lotInfo?.includes(`Lot ${lotNumber}`)).map(group => (
                      <React.Fragment key={group.intervenantId}>
                        {group.tasks.map(task => (
                          <TableRow key={task.id}>
                            <TableCell className="text-sm whitespace-nowrap">{group.displayName}</TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Textarea
                                value={task.comment}
                                onChange={(e) => handleTaskCommentChange(group.intervenantId, task.id, e.target.value)}
                                className="h-8 text-xs"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell className="whitespace-nowrap">{group.displayName}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Button variant="outline" size="sm" onClick={() => handleAddTask(group.intervenantId)}>
                              <Plus className="mr-2 h-4 w-4" /> Ajouter une réserve
                            </Button>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ReceptionTasksTable;