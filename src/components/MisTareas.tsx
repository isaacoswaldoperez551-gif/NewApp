/**
 * "Mis tareas": lo que me asignaron, con cambio de estado
 */
import React, { useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, ClipboardCheck, Play, RotateCcw, UserRound } from 'lucide-react';
import { EstadoTarea, Tarea } from '../types';
import { ESTILO_ESTADO, ESTILO_PRIORIDAD, ETIQUETA_ESTADO, estaVencida, formatearDia, nombreCorto } from '../tareasUtils';

interface Props {
  tareas: Tarea[];
  onEstado: (t: Tarea, estado: EstadoTarea) => void;
}

type Filtro = 'activas' | 'completada' | 'todas';

export const MisTareas: React.FC<Props> = ({ tareas, onEstado }) => {
  const [filtro, setFiltro] = useState<Filtro>('activas');

  const conteo = useMemo(
    () => ({
      activas: tareas.filter((t) => t.estado !== 'completada').length,
      completada: tareas.filter((t) => t.estado === 'completada').length,
      todas: tareas.length,
      vencidas: tareas.filter(estaVencida).length,
    }),
    [tareas]
  );

  const lista = useMemo(() => {
    const base = tareas.filter((t) =>
      filtro === 'todas' ? true : filtro === 'completada' ? t.estado === 'completada' : t.estado !== 'completada'
    );
    return [...base].sort((a, b) => {
      if (a.estado === 'completada' && b.estado !== 'completada') return 1;
      if (b.estado === 'completada' && a.estado !== 'completada') return -1;
      return (a.fecha_limite || '9999').localeCompare(b.fecha_limite || '9999');
    });
  }, [tareas, filtro]);

  const pestanas: [Filtro, string, number][] = [
    ['activas', 'Por hacer', conteo.activas],
    ['completada', 'Completadas', conteo.completada],
    ['todas', 'Todas', conteo.todas],
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          {pestanas.map(([f, texto, n]) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filtro === f
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {texto} <span className="text-xs opacity-70">{n}</span>
            </button>
          ))}
        </div>
        {conteo.vencidas > 0 && (
          <span className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold">
            {conteo.vencidas} {conteo.vencidas === 1 ? 'tarea vencida' : 'tareas vencidas'}
          </span>
        )}
      </div>

      {lista.length === 0 ? (
        <div className="text-center py-16 space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <ClipboardCheck className="mx-auto w-12 h-12 text-slate-300 dark:text-slate-700" />
          <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">
            {filtro === 'activas' ? '¡Estás al día! No tienes tareas pendientes.' : 'No hay tareas aquí.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {lista.map((t) => {
            const vencida = estaVencida(t);
            return (
              <article
                key={t.id}
                className={`flex flex-col gap-3 bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm ${
                  vencida ? 'border-rose-300 dark:border-rose-900' : 'border-slate-200 dark:border-slate-800'
                } ${t.estado === 'completada' ? 'opacity-70' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <h4
                    className={`font-semibold text-slate-900 dark:text-white ${
                      t.estado === 'completada' ? 'line-through' : ''
                    }`}
                  >
                    {t.titulo}
                  </h4>
                  <span className={`shrink-0 px-2 py-0.5 rounded-md text-[11px] font-semibold capitalize ${ESTILO_PRIORIDAD[t.prioridad]}`}>
                    {t.prioridad}
                  </span>
                </div>

                {t.descripcion && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line">{t.descripcion}</p>
                )}

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <span className={`flex items-center gap-1.5 ${vencida ? 'text-rose-600 dark:text-rose-400 font-semibold' : ''}`}>
                    <CalendarDays className="w-3.5 h-3.5" />
                    {formatearDia(t.fecha_limite)}
                    {vencida && ' · vencida'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <UserRound className="w-3.5 h-3.5" /> Asignada por {nombreCorto(t.creado_por_email)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <span className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${ESTILO_ESTADO[t.estado]}`}>
                    {ETIQUETA_ESTADO[t.estado]}
                  </span>
                  <div className="flex items-center gap-2">
                    {t.estado === 'pendiente' && (
                      <button
                        onClick={() => onEstado(t, 'en_progreso')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors"
                      >
                        <Play className="w-3.5 h-3.5" /> Empezar
                      </button>
                    )}
                    {t.estado !== 'completada' && (
                      <button
                        onClick={() => onEstado(t, 'completada')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-xs font-medium text-white transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Completar
                      </button>
                    )}
                    {t.estado === 'completada' && (
                      <button
                        onClick={() => onEstado(t, 'pendiente')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Reabrir
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
