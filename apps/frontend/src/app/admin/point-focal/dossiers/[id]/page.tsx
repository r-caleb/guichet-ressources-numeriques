'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, MessageSquare, ShieldCheck, UploadCloud } from 'lucide-react';
import { AdminShell } from '@/components/admin-shell';
import { ChatPanel } from '@/components/chat-panel';
import { audienceTypes, criticalityLevels, platformTypes, requestTypes } from '@/lib/constants';
import {
  AdminRequestDetail,
  ChatConversation,
  accessTransmissionLabel,
  adminFetch,
  displayMinistryName,
  documentTypeLabel,
  formatDate,
  formatDateTime,
  getAdminToken,
  pointFocalDocumentDownloadUrl,
  statusClassName,
  statusLabel,
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
  };

  return Object.entries(translations).reduce(
    (text, [value, label]) => text.replaceAll(value, label),
    message,
  );
}

export default function PointFocalRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [request, setRequest] = useState<AdminRequestDetail | null>(null);
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!getAdminToken()) {
      router.replace('/admin/login');
      return;
    }

    Promise.all([
      adminFetch<AdminRequestDetail>(`/requests/me/${params.id}`),
      adminFetch<ChatConversation>(`/chat/requests/${params.id}`),
    ])
      .then(([requestResult, conversationResult]) => {
        setRequest(requestResult);
        setConversation(conversationResult);
      })
      .catch((exception) => {
        setError(exception instanceof Error ? exception.message : 'Impossible de charger le dossier.');
      })
      .finally(() => setIsLoading(false));
  }, [params.id, router]);

  async function handleDownloadDocument(documentId: string, fileName: string) {
    setError('');

    try {
      const token = getAdminToken();
      const response = await fetch(pointFocalDocumentDownloadUrl(documentId), {
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

  async function handleUploadAdditionalDocuments(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!request) return;

    setError('');
    setSuccess('');
    setIsUploading(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const updated = await adminFetch<AdminRequestDetail>(`/requests/me/${request.id}/additional-documents`, {
        method: 'POST',
        body: formData,
      });

      setRequest(updated);
      form.reset();
      setSuccess('Compléments transmis. Le dossier est revenu en instruction.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Transmission impossible.');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <AdminShell>
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Espace Point Focal</p>
          <h1>{request?.number ?? 'Dossier'}</h1>
        </div>
        <Link className="button secondary" href="/admin/point-focal">
          <ArrowLeft size={18} aria-hidden="true" />
          Retour à mes dossiers
        </Link>
      </div>

      {error ? <p className="form-alert">{error}</p> : null}
      {success ? <p className="form-alert success">{success}</p> : null}
      {isLoading ? <p className="admin-empty">Chargement du dossier...</p> : null}

      {request ? (
        <>
          <section className="dossier-header">
            <div>
              <span>Statut actuel</span>
              <strong className={statusClassName(request.status)}>{statusLabel(request.status)}</strong>
            </div>
            <div>
              <span>Plateforme</span>
              <strong>{request.platformName}</strong>
            </div>
            <div>
              <span>Date de dépôt</span>
              <strong>{formatDateTime(request.createdAt)}</strong>
            </div>
          </section>

          {request.publicObservation ? (
            <section className="point-focal-alert">
              <ShieldCheck size={20} aria-hidden="true" />
              <div>
                <span>Observation de l'administration</span>
                <strong>{request.publicObservation}</strong>
              </div>
            </section>
          ) : null}

          {request.status === 'ADDITIONAL_DOCUMENTS_REQUESTED' ? (
            <section className="admin-section point-focal-complement-section">
              <div className="admin-section-title">
                <h2>Transmettre les compléments</h2>
              </div>
              <form className="point-focal-complement-form" onSubmit={handleUploadAdditionalDocuments}>
                <label className="field">
                  Message au service instructeur
                  <textarea
                    className="control"
                    name="message"
                    maxLength={600}
                    placeholder="Précisez brièvement les éléments transmis."
                  />
                </label>
                <label className="field">
                  Documents complémentaires
                  <input
                    className="control"
                    name="additionalDocuments"
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                    multiple
                    required
                  />
                </label>
                <button className="button primary" type="submit" disabled={isUploading}>
                  <UploadCloud size={18} aria-hidden="true" />
                  {isUploading ? 'Transmission...' : 'Transmettre les compléments'}
                </button>
              </form>
            </section>
          ) : null}

          <div className="dossier-workspace">
            <div className="dossier-stack">
              <section className="admin-section request-summary-section">
                <div className="admin-section-title">
                  <h2>Résumé du dossier</h2>
                </div>
                <dl className="admin-definition-list">
                  <div>
                    <dt>Ministère / Institution</dt>
                    <dd>{displayMinistryName(request)}</dd>
                  </div>
                  <div>
                    <dt>Objet</dt>
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
                {request.requestDetails ? (
                  <div className="admin-text-block">
                    <h3>Détails utiles</h3>
                    <p>{request.requestDetails}</p>
                  </div>
                ) : null}
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
            </div>

            <div className="dossier-stack">
              <section className="admin-section">
                <div className="admin-section-title">
                  <h2>Ressources attribuées</h2>
                </div>
                <dl className="admin-definition-list">
                  <div>
                    <dt>Domaine attribué</dt>
                    <dd>{request.assignedDomain ?? 'Non renseigné'}</dd>
                  </div>
                  <div>
                    <dt>Hébergement</dt>
                    <dd>{request.hostingAssigned ? 'Attribué' : 'Non renseigné'}</dd>
                  </div>
                  <div>
                    <dt>Mode de transmission</dt>
                    <dd>{accessTransmissionLabel(request.accessTransmissionMode)}</dd>
                  </div>
                  <div>
                    <dt>Création des ressources</dt>
                    <dd>{formatDate(request.resourcesCreatedAt)}</dd>
                  </div>
                  <div>
                    <dt>Transmission des accès</dt>
                    <dd>{formatDate(request.accessDeliveredAt)}</dd>
                  </div>
                </dl>
              </section>

              <section className="admin-section">
                <div className="admin-section-title">
                  <h2>Documents</h2>
                </div>
                <div className="document-grid point-focal-document-grid">
                  {request.documents.map((document) => (
                    <article className="document-card" key={document.id}>
                      <div>
                        <span>{documentTypeLabel(document.type)}</span>
                        <strong>{document.originalName}</strong>
                        <small>{Math.ceil(document.size / 1024)} Ko - {formatDate(document.createdAt)}</small>
                      </div>
                      <button
                        className="icon-action"
                        type="button"
                        onClick={() => handleDownloadDocument(document.id, document.originalName)}
                        aria-label={`Télécharger ${document.originalName}`}
                      >
                        <Download size={17} aria-hidden="true" />
                      </button>
                    </article>
                  ))}
                </div>
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
            <ChatPanel
              conversation={conversation}
              endpoint={`/chat/requests/${request.id}/messages`}
              emptyText="Aucun message pour ce dossier."
              onConversationChange={setConversation}
            />
          </section>

          <section className="admin-section">
            <div className="admin-section-title">
              <h2>Historique</h2>
            </div>
            <ol className="audit-list">
              {request.auditEvents.map((event) => (
                <li key={event.id}>
                  <span>{formatDateTime(event.createdAt)}</span>
                  <strong>{formatAuditMessage(event.message)}</strong>
                </li>
              ))}
            </ol>
          </section>
        </>
      ) : null}
    </AdminShell>
  );
}
