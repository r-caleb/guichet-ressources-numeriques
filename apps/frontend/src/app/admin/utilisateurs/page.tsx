'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Pencil, Plus, RotateCcw, Save, Trash2, UserRound, X } from 'lucide-react';
import { AdminShell } from '@/components/admin-shell';
import { AdminAccount, UserRole, adminFetch, formatDate, getAdminToken } from '@/lib/admin-api';

const roleLabels: Record<UserRole, string> = {
  AGENT: 'Agent',
  ADMIN: 'Administrateur',
  SUPER_ADMIN: 'Super administrateur',
};

function primaryRole(user: AdminAccount) {
  return user.roles[0] ?? 'AGENT';
}

function roleText(roles: UserRole[]) {
  return roles.map((role) => roleLabels[role] ?? role).join(', ');
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminAccount[]>([]);
  const [editingUser, setEditingUser] = useState<AdminAccount | null>(null);
  const [resettingUser, setResettingUser] = useState<AdminAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadUsers() {
    setIsLoading(true);
    setError('');
    try {
      setUsers(await adminFetch<AdminAccount[]>('/admin/users'));
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
    loadUsers();
  }, [router]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsCreating(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const role = String(formData.get('role') || 'AGENT') as UserRole;

    try {
      await adminFetch<AdminAccount>('/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          email: formData.get('email'),
          password: formData.get('password'),
          firstName: formData.get('firstName'),
          lastName: formData.get('lastName'),
          phone: formData.get('phone') || undefined,
          roles: [role],
        }),
      });
      form.reset();
      setSuccess('Utilisateur créé.');
      await loadUsers();
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : "L'utilisateur n'a pas été créé.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingUser) return;

    setError('');
    setSuccess('');
    setIsSaving(true);

    const formData = new FormData(event.currentTarget);
    const role = String(formData.get('role') || 'AGENT') as UserRole;

    try {
      const updated = await adminFetch<AdminAccount>(`/admin/users/${editingUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          email: formData.get('email'),
          firstName: formData.get('firstName'),
          lastName: formData.get('lastName'),
          phone: formData.get('phone') || undefined,
          roles: [role],
          isActive: editingUser.isActive,
        }),
      });

      setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setEditingUser(null);
      setSuccess('Utilisateur modifié.');
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : "L'utilisateur n'a pas été modifié.");
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleStatus(user: AdminAccount) {
    const nextStatus = !user.isActive;
    const action = nextStatus ? 'réactiver' : 'supprimer';

    if (!window.confirm(`Confirmer : ${action} le compte ${user.firstName} ${user.lastName} ?`)) return;

    setError('');
    setSuccess('');

    try {
      const updated = await adminFetch<AdminAccount>(`/admin/users/${user.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: nextStatus }),
      });
      setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      if (editingUser?.id === user.id) setEditingUser(null);
      if (resettingUser?.id === user.id) setResettingUser(null);
      setSuccess(nextStatus ? 'Utilisateur réactivé.' : 'Utilisateur supprimé du back-office.');
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Modification impossible.');
    }
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resettingUser) return;

    setError('');
    setSuccess('');
    setIsResetting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      await adminFetch<AdminAccount>(`/admin/users/${resettingUser.id}/password`, {
        method: 'PATCH',
        body: JSON.stringify({ password: formData.get('password') }),
      });
      form.reset();
      setResettingUser(null);
      setSuccess('Mot de passe réinitialisé.');
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Réinitialisation impossible.');
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <AdminShell>
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Habilitations</p>
          <h1>Utilisateurs</h1>
        </div>
        <span className="admin-count">{isLoading ? '...' : `${users.length} compte(s)`}</span>
      </div>

      {error ? <p className="form-alert">{error}</p> : null}
      {success ? <p className="form-alert success">{success}</p> : null}

      <section className="admin-section">
        <div className="admin-section-title">
          <h2>{editingUser ? 'Modifier un compte' : 'Créer un compte'}</h2>
          {editingUser ? (
            <button className="button secondary compact-button" type="button" onClick={() => setEditingUser(null)}>
              <X size={17} aria-hidden="true" />
              Annuler
            </button>
          ) : null}
        </div>

        {editingUser ? (
          <form className="admin-inline-form users-inline-form" onSubmit={handleUpdate} key={editingUser.id}>
            <label className="field">
              Prénom
              <input className="control" name="firstName" defaultValue={editingUser.firstName} required />
            </label>
            <label className="field">
              Nom
              <input className="control" name="lastName" defaultValue={editingUser.lastName} required />
            </label>
            <label className="field">
              Email
              <input className="control" name="email" type="email" defaultValue={editingUser.email} required />
            </label>
            <label className="field">
              Téléphone
              <input className="control" name="phone" defaultValue={editingUser.phone ?? ''} />
            </label>
            <label className="field">
              Rôle
              <select className="control" name="role" defaultValue={primaryRole(editingUser)}>
                <option value="AGENT">Agent</option>
                <option value="ADMIN">Administrateur</option>
                <option value="SUPER_ADMIN">Super administrateur</option>
              </select>
            </label>
            <button className="button primary" type="submit" disabled={isSaving}>
              <Save size={17} aria-hidden="true" />
              {isSaving ? 'Modification...' : 'Enregistrer'}
            </button>
          </form>
        ) : (
          <form className="admin-inline-form users-inline-form" onSubmit={handleCreate}>
            <label className="field">
              Prénom
              <input className="control" name="firstName" required />
            </label>
            <label className="field">
              Nom
              <input className="control" name="lastName" required />
            </label>
            <label className="field">
              Email
              <input className="control" name="email" type="email" required />
            </label>
            <label className="field">
              Téléphone
              <input className="control" name="phone" />
            </label>
            <label className="field">
              Rôle
              <select className="control" name="role" defaultValue="AGENT">
                <option value="AGENT">Agent</option>
                <option value="ADMIN">Administrateur</option>
                <option value="SUPER_ADMIN">Super administrateur</option>
              </select>
            </label>
            <label className="field">
              Mot de passe temporaire
              <input className="control" name="password" type="password" minLength={8} required />
            </label>
            <button className="button primary" type="submit" disabled={isCreating}>
              <Plus size={17} aria-hidden="true" />
              {isCreating ? 'Création...' : 'Créer'}
            </button>
          </form>
        )}
      </section>

      {resettingUser ? (
        <section className="admin-section">
          <div className="admin-section-title">
            <h2>Réinitialiser le mot de passe</h2>
            <button className="button secondary compact-button" type="button" onClick={() => setResettingUser(null)}>
              <X size={17} aria-hidden="true" />
              Annuler
            </button>
          </div>
          <form className="admin-inline-form reset-password-form" onSubmit={handleResetPassword}>
            <label className="field">
              Compte concerné
              <input
                className="control"
                value={`${resettingUser.firstName} ${resettingUser.lastName} - ${resettingUser.email}`}
                disabled
                readOnly
              />
            </label>
            <label className="field">
              Nouveau mot de passe
              <input className="control" name="password" type="password" minLength={8} required />
            </label>
            <button className="button primary" type="submit" disabled={isResetting}>
              <KeyRound size={17} aria-hidden="true" />
              {isResetting ? 'Réinitialisation...' : 'Réinitialiser'}
            </button>
          </form>
        </section>
      ) : null}

      <section className="admin-section">
        <div className="admin-section-title">
          <h2>Comptes back-office</h2>
        </div>
        <div className="table-shell admin-table-shell">
          <table>
            <thead>
              <tr>
                <th>Agent</th>
                <th>Email</th>
                <th>Rôles</th>
                <th>Statut</th>
                <th>Créé le</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <span className="user-cell">
                      <UserRound size={18} aria-hidden="true" />
                      <strong>
                        {user.firstName} {user.lastName}
                      </strong>
                    </span>
                  </td>
                  <td>{user.email}</td>
                  <td>{roleText(user.roles)}</td>
                  <td>
                    <span className={`status ${user.isActive ? 'status-approved' : 'status-closed'}`}>
                      {user.isActive ? 'Actif' : 'Supprimé'}
                    </span>
                  </td>
                  <td>{formatDate(user.createdAt)}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="icon-action"
                        type="button"
                        onClick={() => {
                          setEditingUser(user);
                          setResettingUser(null);
                        }}
                        aria-label={`Modifier ${user.firstName} ${user.lastName}`}
                      >
                        <Pencil size={17} aria-hidden="true" />
                      </button>
                      <button
                        className="icon-action"
                        type="button"
                        onClick={() => {
                          setResettingUser(user);
                          setEditingUser(null);
                        }}
                        aria-label={`Réinitialiser le mot de passe de ${user.firstName} ${user.lastName}`}
                      >
                        <KeyRound size={17} aria-hidden="true" />
                      </button>
                      <button
                        className={`icon-action ${user.isActive ? 'danger-action' : ''}`}
                        type="button"
                        onClick={() => toggleStatus(user)}
                        aria-label={
                          user.isActive
                            ? `Supprimer ${user.firstName} ${user.lastName}`
                            : `Réactiver ${user.firstName} ${user.lastName}`
                        }
                      >
                        {user.isActive ? (
                          <Trash2 size={17} aria-hidden="true" />
                        ) : (
                          <RotateCcw size={17} aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && users.length === 0 ? (
                <tr>
                  <td colSpan={6}>Aucun utilisateur enregistré.</td>
                </tr>
              ) : null}
              {isLoading ? (
                <tr>
                  <td colSpan={6}>Chargement des utilisateurs...</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}
