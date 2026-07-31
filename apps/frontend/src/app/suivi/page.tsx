'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Download, FileSearch, Printer, Search, UploadCloud } from 'lucide-react';
import { PublicTrackedRequest, apiFetch, displayMinistryName, receiptPdfUrl } from '@/lib/api';
import { requestTypes } from '@/lib/constants';

const statusSteps = [
  { value: 'RECEIVED', label: 'Demande reçue' },
  { value: 'UNDER_REVIEW', label: 'En instruction' },
  { value: 'APPROVED', label: 'Approuvée' },
  { value: 'RESOURCES_ASSIGNED', label: 'Ressources attribuées' },
  { value: 'CLOSED', label: 'Clôturée' },
];

const statusOrder: Record<string, number> = {
  RECEIVED: 0,
  UNDER_REVIEW: 1,
  ADDITIONAL_DOCUMENTS_REQUESTED: 1,
  APPROVED: 2,
  REJECTED: 2,
  RESOURCES_ASSIGNED: 3,
  CLOSED: 4,
};

const statusLabels: Record<string, string> = {
  RECEIVED: 'Reçue',
  UNDER_REVIEW: 'En instruction',
  ADDITIONAL_DOCUMENTS_REQUESTED: 'Compléments demandés',
  APPROVED: 'Approuvée',
  REJECTED: 'Rejetée',
  RESOURCES_ASSIGNED: 'Ressources attribuées',
  CLOSED: 'Clôturée',
};

const statusMessages: Record<string, string> = {
  RECEIVED: 'Votre demande a bien été reçue. Elle sera examinée par les services compétents.',
  UNDER_REVIEW: "Votre dossier est en cours d'instruction administrative et technique.",
  ADDITIONAL_DOCUMENTS_REQUESTED:
    'Des compléments sont nécessaires. Le service instructeur prendra contact avec le Point Focal si besoin.',
  APPROVED: "Votre demande est approuvée. L'attribution technique de la ressource est en cours.",
  REJECTED: "Votre demande n'a pas pu être validée à ce stade.",
  RESOURCES_ASSIGNED: 'Les ressources demandées ont été attribuées.',
  CLOSED: 'Le traitement du dossier est clôturé.',
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('fr-CD', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function requestTypeLabel(value: string) {
  return requestTypes.find((type) => type.value === value)?.label ?? value;
}

function stepState(status: string, index: number) {
  if (status === 'REJECTED') return index <= statusOrder.REJECTED ? 'done' : 'pending';
  if (status === 'ADDITIONAL_DOCUMENTS_REQUESTED') return index <= 1 ? 'done' : 'pending';
  return index <= (statusOrder[status] ?? 0) ? 'done' : 'pending';
}

export default function TrackingPage() {
  const [number, setNumber] = useState('');
  const [focalEmail, setFocalEmail] = useState('');
  const [trackedRequest, setTrackedRequest] = useState<PublicTrackedRequest | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploadingComplement, setIsUploadingComplement] = useState(false);
  const [error, setError] = useState('');
  const [complementMessage, setComplementMessage] = useState('');

  const mainDomain = useMemo(() => {
    if (!trackedRequest) return '';
    return trackedRequest.assignedDomain ?? trackedRequest.domainChoices[0]?.fullDomain ?? 'Non renseigné';
  }, [trackedRequest]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setComplementMessage('');
    setTrackedRequest(null);
    setIsLoading(true);

    try {
      const result = await apiFetch<PublicTrackedRequest>('/requests/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: number.trim(),
          focalEmail: focalEmail.trim(),
        }),
      });
      setTrackedRequest(result);
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Aucun dossier trouvé.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDownloadReceipt() {
    if (!trackedRequest) return;

    setError('');
    setIsDownloading(true);

    try {
      const response = await fetch(receiptPdfUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: trackedRequest.number,
          focalEmail,
        }),
      });

      if (!response.ok) throw new Error("Impossible de télécharger l'accusé de réception.");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `accuse-reception-${trackedRequest.number}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Téléchargement impossible.');
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleAdditionalDocuments(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trackedRequest) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const files = formData
      .getAll('additionalDocuments')
      .filter((file): file is File => file instanceof File && file.size > 0);

    if (!files.length) {
      setError('Veuillez sélectionner au moins un document complémentaire.');
      return;
    }

    const payload = new FormData();
    payload.append('number', trackedRequest.number);
    payload.append('focalEmail', focalEmail.trim());
    files.forEach((file) => payload.append('additionalDocuments', file));

    setError('');
    setComplementMessage('');
    setIsUploadingComplement(true);

    try {
      const result = await apiFetch<PublicTrackedRequest>('/requests/additional-documents', {
        method: 'POST',
        body: payload,
      });
      setTrackedRequest(result);
      setComplementMessage('Documents complémentaires transmis. Votre dossier repasse en instruction.');
      form.reset();
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : "L'envoi des documents a échoué.");
    } finally {
      setIsUploadingComplement(false);
    }
  }

  return (
    <main className="page">
      <div className="page-title">
        <p className="eyebrow">Accusé de réception</p>
        <h1>Suivre un dossier</h1>
      </div>

      <section className="tracking-card tracking-search-card">
        <div className="tracking-card-title">
          <FileSearch size={22} aria-hidden="true" />
          <div>
            <h2>Consultation sécurisée</h2>
            <p>Renseignez le numéro de dossier et l'email déclaré lors de la soumission.</p>
          </div>
        </div>

        <form className="tracking-form" onSubmit={handleSubmit}>
          <div className="form-grid two">
            <label className="field">
              Numéro de dossier
              <input
                className="control"
                value={number}
                onChange={(event) => setNumber(event.target.value)}
                placeholder="DNRN-2026-0000"
                required
              />
            </label>
            <label className="field">
              Email du Point Focal
              <input
                className="control"
                value={focalEmail}
                onChange={(event) => setFocalEmail(event.target.value)}
                type="email"
                placeholder="point.focal@example.com"
                required
              />
            </label>
          </div>
          <div className="actions">
            <button className="button primary" type="submit" disabled={isLoading}>
              <Search size={18} aria-hidden="true" />
              {isLoading ? 'Recherche...' : 'Rechercher'}
            </button>
          </div>
        </form>
      </section>

      {error ? <p className="form-alert tracking-alert">{error}</p> : null}

      {trackedRequest ? (
        <section className="tracking-card tracking-result" aria-live="polite">
          <div className="tracking-result-header">
            <div>
              <p className="eyebrow">Dossier retrouvé</p>
              <h2>{trackedRequest.number}</h2>
              <span className={`status status-${trackedRequest.status.toLowerCase().replaceAll('_', '-')}`}>
                {statusLabels[trackedRequest.status] ?? trackedRequest.status}
              </span>
            </div>
            <div className="tracking-result-dates">
              <span>Déposé le {formatDateTime(trackedRequest.createdAt)}</span>
              <span>Mis à jour le {formatDateTime(trackedRequest.updatedAt)}</span>
            </div>
          </div>

          <p className="tracking-message">
            {statusMessages[trackedRequest.status] ?? 'Le dossier est en cours de traitement.'}
          </p>

          {trackedRequest.publicObservation ? (
            <div className="tracking-public-note">
              <span>Observation du service instructeur</span>
              <p>{trackedRequest.publicObservation}</p>
            </div>
          ) : null}

          {trackedRequest.status === 'ADDITIONAL_DOCUMENTS_REQUESTED' ? (
            <form className="tracking-complement-box" onSubmit={handleAdditionalDocuments}>
              <div>
                <span>Documents complémentaires</span>
                <p>Ajoutez les pièces demandées par le service instructeur. Formats acceptés : PDF, Word, JPG ou PNG.</p>
              </div>
              <label className="field">
                Fichiers à transmettre
                <input
                  className="control"
                  name="additionalDocuments"
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                  multiple
                  required
                />
              </label>
              <div className="actions">
                <button className="button primary" type="submit" disabled={isUploadingComplement}>
                  <UploadCloud size={18} aria-hidden="true" />
                  {isUploadingComplement ? 'Transmission...' : 'Transmettre les compléments'}
                </button>
              </div>
            </form>
          ) : null}

          {complementMessage ? <p className="form-alert success">{complementMessage}</p> : null}

          <ol className="tracking-steps">
            {statusSteps.map((step, index) => (
              <li className={stepState(trackedRequest.status, index)} key={step.value}>
                <span>{index + 1}</span>
                <strong>{step.label}</strong>
              </li>
            ))}
          </ol>

          <div className="tracking-summary-grid">
            <article>
              <span>Ministère / Institution</span>
              <strong>{displayMinistryName(trackedRequest)}</strong>
            </article>
            <article>
              <span>Plateforme</span>
              <strong>{trackedRequest.platformName}</strong>
            </article>
            <article>
              <span>Domaine principal</span>
              <strong>{mainDomain}</strong>
            </article>
            <article>
              <span>Type de demande</span>
              <strong>{trackedRequest.requestTypes.map(requestTypeLabel).join(', ')}</strong>
            </article>
          </div>

          {trackedRequest.status === 'RESOURCES_ASSIGNED' || trackedRequest.status === 'CLOSED' ? (
            <div className="tracking-resource-box">
              <span>Ressource attribuée</span>
              <strong>{trackedRequest.assignedDomain ?? mainDomain}</strong>
              <p>
                La transmission des accès est traitée par le canal officiel défini par l'administration.
              </p>
            </div>
          ) : null}

          <div className="actions">
            <button className="button secondary" type="button" onClick={() => window.print()}>
              <Printer size={18} aria-hidden="true" />
              Imprimer
            </button>
            <button className="button secondary" type="button" onClick={handleDownloadReceipt} disabled={isDownloading}>
              <Download size={18} aria-hidden="true" />
              {isDownloading ? 'Téléchargement...' : "Télécharger l'accusé"}
            </button>
          </div>
        </section>
      ) : null}
    </main>
  );
}
