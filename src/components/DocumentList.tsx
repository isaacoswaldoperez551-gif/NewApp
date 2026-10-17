/**
 * Lista de documentos: vista de tarjetas o tabla, carpetas, orden, renombrar, mover y resumen de espacio.
 */
import React, { useMemo, useState } from 'react';
import { CarpetaSeleccion, Documento, Orden, TipoFiltro, Vista } from '../types';
import { formatearTamano, formatearFecha } from '../utils';
import {
  FileText,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  File,
  Search,
  RefreshCw,
  Download,
  Eye,
  Trash2,
  AlertTriangle,
  FolderOpen,
  Folder,
  FolderPlus,
  FolderInput,
  LayoutGrid,
  Rows3,
  Pencil,
  HardDrive,
  Files,
  UserRound,
  X,
  Check,
} from 'lucide-react';

interface DocumentListProps {
  documentos: Documento[];
  currentUserId: string;
  esAdmin?: boolean;
  cargando: boolean;
  miniaturas: Record<string, string>;
  carpetas: string[];
  carpetaActual: CarpetaSeleccion;
  onCarpetaChange: (c: CarpetaSeleccion) => void;
  onCrearCarpeta: (nombre: string) => void;
  onRefresh: () => void;
  onDownload: (doc: Documento) => void;
  onPreview: (doc: Documento) => void;
  onDelete: (doc: Documento) => void;
  onRename: (doc: Documento, nombre: string) => void;
  onMove: (doc: Documento, carpeta: string | null) => void;
}

const ESTILO_TIPO: Record<string, { icono: React.ReactNode; fondo: string; etiqueta: string }> = {
  pdf: {
    icono: <FileText className="w-10 h-10 text-rose-500" />,
    fondo: 'from-rose-50 to-rose-100 dark:from-rose-950/40 dark:to-rose-900/20',
    etiqueta: 'PDF',
  },
  word: {
    icono: <FileCode className="w-10 h-10 text-blue-500" />,
    fondo: 'from-blue-50 to-blue-100 dark:from-blue-950/40 dark:to-blue-900/20',
    etiqueta: 'Word',
  },
  excel: {
    icono: <FileSpreadsheet className="w-10 h-10 text-emerald-500" />,
    fondo: 'from-emerald-50 to-emerald-100 dark:from-emerald-950/40 dark:to-emerald-900/20',
    etiqueta: 'Excel',
  },
  imagen: {
    icono: <ImageIcon className="w-10 h-10 text-purple-500" />,
    fondo: 'from-purple-50 to-purple-100 dark:from-purple-950/40 dark:to-purple-900/20',
    etiqueta: 'Imagen',
  },
  otro: {
    icono: <File className="w-10 h-10 text-slate-400" />,
    fondo: 'from-slate-50 to-slate-100 dark:from-slate-800/60 dark:to-slate-800/30',
    etiqueta: 'Archivo',
  },
};

const estiloDe = (tipo: string) => ESTILO_TIPO[tipo] || ESTILO_TIPO.otro;

const BTN_ICONO =
  'p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors';

/** Ventana emergente genérica */
const Modal: React.FC<{ onClose: () => void; children: React.ReactNode }> = ({ onClose, children }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
    onClick={onClose}
  >
    <div
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  </div>
);

export const DocumentList: React.FC<DocumentListProps> = ({
  documentos,
  currentUserId,
  esAdmin = false,
  cargando,
  miniaturas,
  carpetas,
  carpetaActual,
  onCarpetaChange,
  onCrearCarpeta,
  onRefresh,
  onDownload,
  onPreview,
  onDelete,
  onRename,
  onMove,
}) => {
  const [busqueda, setBusqueda] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<TipoFiltro>('todos');
  const [orden, setOrden] = useState<Orden>('recientes');
  const [vista, setVista] = useState<Vista>(() => {
    try {
      return (localStorage.getItem('gd_vista') as Vista) || 'tarjetas';
    } catch {
      return 'tarjetas';
    }
  });
  const [docAEliminar, setDocAEliminar] = useState<Documento | null>(null);
  const [docARenombrar, setDocARenombrar] = useState<Documento | null>(null);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [docAMover, setDocAMover] = useState<Documento | null>(null);
  const [creandoCarpeta, setCreandoCarpeta] = useState(false);
  const [nombreCarpeta, setNombreCarpeta] = useState('');

  const cambiarVista = (v: Vista) => {
    setVista(v);
    try {
      localStorage.setItem('gd_vista', v);
    } catch {
      /* sin almacenamiento: no pasa nada */
    }
  };

  // Resumen de espacio
  const resumen = useMemo(() => {
    const total = documentos.reduce((acc, d) => acc + (d.tamano || 0), 0);
    const mios = documentos.filter((d) => d.subido_por === currentUserId).length;
    return { total, mios, cantidad: documentos.length };
  }, [documentos, currentUserId]);

  // Conteo por carpeta
  const conteo = useMemo(() => {
    const c: Record<string, number> = {};
    let sin = 0;
    documentos.forEach((d) => {
      if (d.carpeta) c[d.carpeta] = (c[d.carpeta] || 0) + 1;
      else sin += 1;
    });
    return { porCarpeta: c, sin };
  }, [documentos]);

  // Filtrar y ordenar
  const documentosFiltrados = useMemo(() => {
    const lista = documentos.filter((doc) => {
      const coincideNombre = doc.nombre.toLowerCase().includes(busqueda.toLowerCase());
      const coincideTipo = tipoFiltro === 'todos' || doc.tipo === tipoFiltro;
      const coincideCarpeta =
        carpetaActual === 'todas' ||
        (carpetaActual === '__sin__' ? !doc.carpeta : doc.carpeta === carpetaActual);
      return coincideNombre && coincideTipo && coincideCarpeta;
    });
    lista.sort((a, b) => {
      switch (orden) {
        case 'antiguos':
          return a.creado_en.localeCompare(b.creado_en);
        case 'nombre':
          return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });
        case 'tamano':
          return (b.tamano || 0) - (a.tamano || 0);
        default:
          return b.creado_en.localeCompare(a.creado_en);
      }
    });
    return lista;
  }, [documentos, busqueda, tipoFiltro, carpetaActual, orden]);

  const esVisualizable = (doc: Documento) =>
    doc.tipo === 'pdf' || doc.tipo === 'imagen' || /\.(pdf|png|jpg|jpeg|gif|webp|svg)$/i.test(doc.nombre);

  const ejecutarBorrado = () => {
    if (docAEliminar) {
      onDelete(docAEliminar);
      setDocAEliminar(null);
    }
  };

  const abrirRenombrar = (doc: Documento) => {
    setDocARenombrar(doc);
    setNuevoNombre(doc.nombre);
  };

  const guardarNombre = () => {
    const limpio = nuevoNombre.trim();
    if (docARenombrar && limpio && limpio !== docARenombrar.nombre) {
      onRename(docARenombrar, limpio);
    }
    setDocARenombrar(null);
  };

  const guardarCarpeta = () => {
    const limpio = nombreCarpeta.trim();
    if (limpio) onCrearCarpeta(limpio);
    setNombreCarpeta('');
    setCreandoCarpeta(false);
  };

  const tituloCarpeta =
    carpetaActual === 'todas' ? 'Todos los documentos' : carpetaActual === '__sin__' ? 'Sin carpeta' : carpetaActual;

  /** Botones de acciones de un documento */
  const Acciones: React.FC<{ doc: Documento }> = ({ doc }) => {
    const esMio = doc.subido_por === currentUserId || esAdmin;
    return (
      <div className="flex items-center gap-0.5">
        {esVisualizable(doc) && (
          <button onClick={() => onPreview(doc)} className={BTN_ICONO} title="Vista previa">
            <Eye className="w-4 h-4" />
          </button>
        )}
        <button onClick={() => onDownload(doc)} className={BTN_ICONO} title="Descargar">
          <Download className="w-4 h-4" />
        </button>
        {esMio && (
          <>
            <button onClick={() => abrirRenombrar(doc)} className={BTN_ICONO} title="Cambiar nombre">
              <Pencil className="w-4 h-4" />
            </button>
            <button onClick={() => setDocAMover(doc)} className={BTN_ICONO} title="Mover a carpeta">
              <FolderInput className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDocAEliminar(doc)}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              title="Borrar documento"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    );
  };

  const chipBase =
    'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors shrink-0 lg:w-full';
  const chipActivo = 'bg-indigo-600 text-white shadow-sm';
  const chipInactivo = 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800';

  const Chip: React.FC<{ activo: boolean; onClick: () => void; icono: React.ReactNode; texto: string; n: number }> = ({
    activo,
    onClick,
    icono,
    texto,
    n,
  }) => (
    <button onClick={onClick} className={`${chipBase} ${activo ? chipActivo : chipInactivo}`}>
      {icono}
      <span className="truncate lg:flex-1 lg:text-left">{texto}</span>
      <span className={`text-xs tabular-nums ${activo ? 'text-indigo-100' : 'text-slate-400'}`}>{n}</span>
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { icono: <Files className="w-5 h-5" />, valor: String(resumen.cantidad), etiqueta: 'Documentos' },
          { icono: <HardDrive className="w-5 h-5" />, valor: formatearTamano(resumen.total), etiqueta: 'Espacio usado' },
          { icono: <UserRound className="w-5 h-5" />, valor: String(resumen.mios), etiqueta: 'Subidos por mí' },
        ].map((t) => (
          <div
            key={t.etiqueta}
            className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-sm"
          >
            <div className="hidden sm:flex p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              {t.icono}
            </div>
            <div className="min-w-0">
              <div className="text-base sm:text-lg font-bold tabular-nums truncate">{t.valor}</div>
              <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">{t.etiqueta}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Carpetas */}
        <aside className="w-full lg:w-60 shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-sm">
          <div className="hidden lg:flex items-center justify-between px-2 pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Carpetas
            </span>
            <button
              onClick={() => setCreandoCarpeta(true)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Nueva carpeta"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
            <Chip
              activo={carpetaActual === 'todas'}
              onClick={() => onCarpetaChange('todas')}
              icono={<Files className="w-4 h-4 shrink-0" />}
              texto="Todos"
              n={documentos.length}
            />
            <Chip
              activo={carpetaActual === '__sin__'}
              onClick={() => onCarpetaChange('__sin__')}
              icono={<FolderOpen className="w-4 h-4 shrink-0" />}
              texto="Sin carpeta"
              n={conteo.sin}
            />
            {carpetas.map((c) => (
              <Chip
                key={c}
                activo={carpetaActual === c}
                onClick={() => onCarpetaChange(c)}
                icono={<Folder className="w-4 h-4 shrink-0" />}
                texto={c}
                n={conteo.porCarpeta[c] || 0}
              />
            ))}
            <button
              onClick={() => setCreandoCarpeta(true)}
              className={`${chipBase} ${chipInactivo} lg:hidden`}
            >
              <FolderPlus className="w-4 h-4" /> Nueva
            </button>
          </div>

          {creandoCarpeta && (
            <div className="mt-2 flex items-center gap-1.5">
              <input
                autoFocus
                value={nombreCarpeta}
                onChange={(e) => setNombreCarpeta(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') guardarCarpeta();
                  if (e.key === 'Escape') {
                    setCreandoCarpeta(false);
                    setNombreCarpeta('');
                  }
                }}
                placeholder="Nombre de la carpeta"
                maxLength={40}
                className="min-w-0 flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
              <button onClick={guardarCarpeta} className={BTN_ICONO} title="Crear">
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setCreandoCarpeta(false);
                  setNombreCarpeta('');
                }}
                className={BTN_ICONO}
                title="Cancelar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </aside>

        {/* Contenido */}
        <div className="flex-1 min-w-0 w-full space-y-4">
          {/* Barra de búsqueda y controles */}
          <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar documentos por nombre..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={tipoFiltro}
                onChange={(e) => setTipoFiltro(e.target.value as TipoFiltro)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="todos">Todos los tipos</option>
                <option value="pdf">PDF</option>
                <option value="word">Word</option>
                <option value="excel">Excel</option>
                <option value="imagen">Imágenes</option>
                <option value="otro">Otros</option>
              </select>

              <select
                value={orden}
                onChange={(e) => setOrden(e.target.value as Orden)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                title="Ordenar por"
              >
                <option value="recientes">Más recientes</option>
                <option value="antiguos">Más antiguos</option>
                <option value="nombre">Nombre (A-Z)</option>
                <option value="tamano">Tamaño (mayor)</option>
              </select>

              <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                {([
                  ['tarjetas', <LayoutGrid key="g" className="w-4 h-4" />, 'Tarjetas'],
                  ['tabla', <Rows3 key="t" className="w-4 h-4" />, 'Tabla'],
                ] as const).map(([v, ic, titulo]) => (
                  <button
                    key={v}
                    onClick={() => cambiarVista(v)}
                    title={titulo}
                    className={`p-2 rounded-lg transition-colors ${
                      vista === v
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    {ic}
                  </button>
                ))}
              </div>

              <button
                onClick={onRefresh}
                disabled={cargando}
                className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-medium transition-colors shrink-0"
                title="Actualizar lista"
              >
                <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Actualizar</span>
              </button>
            </div>
          </div>

          <div className="flex items-baseline justify-between px-1">
            <h3 className="font-semibold text-slate-900 dark:text-white">{tituloCarpeta}</h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {documentosFiltrados.length} {documentosFiltrados.length === 1 ? 'documento' : 'documentos'}
            </span>
          </div>

          {/* Resultados */}
          {cargando && documentos.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
              Cargando documentos...
            </div>
          ) : documentosFiltrados.length === 0 ? (
            <div className="text-center py-16 space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
              <FolderOpen className="mx-auto w-12 h-12 text-slate-300 dark:text-slate-700" />
              <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">No hay documentos aquí</p>
              <p className="text-xs text-slate-400">
                Prueba con otra búsqueda, otra carpeta o sube un archivo nuevo.
              </p>
            </div>
          ) : vista === 'tarjetas' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {documentosFiltrados.map((doc) => {
                const est = estiloDe(doc.tipo);
                const mini = miniaturas[doc.id];
                const esMio = doc.subido_por === currentUserId;
                return (
                  <article
                    key={doc.id}
                    className="group flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-800 transition-all"
                  >
                    <button
                      onClick={() => (esVisualizable(doc) ? onPreview(doc) : onDownload(doc))}
                      className={`relative h-36 flex items-center justify-center bg-gradient-to-br ${est.fondo} overflow-hidden`}
                      title={esVisualizable(doc) ? 'Ver vista previa' : 'Descargar'}
                    >
                      {mini ? (
                        <img
                          src={mini}
                          alt={doc.nombre}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        est.icono
                      )}
                      <span className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-white/90 dark:bg-slate-900/80 text-[10px] font-semibold rounded-md text-slate-700 dark:text-slate-200">
                        {est.etiqueta}
                      </span>
                      {esMio && (
                        <span className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-semibold rounded-md">
                          Mío
                        </span>
                      )}
                    </button>

                    <div className="p-4 flex-1 flex flex-col gap-1">
                      <h4 className="font-semibold text-sm text-slate-900 dark:text-white truncate" title={doc.nombre}>
                        {doc.nombre}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        {formatearTamano(doc.tamano)} · {formatearFecha(doc.creado_en)}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{doc.subido_por_email}</p>
                      {doc.carpeta && carpetaActual === 'todas' && (
                        <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-300">
                          <Folder className="w-3 h-3" /> {doc.carpeta}
                        </p>
                      )}
                    </div>

                    <div className="px-2 pb-2 flex justify-end border-t border-slate-100 dark:border-slate-800 pt-1.5">
                      <Acciones doc={doc} />
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      <th className="py-3.5 px-5">Documento</th>
                      <th className="py-3.5 px-5">Tamaño</th>
                      <th className="py-3.5 px-5">Subido por</th>
                      <th className="py-3.5 px-5">Fecha</th>
                      <th className="py-3.5 px-5 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                    {documentosFiltrados.map((doc) => {
                      const est = estiloDe(doc.tipo);
                      const esMio = doc.subido_por === currentUserId;
                      return (
                        <tr key={doc.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${est.fondo} flex items-center justify-center overflow-hidden shrink-0 [&>svg]:w-5 [&>svg]:h-5`}>
                                {miniaturas[doc.id] ? (
                                  <img src={miniaturas[doc.id]} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  est.icono
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[260px]">
                                    {doc.nombre}
                                  </span>
                                  {esMio && (
                                    <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold rounded-md shrink-0">
                                      Mío
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                  {est.etiqueta}
                                  {doc.carpeta ? ` · ${doc.carpeta}` : ''}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-5 text-slate-600 dark:text-slate-400 text-xs tabular-nums">
                            {formatearTamano(doc.tamano)}
                          </td>
                          <td className="py-3.5 px-5 text-slate-600 dark:text-slate-400 text-xs truncate max-w-[180px]">
                            {doc.subido_por_email}
                          </td>
                          <td className="py-3.5 px-5 text-slate-600 dark:text-slate-400 text-xs tabular-nums whitespace-nowrap">
                            {formatearFecha(doc.creado_en)}
                          </td>
                          <td className="py-3.5 px-5 whitespace-nowrap">
                            <div className="flex justify-end">
                              <Acciones doc={doc} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmar borrado */}
      {docAEliminar && (
        <Modal onClose={() => setDocAEliminar(null)}>
          <div className="flex items-center gap-3 text-rose-600">
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 rounded-2xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">¿Eliminar documento?</h3>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Estás a punto de eliminar permanentemente{' '}
            <strong className="text-slate-900 dark:text-white">{docAEliminar.nombre}</strong>. Esta acción no se puede
            deshacer.
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setDocAEliminar(null)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={ejecutarBorrado}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
            >
              Sí, eliminar
            </button>
          </div>
        </Modal>
      )}

      {/* Cambiar nombre */}
      {docARenombrar && (
        <Modal onClose={() => setDocARenombrar(null)}>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Cambiar nombre</h3>
          <input
            autoFocus
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && guardarNombre()}
            maxLength={150}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setDocARenombrar(null)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={guardarNombre}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
            >
              Guardar
            </button>
          </div>
        </Modal>
      )}

      {/* Mover a carpeta */}
      {docAMover && (
        <Modal onClose={() => setDocAMover(null)}>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Mover a carpeta</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{docAMover.nombre}</p>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {[null, ...carpetas].map((c) => {
              const actual = (docAMover.carpeta || null) === c;
              return (
                <button
                  key={c ?? '__sin__'}
                  onClick={() => {
                    if (!actual) onMove(docAMover, c);
                    setDocAMover(null);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left transition-colors ${
                    actual
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {c ? <Folder className="w-4 h-4" /> : <FolderOpen className="w-4 h-4" />}
                  <span className="flex-1 truncate">{c ?? 'Sin carpeta'}</span>
                  {actual && <Check className="w-4 h-4" />}
                </button>
              );
            })}
          </div>
          {carpetas.length === 0 && (
            <p className="text-xs text-slate-500">Aún no tienes carpetas. Crea una con el botón de la izquierda.</p>
          )}
        </Modal>
      )}
    </div>
  );
};
