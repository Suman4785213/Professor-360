import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { Document as DocumentType } from '../../types';
import { Button } from './Button';
import {
  FileText,
  Download,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';

interface DocumentPreviewViewerProps {
  document?: DocumentType | null;
  className?: string;
  showMetadata?: boolean;
}

export const DocumentPreviewViewer: React.FC<DocumentPreviewViewerProps> = ({
  document,
  className = '',
  showMetadata = true,
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;

    if (!document || !document.id) {
      setBlobUrl(null);
      setError(null);
      return;
    }

    const loadDocumentBlob = async () => {
      setLoading(true);
      setError(null);
      try {
        const previewEndpoint = document.preview_url || `/api/documents/${document.id}/preview/`;
        const res = await apiClient.get(previewEndpoint, {
          responseType: 'blob',
        });

        if (active) {
          const contentTypeHeader = res.headers['content-type'];
          const mime = (typeof contentTypeHeader === 'string' ? contentTypeHeader : null) || document.mime_type || 'application/pdf';
          const blob = new Blob([res.data], { type: mime });
          createdUrl = URL.createObjectURL(blob);
          setBlobUrl(createdUrl);
        }
      } catch (err: any) {
        if (active) {
          console.error('Failed to load document preview:', err);
          setError(
            err.response?.status === 403
              ? 'Access denied: You do not have permission to view this department/faculty certificate.'
              : err.response?.status === 404
              ? 'Certificate file was not found in storage.'
              : 'Failed to load certificate preview.'
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadDocumentBlob();

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [document?.id]);

  const handleDownload = async () => {
    if (!document) return;
    try {
      const downloadEndpoint = document.download_url || `/api/documents/${document.id}/download/`;
      const res = await apiClient.get(downloadEndpoint, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([res.data]));
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.original_filename || document.file_name || 'certificate.pdf';
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const handleOpenInNewTab = () => {
    if (blobUrl) {
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (!document) {
    return (
      <div className={`p-12 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 ${className}`}>
        <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
        <p className="text-xs font-semibold text-slate-600">No certificate attached</p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          No document file was submitted with this activity record.
        </p>
      </div>
    );
  }

  const isImage =
    document.mime_type?.startsWith('image/') ||
    /\.(jpg|jpeg|png|webp|gif)$/i.test(document.file_name || '');

  return (
    <div className={`flex flex-col rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-xs ${className}`}>
      {/* Header bar */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-brand-600 shrink-0" />
          <span className="text-xs font-bold text-slate-800 truncate" title={document.original_filename || document.file_name}>
            {document.original_filename || document.file_name}
          </span>
          <span className="text-[10px] bg-slate-200/80 text-slate-600 font-mono px-2 py-0.5 rounded-full font-bold">
            {Math.round((document.file_size || 0) / 1024)} KB
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isImage && (
            <>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(50, z - 20))}
                title="Zoom out"
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-200/60 transition"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono text-slate-500 min-w-[32px] text-center">
                {zoomLevel}%
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(200, z + 20))}
                title="Zoom in"
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-200/60 transition"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {blobUrl && (
            <button
              type="button"
              onClick={handleOpenInNewTab}
              title="Open full view in new tab"
              className="p-1.5 text-slate-500 hover:text-brand-600 rounded-lg hover:bg-brand-50 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={handleDownload}
            className="text-xs py-1 px-2.5 h-7"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            Download
          </Button>
        </div>
      </div>

      {/* Preview content area */}
      <div className="relative min-h-[360px] max-h-[560px] bg-slate-900/95 flex items-center justify-center overflow-auto p-2">
        {loading && (
          <div className="flex flex-col items-center gap-2 text-slate-300 py-16">
            <RefreshCw className="w-7 h-7 animate-spin text-brand-400" />
            <span className="text-xs font-semibold">Loading secure certificate preview...</span>
          </div>
        )}

        {error && !loading && (
          <div className="p-6 text-center max-w-md">
            <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-rose-300">{error}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
              className="mt-3 text-xs text-white border-slate-700 hover:bg-slate-800"
            >
              <Download className="w-3 h-3 mr-1.5" /> Try Direct Download
            </Button>
          </div>
        )}

        {blobUrl && !loading && !error && (
          <>
            {isImage ? (
              <div className="overflow-auto max-h-[540px] flex items-center justify-center w-full">
                <img
                  src={blobUrl}
                  alt={document.file_name}
                  style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'center center' }}
                  className="max-h-[520px] max-w-full object-contain rounded transition-transform"
                />
              </div>
            ) : (
              <iframe
                src={blobUrl}
                title={document.file_name}
                className="w-full h-[520px] rounded border-0 bg-white"
              />
            )}
          </>
        )}
      </div>

      {/* Metadata footer */}
      {showMetadata && (
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>SHA-256 Checksum:</span>
            <span className="font-mono text-slate-700 truncate max-w-[200px]" title={document.file_hash}>
              {document.file_hash ? document.file_hash : 'Computed on ingest'}
            </span>
          </div>
          <div>
            Uploaded: <span className="font-semibold text-slate-700">{new Date(document.uploaded_at || Date.now()).toLocaleDateString()}</span>
          </div>
        </div>
      )}
    </div>
  );
};
