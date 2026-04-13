"use client";

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';
import { showSuccess, showError } from '@/utils/toast';
import { Loader2 } from 'lucide-react';

const CreateProject = () => {
  const navigate = useNavigate();
  const { session, loading: sessionLoading } = useSession();
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (sessionLoading) {
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

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!projectName.trim()) {
      showError("Le nom du projet ne peut pas être vide.");
      setIsSubmitting(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('projects')
        .insert([
          { 
            name: projectName, 
            description: projectDescription, 
            user_id: session.user.id 
          },
        ])
        .select();

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        showSuccess(`Projet "${projectName}" créé avec succès !`);
        navigate(`/projects/${data[0].id}`);
      } else {
        showError("Erreur lors de la création du projet : aucune donnée retournée.");
      }
    } catch (error: any) {
      console.error("Erreur de création de projet:", error);
      showError(`Échec de la création du projet: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-gray p-4">
      <div className="w-full max-w-lg p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-black">Créer un nouveau projet</h2>
        <form onSubmit={handleCreateProject} className="space-y-4">
          <div>
            <Label htmlFor="projectName" className="text-sm font-medium text-black">Nom du projet</Label>
            <Input
              id="projectName"
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Ex: Rénovation Appartement Paris"
              className="mt-1 bg-brand-cream border-brand-gray text-black"
              required
            />
          </div>
          <div>
            <Label htmlFor="projectDescription" className="text-sm font-medium text-black">Description (optionnel)</Label>
            <Textarea
              id="projectDescription"
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              placeholder="Décrivez brièvement votre projet..."
              className="mt-1 bg-brand-cream border-brand-gray text-black"
              rows={4}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate('/dashboard')}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button 
              type="submit" 
              className="bg-brand-yellow hover:bg-yellow-400 text-black"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Créer le projet"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProject;