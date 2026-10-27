import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Administración | FAMA',
  description: 'Panel de configuración de la plataforma FAMA.',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
