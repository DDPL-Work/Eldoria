import React from 'react';
import { useFiles } from '../../context/FileContext';

export function Lightbox({ fileId, onClose }) {
  const { fileGet } = useFiles();
  if (!fileId) return null;

  const f = fileGet(fileId);

  return (
    <div
      role="dialog"
      aria-label="Document preview"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col p-4 border border-slate-700/30"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="font-bold text-slate-800 text-sm truncate max-w-md">
            {f?.name || 'Document preview'}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
          >
            Close
          </button>
        </div>

        <div className="flex items-center justify-center p-4 overflow-auto max-h-[calc(90vh-100px)]">
          {!f ? (
            <div className="text-slate-500 py-12">Loading preview…</div>
          ) : f.missing ? (
            <div className="text-red-500 py-12">This file could not be loaded.</div>
          ) : f.type?.startsWith('image/') ? (
            <img
              src={f.data}
              alt={f.name || 'Preview'}
              className="max-h-[75vh] w-auto object-contain rounded-lg"
            />
          ) : (
            <div className="text-center py-12 px-8">
              <p className="font-bold text-slate-800 mb-2">{f.name}</p>
              <p className="text-xs text-slate-500 mb-4">PDF Document ({Math.round(f.size / 1024)} KB)</p>
              <a
                href={f.data}
                target="_blank"
                rel="noopener noreferrer"
                download={f.name}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm transition"
              >
                Open or Download PDF
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
