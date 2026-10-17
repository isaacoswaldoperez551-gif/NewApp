/**
 * Componente para subir archivos con soporte de arrastrar y soltar, múltiples archivos y límite de 50MB.
 */
import React, { useState, useRef } from 'react';
import { supabase } from '../supabase';
import { limpiarNombre, clasificarTipo } from '../utils';
import { Upload, FileUp, X, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface UploadSectionProps {
  userId: string;
  userEmail: string;
  carpeta?: string | null;
  onUploadComplete: () => void;
  addToast: (mensaje: string, tipo?: 'success' | 'error' | 'info') => void;
}

interface ArchivoSubiendo {
  file: File;
  progreso: number;
  estado: 'subiendo' | 'completado' | 'error';
  errorMsg?: string;
}

export const UploadSection: React.FC<UploadSectionProps> = ({
  userId,
  userEmail,
  carpeta = null,
  onUploadComplete,
  addToast,
}) => {
  const [arrastrando, setArrastrando] = useState(false);
  const [archivosActivos, setArchivosActivos] = useState<ArchivoSubiendo[]>([]);
  const [subiendoGeneral, setSubiendoGeneral] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

  const procesarArchivos = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const nuevosArchivos: ArchivoSubiendo[] = fileArray.map((file) => ({
      file,
      progreso: 0,
      estado: 'subiendo',
    }));

    setArchivosActivos((prev) => [...prev, ...nuevosArchivos]);
    setSubiendoGeneral(true);

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const indexActual = archivosActivos.length + i;

      // Verificar tamaño máximo 50 MB
      if (file.size > MAX_SIZE_BYTES) {
        actualizarEstadoArchivo(indexActual, 'error', 'Supera el límite de 50 MB.');
        addToast(`El archivo "${file.name}" supera los 50 MB permitidos.`, 'error');
        continue;
      }

      try {
        // Limpiar nombre de archivo
        const nombreLimpio = limpiarNombre(file.name);
        const rutaStorage = `${userId}/${Date.now()}_${nombreLimpio}`;
        const tipoClasificado = clasificarTipo(file.type, file.name);

        actualizarProgresoArchivo(indexActual, 30);

        // 1. Guardar en Storage (bucket PRIVADO "documentos")
        const { error: storageError } = await supabase.storage
          .from('documentos')
          .upload(rutaStorage, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (storageError) {
          throw new Error(`Error en Storage: ${storageError.message}`);
        }

        actualizarProgresoArchivo(indexActual, 70);

        // 2. Insertar fila en la tabla public.documentos
        const { error: dbError } = await supabase.from('documentos').insert({
          nombre: file.name,
          ruta: rutaStorage,
          tamano: file.size,
          tipo: tipoClasificado,
          subido_por: userId,
          subido_por_email: userEmail,
          ...(carpeta ? { carpeta } : {}),
        });

        if (dbError) {
          // Rollback: si falla la inserción en tabla, borrar el archivo de Storage
          await supabase.storage.from('documentos').remove([rutaStorage]);
          throw new Error(`Error en base de datos: ${dbError.message}`);
        }

        actualizarProgresoArchivo(indexActual, 100);
        actualizarEstadoArchivo(indexActual, 'completado');
        addToast(`"${file.name}" subido correctamente.`, 'success');
      } catch (err: any) {
        console.error('Error al subir archivo:', err);
        actualizarEstadoArchivo(indexActual, 'error', err?.message || 'Error desconocido');
        addToast(`Error al subir "${file.name}": ${err?.message || 'Error desconocido'}`, 'error');
      }
    }

    setSubiendoGeneral(false);
    onUploadComplete();
  };

  const actualizarProgresoArchivo = (index: number, progreso: number) => {
    setArchivosActivos((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, progreso } : item))
    );
  };

  const actualizarEstadoArchivo = (
    index: number,
    estado: 'subiendo' | 'completado' | 'error',
    errorMsg?: string
  ) => {
    setArchivosActivos((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, estado, errorMsg } : item))
    );
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setArrastrando(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setArrastrando(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setArrastrando(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      procesarArchivos(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      procesarArchivos(e.target.files);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const limpiarLista = () => {
    setArchivosActivos([]);
  };

  return (
    <div className="space-y-4">
      {/* Zona de Arrastrar y Soltar */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
          arrastrando
            ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30'
            : 'border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 bg-white dark:bg-slate-900'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          className="hidden"
        />
        <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 shadow-sm">
          <FileUp className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
          Haz clic para subir o arrastra tus archivos aquí
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          PDF, Word, Excel, imágenes u otros (máximo 50 MB por archivo)
        </p>
      </div>

      {/* Lista de progreso de subida de archivos */}
      {archivosActivos.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Estado de Subida
            </span>
            {!subiendoGeneral && (
              <button
                onClick={limpiarLista}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
              >
                Limpiar lista
              </button>
            )}
          </div>

          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
            {archivosActivos.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {item.estado === 'subiendo' && (
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600 shrink-0" />
                  )}
                  {item.estado === 'completado' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                  {item.estado === 'error' && (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                    {item.file.name}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {item.estado === 'subiendo' && (
                    <span className="text-slate-500">{item.progreso}%</span>
                  )}
                  {item.estado === 'completado' && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      Completado
                    </span>
                  )}
                  {item.estado === 'error' && (
                    <span className="text-rose-600 dark:text-rose-400 font-medium" title={item.errorMsg}>
                      Error
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
