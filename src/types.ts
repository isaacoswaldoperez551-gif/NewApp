/**
 * Definiciones de tipos para GestiónDoc
 */

export interface Documento {
  id: string;
  nombre: string;
  ruta: string;
  tamano: number;
  tipo: string;
  subido_por: string;
  subido_por_email: string;
  creado_en: string;
  carpeta?: string | null;
}

export type TipoFiltro = 'todos' | 'pdf' | 'word' | 'excel' | 'imagen' | 'otro';

export interface ToastMessage {
  id: string;
  tipo: 'success' | 'error' | 'info';
  mensaje: string;
}

export type CarpetaSeleccion = 'todas' | '__sin__' | string;
export type Orden = 'recientes' | 'antiguos' | 'nombre' | 'tamano';
export type Vista = 'tarjetas' | 'tabla';

/* ===== Roles, tareas y notificaciones ===== */
export type Rol = 'admin' | 'supervisor' | 'usuario';
export type EstadoTarea = 'pendiente' | 'en_progreso' | 'completada';
export type PrioridadTarea = 'baja' | 'media' | 'alta';
export type VistaApp = 'documentos' | 'tareas' | 'equipo' | 'usuarios' | 'avisos';

export interface Perfil {
  id: string;
  email: string;
  nombre?: string | null;
  rol: Rol;
  creado_en: string;
}

export interface Tarea {
  id: string;
  titulo: string;
  descripcion: string | null;
  asignado_a: string;
  asignado_email: string | null;
  creado_por: string;
  creado_por_email: string | null;
  estado: EstadoTarea;
  prioridad: PrioridadTarea;
  fecha_limite: string | null;
  creado_en: string;
  completado_en: string | null;
}

export interface Notificacion {
  id: string;
  usuario_id: string;
  titulo: string;
  mensaje: string | null;
  tipo: 'tarea' | 'aviso' | 'sistema';
  tarea_id: string | null;
  leida: boolean;
  creado_en: string;
}

export interface NuevaTarea {
  titulo: string;
  descripcion: string;
  prioridad: PrioridadTarea;
  fecha_limite: string | null;
  asignados: string[];
}

export const ETIQUETA_ROL: Record<Rol, string> = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  usuario: 'Usuario',
};
