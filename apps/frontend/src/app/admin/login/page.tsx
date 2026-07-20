'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, ShieldCheck } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { LoginResponse, storeAdminSession } from '@/lib/admin-api';

export default function AdminLoginPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      const session = await apiFetch<LoginResponse>('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.get('email'),
          password: formData.get('password'),
        }),
      });

      storeAdminSession(session);
      router.replace('/admin/dashboard');
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Connexion impossible.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page admin-login-page">
      <section className="admin-login-panel">
        <div className="admin-login-badge">
          <ShieldCheck size={22} aria-hidden="true" />
        </div>
        <p className="eyebrow">Administration</p>
        <h1>Connexion agent</h1>
        <p>
          Accès réservé aux agents habilités du Secrétariat Général de l'Économie Numérique.
        </p>

        <form className="admin-login-form" onSubmit={handleSubmit}>
          {error ? <p className="form-alert">{error}</p> : null}
          <label className="field">
            Adresse email
            <input className="control" name="email" type="email" autoComplete="email" required />
          </label>
          <label className="field">
            Mot de passe
            <input className="control" name="password" type="password" autoComplete="current-password" required />
          </label>
          <button className="button primary" type="submit" disabled={isSubmitting}>
            <LogIn size={18} aria-hidden="true" />
            {isSubmitting ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </section>
    </main>
  );
}
