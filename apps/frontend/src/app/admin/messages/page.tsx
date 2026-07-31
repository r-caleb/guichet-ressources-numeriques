'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Inbox, MessageSquare } from 'lucide-react';
import { AdminShell } from '@/components/admin-shell';
import { ChatPanel } from '@/components/chat-panel';
import {
  ChatConversation,
  type UserRole,
  adminFetch,
  displayMinistryName,
  formatDateTime,
  getAdminToken,
  statusClassName,
  statusLabel,
} from '@/lib/admin-api';

type MessageFilter = 'all' | 'needsReply' | 'request' | 'general';

function conversationTitle(conversation: ChatConversation) {
  if (conversation.request) return `${conversation.request.number} - ${conversation.request.platformName}`;
  return conversation.subject ?? 'Conversation générale';
}

function conversationTypeLabel(conversation: ChatConversation) {
  return conversation.type === 'GENERAL' ? 'Conversation générale' : conversation.request?.number ?? 'Dossier';
}

function lastMessageText(conversation: ChatConversation) {
  const lastMessage = conversation.messages[0];
  if (!lastMessage) return 'Aucun message.';
  if (lastMessage.body) return lastMessage.body;
  return `${lastMessage.attachments.length} pièce(s) jointe(s)`;
}

function latestMessageNeedsReply(conversation: ChatConversation) {
  const lastMessage = conversation.messages[0];
  return lastMessage?.sender.roles.includes('POINT_FOCAL' satisfies UserRole) ?? false;
}

export default function AdminMessagesPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [messageFilter, setMessageFilter] = useState<MessageFilter>('all');
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

  const needsReplyCount = useMemo(
    () => conversations.filter((conversation) => latestMessageNeedsReply(conversation)).length,
    [conversations],
  );

  const requestConversationCount = useMemo(
    () => conversations.filter((conversation) => conversation.type === 'REQUEST').length,
    [conversations],
  );

  const generalConversationCount = useMemo(
    () => conversations.filter((conversation) => conversation.type === 'GENERAL').length,
    [conversations],
  );

  const filteredConversations = useMemo(() => {
    if (messageFilter === 'needsReply') {
      return conversations.filter((conversation) => latestMessageNeedsReply(conversation));
    }
    if (messageFilter === 'request') {
      return conversations.filter((conversation) => conversation.type === 'REQUEST');
    }
    if (messageFilter === 'general') {
      return conversations.filter((conversation) => conversation.type === 'GENERAL');
    }
    return conversations;
  }, [conversations, messageFilter]);

  function filterCount(filter: MessageFilter) {
    if (filter === 'needsReply') return needsReplyCount;
    if (filter === 'request') return requestConversationCount;
    if (filter === 'general') return generalConversationCount;
    return conversations.length;
  }

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
          <span>À traiter</span>
          <strong>{isLoading ? '...' : needsReplyCount}</strong>
        </div>
        <div>
          <span>Dossiers</span>
          <strong>{isLoading ? '...' : requestConversationCount}</strong>
        </div>
        <div>
          <span>Questions générales</span>
          <strong>{isLoading ? '...' : generalConversationCount}</strong>
        </div>
      </section>

      <section className="messages-workspace">
        <aside className="messages-inbox">
          <div className="messages-inbox-header">
            <Inbox size={18} aria-hidden="true" />
            <strong>Boîte de réception</strong>
          </div>
          <div className="messages-filterbar" aria-label="Filtres des conversations">
            {[
              { value: 'all', label: 'Toutes' },
              { value: 'needsReply', label: 'À traiter' },
              { value: 'request', label: 'Dossiers' },
              { value: 'general', label: 'Général' },
            ].map((option) => (
              <button
                className={messageFilter === option.value ? 'active' : ''}
                key={option.value}
                type="button"
                onClick={() => setMessageFilter(option.value as MessageFilter)}
              >
                {option.label}
                <span>{isLoading ? '...' : filterCount(option.value as MessageFilter)}</span>
              </button>
            ))}
          </div>
          <div className="messages-list">
            {filteredConversations.map((conversation) => {
              const needsReply = latestMessageNeedsReply(conversation);

              return (
              <button
                className={`conversation-item ${conversation.id === selectedId ? 'active' : ''} ${
                  needsReply ? 'needs-reply' : ''
                }`}
                key={conversation.id}
                type="button"
                onClick={() => {
                  setSelectedId(conversation.id);
                  loadConversationDetail(conversation.id).catch((exception) => {
                    setError(exception instanceof Error ? exception.message : 'Chargement impossible.');
                  });
                }}
              >
                <span className="conversation-item-topline">
                  {conversationTypeLabel(conversation)}
                  {needsReply ? <mark>À traiter</mark> : null}
                </span>
                <strong>{conversation.request?.platformName ?? conversation.subject ?? 'Question générale'}</strong>
                <small>{lastMessageText(conversation)}</small>
                <em>{formatDateTime(conversation.lastMessageAt ?? conversation.createdAt)}</em>
              </button>
              );
            })}

            {!isLoading && filteredConversations.length === 0 ? (
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
                  <p className="eyebrow">
                    {selectedConversation.type === 'GENERAL' ? 'Conversation générale' : 'Conversation du dossier'}
                  </p>
                  <h2>{conversationTitle(selectedConversation)}</h2>
                  {selectedConversation.request ? (
                    <small>{displayMinistryName(selectedConversation.request)}</small>
                  ) : (
                    <small>
                      {[selectedConversation.pointFocalUser.firstName, selectedConversation.pointFocalUser.lastName]
                        .filter(Boolean)
                        .join(' ') || selectedConversation.pointFocalUser.email}
                    </small>
                  )}
                </div>
                <div className="messages-detail-actions">
                  {selectedConversation.request ? (
                    <Link
                      className="button secondary compact-button"
                      href={`/admin/dossiers/${selectedConversation.request.id}#conversation-dossier`}
                    >
                      <FileText size={17} aria-hidden="true" />
                      Dossier
                    </Link>
                  ) : null}
                  {selectedConversation.request ? (
                    <span className={statusClassName(selectedConversation.request.status)}>
                      {statusLabel(selectedConversation.request.status)}
                    </span>
                  ) : (
                    <span className="status status-under-review">Général</span>
                  )}
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
