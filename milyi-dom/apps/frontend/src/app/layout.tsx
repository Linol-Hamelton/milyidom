import type { Metadata } from 'next';
import { Manrope, Playfair_Display } from 'next/font/google';
import './globals.css';
import Header from '../components/layout/header';
import Footer from '../components/layout/footer';
import MobileBottomNav from '../components/layout/mobile-bottom-nav';
import { AppProviders } from '../providers/app-providers';
import { ServiceWorkerRegistrar } from '../components/ui/service-worker-registrar';
import { EmailVerificationBanner } from '../components/ui/email-verification-banner';

const sans = Manrope({
  subsets: ['latin', 'cyrillic'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
});
const serif = Playfair_Display({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-serif',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://milyidom.com'),
  title: 'Милый Дом — аренда жилья',
  description:
    'Милый Дом — сервис аренды жилья. Найдите идеальное место для отдыха: проверенные хосты, честные цены, заботливый сервис.',
  manifest: '/manifest.json',
  openGraph: {
    siteName: 'Милый Дом',
    locale: 'ru_RU',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@milyidom',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Милый Дом',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${sans.variable} ${serif.variable}`} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#4a8c6e" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="flex min-h-screen flex-col bg-sand-50 text-slate-900">
        <AppProviders>
          <Header />
          <EmailVerificationBanner />
          <main className="flex-1 pb-16 md:pb-0">{children}</main>
          <Footer />
          <MobileBottomNav />
        </AppProviders>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
