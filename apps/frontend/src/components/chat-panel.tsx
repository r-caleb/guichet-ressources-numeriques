'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Download, ExternalLink, FileText, ImageIcon, Paperclip, Send, X } from 'lucide-react';
import {
  ChatAttachment,
  ChatConversation,
  adminFetch,
  chatAttachmentDownloadUrl,
  formatDateTime,
  getAdminToken,
  getStoredAdminUser,
} from '@/lib/admin-api';

type ChatPanelProps = {
  conversation: ChatConversation | null;
  endpoint: string;
  emptyText?: string;
  onConversationChange: (conversation: ChatConversation) => void;
};

type PendingAttachment = {
  id: string;
  file: File;
  previewUrl: string | null;
};

function senderName(sender: ChatConversation['messages'][number]['sender']) {
  return [sender.firstName, sender.lastName].filter(Boolean).join(' ') || sender.email;
}

function isPreviewableMimeType(mimeType: string) {
  return mimeType.startsWith('image/') || mimeType === 'application/pdf';
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} Ko`;
  return `${(size / (1024 * 1024)).toFixed(1)} Mo`;
}

async function fetchAttachmentBlob(id: string) {
  const token = getAdminToken();
  const response = await fetch(chatAttachmentDownloadUrl(id), {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!response.ok) throw new Error('Fichier indisponible.');
  return response.blob();
}

function SentAttachmentPreview({
  attachment,
  onDownload,
  onError,
}: {
  attachment: ChatAttachment;
  onDownload: (id: string, fileName: string) => void;
  onError: (message: string) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState('');
  const canPreview = isPreviewableMimeType(attachment.mimeType);

  useEffect(() => {
    let objectUrl = '';
    let isMounted = true;

    if (!canPreview) return undefined;

    fetchAttachmentBlob(attachment.id)
      .then((blob) => {
        if (!isMounted) return;
        objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
      })
      .catch(() => {
        if (isMounted) onError("L'aperçu de la pièce jointe est indisponible.");
      });

    return () => {
      isMounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment.id, canPreview, onError]);

  async function handleOpen() {
    try {
      const blob = await fetchAttachmentBlob(attachment.id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (exception) {
      onError(exception instanceof Error ? exception.message : 'Ouverture impossible.');
    }
  }

  return (
    <article className={`chat-attachment-card ${canPreview ? 'previewable' : ''}`}>
      {canPreview && previewUrl ? (
        attachment.mimeType.startsWith('image/') ? (
          <img src={previewUrl} alt={attachment.originalName} />
        ) : (
          <iframe title={attachment.originalName} src={previewUrl} />
        )
      ) : (
        <div className="chat-attachment-placeholder">
          {attachment.mimeType.startsWith('image/') ? (
            <ImageIcon size={22} aria-hidden="true" />
          ) : (
            <FileText size={22} aria-hidden="true" />
          )}
        </div>
      )}
      <div className="chat-attachment-info">
        <strong>{attachment.originalName}</strong>
        <small>{formatFileSize(attachment.size)}</small>
      </div>
      <div className="chat-attachment-actions">
        <button type="button" onClick={handleOpen}>
          <ExternalLink size={15} aria-hidden="true" />
          Ouvrir
        </button>
        <button type="button" onClick={() => onDownload(attachment.id, attachment.originalName)}>
          <Download size={15} aria-hidden="true" />
          Télécharger
        </button>
      </div>
    </article>
  );
}

export function ChatPanel({ conversation, endpoint, emptyText, onConversationChange }: ChatPanelProps) {
  const currentUser = getStoredAdminUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingAttachmentsRef = useRef<PendingAttachment[]>([]);
  const [body, setBody] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  const messages = useMemo(() => conversation?.messages ?? [], [conversation]);

  useEffect(() => {
    pendingAttachmentsRef.current = pendingAttachments;
  }, [pendingAttachments]);

  useEffect(() => {
    return () => {
      pendingAttachmentsRef.current.forEach((attachment) => {
        if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
      });
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!conversation) return;

    if (!body.trim() && pendingAttachments.length === 0) {
      setError('Écrivez un message ou joignez au moins un fichier.');
      return;
    }

    const formData = new FormData();
    formData.append('body', body);
    pendingAttachments.forEach((attachment) => formData.append('attachments', attachment.file));

    setError('');
    setIsSending(true);

    try {
      const updated = await adminFetch<ChatConversation>(endpoint, {
        method: 'POST',
        body: formData,
      });
      onConversationChange(updated);
      setBody('');
      clearPendingAttachments();
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : "Le message n'a pas été envoyé.");
    } finally {
      setIsSending(false);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    const nextAttachments = selectedFiles.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      file,
      previewUrl: isPreviewableMimeType(file.type) ? URL.createObjectURL(file) : null,
    }));

    clearPendingAttachments();
    setPendingAttachments(nextAttachments);
  }

  function clearPendingAttachments() {
    setPendingAttachments((current) => {
      current.forEach((attachment) => {
        if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
      });
      return [];
    });
  }

  function removePendingAttachment(id: string) {
    setPendingAttachments((current) => {
      const removed = current.find((attachment) => attachment.id === id);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      const next = current.filter((attachment) => attachment.id !== id);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return next;
    });
  }

  async function handleDownloadAttachment(id: string, fileName: string) {
    setError('');

    try {
      const blob = await fetchAttachmentBlob(id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Téléchargement impossible.');
    }
  }

  return (
    <section className="chat-panel">
      {error ? <p className="form-alert">{error}</p> : null}
      <div className="chat-thread">
        {messages.map((message) => {
          const isMine = currentUser?.id === message.sender.id || currentUser?.userId === message.sender.id;

          return (
            <article className={`chat-message ${isMine ? 'mine' : ''}`} key={message.id}>
              <div className="chat-bubble">
                <div className="chat-message-meta">
                  <strong>{senderName(message.sender)}</strong>
                  <span>{formatDateTime(message.createdAt)}</span>
                </div>
                {message.body ? <p>{message.body}</p> : null}
                {message.attachments.length ? (
                  <div className="chat-attachments">
                    {message.attachments.map((attachment) => (
                      <SentAttachmentPreview
                        key={attachment.id}
                        attachment={attachment}
                        onDownload={handleDownloadAttachment}
                        onError={setError}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}

        {!messages.length ? (
          <p className="chat-empty">{emptyText ?? 'Aucun message dans cette conversation.'}</p>
        ) : null}
      </div>

      <form className="chat-composer" onSubmit={handleSubmit}>
        <textarea
          className="control"
          name="body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={3000}
          placeholder="Écrire un message..."
        />
        {pendingAttachments.length ? (
          <div className="chat-pending-attachments">
            {pendingAttachments.map((attachment) => (
              <article className="chat-pending-card" key={attachment.id}>
                {attachment.previewUrl && attachment.file.type.startsWith('image/') ? (
                  <img src={attachment.previewUrl} alt={attachment.file.name} />
                ) : (
                  <span>
                    {attachment.file.type.startsWith('image/') ? (
                      <ImageIcon size={18} aria-hidden="true" />
                    ) : (
                      <FileText size={18} aria-hidden="true" />
                    )}
                  </span>
                )}
                <div>
                  <strong>{attachment.file.name}</strong>
                  <small>{formatFileSize(attachment.file.size)}</small>
                </div>
                <button
                  type="button"
                  onClick={() => removePendingAttachment(attachment.id)}
                  aria-label={`Retirer ${attachment.file.name}`}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </article>
            ))}
          </div>
        ) : null}
        <label className="chat-file-button">
          <Paperclip size={17} aria-hidden="true" />
          <span>Joindre</span>
          <input
            ref={fileInputRef}
            name="attachments"
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
            multiple
            onChange={handleFileChange}
          />
        </label>
        <button className="button primary" type="submit" disabled={isSending}>
          <Send size={18} aria-hidden="true" />
          {isSending ? 'Envoi...' : 'Envoyer'}
        </button>
      </form>
    </section>
  );
}
