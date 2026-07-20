import Link from 'next/link';
import { ExternalLink, Mail, MapPin, Phone, Sparkle } from 'lucide-react';

export function GovernmentFooter() {
  const quickLinks = [
    { label: 'Accueil', href: '/' },
    { label: 'Deposer une demande', href: '/' },
    { label: 'Suivre un dossier', href: '/suivi' },
    { label: 'Administration', href: '/admin/login' },
  ];

  const institutions = ['Présidence', 'Sénat', 'Assemblée Nationale', 'Primature', 'Portail de la République'];

  return (
    <footer className="site-footer">
      <div className="footer-state-line tri-band" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div className="footer-inner">
        <section className="footer-contact" aria-label="Coordonnees du ministere">
          <img
            className="footer-logo"
            src="/assets/ministry-logo-white.png"
            alt="Ministère de l'Économie Numérique"
          />

          <div className="footer-contact-item">
            <MapPin size={18} aria-hidden="true" />
            <div>
              <strong>Notre adresse</strong>
              <span>CONCESSION SAFRICAS,</span>
              <span>14 avenue Sergent Moke, Ngaliema</span>
            </div>
          </div>

          <div className="footer-contact-item">
            <Mail size={18} aria-hidden="true" />
            <div>
              <strong>Email</strong>
              <a href="mailto:info@economienumerique.gouv.cd">info@economienumerique.gouv.cd</a>
            </div>
          </div>

          <div className="footer-contact-item">
            <Phone size={18} aria-hidden="true" />
            <div>
              <strong>Téléphone</strong>
              <a href="tel:+243820112385">(+243) 820 112 385 / 990 587 394</a>
            </div>
          </div>
        </section>

        <section className="footer-column">
          <h2 className="footer-title">Accès rapides</h2>
          <ul className="footer-list">
            {quickLinks.map((item) => (
              <li key={item.label}>
                <Sparkle size={13} aria-hidden="true" />
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="footer-column">
          <h2 className="footer-title">Les institutions</h2>
          <ul className="footer-list">
            {institutions.map((item) => (
              <li key={item}>
                <Sparkle size={13} aria-hidden="true" />
                <a href="#" aria-label={`${item} - lien externe`}>
                  {item}
                  <ExternalLink size={14} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="footer-bottom">© 2026 Tous droits réservés - Ministère de l'Économie Numérique</div>
    </footer>
  );
}
