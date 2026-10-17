/**
 * Campanita de notificaciones con contador y lista desplegable
 */
import React, { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, ClipboardList, Megaphone, Trash2 } from 'lucide-react';
import { Notificacion } from '../types';
import { formatearFecha } from '../utils';

interface Props {
  notificaciones: Notificacion[];
  onLeida: (n: Notificacion) => void;
  onTodasLeidas: () => void;
  onBorrar: (n: Notificacion) => void;
  onAbrir: (n: Notificacion) => void;
}

export const NotificationBell: React.FC<Props> = ({ notificaciones, onLeida, onTodasLeidas, onBorrar, onAbrir }) => {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const sinLeer = notificaciones.filter((n) => !n.leida).length;

  useEffect(() => {
    const cerrar = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAbierto(!abierto)}
        className="relative p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        title="Notificaciones"
        aria-label="Notificaciones"
      >
        <Bell className="w-5 h-5" />
        {sinLeer > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-rose-600 text-white text-[10px] font-bold">
            {sinLeer > 9 ? '9+' : sinLeer}
          </span>
        )}
      </button>

      {abierto && (
        <div className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-[68px] sm:top-full sm:mt-2 sm:w-96 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Notificaciones</h3>
            {sinLeer > 0 && (
              <button
                onClick={onTodasLeidas}
                className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Marcar todas como leídas
              </button>
            )}
          </div>

          <div className="max-h-[60vh] sm:max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {notificaciones.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">
                <Bell className="mx-auto w-9 h-9 mb-2 text-slate-300 dark:text-slate-700" />
                No tienes notificaciones
              </div>
            ) : (
              notificaciones.map((n) => (
                <div
                  key={n.id}
                  className={`group flex gap-3 px-4 py-3 ${n.leida ? '' : 'bg-indigo-50/60 dark:bg-indigo-950/20'}`}
                >
                  <div
                    className={`mt-0.5 shrink-0 p-2 rounded-xl h-fit ${
                      n.tipo === 'tarea'
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400'
                        : 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400'
                    }`}
                  >
                    {n.tipo === 'tarea' ? <ClipboardList className="w-4 h-4" /> : <Megaphone className="w-4 h-4" />}
                  </div>
                  <button
                    className="flex-1 min-w-0 text-left"
                    onClick={() => {
                      if (!n.leida) onLeida(n);
                      onAbrir(n);
                      setAbierto(false);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">{n.titulo}</span>
                      {!n.leida && <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />}
                    </div>
                    {n.mensaje && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">{n.mensaje}</p>
                    )}
                    <p className="text-[11px] text-slate-400 mt-1">{formatearFecha(n.creado_en)}</p>
                  </button>
                  <button
                    onClick={() => onBorrar(n)}
                    className="self-start p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 sm:opacity-0 group-hover:opacity-100 transition"
                    title="Borrar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
