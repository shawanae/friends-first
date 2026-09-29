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
  title: 'Friends First — Relationship Reflection Survey',
  description: 'A private relationship reflection about compatibility, values, preferences, and priorities.',
  openGraph: {
    title: 'Friends First — Start with what’s true',
    description: 'A private relationship reflection about compatibility, values, and what matters most.',
  },
  twitter: {
    card: 'summary',
    title: 'Friends First — Start with what’s true',
    description: 'A private relationship reflection about compatibility, values, and what matters most.',
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
