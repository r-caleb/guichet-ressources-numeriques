import type { Metadata } from 'next';
import './globals.css';
import { GovernmentFooter } from '@/components/government-footer';
import { GovernmentHeader } from '@/components/government-header';

export const metadata: Metadata = {
  title: 'Guichet .gouv.cd',
  description: 'Plateforme officielle de demande des ressources numériques gouvernementales.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>
        <GovernmentHeader />
        {children}
        <GovernmentFooter />
      </body>
    </html>
  );
}
