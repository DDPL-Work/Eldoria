import React, { useState } from 'react';
import { useFiles } from '../../context/FileContext';
import { getStaffDocumentViewUrl } from '../../services/api';
import { openDocument } from '../../services/documentViewer';
import { Icon } from '../../constants/icons';

export function Lightbox({ fileId, onClose }) {
  const { fileGet } = useFiles();
  const [loadError, setLoadError] = useState(false);
  const [isDummyPixel, setIsDummyPixel] = useState(false);

  if (!fileId) return null;

  // Resolve file metadata whether passed as an object, a cache key, or a URL
  let f = typeof fileId === 'object' && fileId !== null ? fileId : fileGet(fileId);

  if (!f && typeof fileId === 'string' && (fileId.startsWith('http') || fileId.startsWith('data:'))) {
    f = {
      id: fileId,
      data: fileId,
      url: fileId,
      name: 'Document Preview',
      type: fileId.toLowerCase().includes('.pdf') ? 'application/pdf' : 'image/jpeg',
    };
  }

  const fileSrc = f?.data || f?.url || '';
  const fileName = f?.name || f?.filename || 'Document Preview';

  // Determine if it's a PDF or an Image
  const isPdf = Boolean(
    f?.type === 'application/pdf' ||
    f?.isPdf ||
    /\.(pdf)($|\?|#)/i.test(fileSrc) ||
    /\.(pdf)($|\?|#)/i.test(fileName)
  );

  const isImg =
    !isPdf &&
    Boolean(
      f?.type?.startsWith('image/') ||
      f?.isImage ||
      /\.(jpeg|jpg|gif|png|webp|avif|svg)($|\?|#)/i.test(fileSrc) ||
      /\.(jpeg|jpg|gif|png|webp|avif|svg)($|\?|#)/i.test(fileName) ||
      fileSrc?.startsWith('data:image/') ||
      (/cloudinary\.com/i.test(fileSrc) && !/(\.pdf|\/raw\/)/i.test(fileSrc))
    );

  // Generate stream URL and download URL via backend GET /api/v1/staff/document/view
  const needsBackendStream =
    Boolean(fileSrc && (fileSrc.startsWith('http') || f?.publicId || (f?.staffId && f?.fileKey)));

  const streamUrl = needsBackendStream
    ? getStaffDocumentViewUrl({
        url: fileSrc && fileSrc.startsWith('http') ? fileSrc : undefined,
        publicId: f?.publicId,
        staffId: f?.staffId,
        fileKey: f?.fileKey,
        filename: fileName,
        format: isPdf ? 'pdf' : undefined,
      })
    : fileSrc;

  const downloadUrl = needsBackendStream
    ? getStaffDocumentViewUrl({
        url: fileSrc && fileSrc.startsWith('http') ? fileSrc : undefined,
        publicId: f?.publicId,
        staffId: f?.staffId,
        fileKey: f?.fileKey,
        filename: fileName,
        download: true,
      })
    : fileSrc;

  return (
    <div
      role="dialog"
      aria-label="Document preview"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-5 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-slate-700/30"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5 min-w-0 pr-3">
            <span
              className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                isPdf ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-[#0E2F5A]'
              }`}
            >
              {isPdf ? 'PDF' : isImg ? 'IMAGE' : 'DOC'}
            </span>
            <div className="font-bold text-slate-800 text-xs sm:text-sm truncate">
              {fileName}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {streamUrl && (
              <button
                type="button"
                onClick={() => openDocument(streamUrl)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-[#0E2F5A] hover:bg-slate-50 text-xs font-semibold shadow-2xs transition cursor-pointer"
                title="Open in new tab"
              >
                <Icon name="external" size={14} />
                <span className="hidden sm:inline">Open full</span>
              </button>
            )}

            {downloadUrl && (
              <a
                href={downloadUrl}
                download={fileName}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0E2F5A] hover:bg-[#091f3b] text-white text-xs font-bold shadow-2xs transition"
                title="Download file"
              >
                <Icon name="download" size={14} />
                <span className="hidden sm:inline">Download</span>
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-slate-200/80 hover:bg-slate-300 text-slate-700 text-xs font-bold transition cursor-pointer"
              title="Close"
            >
              <span className="hidden sm:inline">Close</span>
              <span className="sm:hidden text-sm leading-none font-black">✕</span>
            </button>
          </div>
        </div>

        {/* Preview Canvas */}
        <div className="flex items-center justify-center p-3 sm:p-5 overflow-auto max-h-[calc(92vh-80px)] bg-slate-100/50">
          {!f || !fileSrc ? (
            <div className="text-slate-500 py-16 text-center text-xs font-medium">
              No document data available to preview.
            </div>
          ) : f.missing || loadError ? (
            <div className="text-center py-14 space-y-3">
              <div className="text-red-500 text-sm font-bold">This document could not be previewed inline.</div>
              {streamUrl && (
                <a
                  href={streamUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0E2F5A] text-white text-xs font-bold transition shadow-xs"
                >
                  <Icon name="external" size={14} />
                  <span>Try Opening via Backend Stream</span>
                </a>
              )}
            </div>
          ) : isPdf ? (
            <div className="w-full flex flex-col items-center">
              <iframe
                src={streamUrl}
                title={fileName}
                className="w-full h-[72vh] rounded-xl border border-slate-200 bg-white shadow-xs"
                onError={() => setLoadError(true)}
              />
              <div className="mt-2 text-center text-[11px] text-slate-500">
                PDF not rendering?{' '}
                <button
                  type="button"
                  onClick={() => openDocument(streamUrl)}
                  className="text-[#0E2F5A] font-bold underline cursor-pointer"
                >
                  Open in browser tab
                </button>{' '}
                or{' '}
                <a
                  href={downloadUrl}
                  download={fileName}
                  className="text-[#0E2F5A] font-bold underline"
                >
                  Download PDF
                </a>
              </div>
            </div>
          ) : isImg ? (
            <div className="w-full flex flex-col items-center justify-center">
              {isDummyPixel ? (
                <div className="text-center py-12 px-6 space-y-3 bg-white rounded-2xl border border-slate-200 shadow-2xs max-w-md">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
                    <Icon name="user" size={28} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{fileName}</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                      This photo is a 1×1 test placeholder image uploaded during app registration testing.
                    </p>
                  </div>
                  {streamUrl && (
                    <div className="pt-2">
                      <a
                        href={streamUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                      >
                        <Icon name="external" size={13} />
                        <span>Open raw file</span>
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <img
                  src={streamUrl || fileSrc}
                  alt={fileName}
                  onLoad={(e) => {
                    if (e.currentTarget.naturalWidth <= 2 && e.currentTarget.naturalHeight <= 2) {
                      setIsDummyPixel(true);
                    }
                  }}
                  onError={(e) => {
                    if (fileSrc && e.currentTarget.src !== fileSrc) {
                      e.currentTarget.src = fileSrc;
                    } else {
                      setLoadError(true);
                    }
                  }}
                  className="max-h-[76vh] w-auto max-w-full object-contain rounded-xl shadow-xs"
                />
              )}
            </div>
          ) : (
            <div className="text-center py-14 px-6 space-y-3 bg-white rounded-xl border border-slate-200 shadow-2xs max-w-md">
              <div className="w-12 h-12 rounded-2xl bg-[#E4ECF7] text-[#0E2F5A] mx-auto flex items-center justify-center">
                <Icon name="fileText" size={24} />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">{fileName}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {f.size ? `${Math.round(f.size / 1024)} KB · ` : ''}File preview
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <a
                  href={streamUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition shadow-2xs"
                >
                  <Icon name="external" size={14} />
                  <span>View Full</span>
                </a>
                <a
                  href={downloadUrl}
                  download={fileName}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0E2F5A] hover:bg-[#091f3b] text-white text-xs font-bold transition shadow-xs"
                >
                  <Icon name="download" size={14} />
                  <span>Download</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
