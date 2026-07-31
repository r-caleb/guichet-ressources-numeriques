'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LockKeyhole, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export function GovernmentHeader() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { href: '/', label: 'Demande' },
  ];

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

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

        <button
          className="mobile-menu-button"
          type="button"
          aria-label={isMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-controls="primary-navigation"
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((current) => !current)}
        >
          {isMenuOpen ? <X size={21} aria-hidden="true" /> : <Menu size={21} aria-hidden="true" />}
        </button>

        <nav
          className={`nav${isMenuOpen ? ' open' : ''}`}
          id="primary-navigation"
          aria-label="Navigation principale"
        >
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
        </nav>
      </div>
    </header>
  );
}
