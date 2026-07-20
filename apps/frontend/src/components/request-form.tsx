'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Download, Printer, RotateCcw, Send } from 'lucide-react';
import { Ministry, RequestReceipt, apiFetch, receiptPdfUrl } from '@/lib/api';
import { audienceTypes, criticalityLevels, ministries as fallbackMinistries, platformTypes, requestTypes } from '@/lib/constants';

type SubmittedSummary = {
  receipt: RequestReceipt;
  focalEmail: string;
  focalName: string;
  focalFunction: string;
  ministryName: string;
  requestTypes: string[];
  platformType: string;
  audience: string;
  criticality: string;
  officialPurpose: string;
  domains: string[];
  documents: string[];
};

function optionLabel(options: Array<{ label: string; value: string }>, value: FormDataEntryValue | null) {
  return options.find((option) => option.value === value)?.label ?? String(value ?? '');
}

export function RequestForm() {
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [ministriesError, setMinistriesError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<SubmittedSummary | null>(null);

  useEffect(() => {
    apiFetch<Ministry[]>('/ministries')
      .then(setMinistries)
      .catch(() => {
        setMinistriesError("Impossible de charger les ministères depuis l'API.");
      });
  }, []);

  const ministryOptions = useMemo(() => {
    if (ministries.length > 0) return ministries;

    return fallbackMinistries.map((name) => ({
      id: '',
      name,
      isActive: true,
    }));
  }, [ministries]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    if (!formData.get('ministryId')) {
      setError("Les ministères ne sont pas encore chargés. Vérifiez que l'API backend est lancée.");
      setIsSubmitting(false);
      return;
    }

    try {
      if (formData.getAll('requestTypes').length === 0) {
        setError('Veuillez sélectionner au moins un type de demande.');
        return;
      }

      const receipt = await apiFetch<RequestReceipt>('/requests', {
        method: 'POST',
        body: formData,
      });

      const selectedMinistry = ministries.find((ministry) => ministry.id === formData.get('ministryId'));
      const domains = ['prefix1', 'prefix2', 'prefix3']
        .map((name) => String(formData.get(name) ?? '').trim())
        .filter(Boolean)
        .map((prefix) => `${prefix.replace(/\.gouv\.cd$/i, '')}.gouv.cd`);
      const documents = ['officialLetter', 'designationLetter']
        .map((name) => formData.get(name))
        .filter((value): value is File => value instanceof File && value.name.length > 0)
        .map((file) => file.name);
      const selectedRequestTypes = formData
        .getAll('requestTypes')
        .map((value) => optionLabel(requestTypes, value));

      setSummary({
        receipt,
        focalEmail: String(formData.get('focalEmail') ?? ''),
        focalName: [
          formData.get('focalLastName'),
          formData.get('focalMiddleName'),
          formData.get('focalFirstName'),
        ]
          .filter(Boolean)
          .join(' '),
        focalFunction: String(formData.get('focalFunction') ?? ''),
        ministryName: selectedMinistry?.name ?? '',
        requestTypes: selectedRequestTypes,
        platformType: optionLabel(platformTypes, formData.get('platformType')),
        audience: optionLabel(audienceTypes, formData.get('audience')),
        criticality: optionLabel(criticalityLevels, formData.get('criticality')),
        officialPurpose: String(formData.get('officialPurpose') ?? ''),
        domains,
        documents,
      });

      form.reset();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'La soumission a échoué.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDownloadReceipt() {
    if (!summary) return;

    setError('');
    const response = await fetch(receiptPdfUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        number: summary.receipt.number,
        focalEmail: summary.focalEmail,
      }),
    });

    if (!response.ok) {
      setError("Impossible de télécharger l'accusé de réception.");
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `accuse-reception-${summary.receipt.number}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (summary) {
    return (
      <section className="receipt-panel" aria-live="polite">
        <div className="receipt-banner">
          <p className="eyebrow">Demande enregistrée</p>
          <h2>Accusé de réception</h2>
          <strong>{summary.receipt.number}</strong>
          <span>Statut : Reçue</span>
        </div>

        <div className="receipt-grid">
          <article>
            <h3>Résumé</h3>
            <dl className="receipt-list">
              <div>
                <dt>Date de dépôt</dt>
                <dd>{new Date(summary.receipt.createdAt).toLocaleString('fr-CD')}</dd>
              </div>
              <div>
                <dt>Ministère / Institution</dt>
                <dd>{summary.ministryName}</dd>
              </div>
              <div>
                <dt>Plateforme</dt>
                <dd>{summary.receipt.platformName}</dd>
              </div>
              <div>
                <dt>Email de suivi</dt>
                <dd>{summary.focalEmail}</dd>
              </div>
            </dl>
          </article>

          <article>
            <h3>Point Focal</h3>
            <dl className="receipt-list">
              <div>
                <dt>Nom complet</dt>
                <dd>{summary.focalName}</dd>
              </div>
              <div>
                <dt>Fonction</dt>
                <dd>{summary.focalFunction}</dd>
              </div>
            </dl>
          </article>

          <article>
            <h3>Demande</h3>
            <dl className="receipt-list">
              <div>
                <dt>Types</dt>
                <dd>{summary.requestTypes.join(', ')}</dd>
              </div>
              <div>
                <dt>Type de plateforme</dt>
                <dd>{summary.platformType}</dd>
              </div>
              <div>
                <dt>Public cible</dt>
                <dd>{summary.audience}</dd>
              </div>
              <div>
                <dt>Criticité</dt>
                <dd>{summary.criticality}</dd>
              </div>
            </dl>
          </article>

          <article>
            <h3>Domaines proposés</h3>
            <ol className="receipt-items">
              {summary.domains.map((domain) => (
                <li key={domain}>{domain}</li>
              ))}
            </ol>
          </article>

          <article className="receipt-full">
            <h3>Finalité officielle</h3>
            <p>{summary.officialPurpose}</p>
          </article>

          <article className="receipt-full">
            <h3>Documents transmis</h3>
            <ul className="receipt-items">
              {summary.documents.map((document) => (
                <li key={document}>{document}</li>
              ))}
            </ul>
          </article>
        </div>

        <p className="receipt-note">
          Cet accusé confirme uniquement la réception de la demande. Il ne vaut pas approbation ni attribution définitive.
        </p>

        {error ? <p className="form-alert">{error}</p> : null}

        <div className="actions">
          <button className="button secondary" type="button" onClick={() => window.print()}>
            <Printer size={18} aria-hidden="true" />
            Imprimer
          </button>
          <button className="button secondary" type="button" onClick={handleDownloadReceipt}>
            <Download size={18} aria-hidden="true" />
            Télécharger le PDF
          </button>
          <button className="button primary" type="button" onClick={() => setSummary(null)}>
            <RotateCcw size={18} aria-hidden="true" />
            Nouvelle demande
          </button>
        </div>
      </section>
    );
  }

  return (
    <form className="public-form" onSubmit={handleSubmit}>
      {error ? <p className="form-alert">{error}</p> : null}
      {ministriesError ? <p className="form-alert subtle">{ministriesError}</p> : null}

      <section className="form-section">
        <div>
          <p className="eyebrow">Étape 1</p>
          <h2>Informations du Point Focal</h2>
        </div>
        <div className="form-grid">
          <label className="field">
            Nom
            <input className="control" name="focalLastName" required />
          </label>
          <label className="field">
            Postnom
            <input className="control" name="focalMiddleName" required />
          </label>
          <label className="field">
            Prénom
            <input className="control" name="focalFirstName" required />
          </label>
          <label className="field">
            Fonction
            <input className="control" name="focalFunction" required />
          </label>
          <label className="field">
            Ministère / Institution
            <select className="control" name="ministryId" required disabled={ministries.length === 0}>
              <option value="">Sélectionner</option>
              {ministryOptions.map((ministry) => (
                <option key={ministry.name} value={ministry.id}>
                  {ministry.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Direction / Service
            <input className="control" name="focalDepartment" required />
          </label>
          <label className="field">
            Téléphone
            <input className="control" name="focalPhone" type="tel" required />
          </label>
          <label className="field">
            Email
            <input className="control" name="focalEmail" type="email" required />
          </label>
          <label className="field">
            Contact technique (optionnel)
            <input className="control" name="technicalContact" />
          </label>
        </div>
      </section>

      <section className="form-section">
        <div>
          <p className="eyebrow">Étape 2</p>
          <h2>Objet de la demande</h2>
        </div>
        <div className="checkbox-grid">
          {requestTypes.map((type) => (
            <label className="check-item" key={type.value}>
              <input name="requestTypes" type="checkbox" value={type.value} />
              {type.label}
            </label>
          ))}
        </div>
        <label className="field">
          Détails utiles
          <textarea className="control" name="requestDetails" />
        </label>
      </section>

      <section className="form-section">
        <div>
          <p className="eyebrow">Étape 3</p>
          <h2>Plateforme et nom de domaine</h2>
        </div>
        <div className="form-grid two">
          <label className="field">
            Nom de la plateforme
            <input className="control" name="platformName" required />
          </label>
          <label className="field">
            Type de plateforme
            <select className="control" name="platformType" required>
              <option value="">Sélectionner</option>
              {platformTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Public cible
            <select className="control" name="audience" required>
              <option value="">Sélectionner</option>
              {audienceTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Niveau de criticité
            <select className="control" name="criticality" required>
              <option value="">Sélectionner</option>
              {criticalityLevels.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field full">
            Finalité officielle
            <textarea className="control" name="officialPurpose" minLength={10} required />
          </label>
        </div>
        <div className="form-grid">
          {['Nom de domaine souhaité', 'Alternative 1 (optionnel)', 'Alternative 2 (optionnel)'].map((label, index) => (
            <label className="field" key={label}>
              {label}
              <span className="domain-suffix">
                <input className="control" name={`prefix${index + 1}`} placeholder="economie" required={index === 0} />
                <span>.gouv.cd</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="form-section">
        <div>
          <p className="eyebrow">Étape 4</p>
          <h2>Documents obligatoires</h2>
        </div>
        <div className="form-grid two">
          <label className="field">
            Lettre officielle de demande
            <input className="control" name="officialLetter" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" required />
          </label>
          <label className="field">
            Lettre de désignation du Point Focal
            <input className="control" name="designationLetter" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" required />
          </label>
        </div>
      </section>

      <section className="form-section">
        <div>
          <p className="eyebrow">Déclaration</p>
          <h2>Engagements</h2>
        </div>
        <div className="checkbox-grid">
          {[
            'Je certifie être le Point Focal officiellement désigné.',
            'Je certifie que les informations fournies sont exactes.',
            'Je certifie que les documents transmis sont authentiques.',
            'Les ressources seront utilisées dans le cadre des missions officielles.',
          ].map((text) => (
            <label className="check-item" key={text}>
              <input type="checkbox" required />
              {text}
            </label>
          ))}
        </div>
        <div className="actions">
          <button className="button primary" type="submit" disabled={isSubmitting}>
            <Send size={18} aria-hidden="true" />
            {isSubmitting ? 'Soumission...' : 'Soumettre la demande'}
          </button>
        </div>
      </section>
    </form>
  );
}
