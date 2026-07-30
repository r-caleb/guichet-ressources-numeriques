'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, MessageSquare, PlusCircle } from 'lucide-react';
import { AdminShell } from '@/components/admin-shell';
import {
  AdminRequestListItem,
  adminFetch,
  displayMinistryName,
  formatDate,
  getAdminToken,
  statusClassName,
  statusLabel,
} from '@/lib/admin-api';

export default function PointFocalDashboardPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<AdminRequestListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getAdminToken()) {
      router.replace('/admin/login');
      return;
    }

    adminFetch<AdminRequestListItem[]>('/requests/me')
      .then(setRequests)
      .catch((exception) => {
        setError(exception instanceof Error ? exception.message : 'Chargement impossible.');
      })
      .finally(() => setIsLoading(false));
  }, [router]);

  const activeCount = useMemo(
    () => requests.filter((request) => !['REJECTED', 'CLOSED'].includes(request.status)).length,
    [requests],
  );

  return (
    <AdminShell>
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Espace Point Focal</p>
          <h1>Mes dossiers</h1>
        </div>
        <Link className="button secondary" href="/">
          <PlusCircle size={18} aria-hidden="true" />
          Nouvelle demande
        </Link>
      </div>

      {error ? <p className="form-alert">{error}</p> : null}

      <section className="admin-summary-strip">
        <div>
          <span>Dossiers rattachés</span>
          <strong>{isLoading ? '...' : requests.length}</strong>
        </div>
        <div>
          <span>Dossiers en cours</span>
          <strong>{isLoading ? '...' : activeCount}</strong>
        </div>
        <div>
          <span>Messagerie</span>
          <strong>Bientôt</strong>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section-title">
          <h2>État d'avancement</h2>
        </div>
        <div className="point-focal-request-list">
          {requests.map((request) => (
            <article className="point-focal-request-card" key={request.id}>
              <div className="point-focal-request-main">
                <FileText size={20} aria-hidden="true" />
                <div>
                  <span>{request.number}</span>
                  <strong>{request.platformName}</strong>
                  <small>{displayMinistryName(request)}</small>
                </div>
              </div>
              <div>
                <span className={statusClassName(request.status)}>{statusLabel(request.status)}</span>
              </div>
              <div>
                <span>Domaine</span>
                <strong>{request.assignedDomain ?? request.domainChoices[0]?.fullDomain ?? 'Non renseigné'}</strong>
              </div>
              <div>
                <span>Date de dépôt</span>
                <strong>{formatDate(request.createdAt)}</strong>
              </div>
              <button className="button secondary compact-button" type="button" disabled>
                <MessageSquare size={17} aria-hidden="true" />
                Chat bientôt
              </button>
            </article>
          ))}

          {!isLoading && requests.length === 0 ? (
            <p className="admin-empty">Aucun dossier n'est encore rattaché à votre compte.</p>
          ) : null}
          {isLoading ? <p className="admin-empty">Chargement de vos dossiers...</p> : null}
        </div>
      </section>
    </AdminShell>
  );
}
