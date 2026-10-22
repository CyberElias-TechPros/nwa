import type { Metadata, Viewport } from 'next';
import { Nav } from '@/components/nav';
import ServiceWorkerRegister from '@/components/sw-register';
import './globals.css';

export const metadata: Metadata = {
  title: 'NaWeAgree — shared plans for custom work',
  description:
    'Turn scattered conversations about custom work into a shared, editable plan both sides can review and update.',
  manifest: '/manifest.webmanifest',
  applicationName: 'NaWeAgree',
  appleWebApp: { capable: true, title: 'NaWeAgree', statusBarStyle: 'default' },
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#155EEF',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG">
      <body>
        <Nav />
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
