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
  title: 'Friends First',
  description:
    'A relationship reflection about compatibility, values, and what matters most.',
  openGraph: {
    title: 'Friends First',
    description:
      'A relationship reflection about compatibility, values, and what matters most.',
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'Friends First logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Friends First',
    description:
      'A relationship reflection about compatibility, values, and what matters most.',
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
