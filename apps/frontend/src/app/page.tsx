import { RequestForm } from '@/components/request-form';

export default function HomePage() {
  return (
    <main className="page">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Guichet officiel .gouv.cd</p>
          <h1>Demande des ressources numériques gouvernementales</h1>
          <p>
            Déposez une demande de sous-domaine, d'hébergement ou de modification de ressources
            numériques publiques. Le dossier est instruit par les services compétents du Ministère
            de l'Économie Numérique.
          </p>
        </div>
        <aside className="hero-aside" aria-label="Informations rapides">
          <div className="quick-stat">
            <strong>.gouv.cd</strong>
            Patrimoine numérique gouvernemental
          </div>
          <div className="quick-stat">
            <strong>Point Focal</strong>
            Lettre de désignation obligatoire
          </div>
        </aside>
      </section>

      <section className="section-card">
        <h2>Conditions de dépôt</h2>
        <p>
          Cette plateforme est exclusivement destinée aux Points Focaux officiellement désignés par
          les ministères et institutions publiques. La lettre officielle de demande et la lettre de
          désignation du Point Focal sont obligatoires.
        </p>
      </section>

      <RequestForm />
    </main>
  );
}
