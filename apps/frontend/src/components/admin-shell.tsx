'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BarChart3, Building2, FileText, LogOut, Users } from 'lucide-react';
import { clearAdminSession, getStoredAdminUser } from '@/lib/admin-api';

const links = [
  { href: '/admin/dashboard', label: 'Tableau de bord', icon: BarChart3 },
  { href: '/admin/dossiers', label: 'Dossiers', icon: FileText },
  { href: '/admin/ministeres', label: 'Ministères', icon: Building2 },
  { href: '/admin/utilisateurs', label: 'Utilisateurs', icon: Users },
];

export function AdminShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const user = getStoredAdminUser();
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Agent';

  function handleLogout() {
    clearAdminSession();
    router.replace('/admin/login');
  }

  return (
    <main className="page admin-grid">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <span>Back-office</span>
          <strong>Ressources numériques</strong>
        </div>
        <nav className="admin-nav" aria-label="Navigation administration">
          {links.map(({ href, label, icon: Icon }) => (
            <Link className={pathname.startsWith(href) ? 'active' : ''} href={href} key={href}>
              <Icon size={17} aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="admin-user-card">
          <span>Session agent</span>
          <strong>{displayName}</strong>
          <small>{user?.roles?.join(', ') ?? 'Rôle non chargé'}</small>
          <button type="button" onClick={handleLogout}>
            <LogOut size={16} aria-hidden="true" />
            Déconnexion
          </button>
        </div>
      </aside>
      <section className="admin-panel">{children}</section>
    </main>
  );
}
