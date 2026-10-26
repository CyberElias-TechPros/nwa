import type { Metadata, Viewport } from 'next';
import { Nav } from '@/components/nav';
import { Footer } from '@/components/footer';
import ServiceWorkerRegister from '@/components/sw-register';
import './globals.css';

const SITE_URL = 'https://naweagree.app';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'NaWeAgree — no more "I thought you said…"',
    template: '%s · NaWeAgree',
  },
  description:
    'Turn conversations about custom work — tailors, carpenters, hair, catering, repairs — into a shared plan both people can see and agree to. No more "I thought you said". No accounts, no downloads, just a link.',
  applicationName: 'NaWeAgree',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'NaWeAgree', statusBarStyle: 'default' },
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: 'NaWeAgree',
    title: 'NaWeAgree — shared plans for work you agree on',
    description: 'A simple link that turns a verbal agreement into a plan both people can see, update, and confirm. Built for Nigeria.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'NaWeAgree — no more I thought you said' }],
    locale: 'en_NG',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NaWeAgree',
    description: 'Shared plans for custom work — no accounts, no downloads, just a link.',
    images: ['/og.png'],
    creator: '@naweagree',
  },
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  other: {
    'naweagree:version': '1.0',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FBF7F2' },
    { media: '(prefers-color-scheme: dark)', color: '#0C0A09' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG">
      <head>
        {/* Fonts loaded via <link> so the production build doesn't need to fetch
            them at build time (sandboxes and CI often egress-restricted).
            next/font/local or self-hosted can replace this once a build
            environment has outbound network; font-display: swap keeps text
            visible on slow 2G connections in Nigeria. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700;9..144,900&display=swap" />
      </head>
      <body>
        <Nav />
        {children}
        <Footer />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
