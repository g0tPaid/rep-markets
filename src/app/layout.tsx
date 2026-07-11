import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, DM_Sans } from 'next/font/google';
import { Providers } from '@/components/providers';
import './globals.css';

const sans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans-family',
  display: 'swap',
});

const editorial = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-editorial',
  display: 'swap',
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  title: {
    default: 'rep.markets',
    template: '%s · rep.markets',
  },
  description: 'Quiet essentials. Luxury minimal fashion for daily use.',
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'https://rep.markets'),
  openGraph: {
    title: 'rep.markets',
    description: 'Quiet essentials. Luxury minimal fashion for daily use.',
    siteName: 'rep.markets',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${editorial.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
