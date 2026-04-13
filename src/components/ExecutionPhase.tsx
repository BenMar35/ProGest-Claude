"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AllotmentRow } from './AllotmentTable';
import { cn, generateId } from '@/lib/utils';
import { DatePickerButton } from './DatePickerButton';
import { TimePickerButton } from './TimePickerButton';
import { Check, Trash2, Upload, X, FileDown, Loader2, Plus, UserPlus } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { MaitriseOuvrage, Mission } from './StakeholdersDialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { CompanyRow } from './CompanyListingTable';
import { useCompanyContacts } from '@/hooks/useCompanyContacts';
import { generateCRPdf } from '@/utils/pdfService';
import { supabase } from '@/integrations/supabase/client';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import CompanyAttendanceRowGroup from './CompanyAttendanceRowGroup';
import MissionAttendanceRowGroup from './MissionAttendanceRowGroup';
import MaitriseOuvrageAttendanceRow from './MaitriseOuvrageAttendanceRow';
import { SelectedContact } from './CompanyContactSelectorPopover';

// --- Types de données ---
export type AttendanceStatus = 'Pres.' | 'Exc.' | 'Abs.' | 'Vide';
export type TaskStatus = 'OK' | 'Encours' | 'Retard' | 'à reprendre' | 'NON' | 'Vide';
export type TaskColor = 'green' | 'black' | 'red';

export type Task = {
  id: string;
  comment: string;
  provisionalDate: string;
  completionDate: string;
  status: TaskStatus;
  color: TaskColor;
};

export type ContactAttendanceState = {
  contactId: string;
  status: AttendanceStatus;
  absences: number | null;
  convoque: boolean;
};

export type CompanyAttendance = {
  id: string;
  status: AttendanceStatus;
  absences: number | null;
  convoque: boolean;
  selectedContacts: SelectedContact[];
  contactAttendance: ContactAttendanceState[];
};

export type TaskGroup = {
  intervenantId: string;
  intervenantType: 'maitrise-ouvrage' | 'mission' | 'entreprise';
  displayName: string;
  lotInfo?: string;
  tasks: Task[];
};

export type MissionAttendance = {
  id: string;
  present: boolean;
};

export type MOAttendance = {
  id: string;
  present: boolean;
};

interface ExecutionPhaseProps {
  mieuxDisantData: Map<string, { minOffer: number; companyName: string }>;
  allotmentRows: AllotmentRow[];
  taskGroups: TaskGroup[];
  setTaskGroups: React.Dispatch<React.SetStateAction<TaskGroup[]>>;
  maitriseOuvrage: MaitriseOuvrage[];
  setMaitriseOuvrage: (mo: MaitriseOuvrage[]) => void;
  missions: Mission[];
  setMissions: (missions: Mission[]) => void;
  projectCompanies: CompanyRow[]; 
  onSaveSuccess: () => void;
}

const DEFAULT_OBSERVATIONS = `Les déchets doivent être gérés et évacués quotidiennement.
Le stockage des matériaux et du matériel est strictement interdit en dehors de la zone de chantier.
Les abords doivent rester propres durant toute l’opération.
Toute intervention, même ponctuelle, pouvant générer des nuisances sonores importantes doivent
être signalée au Maître d’Œuvre et au Maître d’Ouvrage au minimum 1 journée ouvrée avant
cette même intervention. Dans le cas contraire, ceuxci
seront considérés comme inclus dans le marché de base.
Une boite à clé a été posé avec une clé de chaque appartement à l’intérieur dans une
colonne technique au premier étage.
Horaire du chantier : 07h00 à 20h00.
Le code de la boite à clé est : xxxx`;

const ExecutionPhase = ({ 
  mieuxDisantData, 
  allotmentRows, 
  taskGroups, 
  setTaskGroups,
  maitriseOuvrage,
  setMaitriseOuvrage,
  missions,
  setMissions,
  projectCompanies,
  onSaveSuccess
}: ExecutionPhaseProps) => {
  const [reportNumber, setReportNumber] = useState('');
  const [reportDate, setReportDate] = useState('');
  const [nextMeetingDate, setNextMeetingDate] = useState('');
  const [nextMeetingTime, setNextMeetingTime] = useState('');
  const [generalObservations, setGeneralObservations] = useState(DEFAULT_OBSERVATIONS);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  const [visibleMoIds, setVisibleMoIds] = useState<Set<string>>(new Set());
  const [moAttendance, setMoAttendance] = useState<Record<string, MOAttendance>>({});
  const [companyAttendance, setCompanyAttendance] = useState<Record<string, CompanyAttendance>>({});
  const [photos, setPhotos] = useState<(File | null)[]>([null, null]);
  const [photoPreviews, setPhotoPreviews] = useState<(string | null)[]>([null, null]);
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null);
  const photo1InputRef = useRef<HTMLInputElement>(null);
  const photo2InputRef = useRef<HTMLInputElement>(null);

  const [isAbsenceConfirmOpen, setIsAbsenceConfirmOpen] = useState(false);
  const [isAbsenceResetOpen, setIsAbsenceResetOpen] = useState(false);
  const [targetAbsence, setTargetAbsence] = useState<{ type: 'company' | 'contact', id: string, name: string, contactId?: string } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lotNameMap = useMemo(() => new Map(allotmentRows.map(r => [r.selectedNumber, r.selectedLot])), [allotmentRows]);
  
  const projectId = projectCompanies[0]?.project_id || '';
  const { fetchContacts, contactMap } = useCompanyContacts(projectId, projectCompanies);

  const companiesForTasks = useMemo(() => 
    Array.from(mieuxDisantData.entries()).map(([lot, data]) => {
      const companyDetail = projectCompanies.find(pc => pc.raison_sociale === data.companyName);
      return {
        id: `${lot}-${data.companyName}`,
        lotNumber: lot,
        lotName: lotNameMap.get(lot) || '',
        raisonSociale: data.companyName,
        companyDetail: companyDetail,
      };
    }).sort((a, b) => parseInt(a.lotNumber, 10) - parseInt(b.lotNumber, 10)),
    [mieuxDisantData, lotNameMap, projectCompanies]
  );

  useEffect(() => {
    if (maitriseOuvrage.length > 0 && visibleMoIds.size === 0) {
      setVisibleMoIds(new Set(maitriseOuvrage.map(m => m.id)));
    }
  }, [maitriseOuvrage]);

  useEffect(() => {
    setMoAttendance(prev => {
      const newMoAttendance: Record<string, MOAttendance> = {};
      maitriseOuvrage.forEach(mo => {
        newMoAttendance[mo.id] = prev[mo.id] || { id: mo.id, present: false };
      });
      return newMoAttendance;
    });
  }, [maitriseOuvrage]);

  useEffect(() => {
    setCompanyAttendance(prev => {
      const newCompanyAttendance: Record<string, CompanyAttendance> = { ...prev };
      
      // Initialisation pour les entreprises
      companiesForTasks.forEach(company => {
        if (!newCompanyAttendance[company.id]) {
          const storedContactId = (company.companyDetail as any)?.master_contact_id;
          const initialContacts = storedContactId ? [{ id: storedContactId, nom: contactMap.get(storedContactId)?.nom || '', role: '' }] : [];
          
          newCompanyAttendance[company.id] = { 
            id: company.id, status: 'Vide', absences: null, convoque: true, selectedContacts: initialContacts, contactAttendance: [] 
          };
        }
      });

      // Initialisation pour les missions
      missions.forEach(mission => {
        if (!newCompanyAttendance[mission.id]) {
          const initialContacts = mission.contactId ? [{ id: mission.contactId, nom: mission.contact, role: '' }] : [];
          
          newCompanyAttendance[mission.id] = {
            id: mission.id, status: 'Vide', absences: null, convoque: true, selectedContacts: initialContacts, contactAttendance: []
          };
        }
      });
      return newCompanyAttendance;
    });
  }, [missions, companiesForTasks, contactMap]);

  const incrementAbsence = useCallback((target: { type: 'company' | 'contact', id: string, contactId?: string }) => {
    if (target.type === 'company') {
      setCompanyAttendance(prev => {
        const current = prev[target.id];
        const newAbsences = (current.absences || 0) + 1;
        return {
          ...prev,
          [target.id]: { ...current, absences: newAbsences, status: newAbsences > 0 ? 'Abs.' : 'Vide' }
        };
      });
    } else if (target.type === 'contact' && target.contactId) {
      setCompanyAttendance(prev => {
        const companyAtt = prev[target.id];
        if (!companyAtt) return prev;
        const updatedContactAttendance = companyAtt.contactAttendance.map(c => {
          if (c.contactId === target.contactId) {
            const newAbsences = (c.absences || 0) + 1;
            return { ...c, absences: newAbsences, status: newAbsences > 0 ? 'Abs.' : 'Pres.' };
          }
          return c;
        });
        return { ...prev, [target.id]: { ...companyAtt, contactAttendance: updatedContactAttendance } };
      });
    }
  }, []);

  const resetAbsence = useCallback((target: { type: 'company' | 'contact', id: string, contactId?: string }) => {
    if (target.type === 'company') {
      setCompanyAttendance(prev => ({
        ...prev,
        [target.id]: { ...prev[target.id], absences: null, status: 'Vide' }
      }));
    } else if (target.type === 'contact' && target.contactId) {
      setCompanyAttendance(prev => {
        const companyAtt = prev[target.id];
        if (!companyAtt) return prev;
        const updatedContactAttendance = companyAtt.contactAttendance.map(c => {
          if (c.contactId === target.contactId) return { ...c, absences: null, status: 'Pres.' };
          return c;
        });
        return { ...prev, [target.id]: { ...companyAtt, contactAttendance: updatedContactAttendance } };
      });
    }
    showSuccess("Absence réinitialisée.");
  }, []);

  const handleAbsenceClick = (target: { type: 'company' | 'contact', id: string, name: string, contactId?: string }) => {
    setTargetAbsence(target);
    setIsAbsenceConfirmOpen(true);
  };

  const handleConfirmAbsence = () => {
    if (targetAbsence) incrementAbsence(targetAbsence);
    setIsAbsenceConfirmOpen(false);
    setTargetAbsence(null);
  };

  const handleMouseDownAbsence = (target: { type: 'company' | 'contact', id: string, name: string, contactId?: string }, e: React.MouseEvent) => {
    e.preventDefault();
    longPressTimerRef.current = setTimeout(() => {
      setTargetAbsence(target);
      setIsAbsenceResetOpen(true);
    }, 500);
  };

  const handleMouseUpAbsence = (e: React.MouseEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleConfirmReset = () => {
    if (targetAbsence) resetAbsence(targetAbsence);
    setIsAbsenceResetOpen(false);
    setTargetAbsence(null);
  };

  const handlePhotoChange = (index: number, file: File | null) => {
    const newPhotos = [...photos];
    newPhotos[index] = file;
    setPhotos(newPhotos);
    const newPreviews = [...photoPreviews];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews[index] = reader.result as string;
        setPhotoPreviews(newPreviews);
      };
      reader.readAsDataURL(file);
    } else {
      newPreviews[index] = null;
      setPhotoPreviews(newPreviews);
    }
  };

  const handleAddTask = (intervenantId: string) => {
    const newTaskId = generateId();
    setTaskGroups(groups => groups.map(group => {
      if (group.intervenantId === intervenantId) {
        const newTask: Task = {
          id: newTaskId, comment: '', provisionalDate: '', completionDate: '', status: 'Encours', color: 'black',
        };
        return { ...group, tasks: [...group.tasks, newTask] };
      }
      return group;
    }));
    setFocusTaskId(newTaskId);
  };

  const handleDeleteTask = (intervenantId: string, taskId: string) => {
    setTaskGroups(groups => groups.map(group => {
      if (group.intervenantId === intervenantId) {
        if (group.tasks.length <= 1) {
          const updatedTasks = group.tasks.map(task => 
            task.id === taskId ? { ...task, comment: '', provisionalDate: '', completionDate: '', status: 'Vide', color: 'green' } : task
          );
          return { ...group, tasks: updatedTasks };
        }
        return { ...group, tasks: group.tasks.filter(task => task.id !== taskId) };
      }
      return group;
    }));
  };

  const handleTaskChange = (intervenantId: string, taskId: string, field: keyof Task, value: string | boolean) => {
    setTaskGroups(groups => groups.map(group => {
      if (group.intervenantId === intervenantId) {
        const updatedTasks = group.tasks.map(task => 
          task.id === taskId ? { ...task, [field]: value } : task
        );
        return { ...group, tasks: updatedTasks };
      }
      return group;
    }));
  };

  const handleTaskKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>, intervenantId: string) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleAddTask(intervenantId);
    }
  };

  const handleValidateAndReset = () => {
    showSuccess("Compte rendu validé.");
    setReportNumber('');
    setReportDate('');
    setNextMeetingDate('');
    setNextMeetingTime('');
    setMoAttendance({});
    setCompanyAttendance({});
    setPhotos([null, null]);
    setPhotoPreviews([null, null]);
    setTaskGroups(currentGroups => 
      currentGroups.map(group => ({
        ...group,
        tasks: group.tasks.map(task => ({ ...task, color: 'black' }))
      }))
    );
  };

  const handleColorCycle = (intervenantId: string, taskId: string) => {
    setTaskGroups(groups =>
      groups.map(group => {
        if (group.intervenantId === intervenantId) {
          const updatedTasks = group.tasks.map(task => {
            if (task.id === taskId) {
              let newColor: TaskColor;
              switch (task.color) {
                case 'black': newColor = 'green'; break;
                case 'green': newColor = 'red'; break;
                case 'red': newColor = 'black'; break;
                default: newColor = 'black';
              }
              return { ...task, color: newColor };
            }
            return task;
          });
          return { ...group, tasks: updatedTasks };
        }
        return group;
      })
    );
  };

  const handleMOPresenceChange = (moId: string, status: AttendanceStatus) => {
    setMoAttendance(prev => ({ ...prev, [moId]: { id: moId, present: status === 'Pres.' } }));
  };

  const handleMOContactChange = async (moId: string, name: string, details?: any) => {
    setMaitriseOuvrage(prev => prev.map(mo => {
      if (mo.id === moId) {
        return { 
          ...mo, 
          contact: name,
          coordonneesContact: details?.portable || details?.telephone || mo.coordonneesContact,
          email: details?.email || mo.email,
          adresse: details?.adresse || mo.adresse,
          codePostal: details?.code_postal || mo.codePostal,
          ville: details?.ville || mo.ville,
        };
      }
      return mo;
    }));

    try {
      await supabase
        .from('project_maitrise_ouvrage')
        .update({ 
          contact_nom: name,
          master_contact_id: details?.id || null,
          telephone: details?.portable || details?.telephone || null,
          email: details?.email || null,
          adresse: details?.adresse || null,
          code_postal: details?.code_postal || null,
          Ville: details?.ville || null,
        })
        .eq('id', moId);

      onSaveSuccess();
    } catch (error) { console.error(error); }
  };

  const handleMOFieldUpdate = async (moId: string, field: string, value: string) => {
    const mo = maitriseOuvrage.find(m => m.id === moId);
    if (!mo) return;

    const fieldMapping: Record<string, string> = {
      'adresse': 'adresse', 'codePostal': 'code_postal', 'ville': 'Ville', 'coordonneesContact': 'telephone', 'email': 'email'
    };

    const dbField = fieldMapping[field];
    if (!dbField) return;

    try {
      await supabase.from('project_maitrise_ouvrage').update({ [dbField]: value }).eq('id', moId);
      // @ts-ignore
      const masterId = (mo as any).master_contact_id;
      if (masterId) {
        const masterMapping: Record<string, string> = {
          'adresse': 'adresse', 'codePostal': 'code_postal', 'ville': 'ville', 'coordonneesContact': 'portable', 'email': 'email'
        };
        await supabase.from('master_company_contacts').update({ [masterMapping[field]]: value }).eq('id', masterId);
      }
    } catch (err) { console.error(err); }

    setMaitriseOuvrage(prev => prev.map(m => m.id === moId ? { ...m, [field]: value } : m));
    onSaveSuccess();
  };

  const handleContactFieldUpdate = async (contactId: string, field: string, value: string) => {
    const fieldMapping: Record<string, string> = {
      'adresse': 'adresse', 'codePostal': 'code_postal', 'ville': 'ville', 'portable': 'portable', 'email': 'email'
    };
    const dbField = fieldMapping[field];
    if (!dbField) return;

    try {
      await supabase.from('master_company_contacts').update({ [dbField]: value }).eq('id', contactId);
      await fetchContacts(); 
      onSaveSuccess();
    } catch (err) { console.error(err); }
  };

  const handleCompanyAttendanceChange = (companyId: string, status: AttendanceStatus) => {
    setCompanyAttendance(prev => ({ ...prev, [companyId]: { ...prev[companyId], status } }));
  };

  const handleCompanyContactSelection = async (companyId: string, newContacts: SelectedContact[]) => {
    setCompanyAttendance(prev => {
      const existingAttendance = prev[companyId] || { id: companyId, status: 'Vide', absences: null, convoque: true, selectedContacts: [], contactAttendance: [] };
      const updatedContactAttendance: ContactAttendanceState[] = newContacts.map(contact => {
        const existingState = existingAttendance.contactAttendance.find(c => c.contactId === contact.id);
        return existingState || { contactId: contact.id, status: 'Pres.', absences: null, convoque: true };
      });
      return { ...prev, [companyId]: { ...existingAttendance, selectedContacts: newContacts, contactAttendance: updatedContactAttendance } };
    });

    // SAUVEGARDE PERSISTANTE : On enregistre le contact sélectionné en base
    const contactId = newContacts.length > 0 ? newContacts[0].id : null;
    if (contactId && contactId.startsWith('temp-')) return; // On attend que le contact soit créé en base

    try {
        // Est-ce une mission ?
        const mission = missions.find(m => m.id === companyId);
        if (mission) {
            await supabase.from('project_missions').update({ contact_id: contactId }).eq('id', companyId);
        } else {
            // Est-ce une entreprise ?
            const company = companiesForTasks.find(c => c.id === companyId);
            if (company && company.companyDetail) {
                await supabase.from('project_companies').update({ master_contact_id: contactId }).eq('id', company.companyDetail.id);
            }
        }
        onSaveSuccess();
    } catch (err) { console.error("Persistence error:", err); }
  };

  const handleContactAttendanceChange = (companyId: string, contactId: string, field: keyof ContactAttendanceState, value: string | boolean) => {
    setCompanyAttendance(prev => {
      const companyAtt = prev[companyId];
      if (!companyAtt) return prev;
      const updatedContactAttendance = companyAtt.contactAttendance.map(c => {
        if (c.contactId === contactId) {
          if (field === 'absences') {
            const num = parseInt(value as string, 10);
            return { ...c, absences: isNaN(num) || num === 0 ? null : num };
          }
          return { ...c, [field]: value };
        }
        return c;
      });
      return { ...prev, [companyId]: { ...companyAtt, contactAttendance: updatedContactAttendance } };
    });
  };

  const handlePdfGeneration = async () => {
    setIsGeneratingPdf(true);
    try {
      const base64Photos = await Promise.all(photos.map(async (file) => {
        if (!file) return null;
        return new Promise<string | null>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }));

      const moDataForPdf: Record<string, any> = {};
      maitriseOuvrage.filter(m => visibleMoIds.has(m.id)).forEach(mo => {
        moDataForPdf[mo.id] = { nom: mo.nom, contact: mo.contact, adresse: `${mo.adresse}, ${mo.codePostal} ${mo.ville}`, coordonneesContact: mo.coordonneesContact, present: moAttendance[mo.id]?.present || false };
      });

      await generateCRPdf({ projectId, reportNumber, reportDate, nextMeeting: { date: nextMeetingDate, time: nextMeetingTime }, observations: generalObservations, photos: base64Photos, attendance: { mo: moDataForPdf, missions: companyAttendance, companies: companyAttendance }, taskGroups });
      showSuccess("Compte Rendu PDF généré !");
    } catch (error: any) { showError(`Erreur PDF : ${error.message}`); } finally { setIsGeneratingPdf(false); }
  };

  const handleAddMission = async () => {
    if (!projectId) return;
    const tempId = generateId();
    setMissions(prev => [...prev, { id: tempId, mission: 'Nouvelle Mission', raisonSociale: '', contact: '', adresse: '', contactInfo: '' }]);
    try {
      const { data, error } = await supabase.from('project_missions').insert([{ project_id: projectId }]).select();
      if (error) throw error;
      if (data && data.length > 0) {
        setMissions(prev => prev.map(m => m.id === tempId ? { ...m, id: data[0].id } : m));
        onSaveSuccess();
      }
    } catch (err) { setMissions(prev => prev.filter(m => m.id !== tempId)); }
  };

  const handleMissionNameChangeInPresence = async (id: string, name: string) => {
    setMissions(prev => prev.map(m => m.id === id ? { ...m, mission: name } : m));
    try {
      const { data } = await supabase.from('master_missions').select('id').eq('mission_name', name).maybeSingle();
      if (data) { await supabase.from('project_missions').update({ mission_id: data.id }).eq('id', id); onSaveSuccess(); }
    } catch (err) { console.error(err); }
  };

  const handleMissionRaisonChangeInPresence = async (id: string, name: string, details?: any) => {
    const entityId = details?.id || null;
    setMissions(prev => prev.map(m => m.id === id ? { ...m, raisonSociale: name, entityId: entityId } : m));
    try { await supabase.from('project_missions').update({ entity_id: entityId }).eq('id', id); onSaveSuccess(); } catch (err) { console.error(err); }
  };

  const handleMissionDelete = useCallback(async (id: string) => {
    setMissions(missions.filter(m => m.id !== id));
    try { await supabase.from('project_missions').delete().eq('id', id); showSuccess("Mission supprimée."); onSaveSuccess(); } catch (error) { showError(`Échec: ${error.message}`); }
  }, [missions, onSaveSuccess]);

  const handleRemoveMoFromReport = useCallback((moId: string) => { setVisibleMoIds(prev => { const next = new Set(prev); next.delete(moId); return next; }); showSuccess("Contact retiré."); }, []);
  const handleCreateAndAddMo = useCallback(async (raisonSociale: string) => { if (!projectId) return; try { const { data, error } = await supabase.from('project_maitrise_ouvrage').insert([{ project_id: projectId, nom_client: raisonSociale }]).select(); if (error) throw error; if (data && data.length > 0) { onSaveSuccess(); setVisibleMoIds(prev => new Set(prev).add(data[0].id)); showSuccess("Nouveau contact MO créé."); } } catch (error) { showError(`Échec: ${error.message}`); } }, [projectId, onSaveSuccess]);

  useEffect(() => { if (focusTaskId) { document.getElementById(`task-comment-${focusTaskId}`)?.focus(); setFocusTaskId(null); } }, [focusTaskId, taskGroups]);

  const colorClasses: Record<TaskColor, string> = { green: 'text-green-700 font-bold', black: 'text-black font-normal', red: 'text-red-600 font-bold' };
  const moGrouped = useMemo(() => maitriseOuvrage.filter(m => visibleMoIds.has(m.id)).reduce((acc, mo) => { const key = mo.nom || 'Maîtrise d\'ouvrage sans nom'; if (!acc[key]) acc[key] = []; acc[key].push(mo); return acc; }, {} as Record<string, MaitriseOuvrage[]>), [maitriseOuvrage, visibleMoIds]);

  return (
    <div className="p-4 bg-white border rounded-lg shadow-md w-full">
      <div className="flex flex-wrap items-end gap-x-[50px] gap-y-4 border-b pb-4">
        <div className="w-28">
          <label className="text-sm font-medium whitespace-nowrap">N° de C.R.</label>
          <Input value={reportNumber} onChange={e => setReportNumber(e.target.value)} className={cn(reportNumber ? "bg-white" : "bg-brand-yellow hover:bg-yellow-400/80")} />
        </div>
        <div className="w-52">
          <label className="text-sm font-medium whitespace-nowrap">Date du Compte Rendu</label>
          <div className="h-10"><DatePickerButton date={reportDate} setDate={setReportDate} /></div>
        </div>
        <div className="w-52">
          <label className="text-sm font-medium whitespace-nowrap">Date Prochaine Réunion</label>
          <div className="h-10"><DatePickerButton date={nextMeetingDate} setDate={setNextMeetingDate} /></div>
        </div>
        <div className="w-52">
          <label className="text-sm font-medium whitespace-nowrap">Heure Prochaine Réunion</label>
          <div className="h-10"><TimePickerButton time={nextMeetingTime} setTime={setNextMeetingTime} /></div>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" className="bg-brand-yellow hover:bg-yellow-400 text-black h-8 border-none" onClick={handlePdfGeneration} disabled={isGeneratingPdf}>
            {isGeneratingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
            Générer CR
          </Button>
          <Button onClick={handleValidateAndReset} size="icon" className="bg-brand-yellow hover:bg-yellow-400 text-black h-8 w-8">
            <Check className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="border-b pb-4 space-y-4">
        <h3 className="font-semibold whitespace-nowrap">Présences</h3>
        
        <div className="bg-brand-cream p-2 rounded-md">
          <div className="flex items-center justify-center mb-2 relative">
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button size="icon" className="absolute left-0 bg-brand-yellow hover:bg-yellow-400 text-black h-7 w-7"><Plus className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56"><DropdownMenuItem onClick={() => handleCreateAndAddMo("Nouvelle Entité")}><UserPlus className="mr-2 h-4 w-4" />Créer nouveau contact maître</DropdownMenuItem></DropdownMenuContent>
            </DropdownMenu>
            <h4 className="font-bold text-center whitespace-nowrap">Maîtrise d'ouvrage</h4>
          </div>

          <div className="w-full overflow-x-auto">
            <Table className="min-w-max">
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap min-w-[250px]">Contact</TableHead>
                  <TableHead className="whitespace-nowrap min-w-[300px]">Adresse</TableHead>
                  <TableHead className="whitespace-nowrap min-w-[150px]">Portable</TableHead>
                  <TableHead className="whitespace-nowrap min-w-[150px]">Email</TableHead>
                  <TableHead className="whitespace-nowrap min-w-[80px] text-center">Présence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(moGrouped).map(([raisonSociale, moList]) => (
                  <React.Fragment key={raisonSociale}>
                    <TableRow className="bg-[#ded3a4] hover:bg-[#ded3a4]/90 border-b border-gray-300">
                      <TableCell colSpan={5} className="font-bold text-black py-0.5 px-3">
                        <div className="flex items-center gap-3">
                          <Button onClick={() => handleCreateAndAddMo(raisonSociale)} size="icon" className="h-6 w-6 bg-brand-yellow hover:bg-yellow-400 text-black border-none shadow-sm flex-shrink-0"><Plus className="h-4 w-4" /></Button>
                          <span className="whitespace-nowrap">{raisonSociale}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                    {moList.map((mo, index) => (
                      <MaitriseOuvrageAttendanceRow
                        key={mo.id} mo={mo} index={index} isPresent={moAttendance[mo.id]?.present || false}
                        onAttendanceChange={handleMOPresenceChange} onContactChange={handleMOContactChange}
                        onFieldUpdate={handleMOFieldUpdate} onDelete={handleRemoveMoFromReport} 
                      />
                    ))}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="bg-brand-cream p-2 rounded-md">
            <div className="relative flex items-center justify-center mb-2">
              <Button onClick={handleAddMission} size="icon" className="absolute left-0 bg-brand-yellow hover:bg-yellow-400 text-black h-6 w-6"><Plus className="h-4 w-4" /></Button>
              <h4 className="font-bold whitespace-nowrap">Missions</h4>
            </div>
            
            <div className="w-full overflow-x-auto">
              <Table className="min-w-max">
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap min-w-[200px]">Contact / Rôle</TableHead>
                    <TableHead className="whitespace-nowrap min-w-[300px]">Adresse</TableHead>
                    <TableHead className="whitespace-nowrap min-w-[150px]">Portable</TableHead>
                    <TableHead className="whitespace-nowrap min-w-[150px]">Email</TableHead>
                    <TableHead className="whitespace-nowrap min-w-[80px] text-center">Présence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {missions.map((mission, index) => {
                    const companyDetail = projectCompanies.find(pc => pc.raison_sociale === mission.raisonSociale);
                    const attendance = companyAttendance[mission.id] || { id: mission.id, status: 'Vide', absences: null, convoque: true, selectedContacts: [], contactAttendance: [] };
                    return (
                      <MissionAttendanceRowGroup
                        key={mission.id} mission={{ id: mission.id, missionName: mission.mission, raisonSociale: mission.raisonSociale, companyDetail: companyDetail }}
                        attendance={attendance} contactMap={contactMap} index={index} handleCompanyContactSelection={handleCompanyContactSelection}
                        handleContactAttendanceChange={handleContactAttendanceChange} onMissionNameChange={handleMissionNameChangeInPresence}
                        onRaisonSocialeChange={handleMissionRaisonChangeInPresence} onContactFieldChange={handleContactFieldUpdate} onDeleteMission={handleMissionDelete}
                      />
                    );
                  })}
                </TableBody>
              </Table>
            </div>
        </div>

        <div className="bg-brand-cream p-2 rounded-md">
            <h4 className="font-bold text-center mb-2 whitespace-nowrap">Entreprises</h4>
            <div className="w-full overflow-x-auto">
              <Table className="min-w-max">
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap min-w-[200px]">Contact / Rôle</TableHead>
                    <TableHead className="whitespace-nowrap min-w-[300px]">Adresse</TableHead>
                    <TableHead className="whitespace-nowrap min-w-[150px]">Portable</TableHead>
                    <TableHead className="whitespace-nowrap min-w-[150px]">Email</TableHead>
                    <TableHead className="whitespace-nowrap min-w-[40px] text-center">P</TableHead>
                    <TableHead className="whitespace-nowrap min-w-[40px] text-center">A</TableHead>
                    <TableHead className="whitespace-nowrap min-w-[40px] text-center">C</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companiesForTasks.map((company, index) => {
                    const attendance = companyAttendance[company.id] || { id: company.id, status: 'Vide', absences: null, convoque: true, selectedContacts: [], contactAttendance: [] };
                    return (
                      <CompanyAttendanceRowGroup
                        key={company.id} company={company} attendance={attendance} contactMap={contactMap} index={index} handleCompanyContactSelection={handleCompanyContactSelection}
                        handleCompanyAttendanceChange={handleCompanyAttendanceChange} handleContactAttendanceChange={handleContactAttendanceChange}
                        handleAbsenceClick={handleAbsenceClick} handleMouseDownAbsence={handleMouseDownAbsence} handleMouseUpAbsence={handleMouseUpAbsence} onContactFieldChange={handleContactFieldUpdate}
                      />
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={7} className="text-xs text-muted-foreground py-1 px-2 whitespace-nowrap"><span className="font-bold">Glossaire:</span> P : Présent, A : Nombre d'absences, C : Convoqué à la prochaine réunion.</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
        </div>
      </div>

      <div className="border-b pb-4 space-y-2">
        <h3 className="font-semibold whitespace-nowrap">Observations générales :</h3>
        <Textarea value={generalObservations} onChange={e => setGeneralObservations(e.target.value)} className="min-h-[200px] bg-brand-cream-light border-brand-gray text-black" />
      </div>

      <div className="border-b pb-4">
        <h3 className="font-semibold whitespace-nowrap">Photos</h3>
        <div className="flex space-x-4 mt-4">
          <div className="flex flex-col items-center gap-2 w-48 h-48 border rounded-md justify-center bg-gray-50 relative">
            {photoPreviews[0] ? (
              <>
                <img src={photoPreviews[0]} alt="Photo 1" className="max-w-full max-h-full object-contain" />
                <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 rounded-full" onClick={() => handlePhotoChange(0, null)}><X className="h-4 w-4" /></Button>
              </>
            ) : (
              <Button onClick={() => photo1InputRef.current?.click()} variant="outline" className="h-full w-full flex flex-col items-center justify-center text-gray-500 hover:text-black">
                <Upload className="h-8 w-8 mb-2" /><span>Ajouter Photo 1</span>
              </Button>
            )}
            <input type="file" ref={photo1InputRef} onChange={(e) => handlePhotoChange(0, e.target.files?.[0] || null)} className="hidden" accept="image/*" />
          </div>
          <div className="flex flex-col items-center gap-2 w-48 h-48 border rounded-md justify-center bg-gray-50 relative">
            {photoPreviews[1] ? (
              <>
                <img src={photoPreviews[1]} alt="Photo 2" className="max-w-full max-h-full object-contain" />
                <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 rounded-full" onClick={() => handlePhotoChange(1, null)}><X className="h-4 w-4" /></Button>
              </>
            ) : (
              <Button onClick={() => photo2InputRef.current?.click()} variant="outline" className="h-full w-full flex flex-col items-center justify-center text-gray-500 hover:text-black">
                <Upload className="h-8 w-8 mb-2" /><span>Ajouter Photo 2</span>
              </Button>
            )}
            <input type="file" ref={photo2InputRef} onChange={(e) => handlePhotoChange(1, e.target.files?.[0] || null)} className="hidden" accept="image/*" />
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-2 whitespace-nowrap">Suivi des Tâches</h3>
        <div className="w-full overflow-x-auto">
          <div className="grid w-max" style={{ gridTemplateColumns: 'minmax(200px, 1fr) minmax(400px, 2fr) minmax(100px, max-content) minmax(100px, max-content) minmax(100px, max-content) minmax(50px, max-content)' }}>
            <div className="font-bold p-2 border-b bg-gray-50 whitespace-nowrap sticky left-0 z-10">Intervenant / Lot</div>
            <div className="font-bold p-2 border-b bg-gray-50 whitespace-nowrap">Commentaires</div>
            <div className="font-bold p-2 border-b bg-gray-50 text-center whitespace-nowrap">Date Prév.</div>
            <div className="font-bold p-2 border-b bg-gray-50 text-center whitespace-nowrap">Date Réal.</div>
            <div className="font-bold p-2 border-b bg-gray-50 text-center whitespace-nowrap">Déroulement</div>
            <div className="p-2 border-b bg-gray-50 whitespace-nowrap"></div>
            {(taskGroups || []).flatMap(group => {
              const tasksToDisplay = group.tasks.filter(t => t.status !== 'Vide' || t.comment.trim() !== '');
              if (tasksToDisplay.length === 0) tasksToDisplay.push({ id: generateId(), comment: '', provisionalDate: '', completionDate: '', status: 'Vide' as const, color: 'green' as const });
              return tasksToDisplay.map((task, taskIndex) => {
                const isFirstTask = taskIndex === 0;
                const rowColorClass = taskIndex % 2 === 0 ? 'bg-brand-cream' : 'bg-brand-cream-light';
                return (
                  <React.Fragment key={task.id}>
                    <div className={cn("p-2 border-t font-semibold text-sm whitespace-nowrap sticky left-0 z-10", rowColorClass)} style={{ gridColumn: 1 }}>
                      {isFirstTask && <div className="flex flex-col"><span className="whitespace-nowrap">{group.lotInfo}</span><span className="font-normal text-gray-600 whitespace-nowrap"> - {group.displayName}</span></div>}
                    </div>
                    <div className={cn("border-t", rowColorClass)} style={{ gridColumn: 2 }} onClick={() => handleColorCycle(group.intervenantId, task.id)}>
                      <Textarea id={`task-comment-${task.id}`} rows={1} value={task.comment} onChange={(e) => handleTaskChange(group.intervenantId, task.id, 'comment', e.target.value)} onKeyDown={e => handleTaskKeyDown(e, group.intervenantId)} className={cn("w-full bg-transparent border-0 appearance-none resize-none text-xs h-full p-1 cursor-pointer", colorClasses[task.color], task.status === 'NON' && "line-through")} />
                    </div>
                    <div className={cn("border-t h-8", rowColorClass)} style={{ gridColumn: 3 }}>
                      <Input value={task.provisionalDate} onChange={(e) => handleTaskChange(group.intervenantId, task.id, 'provisionalDate', e.target.value)} className={cn("w-full h-full border-0 text-xs p-1 text-center whitespace-nowrap", task.provisionalDate ? "bg-transparent" : "bg-brand-yellow hover:bg-yellow-400")} />
                    </div>
                    <div className={cn("border-t h-8 p-1 flex items-center justify-center", rowColorClass)} style={{ gridColumn: 4 }}><DatePickerButton date={task.completionDate} setDate={(d) => handleTaskChange(group.intervenantId, task.id, 'completionDate', d)} /></div>
                    <div className={cn("border-t h-8 p-1", rowColorClass)} style={{ gridColumn: 5 }}>
                      <Select value={task.status} onValueChange={val => handleTaskChange(group.intervenantId, task.id, 'status', val as TaskStatus)}>
                        <SelectTrigger className={cn("appearance-none h-full text-xs p-1 rounded-md text-black border-0 whitespace-nowrap", task.status !== 'Vide' ? "bg-brand-cream-light hover:bg-brand-cream" : "bg-brand-yellow hover:bg-yellow-400")}><SelectValue /></SelectTrigger>
                        <SelectContent>{['OK', 'Encours', 'Retard', 'à reprendre', 'NON', 'Vide'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className={cn("border-t h-8 p-1 flex items-center justify-center", rowColorClass)} style={{ gridColumn: 6 }}><Button size="icon" variant="ghost" className="bg-brand-yellow hover:bg-yellow-400 text-black h-6 w-6" onClick={() => handleDeleteTask(group.intervenantId, task.id)} disabled={tasksToDisplay.length === 1 && task.comment.trim() === ''}><Trash2 className="h-4 w-4" /></Button></div>
                  </React.Fragment>
                );
              });
            })}
          </div>
        </div>
      </div>

      <AlertDialog open={isAbsenceConfirmOpen} onOpenChange={setIsAbsenceConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirmer l'absence</AlertDialogTitle><AlertDialogDescription>Voulez-vous ajouter une absence pour <span className="font-bold">{targetAbsence?.name}</span> ?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel onClick={() => setTargetAbsence(null)}>Annuler</AlertDialogCancel><AlertDialogAction onClick={handleConfirmAbsence}>Confirmer</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isAbsenceResetOpen} onOpenChange={setIsAbsenceResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Réinitialiser l'absence</AlertDialogTitle><AlertDialogDescription>Voulez-vous réinitialiser le compteur d'absences pour <span className="font-bold">{targetAbsence?.name}</span> à zéro ?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel onClick={() => setTargetAbsence(null)}>Annuler</AlertDialogCancel><AlertDialogAction onClick={handleConfirmReset}>Réinitialiser</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ExecutionPhase;