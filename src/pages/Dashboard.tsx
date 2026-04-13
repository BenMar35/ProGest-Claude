"use client";

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/components/SessionContextProvider';
import { Loader2 } from 'lucide-react';
import { Plus } from 'lucide-react';
import { showError } from '@/utils/toast';
import { cn } from '@/lib/utils'; // Import cn for conditional class names

interface Project {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { session, loading } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);

  useEffect(() => {
    if (session) {
      const fetchProjects = async () => {
        setProjectsLoading(true);
        const { data, error } = await supabase
          .from('projects')
          .select('id, name, description, created_at')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error("Error fetching projects:", error);
          showError("Erreur lors du chargement des projets.");
        } else {
          setProjects(data || []);
        }
        setProjectsLoading(false);
      };
      fetchProjects();
    }
  }, [session]);

  if (loading || projectsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-gray">
        <Loader2 className="h-8 w-8 animate-spin text-brand-yellow" />
      </div>
    );
  }

  if (!session) {
    navigate('/login');
    return null;
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleNavigateToProject = (projectId: string) => {
    navigate(`/projects/${projectId}`);
  };

  return (
    <div className="min-h-screen bg-brand-gray p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-black">Tableau de Bord</h1>
        <Button onClick={handleLogout} className="bg-brand-yellow hover:bg-yellow-400 text-black">
          Déconnexion
        </Button>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-end mb-4">
          <Button 
            onClick={() => navigate('/projects/new')} 
            className="bg-brand-yellow hover:bg-yellow-400 text-black"
          >
            <Plus className="mr-2 h-4 w-4" /> Créer un nouveau projet
          </Button>
        </div>

        {projects.length === 0 ? (
          <div className="p-4 border border-dashed border-gray-300 rounded-md text-gray-500 text-center">
            <p>Aucun projet pour le moment. Créez-en un nouveau !</p>
          </div>
        ) : (
          <div className="flex flex-col space-y-2">
            {projects.map((project, index) => (
              <button 
                key={project.id} 
                onClick={() => handleNavigateToProject(project.id)}
                className={cn(
                  "w-full text-left p-3 rounded-md text-black text-lg font-medium",
                  "hover:bg-brand-yellow/80 transition-colors",
                  index % 2 === 0 ? 'bg-brand-cream' : 'bg-brand-cream-light'
                )}
              >
                {project.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;