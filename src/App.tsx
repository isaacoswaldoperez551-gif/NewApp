/**
 * Componente Principal (App.tsx) para GestiónDoc
 */
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabase';
import {
  CarpetaSeleccion,
  Documento,
  EstadoTarea,
  Notificacion,
  NuevaTarea,
  Perfil,
  Rol,
  Tarea,
  ToastMessage,
  VistaApp,
} from './types';
import { NotificationBell } from './components/NotificationBell';
import { MisTareas } from './components/MisTareas';
import { PanelEquipo } from './components/PanelEquipo';
import { AdminUsuarios } from './components/AdminUsuarios';
import { AdminAvisos } from './components/AdminAvisos';
import { FolderOpen, ClipboardList, UsersRound, ShieldCheck, Megaphone } from 'lucide-react';
import { Login } from './components/Login';
import { Navbar } from './components/Navbar';
import { UploadSection } from './components/UploadSection';
import { DocumentList } from './components/DocumentList';
import { PreviewModal } from './components/PreviewModal';
import { Toast } from './components/Toast';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [cargandoDocs, setCargandoDocs] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Roles, tareas y notificaciones
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [perfiles, setPerfiles] = useState<Perfil[]>([]);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [notifs, setNotifs] = useState<Notificacion[]>([]);
  const [vista, setVista] = useState<VistaApp>('documentos');

  const uid: string = session?.user?.id ?? '';
  const rol: Rol | null = perfil?.rol ?? null;
  const esAdmin = rol === 'admin';
  const esGestor = rol === 'admin' || rol === 'supervisor';

  // Carpetas
  const [carpetaActual, setCarpetaActual] = useState<CarpetaSeleccion>('todas');
  const [carpetasLocales, setCarpetasLocales] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('gd_carpetas') || '[]');
    } catch {
      return [];
    }
  });
  const [miniaturas, setMiniaturas] = useState<Record<string, string>>({});

  // Estado para vista previa
  const [docPreview, setDocPreview] = useState<Documento | null>(null);
  const [signedUrlPreview, setSignedUrlPreview] = useState<string | null>(null);

  // Agregar notificación Toast
  const addToast = (mensaje: string, tipo: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, mensaje, tipo }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Verificar sesión al cargar
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setCargandoSesion(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Cargar documentos y configurar Realtime
  useEffect(() => {
    if (!session) return;

    fetchDocumentos();

    // Supabase Realtime sobre la tabla documentos
    const canal = supabase
      .channel('public:documentos')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'documentos' },
        () => {
          fetchDocumentos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [session]);

  const fetchDocumentos = async () => {
    setCargandoDocs(true);
    try {
      const { data, error } = await supabase
        .from('documentos')
        .select('*')
        .order('creado_en', { ascending: false });

      if (error) {
        throw error;
      }
      setDocumentos(data || []);
    } catch (err: any) {
      console.error('Error al cargar documentos:', err);
      addToast('Error al cargar la lista de documentos.', 'error');
    } finally {
      setCargandoDocs(false);
    }
  };

  // ---- Perfil y rol (viene de Supabase según el correo; no se puede cambiar desde la página) ----
  useEffect(() => {
    if (!uid) {
      setPerfil(null);
      setPerfiles([]);
      setTareas([]);
      setNotifs([]);
      setVista('documentos');
      return;
    }
    let cancelado = false;
    supabase
      .from('perfiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelado) return;
        // Si todavía no se ejecutó el SQL de roles, la página funciona como antes
        setPerfil(error || !data ? null : (data as Perfil));
      });
    return () => {
      cancelado = true;
    };
  }, [uid]);

  const fetchTareas = async () => {
    const { data, error } = await supabase.from('tareas').select('*').order('creado_en', { ascending: false });
    if (!error) setTareas((data as Tarea[]) || []);
  };

  const fetchNotifs = async () => {
    const { data, error } = await supabase
      .from('notificaciones')
      .select('*')
      .order('creado_en', { ascending: false })
      .limit(50);
    if (!error) setNotifs((data as Notificacion[]) || []);
  };

  const fetchPerfiles = async () => {
    const { data, error } = await supabase.from('perfiles').select('*').order('email', { ascending: true });
    if (!error) setPerfiles((data as Perfil[]) || []);
  };

  useEffect(() => {
    if (!perfil) return;
    fetchTareas();
    fetchNotifs();
    if (perfil.rol !== 'usuario') fetchPerfiles();

    const canalTareas = supabase
      .channel('rt-tareas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tareas' }, () => fetchTareas())
      .subscribe();

    const canalNotifs = supabase
      .channel('rt-notificaciones')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificaciones', filter: `usuario_id=eq.${perfil.id}` },
        (payload: any) => {
          fetchNotifs();
          addToast(payload?.new?.titulo || 'Tienes una notificación nueva', 'info');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canalTareas);
      supabase.removeChannel(canalNotifs);
    };
  }, [perfil?.id, perfil?.rol]);

  const handleCrearTareas = async (n: NuevaTarea): Promise<boolean> => {
    const filas = n.asignados.map((id) => ({
      titulo: n.titulo,
      descripcion: n.descripcion || null,
      prioridad: n.prioridad,
      fecha_limite: n.fecha_limite,
      asignado_a: id,
      creado_por: uid,
    }));
    const { error } = await supabase.from('tareas').insert(filas);
    if (error) {
      addToast(`No se pudo asignar la tarea: ${error.message}`, 'error');
      return false;
    }
    addToast(n.asignados.length > 1 ? `Tarea asignada a ${n.asignados.length} personas.` : 'Tarea asignada.', 'success');
    fetchTareas();
    return true;
  };

  const handleEstadoTarea = async (t: Tarea, estado: EstadoTarea) => {
    setTareas((prev) => prev.map((x) => (x.id === t.id ? { ...x, estado } : x)));
    const { data, error } = await supabase.from('tareas').update({ estado }).eq('id', t.id).select('id');
    if (error || !data || data.length === 0) {
      addToast(error?.message || 'No se pudo cambiar el estado.', 'error');
    }
    fetchTareas();
  };

  const handleEliminarTarea = async (t: Tarea) => {
    const { error } = await supabase.from('tareas').delete().eq('id', t.id);
    if (error) {
      addToast(error.message, 'error');
      return;
    }
    addToast('Tarea eliminada.', 'success');
    fetchTareas();
  };

  const handleCambiarRol = async (p: Perfil, nuevoRol: Rol) => {
    const { data, error } = await supabase.from('perfiles').update({ rol: nuevoRol }).eq('id', p.id).select('id');
    if (error || !data || data.length === 0) {
      addToast(error?.message || 'No se pudo cambiar el rol.', 'error');
    } else {
      addToast(`${p.email} ahora es ${nuevoRol}.`, 'success');
    }
    fetchPerfiles();
  };

  const handleAsignarCorreo = async (email: string, nuevoRol: Rol): Promise<boolean> => {
    const { error } = await supabase.rpc('asignar_rol_por_correo', { p_email: email, p_rol: nuevoRol });
    if (error) {
      addToast(error.message, 'error');
      return false;
    }
    addToast(`Rol guardado para ${email}.`, 'success');
    fetchPerfiles();
    return true;
  };

  const handleEnviarAviso = async (
    titulo: string,
    mensaje: string,
    destino: string,
    usuarioId: string | null
  ): Promise<boolean> => {
    const { data, error } = await supabase.rpc('enviar_aviso', {
      p_titulo: titulo,
      p_mensaje: mensaje,
      p_destino: destino,
      p_usuario_id: usuarioId,
    });
    if (error) {
      addToast(error.message, 'error');
      return false;
    }
    addToast(`Aviso enviado a ${data ?? 0} ${data === 1 ? 'persona' : 'personas'}.`, 'success');
    return true;
  };

  const handleNotifLeida = async (n: Notificacion) => {
    setNotifs((prev) => prev.map((x) => (x.id === n.id ? { ...x, leida: true } : x)));
    await supabase.from('notificaciones').update({ leida: true }).eq('id', n.id);
  };

  const handleNotifTodasLeidas = async () => {
    setNotifs((prev) => prev.map((x) => ({ ...x, leida: true })));
    await supabase.from('notificaciones').update({ leida: true }).eq('usuario_id', uid).eq('leida', false);
  };

  const handleNotifBorrar = async (n: Notificacion) => {
    setNotifs((prev) => prev.filter((x) => x.id !== n.id));
    await supabase.from('notificaciones').delete().eq('id', n.id);
  };

  const handleNotifAbrir = (n: Notificacion) => {
    if (!n.tarea_id) return;
    const t = tareas.find((x) => x.id === n.tarea_id);
    setVista(t && t.asignado_a !== uid && esGestor ? 'equipo' : 'tareas');
  };

  // Lista de carpetas = las que usan los documentos + las creadas y aún vacías
  const carpetas = useMemo(() => {
    const set = new Set<string>(carpetasLocales);
    documentos.forEach((d) => d.carpeta && set.add(d.carpeta));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  }, [documentos, carpetasLocales]);

  // Miniaturas de imágenes (enlaces temporales de 1 hora)
  useEffect(() => {
    const pendientes = documentos.filter((d) => d.tipo === 'imagen' && !miniaturas[d.id]);
    if (pendientes.length === 0) return;
    let cancelado = false;
    supabase.storage
      .from('documentos')
      .createSignedUrls(
        pendientes.map((d) => d.ruta),
        3600
      )
      .then(({ data }) => {
        if (cancelado || !data) return;
        const nuevas: Record<string, string> = {};
        data.forEach((item) => {
          const doc = pendientes.find((d) => d.ruta === item.path);
          if (doc && item.signedUrl) nuevas[doc.id] = item.signedUrl;
        });
        setMiniaturas((prev) => ({ ...prev, ...nuevas }));
      });
    return () => {
      cancelado = true;
    };
  }, [documentos]);

  const handleCrearCarpeta = (nombre: string) => {
    const existente = carpetas.find((c) => c.toLowerCase() === nombre.toLowerCase());
    if (existente) {
      setCarpetaActual(existente);
      return;
    }
    const nuevas = [...carpetasLocales, nombre];
    setCarpetasLocales(nuevas);
    try {
      localStorage.setItem('gd_carpetas', JSON.stringify(nuevas));
    } catch {
      /* sin almacenamiento */
    }
    setCarpetaActual(nombre);
    addToast(`Carpeta "${nombre}" creada.`, 'success');
  };

  // Cambiar nombre (solo el nombre que se muestra; el archivo en Storage no cambia)
  const handleRename = async (doc: Documento, nombre: string) => {
    const { data, error } = await supabase
      .from('documentos')
      .update({ nombre })
      .eq('id', doc.id)
      .select('id');
    if (error || !data || data.length === 0) {
      addToast(error?.message || 'No tienes permiso para cambiar el nombre. Revisa los permisos en Supabase.', 'error');
      return;
    }
    addToast('Nombre actualizado.', 'success');
    fetchDocumentos();
  };

  const handleMove = async (doc: Documento, carpeta: string | null) => {
    const { data, error } = await supabase
      .from('documentos')
      .update({ carpeta })
      .eq('id', doc.id)
      .select('id');
    if (error || !data || data.length === 0) {
      addToast(
        error?.message || 'No se pudo mover. Falta ejecutar el SQL de carpetas en Supabase.',
        'error'
      );
      return;
    }
    addToast(carpeta ? `Movido a "${carpeta}".` : 'Movido a "Sin carpeta".', 'success');
    fetchDocumentos();
  };

  // Descargar documento con createSignedUrl (60 segundos)
  const handleDownload = async (doc: Documento) => {
    try {
      const { data, error } = await supabase.storage
        .from('documentos')
        .createSignedUrl(doc.ruta, 60);

      if (error || !data?.signedUrl) {
        throw new Error(error?.message || 'No se pudo generar el enlace de descarga.');
      }

      // Abrir o descargar mediante enlace temporal
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = doc.nombre;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast(`Descargando "${doc.nombre}"...`, 'success');
    } catch (err: any) {
      console.error('Error al descargar:', err);
      addToast(err?.message || 'Error al descargar el archivo.', 'error');
    }
  };

  // Abrir vista previa
  const handlePreview = async (doc: Documento) => {
    setDocPreview(doc);
    setSignedUrlPreview(null);
    try {
      const { data, error } = await supabase.storage
        .from('documentos')
        .createSignedUrl(doc.ruta, 60);

      if (error || !data?.signedUrl) {
        throw new Error(error?.message || 'No se pudo generar la vista previa.');
      }
      setSignedUrlPreview(data.signedUrl);
    } catch (err: any) {
      console.error('Error en vista previa:', err);
      addToast(err?.message || 'Error al abrir la vista previa.', 'error');
    }
  };

  // Borrar documento (solo propios)
  const handleDelete = async (doc: Documento) => {
    try {
      // 1. Borrar archivo de Storage
      const { error: storageError } = await supabase.storage
        .from('documentos')
        .remove([doc.ruta]);

      if (storageError) {
        console.error('Error al borrar en Storage:', storageError);
      }

      // 2. Borrar fila de la tabla
      const { error: dbError } = await supabase
        .from('documentos')
        .delete()
        .eq('id', doc.id);

      if (dbError) {
        throw dbError;
      }

      addToast(`Documento "${doc.nombre}" eliminado con éxito.`, 'success');
      fetchDocumentos();
    } catch (err: any) {
      console.error('Error al borrar documento:', err);
      addToast(err?.message || 'Error al eliminar el documento.', 'error');
    }
  };

  // Toggle modo oscuro
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark', !darkMode);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    addToast('Sesión cerrada correctamente.', 'info');
  };

  if (cargandoSesion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-sm font-medium text-slate-500 animate-pulse">
          Cargando GestiónDoc...
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <>
        <Login onLoginSuccess={() => {}} addToast={addToast} />
        <Toast toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  const userId = session.user.id;
  const userEmail = session.user.email || '';

  const activas = tareas.filter((t) => t.asignado_a === uid && t.estado !== 'completada').length;
  const pestanas: { id: VistaApp; texto: string; icono: React.ReactNode; contador?: number }[] = [
    { id: 'documentos', texto: 'Documentos', icono: <FolderOpen className="w-4 h-4" /> },
    { id: 'tareas', texto: 'Mis tareas', icono: <ClipboardList className="w-4 h-4" />, contador: activas },
    ...(esGestor ? [{ id: 'equipo' as VistaApp, texto: 'Equipo', icono: <UsersRound className="w-4 h-4" /> }] : []),
    ...(esAdmin
      ? [
          { id: 'usuarios' as VistaApp, texto: 'Usuarios', icono: <ShieldCheck className="w-4 h-4" /> },
          { id: 'avisos' as VistaApp, texto: 'Avisos', icono: <Megaphone className="w-4 h-4" /> },
        ]
      : []),
  ];
  const vistaActiva: VistaApp = perfil && pestanas.some((t) => t.id === vista) ? vista : 'documentos';

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors ${darkMode ? 'dark' : ''}`}>
      <Navbar
        userEmail={userEmail}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        onLogout={handleLogout}
        rol={rol}
        campana={
          perfil ? (
            <NotificationBell
              notificaciones={notifs}
              onLeida={handleNotifLeida}
              onTodasLeidas={handleNotifTodasLeidas}
              onBorrar={handleNotifBorrar}
              onAbrir={handleNotifAbrir}
            />
          ) : null
        }
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Pestañas (solo aparecen las que corresponden al rol de quien inició sesión) */}
        {perfil && (
          <nav className="flex gap-1.5 overflow-x-auto pb-1 -mt-2">
            {pestanas.map((t) => (
              <button
                key={t.id}
                onClick={() => setVista(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                  vistaActiva === t.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900'
                }`}
              >
                {t.icono}
                {t.texto}
                {t.contador ? (
                  <span
                    className={`px-1.5 rounded-md text-[11px] font-bold ${
                      vistaActiva === t.id ? 'bg-white/25' : 'bg-rose-600 text-white'
                    }`}
                  >
                    {t.contador}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>
        )}

        {vistaActiva === 'tareas' && perfil && (
          <section>
            <div className="mb-4">
              <h2 className="text-xl font-bold tracking-tight">Mis tareas</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Lo que te han asignado y su fecha límite.</p>
            </div>
            <MisTareas tareas={tareas.filter((t) => t.asignado_a === uid)} onEstado={handleEstadoTarea} />
          </section>
        )}

        {vistaActiva === 'equipo' && perfil && esGestor && (
          <section>
            <div className="mb-4">
              <h2 className="text-xl font-bold tracking-tight">Panel del equipo</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {esAdmin ? 'Todas las tareas del equipo.' : 'Las tareas que tú has asignado.'}
              </p>
            </div>
            <PanelEquipo
              tareas={esAdmin ? tareas : tareas.filter((t) => t.creado_por === uid)}
              perfiles={perfiles}
              userId={uid}
              rol={rol as Rol}
              onCrear={handleCrearTareas}
              onEstado={handleEstadoTarea}
              onEliminar={handleEliminarTarea}
            />
          </section>
        )}

        {vistaActiva === 'usuarios' && perfil && esAdmin && (
          <section>
            <div className="mb-4">
              <h2 className="text-xl font-bold tracking-tight">Usuarios y roles</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Quién es administrador, supervisor o usuario.</p>
            </div>
            <AdminUsuarios
              perfiles={perfiles}
              userId={uid}
              onCambiarRol={handleCambiarRol}
              onAsignarCorreo={handleAsignarCorreo}
            />
          </section>
        )}

        {vistaActiva === 'avisos' && perfil && esAdmin && (
          <section>
            <div className="mb-4">
              <h2 className="text-xl font-bold tracking-tight">Avisos</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Envía notificaciones al equipo.</p>
            </div>
            <AdminAvisos perfiles={perfiles} onEnviar={handleEnviarAviso} />
          </section>
        )}

        {vistaActiva === 'documentos' && (<>
        {/* Sección de Subida */}
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold tracking-tight">Subir Documentos</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sube uno o varios archivos (hasta 50 MB cada uno) al repositorio compartido.
              {carpetaActual !== 'todas' && carpetaActual !== '__sin__' && (
                <> Se guardarán en la carpeta <strong>{carpetaActual}</strong>.</>
              )}
            </p>
          </div>
          <UploadSection
            userId={userId}
            userEmail={userEmail}
            carpeta={carpetaActual !== 'todas' && carpetaActual !== '__sin__' ? carpetaActual : null}
            onUploadComplete={fetchDocumentos}
            addToast={addToast}
          />
        </section>

        {/* Lista de Documentos */}
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold tracking-tight">Repositorio Documental</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Todos los documentos subidos por el equipo, ordenados por fecha de creación.
            </p>
          </div>
          <DocumentList
            documentos={documentos}
            currentUserId={userId}
            esAdmin={esAdmin}
            cargando={cargandoDocs}
            miniaturas={miniaturas}
            carpetas={carpetas}
            carpetaActual={carpetaActual}
            onCarpetaChange={setCarpetaActual}
            onCrearCarpeta={handleCrearCarpeta}
            onRename={handleRename}
            onMove={handleMove}
            onRefresh={fetchDocumentos}
            onDownload={handleDownload}
            onPreview={handlePreview}
            onDelete={handleDelete}
          />
        </section>
        </>)}
      </main>

      {/* Modal de Vista Previa */}
      <PreviewModal
        documento={docPreview}
        signedUrl={signedUrlPreview}
        onClose={() => setDocPreview(null)}
        onDownload={handleDownload}
      />

      {/* Notificaciones Toast */}
      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
