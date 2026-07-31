'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BarChart3, Building2, FileText, LogOut, MessageSquare, UserCircle, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AdminUser, clearAdminSession, getStoredAdminUser } from '@/lib/admin-api';

const links = [
  { href: '/admin/dashboard', label: 'Tableau de bord', icon: BarChart3 },
  { href: '/admin/dossiers', label: 'Dossiers', icon: FileText },
  { href: '/admin/messages', label: 'Messages', icon: MessageSquare },
  { href: '/admin/ministeres', label: 'Ministères', icon: Building2 },
  { href: '/admin/utilisateurs', label: 'Utilisateurs', icon: Users },
  { href: '/admin/compte', label: 'Compte', icon: UserCircle },
];

export function AdminShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    setUser(getStoredAdminUser());
  }, []);

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Agent';
  const isPointFocalOnly =
    user?.roles?.includes('POINT_FOCAL') &&
    !user.roles.some((role) => ['AGENT', 'ADMIN', 'SUPER_ADMIN'].includes(role));
  const visibleLinks = isPointFocalOnly
    ? [
        { href: '/admin/point-focal', label: 'Mes dossiers', icon: FileText },
        { href: '/admin/point-focal/messages', label: 'Message général', icon: MessageSquare },
        { href: '/admin/compte', label: 'Compte', icon: UserCircle },
      ]
    : links;

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
          {visibleLinks.map(({ href, label, icon: Icon }) => (
            <Link className={pathname.startsWith(href) ? 'active' : ''} href={href} key={href}>
              <Icon size={17} aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="admin-user-card">
          <span>{isPointFocalOnly ? 'Session Point Focal' : 'Session agent'}</span>
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
