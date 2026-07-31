'use client';

import { FormEvent, useMemo, useRef, useState } from 'react';
import { Download, Paperclip, Send } from 'lucide-react';
import {
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

function senderName(sender: ChatConversation['messages'][number]['sender']) {
  return [sender.firstName, sender.lastName].filter(Boolean).join(' ') || sender.email;
}

export function ChatPanel({ conversation, endpoint, emptyText, onConversationChange }: ChatPanelProps) {
  const currentUser = getStoredAdminUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  const messages = useMemo(() => conversation?.messages ?? [], [conversation]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!conversation) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const files = formData.getAll('attachments').filter((file) => file instanceof File && file.name);
    if (!body.trim() && files.length === 0) {
      setError('Écrivez un message ou joignez au moins un fichier.');
      return;
    }

    setError('');
    setIsSending(true);

    try {
      const updated = await adminFetch<ChatConversation>(endpoint, {
        method: 'POST',
        body: formData,
      });
      onConversationChange(updated);
      setBody('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : "Le message n'a pas été envoyé.");
    } finally {
      setIsSending(false);
    }
  }

  async function handleDownloadAttachment(id: string, fileName: string) {
    setError('');

    try {
      const token = getAdminToken();
      const response = await fetch(chatAttachmentDownloadUrl(id), {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) throw new Error('Téléchargement impossible.');

      const blob = await response.blob();
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
                      <button
                        className="chat-attachment"
                        type="button"
                        key={attachment.id}
                        onClick={() => handleDownloadAttachment(attachment.id, attachment.originalName)}
                      >
                        <Download size={15} aria-hidden="true" />
                        <span>{attachment.originalName}</span>
                        <small>{Math.ceil(attachment.size / 1024)} Ko</small>
                      </button>
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
        <label className="chat-file-button">
          <Paperclip size={17} aria-hidden="true" />
          <span>Joindre</span>
          <input
            ref={fileInputRef}
            name="attachments"
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            multiple
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
