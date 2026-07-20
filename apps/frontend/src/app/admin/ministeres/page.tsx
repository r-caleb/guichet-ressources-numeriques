'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Plus, RotateCcw, Save, Trash2, X } from 'lucide-react';
import { AdminShell } from '@/components/admin-shell';
import { Ministry } from '@/lib/api';
import { adminFetch, getAdminToken } from '@/lib/admin-api';

export default function AdminMinistriesPage() {
  const router = useRouter();
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [editingMinistry, setEditingMinistry] = useState<Ministry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadMinistries() {
    setIsLoading(true);
    setError('');
    try {
      setMinistries(await adminFetch<Ministry[]>('/admin/ministries'));
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Chargement impossible.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!getAdminToken()) {
      router.replace('/admin/login');
      return;
    }
    loadMinistries();
  }, [router]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsCreating(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      await adminFetch<Ministry>('/ministries', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.get('name'),
          shortName: formData.get('shortName') || undefined,
          officialEmailDomain: formData.get('officialEmailDomain') || undefined,
        }),
      });
      form.reset();
      setSuccess('Ministère ajouté.');
      await loadMinistries();
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : "Le ministère n'a pas été ajouté.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingMinistry) return;

    setError('');
    setSuccess('');
    setIsSaving(true);

    const formData = new FormData(event.currentTarget);

    try {
      const updated = await adminFetch<Ministry>(`/admin/ministries/${editingMinistry.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: formData.get('name'),
          shortName: formData.get('shortName') || undefined,
          officialEmailDomain: formData.get('officialEmailDomain') || undefined,
          isActive: editingMinistry.isActive,
        }),
      });

      setMinistries((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setEditingMinistry(null);
      setSuccess('Ministère modifié.');
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : "Le ministère n'a pas été modifié.");
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleStatus(ministry: Ministry) {
    const nextStatus = !ministry.isActive;
    const action = nextStatus ? 'réactiver' : 'supprimer';

    if (!window.confirm(`Confirmer : ${action} ${ministry.name} ?`)) return;

    setError('');
    setSuccess('');

    try {
      const updated = await adminFetch<Ministry>(`/admin/ministries/${ministry.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: nextStatus }),
      });
      setMinistries((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      if (editingMinistry?.id === ministry.id) setEditingMinistry(null);
      setSuccess(nextStatus ? 'Ministère réactivé.' : 'Ministère supprimé du formulaire public.');
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Modification impossible.');
    }
  }

  return (
    <AdminShell>
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Référentiel</p>
          <h1>Ministères et institutions</h1>
        </div>
        <span className="admin-count">{isLoading ? '...' : `${ministries.length} entrée(s)`}</span>
      </div>

      {error ? <p className="form-alert">{error}</p> : null}
      {success ? <p className="form-alert success">{success}</p> : null}

      <section className="admin-section">
        <div className="admin-section-title">
          <h2>{editingMinistry ? 'Modifier une institution' : 'Ajouter une institution'}</h2>
          {editingMinistry ? (
            <button className="button secondary compact-button" type="button" onClick={() => setEditingMinistry(null)}>
              <X size={17} aria-hidden="true" />
              Annuler
            </button>
          ) : null}
        </div>
        {editingMinistry ? (
          <form className="admin-inline-form" onSubmit={handleUpdate} key={editingMinistry.id}>
            <label className="field">
              Nom officiel
              <input className="control" name="name" defaultValue={editingMinistry.name} required />
            </label>
            <label className="field">
              Sigle
              <input className="control" name="shortName" defaultValue={editingMinistry.shortName ?? ''} />
            </label>
            <label className="field">
              Domaine email
              <input
                className="control"
                name="officialEmailDomain"
                defaultValue={editingMinistry.officialEmailDomain ?? ''}
                placeholder="exemple.gouv.cd"
              />
            </label>
            <button className="button primary" type="submit" disabled={isSaving}>
              <Save size={17} aria-hidden="true" />
              {isSaving ? 'Modification...' : 'Enregistrer'}
            </button>
          </form>
        ) : (
          <form className="admin-inline-form" onSubmit={handleCreate}>
            <label className="field">
              Nom officiel
              <input className="control" name="name" required />
            </label>
            <label className="field">
              Sigle
              <input className="control" name="shortName" />
            </label>
            <label className="field">
              Domaine email
              <input className="control" name="officialEmailDomain" placeholder="exemple.gouv.cd" />
            </label>
            <button className="button primary" type="submit" disabled={isCreating}>
              <Plus size={17} aria-hidden="true" />
              {isCreating ? 'Ajout...' : 'Ajouter'}
            </button>
          </form>
        )}
      </section>

      <section className="admin-section">
        <div className="admin-section-title">
          <h2>Liste administrative</h2>
        </div>
        <div className="table-shell admin-table-shell">
          <table>
            <thead>
              <tr>
                <th>Institution</th>
                <th>Sigle</th>
                <th>Domaine email</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {ministries.map((ministry) => (
                <tr key={ministry.id}>
                  <td>
                    <strong>{ministry.name}</strong>
                  </td>
                  <td>{ministry.shortName || 'Non renseigné'}</td>
                  <td>{ministry.officialEmailDomain || 'Non renseigné'}</td>
                  <td>
                    <span className={`status ${ministry.isActive ? 'status-approved' : 'status-closed'}`}>
                      {ministry.isActive ? 'Actif' : 'Supprimé'}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="icon-action"
                        type="button"
                        onClick={() => setEditingMinistry(ministry)}
                        aria-label={`Modifier ${ministry.name}`}
                      >
                        <Pencil size={17} aria-hidden="true" />
                      </button>
                      <button
                        className={`icon-action ${ministry.isActive ? 'danger-action' : ''}`}
                        type="button"
                        onClick={() => toggleStatus(ministry)}
                        aria-label={ministry.isActive ? `Supprimer ${ministry.name}` : `Réactiver ${ministry.name}`}
                      >
                        {ministry.isActive ? (
                          <Trash2 size={17} aria-hidden="true" />
                        ) : (
                          <RotateCcw size={17} aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && ministries.length === 0 ? (
                <tr>
                  <td colSpan={5}>Aucune institution enregistrée.</td>
                </tr>
              ) : null}
              {isLoading ? (
                <tr>
                  <td colSpan={5}>Chargement des institutions...</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}
