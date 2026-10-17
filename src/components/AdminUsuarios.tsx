/**
 * Gestión de usuarios y roles (solo administrador). Los roles dependen del correo.
 */
import React, { useMemo, useState } from 'react';
import { Info, Loader2, ShieldCheck, UserPlus } from 'lucide-react';
import { ETIQUETA_ROL, Perfil, Rol } from '../types';

interface Props {
  perfiles: Perfil[];
  userId: string;
  onCambiarRol: (p: Perfil, rol: Rol) => void;
  onAsignarCorreo: (email: string, rol: Rol) => Promise<boolean>;
}

const COLOR_ROL: Record<Rol, string> = {
  admin: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900',
  supervisor: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900',
  usuario: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
};

export const AdminUsuarios: React.FC<Props> = ({ perfiles, userId, onCambiarRol, onAsignarCorreo }) => {
  const [email, setEmail] = useState('');
  const [rol, setRol] = useState<Rol>('usuario');
  const [guardando, setGuardando] = useState(false);

  const conteo = useMemo(
    () => ({
      admin: perfiles.filter((p) => p.rol === 'admin').length,
      supervisor: perfiles.filter((p) => p.rol === 'supervisor').length,
      usuario: perfiles.filter((p) => p.rol === 'usuario').length,
    }),
    [perfiles]
  );

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setGuardando(true);
    const ok = await onAsignarCorreo(email.trim(), rol);
    setGuardando(false);
    if (ok) setEmail('');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {(['admin', 'supervisor', 'usuario'] as Rol[]).map((r) => (
          <div key={r} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="text-xl font-bold tabular-nums">{conteo[r]}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{ETIQUETA_ROL[r]}{conteo[r] === 1 ? '' : 'es'}</div>
          </div>
        ))}
      </div>

      <form onSubmit={enviar} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold">Asignar rol por correo</h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 flex gap-2">
          <Info className="w-4 h-4 shrink-0 mt-px" />
          Sirve aunque la persona todavía no tenga cuenta: cuando la crees en Supabase, entrará ya con este rol.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
            className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
          <select value={rol} onChange={(e) => setRol(e.target.value as Rol)} className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm">
            <option value="usuario">Usuario</option>
            <option value="supervisor">Supervisor</option>
            <option value="admin">Administrador</option>
          </select>
          <button
            type="submit"
            disabled={guardando || !email.trim()}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            {guardando && <Loader2 className="w-4 h-4 animate-spin" />} Guardar
          </button>
        </div>
      </form>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <ShieldCheck className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold">Personas con cuenta</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-slate-800/50">
                <th className="py-3 px-5 font-semibold">Correo</th>
                <th className="py-3 px-5 font-semibold">Rol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {perfiles.map((p) => (
                <tr key={p.id}>
                  <td className="py-3.5 px-5">
                    <span className="font-medium">{p.email}</span>
                    {p.id === userId && <span className="ml-2 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">(tú)</span>}
                  </td>
                  <td className="py-3.5 px-5">
                    {p.id === userId ? (
                      <span className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${COLOR_ROL[p.rol]}`}>{ETIQUETA_ROL[p.rol]}</span>
                    ) : (
                      <select
                        value={p.rol}
                        onChange={(e) => onCambiarRol(p, e.target.value as Rol)}
                        className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${COLOR_ROL[p.rol]}`}
                      >
                        <option value="usuario">Usuario</option>
                        <option value="supervisor">Supervisor</option>
                        <option value="admin">Administrador</option>
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
