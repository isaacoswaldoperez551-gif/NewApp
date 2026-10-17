/**
 * Panel del equipo (admin y supervisor): estadísticas, crear/asignar tareas y seguimiento
 */
import React, { useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, CheckCircle2, ClipboardList, Loader2, Plus, Send, Timer, Trash2, Users } from 'lucide-react';
import { EstadoTarea, NuevaTarea, Perfil, PrioridadTarea, Rol, Tarea } from '../types';
import { ESTILO_ESTADO, ESTILO_PRIORIDAD, ETIQUETA_ESTADO, estaVencida, formatearDia, hoyISO, nombreCorto } from '../tareasUtils';

interface Props {
  tareas: Tarea[];
  perfiles: Perfil[];
  userId: string;
  rol: Rol;
  onCrear: (t: NuevaTarea) => Promise<boolean>;
  onEstado: (t: Tarea, estado: EstadoTarea) => void;
  onEliminar: (t: Tarea) => void;
}

const CAMPO =
  'w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600';

export const PanelEquipo: React.FC<Props> = ({ tareas, perfiles, userId, rol, onCrear, onEstado, onEliminar }) => {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [prioridad, setPrioridad] = useState<PrioridadTarea>('media');
  const [fecha, setFecha] = useState('');
  const [asignados, setAsignados] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<'todos' | EstadoTarea | 'vencidas'>('todos');
  const [filtroPersona, setFiltroPersona] = useState('todas');

  // A quién se le puede asignar: admin a todos; supervisor a usuarios y a sí mismo
  const candidatos = useMemo(
    () =>
      perfiles
        .filter((p) => (rol === 'admin' ? true : p.rol === 'usuario' || p.id === userId))
        .sort((a, b) => a.email.localeCompare(b.email)),
    [perfiles, rol, userId]
  );

  const stats = useMemo(
    () => ({
      total: tareas.length,
      pendiente: tareas.filter((t) => t.estado === 'pendiente').length,
      en_progreso: tareas.filter((t) => t.estado === 'en_progreso').length,
      completada: tareas.filter((t) => t.estado === 'completada').length,
      vencidas: tareas.filter(estaVencida).length,
    }),
    [tareas]
  );

  const porPersona = useMemo(() => {
    const mapa = new Map<string, { email: string; pendiente: number; en_progreso: number; completada: number; vencidas: number }>();
    tareas.forEach((t) => {
      const f = mapa.get(t.asignado_a) || { email: t.asignado_email || '—', pendiente: 0, en_progreso: 0, completada: 0, vencidas: 0 };
      f[t.estado] += 1;
      if (estaVencida(t)) f.vencidas += 1;
      mapa.set(t.asignado_a, f);
    });
    return Array.from(mapa.entries())
      .map(([id, f]) => ({ id, ...f, total: f.pendiente + f.en_progreso + f.completada }))
      .sort((a, b) => b.total - a.total);
  }, [tareas]);

  const lista = useMemo(
    () =>
      tareas
        .filter((t) => (filtroPersona === 'todas' ? true : t.asignado_a === filtroPersona))
        .filter((t) =>
          filtroEstado === 'todos' ? true : filtroEstado === 'vencidas' ? estaVencida(t) : t.estado === filtroEstado
        )
        .sort((a, b) => b.creado_en.localeCompare(a.creado_en)),
    [tareas, filtroEstado, filtroPersona]
  );

  const alternar = (id: string) =>
    setAsignados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || asignados.length === 0) return;
    setEnviando(true);
    const ok = await onCrear({
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      prioridad,
      fecha_limite: fecha || null,
      asignados,
    });
    setEnviando(false);
    if (ok) {
      setTitulo('');
      setDescripcion('');
      setPrioridad('media');
      setFecha('');
      setAsignados([]);
    }
  };

  const tiles = [
    { etiqueta: 'Total', valor: stats.total, icono: <ClipboardList className="w-5 h-5" />, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 dark:text-indigo-400' },
    { etiqueta: 'Pendientes', valor: stats.pendiente, icono: <Timer className="w-5 h-5" />, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400' },
    { etiqueta: 'En progreso', valor: stats.en_progreso, icono: <Loader2 className="w-5 h-5" />, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-400' },
    { etiqueta: 'Completadas', valor: stats.completada, icono: <CheckCircle2 className="w-5 h-5" />, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400' },
    { etiqueta: 'Vencidas', valor: stats.vencidas, icono: <AlertTriangle className="w-5 h-5" />, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/50 dark:text-rose-400' },
  ];

  return (
    <div className="space-y-8">
      {/* Estadísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {tiles.map((t) => (
          <div key={t.etiqueta} className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className={`p-2.5 rounded-xl ${t.color}`}>{t.icono}</div>
            <div>
              <div className="text-xl font-bold tabular-nums">{t.valor}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{t.etiqueta}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start">
        {/* Formulario */}
        <form onSubmit={enviar} className="xl:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold">Asignar tarea nueva</h3>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Título</label>
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={120} placeholder="Ej: Revisar contratos de octubre" className={CAMPO} />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Detalles (opcional)</label>
            <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={3} className={CAMPO} placeholder="Instrucciones o contexto" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Prioridad</label>
              <select value={prioridad} onChange={(e) => setPrioridad(e.target.value as PrioridadTarea)} className={CAMPO}>
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Fecha límite</label>
              <input type="date" min={hoyISO()} value={fecha} onChange={(e) => setFecha(e.target.value)} className={CAMPO} />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Asignar a</label>
              <button
                type="button"
                onClick={() => setAsignados(asignados.length === candidatos.length ? [] : candidatos.map((c) => c.id))}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {asignados.length === candidatos.length ? 'Quitar todos' : 'Seleccionar todos'}
              </button>
            </div>
            <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-300 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
              {candidatos.length === 0 && <p className="p-3 text-xs text-slate-500">No hay personas disponibles.</p>}
              {candidatos.map((c) => (
                <label key={c.id} className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <input type="checkbox" checked={asignados.includes(c.id)} onChange={() => alternar(c.id)} className="accent-indigo-600 w-4 h-4" />
                  <span className="flex-1 truncate">{c.email}</span>
                  <span className="text-[10px] uppercase tracking-wide text-slate-400">{c.id === userId ? 'yo' : c.rol}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={enviando || !titulo.trim() || asignados.length === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors"
          >
            {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Asignar{asignados.length > 1 ? ` a ${asignados.length} personas` : ''}
          </button>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Cada persona recibirá una notificación en la página y un correo.
          </p>
        </form>

        {/* Rendimiento por persona */}
        <div className="xl:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-200 dark:border-slate-800">
            <Users className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold">Avance por persona</h3>
          </div>
          {porPersona.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500">Todavía no hay tareas asignadas.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-slate-800/50">
                    <th className="py-3 px-5 font-semibold">Persona</th>
                    <th className="py-3 px-3 font-semibold text-center">Pend.</th>
                    <th className="py-3 px-3 font-semibold text-center">En prog.</th>
                    <th className="py-3 px-3 font-semibold text-center">Listas</th>
                    <th className="py-3 px-3 font-semibold text-center">Venc.</th>
                    <th className="py-3 px-5 font-semibold w-40">Cumplimiento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {porPersona.map((p) => {
                    const pct = Math.round((p.completada / p.total) * 100);
                    return (
                      <tr key={p.id}>
                        <td className="py-3 px-5 font-medium truncate max-w-[200px]">{p.email}</td>
                        <td className="py-3 px-3 text-center tabular-nums">{p.pendiente}</td>
                        <td className="py-3 px-3 text-center tabular-nums">{p.en_progreso}</td>
                        <td className="py-3 px-3 text-center tabular-nums">{p.completada}</td>
                        <td className={`py-3 px-3 text-center tabular-nums ${p.vencidas ? 'text-rose-600 font-bold' : ''}`}>{p.vencidas}</td>
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs tabular-nums w-9 text-right text-slate-500">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Seguimiento */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-bold text-lg">Seguimiento de tareas</h3>
          <div className="flex flex-wrap gap-2">
            <select value={filtroPersona} onChange={(e) => setFiltroPersona(e.target.value)} className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm">
              <option value="todas">Todas las personas</option>
              {porPersona.map((p) => (
                <option key={p.id} value={p.id}>{p.email}</option>
              ))}
            </select>
            <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value as any)} className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm">
              <option value="todos">Todos los estados</option>
              <option value="pendiente">Pendientes</option>
              <option value="en_progreso">En progreso</option>
              <option value="completada">Completadas</option>
              <option value="vencidas">Vencidas</option>
            </select>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          {lista.length === 0 ? (
            <p className="py-14 text-center text-sm text-slate-500">No hay tareas con estos filtros.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-slate-800/50">
                    <th className="py-3 px-5 font-semibold">Tarea</th>
                    <th className="py-3 px-4 font-semibold">Asignada a</th>
                    <th className="py-3 px-4 font-semibold">Límite</th>
                    <th className="py-3 px-4 font-semibold">Prioridad</th>
                    <th className="py-3 px-4 font-semibold">Estado</th>
                    <th className="py-3 px-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {lista.map((t) => {
                    const venc = estaVencida(t);
                    return (
                      <tr key={t.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="py-3.5 px-5 max-w-[280px]">
                          <div className="font-semibold truncate">{t.titulo}</div>
                          <div className="text-xs text-slate-500 truncate">por {nombreCorto(t.creado_por_email)}</div>
                        </td>
                        <td className="py-3.5 px-4 text-xs truncate max-w-[180px]">{t.asignado_email}</td>
                        <td className={`py-3.5 px-4 text-xs whitespace-nowrap ${venc ? 'text-rose-600 font-semibold' : 'text-slate-600 dark:text-slate-400'}`}>
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays className="w-3.5 h-3.5" /> {formatearDia(t.fecha_limite)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold capitalize ${ESTILO_PRIORIDAD[t.prioridad]}`}>{t.prioridad}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <select
                            value={t.estado}
                            onChange={(e) => onEstado(t, e.target.value as EstadoTarea)}
                            className={`px-2 py-1 rounded-lg border text-xs font-semibold ${ESTILO_ESTADO[t.estado]}`}
                          >
                            {(Object.keys(ETIQUETA_ESTADO) as EstadoTarea[]).map((e) => (
                              <option key={e} value={e}>{ETIQUETA_ESTADO[e]}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => {
                              if (window.confirm(`¿Eliminar la tarea "${t.titulo}"?`)) onEliminar(t);
                            }}
                            className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Eliminar tarea"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
