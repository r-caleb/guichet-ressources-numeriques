'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, MessageSquare, Save, UserCheck, UserPlus } from 'lucide-react';
import { AdminShell } from '@/components/admin-shell';
import { DocumentCard } from '@/components/document-card';
import { ChatPanel } from '@/components/chat-panel';
import { TemporaryPasswordField } from '@/components/temporary-password-field';
import { audienceTypes, criticalityLevels, platformTypes, requestTypes } from '@/lib/constants';
import {
  AdminAccount,
  AdminRequestDetail,
  ChatConversation,
  accessTransmissionOptions,
  adminFetch,
  auditActionLabel,
  displayMinistryName,
  documentArchiveDownloadUrl,
  documentDownloadUrl,
  formatDateTime,
  getAdminToken,
  getStoredAdminUser,
  statusClassName,
  statusLabel,
  statusOptions,
} from '@/lib/admin-api';

function optionLabel(options: Array<{ label: string; value: string }>, value?: string | null) {
  return options.find((option) => option.value === value)?.label ?? value ?? 'Non renseigné';
}

function requestTypeLabels(values: string[]) {
  return values.map((value) => optionLabel(requestTypes, value)).join(', ');
}

function formatAuditMessage(message: string) {
  const translations: Record<string, string> = {
    RECEIVED: 'Reçue',
    UNDER_REVIEW: 'En instruction',
    ADDITIONAL_DOCUMENTS_REQUESTED: 'Compléments demandés',
    APPROVED: 'Approuvée',
    REJECTED: 'Rejetée',
    RESOURCES_ASSIGNED: 'Ressources attribuées',
    CLOSED: 'Clôturée',
    'Instruction enregistrée.': 'Décision enregistrée.',
    'Statut :': 'Décision :',
  };

  return Object.entries(translations).reduce(
    (text, [value, label]) => text.replaceAll(value, label),
    message,
  );
}

function actorName(actor?: AdminAccount | null) {
  if (!actor) return 'Non renseigné';
  return [actor.firstName, actor.lastName].filter(Boolean).join(' ') || actor.email;
}

function userName(user?: { firstName?: string | null; lastName?: string | null; email: string } | null) {
  if (!user) return 'Non assigné';
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
}

function actorRole(actor?: AdminAccount | null) {
  if (!actor) return 'Action système';
  const roleLabels: Record<string, string> = {
    SUPER_ADMIN: 'Super administrateur',
    ADMIN: 'Administrateur',
    AGENT: 'Agent',
    POINT_FOCAL: 'Point Focal',
  };

  return actor.roles.map((role) => roleLabels[role] ?? role).join(', ');
}

function latestInstruction(request: AdminRequestDetail) {
  return [...request.auditEvents]
    .reverse()
    .find((event) =>
      ['STATUS_CHANGED', 'ADMIN_NOTE_ADDED', 'RESOURCE_ASSIGNED', 'REQUEST_CLOSED'].includes(event.action),
    );
}

export default function AdminRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [request, setRequest] = useState<AdminRequestDetail | null>(null);
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [assignableUsers, setAssignableUsers] = useState<AdminAccount[]>([]);
  const [assignmentValue, setAssignmentValue] = useState('');
  const [form, setForm] = useState({
    status: '',
    assignedDomain: '',
    accessTransmissionMode: '',
    administrativeNotes: '',
    publicObservation: '',
    rejectionReason: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingPointFocal, setIsCreatingPointFocal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const currentUser = getStoredAdminUser();
  const canAssign = currentUser?.roles.some((role) => ['SUPER_ADMIN', 'ADMIN'].includes(role)) ?? false;
  const canAssignAdministrators = currentUser?.roles.includes('SUPER_ADMIN') ?? false;

  useEffect(() => {
    if (!getAdminToken()) {
      router.replace('/admin/login');
      return;
    }

    adminFetch<AdminRequestDetail>(`/requests/admin/${params.id}`)
      .then((result) => {
        setRequest(result);
        setAssignmentValue(result.instructor?.id ?? result.instructor?.userId ?? '');
        setForm({
          status: result.status,
          assignedDomain: result.assignedDomain ?? '',
          accessTransmissionMode: result.accessTransmissionMode ?? '',
          administrativeNotes: result.administrativeNotes ?? '',
          publicObservation: result.publicObservation ?? '',
          rejectionReason: result.rejectionReason ?? '',
        });
        if (result.pointFocalUser) {
          adminFetch<ChatConversation>(`/chat/admin/requests/${result.id}`)
            .then(setConversation)
            .catch(() => setConversation(null));
        }
      })
      .catch((exception) => {
        setError(exception instanceof Error ? exception.message : 'Impossible de charger le dossier.');
      })
      .finally(() => setIsLoading(false));
  }, [params.id, router]);

  useEffect(() => {
    if (!canAssign) return;

    adminFetch<AdminAccount[]>('/admin/users')
      .then((users) => {
        setAssignableUsers(
          users.filter((user) => {
            if (!user.isActive || user.roles.includes('POINT_FOCAL')) return false;
            if (canAssignAdministrators && user.roles.includes('ADMIN')) return true;
            return user.roles.includes('AGENT');
          }),
        );
      })
      .catch(() => setAssignableUsers([]));
  }, [canAssign, canAssignAdministrators]);

  async function handleAssign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!request) return;

    setError('');
    setSuccess('');
    setIsAssigning(true);

    try {
      const updated = await adminFetch<AdminRequestDetail>(`/requests/admin/${request.id}/assignment`, {
        method: 'PATCH',
        body: JSON.stringify({ instructorId: assignmentValue || null }),
      });

      setRequest(updated);
      setAssignmentValue(updated.instructor?.id ?? updated.instructor?.userId ?? '');
      setSuccess(assignmentValue ? 'Assignation enregistrée.' : 'Dossier désassigné.');
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : "L'assignation n'a pas été enregistrée.");
    } finally {
      setIsAssigning(false);
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!request) return;

    setError('');
    setSuccess('');
    setIsSaving(true);

    try {
      const updated = await adminFetch<AdminRequestDetail>(`/requests/admin/${request.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: form.status,
          assignedDomain: form.assignedDomain || undefined,
          accessTransmissionMode: form.accessTransmissionMode || undefined,
          administrativeNotes: form.administrativeNotes || undefined,
          publicObservation: form.publicObservation || undefined,
          rejectionReason: form.rejectionReason || undefined,
        }),
      });

      setRequest((current) => (current ? { ...current, ...updated } : current));
      setSuccess('Décision enregistrée.');
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : "La décision n'a pas été enregistrée.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDownloadDocument(documentId: string, fileName: string) {
    setError('');
    try {
      const token = getAdminToken();
      const response = await fetch(documentDownloadUrl(documentId), {
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

  async function handleDownloadAllDocuments() {
    if (!request) return;

    setError('');
    try {
      const token = getAdminToken();
      const response = await fetch(documentArchiveDownloadUrl(request.id), {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) throw new Error('Téléchargement groupé impossible.');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `documents-${request.number}.zip`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Téléchargement groupé impossible.');
    }
  }

  async function handleCreatePointFocalAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!request) return;

    setError('');
    setSuccess('');
    setIsCreatingPointFocal(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const result = await adminFetch<{
        user: NonNullable<AdminRequestDetail['pointFocalUser']>;
        linkedRequestsCount: number;
        alreadyLinked: boolean;
      }>(`/requests/admin/${request.id}/point-focal-account`, {
        method: 'POST',
        body: JSON.stringify({ password: formData.get('password') }),
      });

      setRequest((current) => (current ? { ...current, pointFocalUser: result.user } : current));
      adminFetch<ChatConversation>(`/chat/admin/requests/${request.id}`)
        .then(setConversation)
        .catch(() => setConversation(null));
      form.reset();
      setSuccess(
        result.alreadyLinked
          ? 'Ce dossier est déjà lié à un compte Point Focal.'
          : `Compte Point Focal créé. ${result.linkedRequestsCount} dossier(s) lié(s).`,
      );
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : "Le compte Point Focal n'a pas été créé.");
    } finally {
      setIsCreatingPointFocal(false);
    }
  }

  return (
    <AdminShell>
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Décision du dossier</p>
          <h1>{request?.number ?? 'Dossier'}</h1>
        </div>
        <Link className="button secondary" href="/admin/dossiers">
          <ArrowLeft size={18} aria-hidden="true" />
          Retour aux dossiers
        </Link>
      </div>

      {error ? <p className="form-alert">{error}</p> : null}
      {success ? <p className="form-alert success">{success}</p> : null}
      {isLoading ? <p className="admin-empty">Chargement du dossier...</p> : null}

      {request ? (
        <>
          {(() => {
            const latest = latestInstruction(request);

            return (
              <section className="admin-section last-instruction-card">
                <div className="admin-section-title">
                  <h2>Dernière décision</h2>
                  <span className="admin-count">{latest ? formatDateTime(latest.createdAt) : 'Aucune action'}</span>
                </div>
                <dl className="admin-definition-list">
                  <div>
                    <dt>Action</dt>
                    <dd>{latest ? formatAuditMessage(latest.message) : 'Aucune décision administrative enregistrée.'}</dd>
                  </div>
                  <div>
                    <dt>Auteur</dt>
                    <dd>{latest ? actorName(latest.actor) : 'Non renseigné'}</dd>
                  </div>
                  <div>
                    <dt>Rôle</dt>
                    <dd>{latest ? actorRole(latest.actor) : 'Non renseigné'}</dd>
                  </div>
                  <div>
                    <dt>Décision actuelle</dt>
                    <dd>{statusLabel(request.status)}</dd>
                  </div>
                  <div>
                    <dt>Domaine attribué</dt>
                    <dd>{request.assignedDomain ?? 'Non attribué'}</dd>
                  </div>
                  <div>
                    <dt>Accès transmis</dt>
                    <dd>{optionLabel(accessTransmissionOptions, request.accessTransmissionMode)}</dd>
                  </div>
                </dl>
              </section>
            );
          })()}

          <section className="dossier-header">
            <div>
              <span>Décision actuelle</span>
              <strong className={statusClassName(request.status)}>{statusLabel(request.status)}</strong>
            </div>
            <div>
              <span>Ministère / Institution</span>
              <strong>{displayMinistryName(request)}</strong>
            </div>
            <div>
              <span>Date de dépôt</span>
              <strong>{formatDateTime(request.createdAt)}</strong>
            </div>
          </section>

          <div className="dossier-workspace">
            <div className="dossier-stack">
              <section className="admin-section request-summary-section">
                <div className="admin-section-title">
                  <h2>Résumé de la demande</h2>
                </div>
                <dl className="admin-definition-list">
                  <div>
                    <dt>Plateforme</dt>
                    <dd>{request.platformName}</dd>
                  </div>
                  <div>
                    <dt>Type de demande</dt>
                    <dd>{requestTypeLabels(request.requestTypes)}</dd>
                  </div>
                  <div>
                    <dt>Type de plateforme</dt>
                    <dd>{optionLabel(platformTypes, request.platformType)}</dd>
                  </div>
                  <div>
                    <dt>Public cible</dt>
                    <dd>{optionLabel(audienceTypes, request.audience)}</dd>
                  </div>
                  <div>
                    <dt>Criticité</dt>
                    <dd>{optionLabel(criticalityLevels, request.criticality)}</dd>
                  </div>
                  <div>
                    <dt>Contact technique</dt>
                    <dd>{request.technicalContact || 'Point Focal désigné'}</dd>
                  </div>
                </dl>
                <div className="admin-text-block">
                  <h3>Finalité officielle</h3>
                  <p>{request.officialPurpose}</p>
                </div>
              </section>

              <section className="admin-section">
                <div className="admin-section-title">
                  <h2>Point Focal</h2>
                </div>
                <dl className="admin-definition-list">
                  <div>
                    <dt>Nom complet</dt>
                    <dd>
                      {[request.focalLastName, request.focalMiddleName, request.focalFirstName]
                        .filter(Boolean)
                        .join(' ')}
                    </dd>
                  </div>
                  <div>
                    <dt>Fonction</dt>
                    <dd>{request.focalFunction}</dd>
                  </div>
                  <div>
                    <dt>Direction / Service</dt>
                    <dd>{request.focalDepartment}</dd>
                  </div>
                  <div>
                    <dt>Téléphone</dt>
                    <dd>{request.focalPhone}</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{request.focalEmail}</dd>
                  </div>
                </dl>
                {request.pointFocalUser ? (
                  <div className="admin-linked-account">
                    <span>Compte connecté</span>
                    <strong>
                      {request.pointFocalUser.firstName} {request.pointFocalUser.lastName}
                    </strong>
                    <small>
                      {request.pointFocalUser.email} - {request.pointFocalUser.isActive ? 'Actif' : 'Désactivé'}
                    </small>
                  </div>
                ) : (
                  <form className="point-focal-account-form" onSubmit={handleCreatePointFocalAccount}>
                    <TemporaryPasswordField label="Mot de passe temporaire" />
                    <button className="button secondary" type="submit" disabled={isCreatingPointFocal}>
                      <UserPlus size={18} aria-hidden="true" />
                      {isCreatingPointFocal ? 'Création...' : 'Créer le compte Point Focal'}
                    </button>
                  </form>
                )}
              </section>

              <section className="admin-section">
                <div className="admin-section-title">
                  <h2>Domaines proposés</h2>
                </div>
                <ul className="admin-list">
                  {request.domainChoices.map((choice) => (
                    <li key={choice.id}>
                      <span>{choice.rank === 'FIRST' ? 'Choix principal' : choice.rank === 'SECOND' ? 'Alternative 1' : 'Alternative 2'}</span>
                      <strong>{choice.fullDomain}</strong>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="admin-section">
                <div className="admin-section-title">
                  <h2>Documents transmis</h2>
                  <button
                    className="button secondary compact-button"
                    type="button"
                    onClick={handleDownloadAllDocuments}
                    disabled={!request.documents.length}
                  >
                    <Download size={17} aria-hidden="true" />
                    Télécharger tout
                  </button>
                </div>
                <div className="document-grid admin-detail-document-grid">
                  {request.documents.map((document) => (
                    <DocumentCard
                      key={document.id}
                      document={document}
                      downloadUrl={documentDownloadUrl(document.id)}
                      onDownload={handleDownloadDocument}
                    />
                  ))}
                </div>
              </section>
            </div>

            <div className="dossier-stack">
              <section className="admin-section assignment-section">
                <div className="admin-section-title">
                  <h2>Assignation</h2>
                  <span className="admin-count">
                    <UserCheck size={17} aria-hidden="true" />
                    {request.instructor ? 'Assigné' : 'Non assigné'}
                  </span>
                </div>
                <dl className="admin-definition-list assignment-definition-list">
                  <div>
                    <dt>Responsable du dossier</dt>
                    <dd>{userName(request.instructor)}</dd>
                  </div>
                </dl>
                {canAssign ? (
                  <form className="assignment-form" onSubmit={handleAssign}>
                    <label className="field">
                      Attribuer à
                      <select
                        className="control"
                        value={assignmentValue}
                        onChange={(event) => setAssignmentValue(event.target.value)}
                      >
                        <option value="">Non assigné</option>
                        {assignableUsers.map((user) => (
                          <option key={user.id} value={user.id}>
                            {userName(user)} - {actorRole(user)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button className="button secondary" type="submit" disabled={isAssigning}>
                      <UserCheck size={18} aria-hidden="true" />
                      {isAssigning ? 'Assignation...' : "Enregistrer l'assignation"}
                    </button>
                  </form>
                ) : null}
              </section>

              <section className="admin-section decision-section">
                <div className="admin-section-title">
                  <h2>Décision administrative</h2>
                </div>
                <dl className="decision-recap">
                  <div>
                    <dt>Décision actuelle</dt>
                    <dd>{statusLabel(request.status)}</dd>
                  </div>
                  <div>
                    <dt>Domaine retenu</dt>
                    <dd>{request.assignedDomain ?? 'Non attribué'}</dd>
                  </div>
                  <div>
                    <dt>Accès</dt>
                    <dd>{optionLabel(accessTransmissionOptions, request.accessTransmissionMode)}</dd>
                  </div>
                </dl>
                <form className="instruction-form" onSubmit={handleSave}>
                  <label className="field">
                    Décision
                    <select
                      className="control"
                      value={form.status}
                      onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                      required
                    >
                      {statusOptions.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    Domaine attribué
                    <input
                      className="control"
                      value={form.assignedDomain}
                      onChange={(event) => setForm((current) => ({ ...current, assignedDomain: event.target.value }))}
                      placeholder="exemple.gouv.cd"
                    />
                  </label>
                  <label className="field">
                    Transmission des accès
                    <select
                      className="control"
                      value={form.accessTransmissionMode}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, accessTransmissionMode: event.target.value }))
                      }
                    >
                      {accessTransmissionOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    Notes internes
                    <textarea
                      className="control"
                      value={form.administrativeNotes}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, administrativeNotes: event.target.value }))
                      }
                    />
                  </label>
                  <label className="field">
                    Observation visible au Point Focal
                    <textarea
                      className="control"
                      value={form.publicObservation}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, publicObservation: event.target.value }))
                      }
                      placeholder="Exemple : veuillez transmettre une lettre plus lisible."
                    />
                  </label>
                  <label className="field">
                    Motif de rejet
                    <textarea
                      className="control"
                      value={form.rejectionReason}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, rejectionReason: event.target.value }))
                      }
                      placeholder="À renseigner si la décision est Rejetée."
                    />
                  </label>
                  <button className="button primary" type="submit" disabled={isSaving}>
                    <Save size={18} aria-hidden="true" />
                    {isSaving ? 'Enregistrement...' : 'Enregistrer la décision'}
                  </button>
                </form>
              </section>
            </div>
          </div>

          <section className="admin-section" id="conversation-dossier">
            <div className="admin-section-title">
              <h2>Conversation du dossier</h2>
              <span className="admin-count">
                <MessageSquare size={17} aria-hidden="true" />
                Service instructeur
              </span>
            </div>
            {request.pointFocalUser ? (
              <ChatPanel
                conversation={conversation}
                endpoint={`/chat/admin/requests/${request.id}/messages`}
                emptyText="Aucun message. Vous pouvez démarrer l'échange avec le Point Focal."
                onConversationChange={setConversation}
              />
            ) : (
              <p className="admin-empty">Créez d'abord le compte Point Focal pour démarrer la conversation.</p>
            )}
          </section>

          <section className="admin-section">
            <div className="admin-section-title">
              <h2>Historique</h2>
            </div>
            <ol className="audit-list">
              {request.auditEvents.map((event) => (
                <li key={event.id}>
                  <div className="audit-list-header">
                    <span>{formatDateTime(event.createdAt)}</span>
                    <em>{auditActionLabel(event.action)}</em>
                  </div>
                  <strong>{formatAuditMessage(event.message)}</strong>
                  <small>
                    {actorName(event.actor)} - {actorRole(event.actor)}
                  </small>
                </li>
              ))}
            </ol>
          </section>
        </>
      ) : null}
    </AdminShell>
  );
}
