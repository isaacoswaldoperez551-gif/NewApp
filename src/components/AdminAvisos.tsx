/**
 * Enviar avisos a todos, a un rol o a una persona (solo administrador)
 */
import React, { useState } from 'react';
import { Loader2, Megaphone, Send } from 'lucide-react';
import { Perfil } from '../types';

interface Props {
  perfiles: Perfil[];
  onEnviar: (titulo: string, mensaje: string, destino: string, usuarioId: string | null) => Promise<boolean>;
}

const CAMPO =
  'w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600';

export const AdminAvisos: React.FC<Props> = ({ perfiles, onEnviar }) => {
  const [destino, setDestino] = useState('todos');
  const [persona, setPersona] = useState('');
  const [titulo, setTitulo] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);

  const listo = titulo.trim() && (destino !== 'persona' || persona);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listo) return;
    setEnviando(true);
    const ok = await onEnviar(titulo.trim(), mensaje.trim(), destino, destino === 'persona' ? persona : null);
    setEnviando(false);
    if (ok) {
      setTitulo('');
      setMensaje('');
    }
  };

  return (
    <form onSubmit={enviar} className="max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <Megaphone className="w-5 h-5 text-indigo-600" />
        <h3 className="font-bold text-lg">Enviar un aviso</h3>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">¿A quién?</label>
        <select value={destino} onChange={(e) => setDestino(e.target.value)} className={CAMPO}>
          <option value="todos">A todos</option>
          <option value="supervisores">Solo a los supervisores</option>
          <option value="usuarios">Solo a los usuarios</option>
          <option value="persona">A una persona</option>
        </select>
      </div>

      {destino === 'persona' && (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Persona</label>
          <select value={persona} onChange={(e) => setPersona(e.target.value)} className={CAMPO}>
            <option value="">Elige una persona…</option>
            {perfiles.map((p) => (
              <option key={p.id} value={p.id}>{p.email}</option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Título</label>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={100} placeholder="Ej: Reunión mañana a las 9:00" className={CAMPO} />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Mensaje</label>
        <textarea value={mensaje} onChange={(e) => setMensaje(e.target.value)} rows={4} className={CAMPO} placeholder="Escribe los detalles del aviso" />
      </div>

      <button
        type="submit"
        disabled={enviando || !listo}
        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors"
      >
        {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Enviar aviso
      </button>
      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        Les llegará a la campanita de la página y también por correo.
      </p>
    </form>
  );
};
