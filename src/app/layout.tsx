import type { Metadata, Viewport } from 'next';
import { Providers } from '@/components/providers';
import './globals.css';

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
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
