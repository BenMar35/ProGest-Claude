/**
 * Service pour la génération de PDF via le backend Python sur Render
 */

const API_BASE_URL = 'https://onepoint61-api-weasyprint.onrender.com/api';

/**
 * Déclenche le téléchargement d'un fichier Blob
 */
const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

/**
 * Récupère les métadonnées globales du projet pour les en-têtes PDF
 */
const getProjectMetadata = () => {
  return {
    clientName: "NOM DU CLIENT",
    projectAddress: "123 Rue du Chantier, 75000 Paris",
    projectName: "RÉNOVATION APPARTEMENT" // Ajouté pour le template
  };
};

export const generateTenderPdf = async (data: any) => {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-tender-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        metadata: getProjectMetadata()
      }),
    });

    if (!response.ok) throw new Error('Erreur lors de la génération du PDF (Tender)');
    
    const blob = await response.blob();
    downloadBlob(blob, `analyse-offres-${data.projectId}.pdf`);
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const generateCRPdf = async (data: any) => {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-cr-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        metadata: getProjectMetadata()
      }),
    });

    if (!response.ok) throw new Error('Erreur lors de la génération du PDF (CR)');

    const blob = await response.blob();
    downloadBlob(blob, `CR-${data.reportNumber || 'chantier'}.pdf`);
  } catch (error) {
    console.error(error);
    throw error;
  }
};