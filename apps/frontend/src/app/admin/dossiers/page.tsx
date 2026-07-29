'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, RefreshCw, Search } from 'lucide-react';
import { AdminShell } from '@/components/admin-shell';
import { Ministry, apiFetch } from '@/lib/api';
import {
  AdminRequestListItem,
  PaginatedResponse,
  adminFetch,
  buildAdminQuery,
  displayMinistryName,
  formatDate,
  getAdminToken,
  statusClassName,
  statusLabel,
  statusOptions,
} from '@/lib/admin-api';

type Filters = {
  search: string;
  status: string;
  ministryId: string;
  page: number;
  limit: number;
};

const requestsPerPage = 10;
const initialFilters: Filters = {
  search: '',
  status: '',
  ministryId: '',
  page: 1,
  limit: requestsPerPage,
};

export default function AdminRequestsPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(initialFilters);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [requests, setRequests] = useState<AdminRequestListItem[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: requestsPerPage,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getAdminToken()) {
      router.replace('/admin/login');
      return;
    }

    apiFetch<Ministry[]>('/ministries')
      .then(setMinistries)
      .catch(() => setMinistries([]));
  }, [router]);

  useEffect(() => {
    if (!getAdminToken()) return;

    setIsLoading(true);
    setError('');
    adminFetch<PaginatedResponse<AdminRequestListItem>>(`/requests/admin${buildAdminQuery(appliedFilters)}`)
      .then((result) => {
        setRequests(result.items);
        setPagination({
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        });
      })
      .catch((exception) => {
        setError(exception instanceof Error ? exception.message : 'Impossible de charger les dossiers.');
      })
      .finally(() => setIsLoading(false));
  }, [appliedFilters]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedFilters({ ...filters, page: 1, limit: requestsPerPage });
  }

  function handleReset() {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
  }

  function goToPage(page: number) {
    setAppliedFilters((current) => ({ ...current, page }));
  }

  return (
    <AdminShell>
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Dossiers administratifs</p>
          <h1>Demandes reçues</h1>
        </div>
        <span className="admin-count">{isLoading ? '...' : `${pagination.total} dossier(s)`}</span>
      </div>

      <form className="admin-filter-bar" onSubmit={handleSearch}>
        <label className="field">
          Recherche
          <input
            className="control"
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            placeholder="Numéro, plateforme, Point Focal"
          />
        </label>
        <label className="field">
          Statut
          <select
            className="control"
            value={filters.status}
            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
          >
            <option value="">Tous les statuts</option>
            {statusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Ministère
          <select
            className="control"
            value={filters.ministryId}
            onChange={(event) => setFilters((current) => ({ ...current, ministryId: event.target.value }))}
          >
            <option value="">Tous les ministères</option>
            {ministries.map((ministry) => (
              <option key={ministry.id} value={ministry.id}>
                {ministry.name}
              </option>
            ))}
          </select>
        </label>
        <div className="admin-filter-actions">
          <button className="button secondary" type="button" onClick={handleReset}>
            <RefreshCw size={17} aria-hidden="true" />
            Réinitialiser
          </button>
          <button className="button primary" type="submit">
            <Search size={17} aria-hidden="true" />
            Filtrer
          </button>
        </div>
      </form>

      {error ? <p className="form-alert">{error}</p> : null}

      <div className="table-shell admin-table-shell">
        <table>
          <thead>
            <tr>
              <th>Numéro</th>
              <th>Ministère</th>
              <th>Plateforme</th>
              <th>Domaine</th>
              <th>Statut</th>
              <th>Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
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
                <td>
                  <Link className="icon-action" href={`/admin/dossiers/${request.id}`} aria-label="Ouvrir le dossier">
                    <Eye size={17} aria-hidden="true" />
                  </Link>
                </td>
              </tr>
            ))}
            {!isLoading && requests.length === 0 ? (
              <tr>
                <td colSpan={7}>Aucun dossier ne correspond aux critères sélectionnés.</td>
              </tr>
            ) : null}
            {isLoading ? (
              <tr>
                <td colSpan={7}>Chargement des dossiers...</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="pagination-bar">
        <span>
          Page {pagination.page} sur {pagination.totalPages}
        </span>
        <div>
          <button
            className="button secondary compact-button"
            type="button"
            onClick={() => goToPage(pagination.page - 1)}
            disabled={isLoading || pagination.page <= 1}
          >
            Précédent
          </button>
          <button
            className="button secondary compact-button"
            type="button"
            onClick={() => goToPage(pagination.page + 1)}
            disabled={isLoading || pagination.page >= pagination.totalPages}
          >
            Suivant
          </button>
        </div>
      </div>
    </AdminShell>
  );
}
