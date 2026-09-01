import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Pairwise — Relationship Reflection Survey',
  description: 'A thoughtful, private survey about compatibility, values, and relationship priorities.',
  openGraph: {
    title: 'Pairwise — A thoughtful look at compatibility',
    description: 'Reflect on values, preferences, and what matters most.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Pairwise relationship reflection survey' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pairwise — A thoughtful look at compatibility',
    description: 'Reflect on values, preferences, and what matters most.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
