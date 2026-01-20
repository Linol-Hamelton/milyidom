import type { Metadata } from 'next';
import { Manrope, Playfair_Display } from 'next/font/google';
import './globals.css';
import Header from '../components/layout/header';
import Footer from '../components/layout/footer';
import { AppProviders } from '../providers/app-providers';

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
  title: 'Milyi Dom — сервис управления арендой',
  description:
    'Milyi Dom помогает выбирать стильное жильё для отдыха и путешествий: проверенные хосты, понятные условия и забота о гостях.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${sans.variable} ${serif.variable}`} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col bg-sand-50 text-slate-900">
        <AppProviders>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </AppProviders>
      </body>
    </html>
  );
}
