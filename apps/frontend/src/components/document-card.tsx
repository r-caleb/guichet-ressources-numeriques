'use client';

import { useEffect, useState } from 'react';
import { Download, Eye, FileText, X } from 'lucide-react';
import {
  RequestDocument,
  documentTypeLabel,
  formatDate,
  getAdminToken,
} from '@/lib/admin-api';

type DocumentCardProps = {
  document: RequestDocument;
  downloadUrl: string;
  onDownload: (documentId: string, fileName: string) => void;
  showDate?: boolean;
};

function isPreviewable(mimeType: string) {
  return mimeType === 'application/pdf' || mimeType.startsWith('image/');
}

function formatSize(size: number) {
  return `${Math.ceil(size / 1024)} Ko`;
}

export function DocumentCard({ document, downloadUrl, onDownload, showDate = false }: DocumentCardProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewError, setPreviewError] = useState('');
  const canPreview = isPreviewable(document.mimeType);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function togglePreview() {
    if (!canPreview) return;

    if (isPreviewOpen) {
      setIsPreviewOpen(false);
      return;
    }

    setPreviewError('');
    setIsPreviewOpen(true);

    if (previewUrl) return;

    try {
      const token = getAdminToken();
      const response = await fetch(downloadUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) throw new Error('Aperçu indisponible.');

      setPreviewUrl(URL.createObjectURL(await response.blob()));
    } catch (exception) {
      setPreviewError(exception instanceof Error ? exception.message : 'Aperçu indisponible.');
    }
  }

  return (
    <article className="document-card">
      <div className="document-card-main">
        <div className="document-card-info">
          <span className="document-type-badge">{documentTypeLabel(document.type)}</span>
          <strong>{document.originalName}</strong>
          <small>
            {formatSize(document.size)}
            {showDate ? ` - ${formatDate(document.createdAt)}` : ''}
          </small>
        </div>
        <div className="document-card-actions">
          {canPreview ? (
            <button
              className="icon-action"
              type="button"
              onClick={togglePreview}
              aria-label={`${isPreviewOpen ? 'Fermer' : 'Afficher'} l’aperçu de ${document.originalName}`}
            >
              {isPreviewOpen ? <X size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
            </button>
          ) : null}
          <button
            className="icon-action"
            type="button"
            onClick={() => onDownload(document.id, document.originalName)}
            aria-label={`Télécharger ${document.originalName}`}
          >
            <Download size={17} aria-hidden="true" />
          </button>
        </div>
      </div>

      {isPreviewOpen ? (
        <div className="document-preview-panel">
          {previewError ? <p>{previewError}</p> : null}
          {!previewError && !previewUrl ? <p>Chargement de l’aperçu...</p> : null}
          {previewUrl && document.mimeType.startsWith('image/') ? (
            <img src={previewUrl} alt={`Aperçu de ${document.originalName}`} />
          ) : null}
          {previewUrl && document.mimeType === 'application/pdf' ? (
            <iframe src={previewUrl} title={`Aperçu de ${document.originalName}`} />
          ) : null}
        </div>
      ) : null}

      {!canPreview ? (
        <div className="document-preview-note">
          <FileText size={15} aria-hidden="true" />
          Aperçu réservé aux PDF et images.
        </div>
      ) : null}
    </article>
  );
}
