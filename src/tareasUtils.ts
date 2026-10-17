/** Utilidades compartidas por las pantallas de tareas */
import { Tarea } from './types';

export const hoyISO = () => {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
};

export const estaVencida = (t: Tarea) =>
  t.estado !== 'completada' && !!t.fecha_limite && t.fecha_limite < hoyISO();

export const formatearDia = (iso: string | null) => {
  if (!iso) return 'Sin fecha límite';
  const [a, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(a, m - 1, d)
  );
};

export const nombreCorto = (email: string | null | undefined) => (email ? email.split('@')[0] : '—');

export const ETIQUETA_ESTADO = {
  pendiente: 'Pendiente',
  en_progreso: 'En progreso',
  completada: 'Completada',
} as const;

export const ESTILO_ESTADO = {
  pendiente: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
  en_progreso: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
  completada: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
} as const;

export const ESTILO_PRIORIDAD = {
  baja: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  media: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300',
  alta: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
} as const;
