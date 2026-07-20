'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LockKeyhole, Search } from 'lucide-react';

export function GovernmentHeader() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Demande' },
    { href: '/suivi', label: 'Suivi' },
  ];

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" href="/">
          <img
            className="brand-logo"
            src="/assets/ministry-logo.png"
            alt="Ministère de l'Économie Numérique"
          />
        </Link>

        <nav className="nav" aria-label="Navigation principale">
          {navItems.map((item) => {
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

            return (
              <Link className={`nav-link${isActive ? ' active' : ''}`} href={item.href} key={item.href}>
                {item.label}
              </Link>
            );
          })}
          <Link className={`nav-link admin-access${pathname.startsWith('/admin') ? ' active' : ''}`} href="/admin/login">
            <LockKeyhole size={14} aria-hidden="true" />
            Administration
          </Link>
          <button className="header-search" type="button" aria-label="Rechercher">
            <Search size={18} aria-hidden="true" />
          </button>
        </nav>
      </div>
    </header>
  );
}
