'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Activity, KeyRound, ShieldCheck, UserCircle } from 'lucide-react';
import { AdminShell } from '@/components/admin-shell';
import {
  AdminAccount,
  adminFetch,
  displayMinistryName,
  formatDate,
  getAdminToken,
  getStoredAdminUser,
} from '@/lib/admin-api';

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Super administrateur',
  ADMIN: 'Administrateur',
  AGENT: 'Agent',
  POINT_FOCAL: 'Point Focal',
};

function rolesLabel(roles: string[]) {
  return roles.map((role) => roleLabels[role] ?? role).join(', ');
}

function accountScope(profile: AdminAccount | null) {
  if (!profile) return 'Compte connecté';
  if (
    profile.roles.includes('POINT_FOCAL') &&
    !profile.roles.some((role) => ['AGENT', 'ADMIN', 'SUPER_ADMIN'].includes(role))
  ) {
    return 'Espace de suivi, échanges avec le service instructeur et consultation des dossiers rattachés.';
  }
  if (profile.roles.includes('SUPER_ADMIN')) {
    return 'Gestion complète des dossiers, ministères, utilisateurs et comptes administratifs.';
  }
  if (profile.roles.includes('ADMIN')) {
    return 'Instruction des dossiers, messagerie et gestion opérationnelle selon les droits accordés.';
  }
  return 'Instruction des dossiers et échanges avec les Points Focaux.';
}

export default function AccountPage() {
  const router = useRouter();
  const storedUser = getStoredAdminUser();
  const [profile, setProfile] = useState<AdminAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (!getAdminToken()) {
      router.replace('/admin/login');
      return;
    }

    adminFetch<AdminAccount>('/auth/me')
      .then(setProfile)
      .catch((exception) => {
        setError(exception instanceof Error ? exception.message : 'Impossible de charger le compte.');
      })
      .finally(() => setIsLoading(false));
  }, [router]);

  const isPointFocalOnly = useMemo(
    () =>
      profile?.roles.includes('POINT_FOCAL') &&
      !profile.roles.some((role) => ['AGENT', 'ADMIN', 'SUPER_ADMIN'].includes(role)),
    [profile],
  );

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('La confirmation du nouveau mot de passe ne correspond pas.');
      return;
    }

    setIsSaving(true);
    try {
      const result = await adminFetch<{ message: string }>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(passwordForm),
      });
      setSuccess(result.message);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Modification impossible.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AdminShell>
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Compte</p>
          <h1>Paramètres du compte</h1>
        </div>
        <span className="admin-count">
          <UserCircle size={17} aria-hidden="true" />
          {isLoading ? 'Chargement...' : rolesLabel(profile?.roles ?? storedUser?.roles ?? [])}
        </span>
      </div>

      {error ? <p className="form-alert">{error}</p> : null}
      {success ? <p className="form-alert success">{success}</p> : null}

      <section className="account-grid">
        <article className="admin-section account-card">
          <div className="admin-section-title">
            <h2>Profil</h2>
            <span className="admin-count">
              <UserCircle size={17} aria-hidden="true" />
              Identité
            </span>
          </div>
          <dl className="admin-definition-list">
            <div>
              <dt>Nom complet</dt>
              <dd>{[profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || 'Non renseigné'}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{profile?.email ?? storedUser?.email ?? 'Non renseigné'}</dd>
            </div>
            <div>
              <dt>Téléphone</dt>
              <dd>{profile?.phone ?? 'Non renseigné'}</dd>
            </div>
            <div>
              <dt>Fonction</dt>
              <dd>{profile?.functionTitle ?? 'Non renseigné'}</dd>
            </div>
            <div>
              <dt>Direction / service</dt>
              <dd>{profile?.department ?? 'Non renseigné'}</dd>
            </div>
            <div>
              <dt>Institution</dt>
              <dd>
                {profile?.ministry
                  ? displayMinistryName({
                      ministry: profile.ministry,
                      otherInstitutionName: profile.otherInstitutionName,
                    })
                  : profile?.otherInstitutionName ?? 'Non renseigné'}
              </dd>
            </div>
          </dl>
        </article>

        <article className="admin-section account-card">
          <div className="admin-section-title">
            <h2>Sécurité</h2>
            <span className="admin-count">
              <ShieldCheck size={17} aria-hidden="true" />
              Actif
            </span>
          </div>
          <dl className="admin-definition-list">
            <div>
              <dt>Rôle</dt>
              <dd>{rolesLabel(profile?.roles ?? storedUser?.roles ?? [])}</dd>
            </div>
            <div>
              <dt>Statut</dt>
              <dd>{profile?.isActive ? 'Compte actif' : 'Compte désactivé'}</dd>
            </div>
            <div>
              <dt>Création</dt>
              <dd>{formatDate(profile?.createdAt)}</dd>
            </div>
            <div>
              <dt>Portée</dt>
              <dd>{accountScope(profile)}</dd>
            </div>
          </dl>
        </article>
      </section>

      <section className="account-grid">
        <article className="admin-section account-card">
          <div className="admin-section-title">
            <h2>Changer le mot de passe</h2>
            <span className="admin-count">
              <KeyRound size={17} aria-hidden="true" />
              Personnel
            </span>
          </div>
          <form className="account-password-form" onSubmit={handleChangePassword}>
            <label className="field">
              Mot de passe actuel
              <input
                className="control"
                type="password"
                minLength={8}
                value={passwordForm.currentPassword}
                onChange={(event) =>
                  setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))
                }
                required
              />
            </label>
            <label className="field">
              Nouveau mot de passe
              <input
                className="control"
                type="password"
                minLength={10}
                value={passwordForm.newPassword}
                onChange={(event) =>
                  setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))
                }
                required
              />
            </label>
            <label className="field">
              Confirmer le nouveau mot de passe
              <input
                className="control"
                type="password"
                minLength={10}
                value={passwordForm.confirmPassword}
                onChange={(event) =>
                  setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))
                }
                required
              />
            </label>
            <button className="button primary" type="submit" disabled={isSaving}>
              <KeyRound size={18} aria-hidden="true" />
              {isSaving ? 'Modification...' : 'Modifier le mot de passe'}
            </button>
          </form>
        </article>

        <article className="admin-section account-card">
          <div className="admin-section-title">
            <h2>Activité et responsabilités</h2>
            <span className="admin-count">
              <Activity size={17} aria-hidden="true" />
              Synthèse
            </span>
          </div>
          <div className="account-guidance">
            {isPointFocalOnly ? (
              <>
                <p>
                  Votre compte vous permet de suivre vos dossiers, d’envoyer des compléments et d’échanger avec le
                  service instructeur.
                </p>
                <Link className="button secondary compact-button" href="/admin/point-focal">
                  Voir mes dossiers
                </Link>
              </>
            ) : (
              <>
                <p>
                  Les actions administratives importantes sont historisées dans les dossiers concernés. Les modifications
                  de compte et de mot de passe sont aussi enregistrées.
                </p>
                <Link className="button secondary compact-button" href="/admin/utilisateurs">
                  Gérer les utilisateurs
                </Link>
              </>
            )}
          </div>
        </article>
      </section>
    </AdminShell>
  );
}
