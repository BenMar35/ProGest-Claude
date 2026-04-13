"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProjectCanvas from "@/components/ProjectCanvas";
import { useSession } from '@/components/SessionContextProvider';
import { Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { Button } from '@/components/ui/button';

const ProjectDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session, loading: sessionLoading } = useSession();
  const [projectName, setProjectName] = useState<string | null>(null);
  const [projectAddress, setProjectAddress] = useState<string | null>(null);
  const [projectDataLoaded, setProjectDataLoaded] = useState(false);
  const [isValidProject, setIsValidProject] = useState(false);

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const projectId = id;

  const checkProjectAccess = useCallback(async () => {
    if (!projectId || !uuidRegex.test(projectId)) {
      showError("ID du projet invalide.");
      navigate('/dashboard');
      return;
    }

    const { data, error } = await supabase
      .from('projects')
      .select('name, user_id')
      .eq('id', projectId)
      .single();

    if (error || !data) {
      showError("Projet introuvable.");
      navigate('/dashboard');
    } else if (data.user_id !== session?.user.id) {
      showError("Accès refusé.");
      navigate('/dashboard');
    } else {
      setProjectName(data.name);
      setIsValidProject(true);
    }
    setProjectDataLoaded(true);
  }, [projectId, session, navigate]);

  useEffect(() => {
    if (!sessionLoading && session) {
      checkProjectAccess();
    } else if (!sessionLoading && !session) {
      navigate('/login');
    }
  }, [session, sessionLoading, navigate, checkProjectAccess]);

  if (sessionLoading || !projectDataLoaded) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-brand-gray">
        <Loader2 className="h-8 w-8 animate-spin text-brand-yellow" />
      </div>
    );
  }

  if (!isValidProject || !projectId) return null;

  return (
    <div className="w-screen h-screen bg-brand-gray overflow-hidden relative">
      {/* HEADER FIXE - Priorité absolue pour le clic, sans aucun fond */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center space-x-4 px-4 py-1.5 pointer-events-auto">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/dashboard')}
          className="hover:bg-brand-yellow/20 text-black h-10 w-10 rounded-full transition-colors bg-transparent border-none shadow-none"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 
          className="text-xl font-bold text-black whitespace-nowrap cursor-pointer hover:text-brand-yellow transition-colors select-none"
          onClick={() => navigate('/dashboard')}
        >
          {projectName || "Projet"}
        </h1>
      </div>

      <ProjectCanvas 
        projectId={projectId} 
        projectName={projectName || "Chargement..."} 
        projectAddress={projectAddress || ""} 
      />
    </div>
  );
};

export default ProjectDetails;