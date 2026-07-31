'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Inbox, MessageSquare } from 'lucide-react';
import { AdminShell } from '@/components/admin-shell';
import { ChatPanel } from '@/components/chat-panel';
import {
  ChatConversation,
  adminFetch,
  displayMinistryName,
  formatDateTime,
  getAdminToken,
  statusClassName,
  statusLabel,
} from '@/lib/admin-api';

function conversationTitle(conversation: ChatConversation) {
  if (conversation.request) return `${conversation.request.number} - ${conversation.request.platformName}`;
  return conversation.subject ?? 'Conversation générale';
}

function lastMessageText(conversation: ChatConversation) {
  const lastMessage = conversation.messages[0];
  if (!lastMessage) return 'Aucun message.';
  if (lastMessage.body) return lastMessage.body;
  return `${lastMessage.attachments.length} pièce(s) jointe(s)`;
}

export default function AdminMessagesPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState('');

  async function loadConversations(nextSelectedId?: string) {
    const result = await adminFetch<ChatConversation[]>('/chat/admin/conversations');
    setConversations(result);

    const targetId = nextSelectedId || selectedId || result[0]?.id || '';
    setSelectedId(targetId);
    if (targetId) await loadConversationDetail(targetId);
  }

  async function loadConversationDetail(id: string) {
    setIsLoadingDetail(true);
    try {
      setSelectedConversation(await adminFetch<ChatConversation>(`/chat/admin/conversations/${id}`));
    } finally {
      setIsLoadingDetail(false);
    }
  }

  useEffect(() => {
    if (!getAdminToken()) {
      router.replace('/admin/login');
      return;
    }

    setIsLoading(true);
    setError('');
    loadConversations()
      .catch((exception) => {
        setError(exception instanceof Error ? exception.message : 'Chargement impossible.');
      })
      .finally(() => setIsLoading(false));
  }, [router]);

  const openCount = useMemo(
    () => conversations.filter((conversation) => conversation.status === 'OPEN').length,
    [conversations],
  );

  return (
    <AdminShell>
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Messagerie</p>
          <h1>Conversations</h1>
        </div>
        <span className="admin-count">{isLoading ? '...' : `${conversations.length} conversation(s)`}</span>
      </div>

      {error ? <p className="form-alert">{error}</p> : null}

      <section className="admin-summary-strip">
        <div>
          <span>Conversations ouvertes</span>
          <strong>{isLoading ? '...' : openCount}</strong>
        </div>
        <div>
          <span>Type actif</span>
          <strong>Dossiers</strong>
        </div>
        <div>
          <span>Chat général</span>
          <strong>Bientôt</strong>
        </div>
      </section>

      <section className="messages-workspace">
        <aside className="messages-inbox">
          <div className="messages-inbox-header">
            <Inbox size={18} aria-hidden="true" />
            <strong>Boîte de réception</strong>
          </div>
          <div className="messages-list">
            {conversations.map((conversation) => (
              <button
                className={`conversation-item ${conversation.id === selectedId ? 'active' : ''}`}
                key={conversation.id}
                type="button"
                onClick={() => {
                  setSelectedId(conversation.id);
                  loadConversationDetail(conversation.id).catch((exception) => {
                    setError(exception instanceof Error ? exception.message : 'Chargement impossible.');
                  });
                }}
              >
                <span>{conversation.request ? conversation.request.number : 'Conversation générale'}</span>
                <strong>{conversation.request?.platformName ?? conversation.subject ?? 'Question générale'}</strong>
                <small>{lastMessageText(conversation)}</small>
                <em>{formatDateTime(conversation.lastMessageAt ?? conversation.createdAt)}</em>
              </button>
            ))}

            {!isLoading && conversations.length === 0 ? (
              <p className="admin-empty">Aucune conversation pour le moment.</p>
            ) : null}
            {isLoading ? <p className="admin-empty">Chargement des conversations...</p> : null}
          </div>
        </aside>

        <div className="messages-detail">
          {selectedConversation ? (
            <>
              <div className="messages-detail-header">
                <div>
                  <p className="eyebrow">Conversation du dossier</p>
                  <h2>{conversationTitle(selectedConversation)}</h2>
                  {selectedConversation.request ? (
                    <small>{displayMinistryName(selectedConversation.request)}</small>
                  ) : null}
                </div>
                <div className="messages-detail-actions">
                  {selectedConversation.request ? (
                    <Link
                      className="button secondary compact-button"
                      href={`/admin/dossiers/${selectedConversation.request.id}`}
                    >
                      <FileText size={17} aria-hidden="true" />
                      Dossier
                    </Link>
                  ) : null}
                  <span className={statusClassName(selectedConversation.request?.status ?? 'UNDER_REVIEW')}>
                    {selectedConversation.request ? statusLabel(selectedConversation.request.status) : 'Conversation'}
                  </span>
                </div>
              </div>

              {isLoadingDetail ? <p className="admin-empty">Chargement de la conversation...</p> : null}
              <ChatPanel
                conversation={selectedConversation}
                endpoint={`/chat/admin/conversations/${selectedConversation.id}/messages`}
                onConversationChange={(updated) => {
                  setSelectedConversation(updated);
                  loadConversations(updated.id).catch((exception) => {
                    setError(exception instanceof Error ? exception.message : 'Actualisation impossible.');
                  });
                }}
              />
            </>
          ) : (
            <div className="messages-placeholder">
              <MessageSquare size={24} aria-hidden="true" />
              <strong>Sélectionnez une conversation.</strong>
            </div>
          )}
        </div>
      </section>
    </AdminShell>
  );
}
