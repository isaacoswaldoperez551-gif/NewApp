/**
 * Componente Modal para vista previa de PDFs e imágenes
 */
import React from 'react';
import { Documento } from '../types';
import { X, ExternalLink, Download } from 'lucide-react';

interface PreviewModalProps {
  documento: Documento | null;
  signedUrl: string | null;
  onClose: () => void;
  onDownload: (doc: Documento) => void;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
  documento,
  signedUrl,
  onClose,
  onDownload,
}) => {
  if (!documento) return null;

  const esImagen = documento.tipo === 'imagen' || /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(documento.nombre);
  const esPdf = documento.tipo === 'pdf' || /\.pdf$/i.test(documento.nombre);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Cabecera del modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="min-w-0 pr-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white truncate">
              {documento.nombre}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Subido por: {documento.subido_por_email}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onDownload(documento)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-medium transition-colors"
              title="Descargar"
            >
              <Download className="w-4 h-4" />
              <span>Descargar</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenido / Vista previa */}
        <div className="flex-1 overflow-auto p-6 bg-slate-50 dark:bg-slate-950 flex items-center justify-center min-h-[400px]">
          {!signedUrl ? (
            <div className="text-slate-500 text-sm">Generando enlace seguro...</div>
          ) : esImagen ? (
            <img
              src={signedUrl}
              alt={documento.nombre}
              className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-md"
              referrerPolicy="no-referrer"
            />
          ) : esPdf ? (
            <iframe
              src={signedUrl}
              title={documento.nombre}
              className="w-full h-[70vh] rounded-lg border border-slate-200 dark:border-slate-800 bg-white"
            />
          ) : (
            <div className="text-center py-12 space-y-3">
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                La vista previa no está disponible para este tipo de archivo.
              </p>
              <button
                onClick={() => onDownload(documento)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-medium transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Descargar para abrir
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
