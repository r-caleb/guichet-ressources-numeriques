'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Clock3, FileText, Inbox, Search } from 'lucide-react';
import { AdminShell } from '@/components/admin-shell';
import {
  AdminRequestListItem,
  DashboardStats,
  PaginatedResponse,
  adminFetch,
  displayMinistryName,
  formatDate,
  getAdminToken,
  statusClassName,
  statusLabel,
} from '@/lib/admin-api';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [requests, setRequests] = useState<AdminRequestListItem[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!getAdminToken()) {
      router.replace('/admin/login');
      return;
    }

    Promise.all([
      adminFetch<DashboardStats>('/admin/stats'),
      adminFetch<PaginatedResponse<AdminRequestListItem>>('/requests/admin?limit=6'),
    ])
      .then(([statsResult, requestsResult]) => {
        setStats(statsResult);
        setRequests(requestsResult.items);
      })
      .catch((exception) => {
        setError(exception instanceof Error ? exception.message : 'Chargement impossible.');
      })
      .finally(() => setIsLoading(false));
  }, [router]);

  const pendingCount = useMemo(
    () =>
      requests.filter((request) =>
        ['RECEIVED', 'UNDER_REVIEW', 'ADDITIONAL_DOCUMENTS_REQUESTED', 'APPROVED'].includes(request.status),
      ).length,
    [requests],
  );
  const recentRequests = requests;

  return (
    <AdminShell>
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Instruction</p>
          <h1>Tableau de bord</h1>
        </div>
        <Link className="button secondary" href="/admin/dossiers">
          <Search size={18} aria-hidden="true" />
          Rechercher un dossier
        </Link>
      </div>

      {error ? <p className="form-alert">{error}</p> : null}

      <div className="dashboard-grid">
        <article className="dashboard-card metric-card">
          <FileText size={21} aria-hidden="true" />
          <span>Total dossiers</span>
          <strong>{isLoading ? '...' : stats?.total ?? 0}</strong>
        </article>
        <article className="dashboard-card metric-card">
          <Inbox size={21} aria-hidden="true" />
          <span>Reçus</span>
          <strong>{isLoading ? '...' : stats?.received ?? 0}</strong>
        </article>
        <article className="dashboard-card metric-card">
          <Clock3 size={21} aria-hidden="true" />
          <span>En instruction</span>
          <strong>{isLoading ? '...' : stats?.underReview ?? 0}</strong>
        </article>
        <article className="dashboard-card metric-card">
          <CheckCircle2 size={21} aria-hidden="true" />
          <span>Clôturés</span>
          <strong>{isLoading ? '...' : stats?.closed ?? 0}</strong>
        </article>
      </div>

      <section className="admin-summary-strip">
        <div>
          <span>Dossiers à traiter</span>
          <strong>{pendingCount}</strong>
        </div>
        <div>
          <span>Attributions effectuées</span>
          <strong>{requests.filter((request) => request.status === 'RESOURCES_ASSIGNED').length}</strong>
        </div>
        <div>
          <span>Demandes rejetées</span>
          <strong>{requests.filter((request) => request.status === 'REJECTED').length}</strong>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section-title">
          <h2>Derniers dossiers reçus</h2>
          <Link href="/admin/dossiers">Voir tout</Link>
        </div>
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Numéro</th>
                <th>Ministère</th>
                <th>Plateforme</th>
                <th>Domaine</th>
                <th>Statut</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentRequests.map((request) => (
                <tr key={request.id}>
                  <td>
                    <Link className="table-link" href={`/admin/dossiers/${request.id}`}>
                      {request.number}
                    </Link>
                  </td>
                  <td>{displayMinistryName(request)}</td>
                  <td>{request.platformName}</td>
                  <td>{request.assignedDomain ?? request.domainChoices[0]?.fullDomain ?? 'Non renseigné'}</td>
                  <td>
                    <span className={statusClassName(request.status)}>{statusLabel(request.status)}</span>
                  </td>
                  <td>{formatDate(request.createdAt)}</td>
                </tr>
              ))}
              {!isLoading && recentRequests.length === 0 ? (
                <tr>
                  <td colSpan={6}>Aucun dossier enregistré pour le moment.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}
