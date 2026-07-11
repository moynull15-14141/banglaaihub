import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const geistSans = Geist({
  variable: '--font-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'Bangla AI Hub',
    template: '%s | Bangla AI Hub',
  },
  description:
    'A Bangla-language AI ecosystem — datasets, research papers, tools, and tutorials for the Bengali AI community.',
  icons: {
    // Dark-background mark for a light browser/OS theme, light-background
    // mark for dark theme — `media` maps straight to the generated
    // <link rel="icon" media="..."> tags, no client JS needed to switch.
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png', media: '(prefers-color-scheme: light)' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png', media: '(prefers-color-scheme: light)' },
      {
        url: '/favicon-light-32x32.png',
        sizes: '32x32',
        type: 'image/png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/favicon-light-16x16.png',
        sizes: '16x16',
        type: 'image/png',
        media: '(prefers-color-scheme: dark)',
      },
    ],
    apple: { url: '/favicon-180x180.png', sizes: '180x180', type: 'image/png' },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
