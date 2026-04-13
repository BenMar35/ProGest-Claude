import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Génère un ID unique. Utilise crypto.randomUUID si disponible, sinon un fallback basé sur le temps et un nombre aléatoire.
 * @returns {string} Un ID unique.
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Réinitialise la valeur d'un input de type fichier.
 * @param {React.RefObject<HTMLInputElement>} ref La référence de l'input de fichier.
 */
export function resetFileInput(ref: React.RefObject<HTMLInputElement>) {
  if (ref.current) {
    ref.current.value = "";
  }
}

/**
 * Valide une ligne CSV pour s'assurer qu'elle a le nombre attendu de colonnes et que la première colonne n'est pas vide.
 * @param {string[]} row La ligne CSV sous forme de tableau de chaînes.
 * @param {number} expectedColumns Le nombre minimum de colonnes attendues.
 * @returns {boolean} Vrai si la ligne est valide, faux sinon.
 */
export function validateCSVRow(row: string[], expectedColumns: number): boolean {
  return row && row.length >= expectedColumns && row[0]?.trim() !== '';
}