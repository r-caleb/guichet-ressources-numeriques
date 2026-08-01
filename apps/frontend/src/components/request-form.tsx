'use client';

import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { Download, Printer, RotateCcw, Send } from 'lucide-react';
import { Ministry, RequestReceipt, apiFetch, receiptPdfUrl } from '@/lib/api';
import {
  accessResetTypes,
  accessResetUrgencyLevels,
  audienceTypes,
  criticalityLevels,
  ministries as fallbackMinistries,
  platformTypes,
  requestTypes,
  resourceModificationTypes,
} from '@/lib/constants';

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
  requestDetails?: string;
  isAccessReset: boolean;
  isResourceModification: boolean;
};

function optionLabel(options: Array<{ label: string; value: string }>, value: FormDataEntryValue | null) {
  return options.find((option) => option.value === value)?.label ?? String(value ?? '');
}

function RequiredMark() {
  return (
    <span className="required-mark" aria-label="obligatoire">
      *
    </span>
  );
}

function RequiredLabel({ children }: { children: ReactNode }) {
  return (
    <span className="field-label">
      {children} <RequiredMark />
    </span>
  );
}

function fallbackMinistryId(name: string) {
  return `fallback:${name}`;
}

export function RequestForm() {
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [selectedMinistryId, setSelectedMinistryId] = useState('');
  const [selectedRequestType, setSelectedRequestType] = useState('');
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
      id: fallbackMinistryId(name),
      name,
      isActive: true,
    }));
  }, [ministries]);

  const selectedMinistry = useMemo(
    () => ministryOptions.find((ministry) => ministry.id === selectedMinistryId),
    [ministryOptions, selectedMinistryId],
  );
  const isOtherInstitution = selectedMinistry?.name.toLowerCase() === 'autre institution publique';
  const isOtherRequestType = selectedRequestType === 'OTHER';
  const isAccessReset = selectedRequestType === 'ACCESS_RESET';
  const isResourceModification = selectedRequestType === 'RESOURCE_MODIFICATION';
  const isExistingResourceRequest = isAccessReset || isResourceModification;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    const ministryId = String(formData.get('ministryId') ?? '');

    if (!ministryId || ministryId.startsWith('fallback:')) {
      setError("Les ministères ne sont pas encore chargés. Vérifiez que l'API backend est lancée.");
      setIsSubmitting(false);
      return;
    }

    try {
      if (!formData.get('requestTypes')) {
        setError("Veuillez sélectionner l'objet de la demande.");
        return;
      }

      if (isOtherInstitution && !String(formData.get('otherInstitutionName') ?? '').trim()) {
        setError("Veuillez renseigner le nom de l'institution publique.");
        return;
      }

      if (isOtherRequestType && !String(formData.get('requestDetails') ?? '').trim()) {
        setError("Veuillez préciser les détails utiles pour l'objet Autre.");
        return;
      }

      if (isAccessReset) {
        const resourceDomain = String(formData.get('resourceDomain') ?? '').trim();
        const accessType = String(formData.get('resetAccessType') ?? '').trim();
        const concernedAccount = String(formData.get('concernedAccount') ?? '').trim();
        const resetReason = String(formData.get('resetReason') ?? '').trim();
        const urgency = String(formData.get('resetUrgency') ?? '').trim();

        if (!resourceDomain || !accessType || !resetReason || !urgency) {
          setError("Veuillez compléter les informations de la ressource concernée par la réinitialisation.");
          return;
        }

        const normalizedResource = resourceDomain.replace(/\.gouv\.cd$/i, '');
        const accessTypeLabel = optionLabel(accessResetTypes, accessType);
        const urgencyLabel = optionLabel(accessResetUrgencyLevels, urgency);
        const requestDetails = [
          `Type d'accès concerné : ${accessTypeLabel}`,
          concernedAccount ? `Compte ou utilisateur concerné : ${concernedAccount}` : null,
          `Motif : ${resetReason}`,
          `Niveau d'urgence : ${urgencyLabel}`,
        ]
          .filter(Boolean)
          .join('\n');

        formData.set('platformName', `Réinitialisation des accès - ${normalizedResource}.gouv.cd`);
        formData.set('platformType', 'OTHER');
        formData.set('audience', 'INTERNAL_ONLY');
        formData.set('criticality', urgency === 'CRITICAL' ? 'CRITICAL' : urgency === 'URGENT' ? 'HIGH' : 'NORMAL');
        formData.set('officialPurpose', `Réinitialisation des accès : ${resetReason}`);
        formData.set('prefix1', normalizedResource);
        formData.set('requestDetails', requestDetails);
        formData.delete('resourceDomain');
        formData.delete('resetAccessType');
        formData.delete('concernedAccount');
        formData.delete('resetReason');
        formData.delete('resetUrgency');
      }

      if (isResourceModification) {
        const resourceDomain = String(formData.get('modificationResourceDomain') ?? '').trim();
        const modificationType = String(formData.get('modificationType') ?? '').trim();
        const modificationDescription = String(formData.get('modificationDescription') ?? '').trim();
        const administrativeJustification = String(formData.get('administrativeJustification') ?? '').trim();
        const criticality = String(formData.get('modificationCriticality') ?? '').trim();

        if (!resourceDomain || !modificationType || !modificationDescription || !administrativeJustification || !criticality) {
          setError('Veuillez compléter les informations de la ressource à modifier.');
          return;
        }

        const normalizedResource = resourceDomain.replace(/\.gouv\.cd$/i, '');
        const modificationTypeLabel = optionLabel(resourceModificationTypes, modificationType);
        const criticalityLabel = optionLabel(criticalityLevels, criticality);
        const requestDetails = [
          `Type de modification : ${modificationTypeLabel}`,
          `Description de la modification : ${modificationDescription}`,
          `Justification administrative : ${administrativeJustification}`,
          `Niveau de criticité : ${criticalityLabel}`,
        ].join('\n');

        formData.set('platformName', `Modification des ressources - ${normalizedResource}.gouv.cd`);
        formData.set('platformType', 'OTHER');
        formData.set('audience', 'INTERNAL_ONLY');
        formData.set('criticality', criticality);
        formData.set('officialPurpose', `Modification des ressources : ${administrativeJustification}`);
        formData.set('prefix1', normalizedResource);
        formData.set('requestDetails', requestDetails);
        formData.delete('modificationResourceDomain');
        formData.delete('modificationType');
        formData.delete('modificationDescription');
        formData.delete('administrativeJustification');
        formData.delete('modificationCriticality');
      }

      const receipt = await apiFetch<RequestReceipt>('/requests', {
        method: 'POST',
        body: formData,
      });

      const selectedMinistry = ministryOptions.find((ministry) => ministry.id === formData.get('ministryId'));
      const otherInstitutionName = String(formData.get('otherInstitutionName') ?? '').trim();
      const ministryName =
        selectedMinistry?.name && otherInstitutionName
          ? `${selectedMinistry.name} - ${otherInstitutionName}`
          : selectedMinistry?.name ?? '';
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
        ministryName,
        requestTypes: selectedRequestTypes,
        platformType: optionLabel(platformTypes, formData.get('platformType')),
        audience: optionLabel(audienceTypes, formData.get('audience')),
        criticality: optionLabel(criticalityLevels, formData.get('criticality')),
        officialPurpose: String(formData.get('officialPurpose') ?? ''),
        domains,
        documents,
        requestDetails: String(formData.get('requestDetails') ?? ''),
        isAccessReset,
        isResourceModification,
      });

      form.reset();
      setSelectedMinistryId('');
      setSelectedRequestType('');
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
                <dt>{summary.isAccessReset || summary.isResourceModification ? 'Ressource concernée' : 'Plateforme'}</dt>
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
              {!summary.isAccessReset && !summary.isResourceModification ? (
                <>
                  <div>
                    <dt>Type de plateforme</dt>
                    <dd>{summary.platformType}</dd>
                  </div>
                  <div>
                    <dt>Public cible</dt>
                    <dd>{summary.audience}</dd>
                  </div>
                </>
              ) : null}
              <div>
                <dt>Criticité</dt>
                <dd>{summary.criticality}</dd>
              </div>
            </dl>
          </article>

          <article>
            <h3>{summary.isAccessReset || summary.isResourceModification ? 'Domaine concerné' : 'Domaines proposés'}</h3>
            <ol className="receipt-items">
              {summary.domains.map((domain) => (
                <li key={domain}>{domain}</li>
              ))}
            </ol>
          </article>

          <article className="receipt-full">
            <h3>{summary.isAccessReset || summary.isResourceModification ? 'Motif de la demande' : 'Finalité officielle'}</h3>
            <p>{summary.officialPurpose}</p>
          </article>

          {summary.isAccessReset && summary.requestDetails ? (
            <article className="receipt-full">
              <h3>Détails de réinitialisation</h3>
              <p className="receipt-details">{summary.requestDetails}</p>
            </article>
          ) : null}

          {summary.isResourceModification && summary.requestDetails ? (
            <article className="receipt-full">
              <h3>Détails de modification</h3>
              <p className="receipt-details">{summary.requestDetails}</p>
            </article>
          ) : null}

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
            <RequiredLabel>Nom</RequiredLabel>
            <input className="control" name="focalLastName" required />
          </label>
          <label className="field">
            <RequiredLabel>Postnom</RequiredLabel>
            <input className="control" name="focalMiddleName" required />
          </label>
          <label className="field">
            <RequiredLabel>Prénom</RequiredLabel>
            <input className="control" name="focalFirstName" required />
          </label>
          <label className="field">
            <RequiredLabel>Fonction</RequiredLabel>
            <input className="control" name="focalFunction" required />
          </label>
          <label className="field">
            <RequiredLabel>Ministère / Institution</RequiredLabel>
            <select
              className="control"
              name="ministryId"
              value={selectedMinistryId}
              onChange={(event) => setSelectedMinistryId(event.target.value)}
              required
              disabled={ministryOptions.length === 0}
            >
              <option value="">Sélectionner</option>
              {ministryOptions.map((ministry) => (
                <option key={ministry.name} value={ministry.id}>
                  {ministry.name}
                </option>
              ))}
            </select>
          </label>
          {isOtherInstitution ? (
            <label className="field">
              <RequiredLabel>Nom de l'institution</RequiredLabel>
              <input className="control" name="otherInstitutionName" required={isOtherInstitution} />
            </label>
          ) : null}
          <label className="field">
            <RequiredLabel>Direction / Service</RequiredLabel>
            <input className="control" name="focalDepartment" required />
          </label>
          <label className="field">
            <RequiredLabel>Téléphone</RequiredLabel>
            <input className="control" name="focalPhone" type="tel" required />
          </label>
          <label className="field">
            <RequiredLabel>Email</RequiredLabel>
            <input className="control" name="focalEmail" type="email" required />
          </label>
          <label className="field">
            <span className="field-label">Contact technique (si prestataire externe, mettre son numéro)</span>
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
              <input
                name="requestTypes"
                type="radio"
                value={type.value}
                checked={selectedRequestType === type.value}
                onChange={(event) => setSelectedRequestType(event.target.value)}
                required
              />
              {type.label}
            </label>
          ))}
        </div>
        {isOtherRequestType ? (
          <label className="field">
            <RequiredLabel>Détails utiles</RequiredLabel>
            <textarea className="control" name="requestDetails" required={isOtherRequestType} />
          </label>
        ) : null}
      </section>

      <section className="form-section">
        <div>
          <p className="eyebrow">Étape 3</p>
          <h2>{isExistingResourceRequest ? 'Ressource concernée' : 'Plateforme et nom de domaine'}</h2>
        </div>
        {isAccessReset ? (
          <div className="form-grid two">
            <label className="field">
              <RequiredLabel>Domaine concerné</RequiredLabel>
              <span className="domain-suffix">
                <input className="control" name="resourceDomain" placeholder="economie" required={isAccessReset} />
                <span>.gouv.cd</span>
              </span>
            </label>
            <label className="field">
              <RequiredLabel>Type d'accès concerné</RequiredLabel>
              <select className="control" name="resetAccessType" required={isAccessReset}>
                <option value="">Sélectionner</option>
                {accessResetTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Compte ou utilisateur concerné</span>
              <input className="control" name="concernedAccount" placeholder="Si connu" />
            </label>
            <label className="field">
              <RequiredLabel>Niveau d'urgence</RequiredLabel>
              <select className="control" name="resetUrgency" required={isAccessReset}>
                <option value="">Sélectionner</option>
                {accessResetUrgencyLevels.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field full">
              <RequiredLabel>Motif de la réinitialisation</RequiredLabel>
              <textarea
                className="control"
                name="resetReason"
                minLength={10}
                placeholder="Exemple : perte des accès après changement de Point Focal."
                required={isAccessReset}
              />
            </label>
          </div>
        ) : isResourceModification ? (
          <div className="form-grid two">
            <label className="field">
              <RequiredLabel>Domaine concerné</RequiredLabel>
              <span className="domain-suffix">
                <input
                  className="control"
                  name="modificationResourceDomain"
                  placeholder="economie"
                  required={isResourceModification}
                />
                <span>.gouv.cd</span>
              </span>
            </label>
            <label className="field">
              <RequiredLabel>Type de modification</RequiredLabel>
              <select className="control" name="modificationType" required={isResourceModification}>
                <option value="">Sélectionner</option>
                {resourceModificationTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <RequiredLabel>Niveau de criticité</RequiredLabel>
              <select className="control" name="modificationCriticality" required={isResourceModification}>
                <option value="">Sélectionner</option>
                {criticalityLevels.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field full">
              <RequiredLabel>Description de la modification</RequiredLabel>
              <textarea
                className="control"
                name="modificationDescription"
                minLength={10}
                placeholder="Exemple : pointer le domaine vers une nouvelle adresse IP."
                required={isResourceModification}
              />
            </label>
            <label className="field full">
              <RequiredLabel>Justification administrative</RequiredLabel>
              <textarea
                className="control"
                name="administrativeJustification"
                minLength={10}
                placeholder="Exemple : migration vers une nouvelle infrastructure du ministère."
                required={isResourceModification}
              />
            </label>
          </div>
        ) : (
          <>
            <div className="form-grid two">
              <label className="field">
                <RequiredLabel>Nom de la plateforme</RequiredLabel>
                <input className="control" name="platformName" required={!isExistingResourceRequest} />
              </label>
              <label className="field">
                <RequiredLabel>Type de plateforme</RequiredLabel>
                <select className="control" name="platformType" required={!isExistingResourceRequest}>
                  <option value="">Sélectionner</option>
                  {platformTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <RequiredLabel>Public cible</RequiredLabel>
                <select className="control" name="audience" required={!isExistingResourceRequest}>
                  <option value="">Sélectionner</option>
                  {audienceTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <RequiredLabel>Niveau de criticité</RequiredLabel>
                <select className="control" name="criticality" required={!isExistingResourceRequest}>
                  <option value="">Sélectionner</option>
                  {criticalityLevels.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field full">
                <RequiredLabel>Finalité officielle</RequiredLabel>
                <textarea className="control" name="officialPurpose" minLength={10} required={!isExistingResourceRequest} />
              </label>
            </div>
            <div className="form-grid">
              {['Nom de domaine souhaité', 'Alternative 1', 'Alternative 2'].map((label, index) => (
                <label className="field" key={label}>
                  {index === 0 ? <RequiredLabel>{label}</RequiredLabel> : <span className="field-label">{label}</span>}
                  <span className="domain-suffix">
                    <input
                      className="control"
                      name={`prefix${index + 1}`}
                      placeholder="economie"
                      required={index === 0 && !isExistingResourceRequest}
                    />
                    <span>.gouv.cd</span>
                  </span>
                </label>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="form-section">
        <div>
          <p className="eyebrow">Étape 4</p>
          <h2>Documents obligatoires</h2>
        </div>
        <div className="form-grid two">
          <label className="field">
            <RequiredLabel>Lettre officielle de demande</RequiredLabel>
            <input className="control" name="officialLetter" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp" required />
          </label>
          <label className="field">
            <RequiredLabel>Lettre de désignation du Point Focal</RequiredLabel>
            <input className="control" name="designationLetter" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp" required />
          </label>
        </div>
      </section>

      <section className="form-section">
        <div>
          <p className="eyebrow">Déclaration</p>
          <h2>
            Engagements <RequiredMark />
          </h2>
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
              <span>{text}</span>
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
