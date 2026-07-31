'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { AdminShell } from '@/components/admin-shell';
import { ChatPanel } from '@/components/chat-panel';
import { ChatConversation, adminFetch, getAdminToken } from '@/lib/admin-api';

export default function PointFocalGeneralMessagesPage() {
  const router = useRouter();
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getAdminToken()) {
      router.replace('/admin/login');
      return;
    }

    adminFetch<ChatConversation>('/chat/general')
      .then(setConversation)
      .catch((exception) => {
        setError(exception instanceof Error ? exception.message : 'Impossible de charger la conversation.');
      })
      .finally(() => setIsLoading(false));
  }, [router]);

  return (
    <AdminShell>
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Espace Point Focal</p>
          <h1>Message général</h1>
        </div>
        <Link className="button secondary" href="/admin/point-focal">
          <ArrowLeft size={18} aria-hidden="true" />
          Retour à mes dossiers
        </Link>
      </div>

      {error ? <p className="form-alert">{error}</p> : null}
      {isLoading ? <p className="admin-empty">Chargement de la conversation...</p> : null}

      <section className="admin-section">
        <div className="admin-section-title">
          <h2>Conversation avec le service</h2>
          <span className="admin-count">
            <MessageSquare size={17} aria-hidden="true" />
            Sans dossier
          </span>
        </div>
        <ChatPanel
          conversation={conversation}
          endpoint="/chat/general/messages"
          emptyText="Aucun message général pour le moment."
          onConversationChange={setConversation}
        />
      </section>
    </AdminShell>
  );
}
