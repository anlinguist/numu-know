import type { Metadata } from 'next';
import Script from 'next/script';
import { headers } from 'next/headers';
import { ColorSchemeScript, mantineHtmlProps } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { MantineProviders } from '@/components/MantineProviders';
import ClientLayout from '@/components/ClientLayout';
import { APP_DOMAIN } from '@/lib/constants';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './base.css';
import '../styles/index.css';
import { ThemeProvider } from 'next-themes';
import { NonceProvider } from '@/components/NonceContext';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Numu Know - Language Learning Platform',
  description: 'Learn the Numu language through interlinear texts and stories. A community-driven platform for preserving and revitalizing Indigenous languages.',
  metadataBase: new URL(APP_DOMAIN),

  manifest: '/manifest.json',
  openGraph: {
    title: 'Numu Know - Language Learning Platform',
    description: 'Learn the Numu language through interlinear texts and stories.',
    url: APP_DOMAIN,
    siteName: 'Numu Know',
    images: [
      {
        url: '/logo512.png', // Assuming this exists in public/
        width: 512,
        height: 512,
        alt: 'Numu Know Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Numu Know - Language Learning Platform',
    description: 'Learn the Numu language through interlinear texts and stories.',
    images: ['/logo512.png'], // Assuming this exists in public/
  },
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const headersList = await headers();
  const nonce = headersList.get('x-nonce') || '';
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ColorSchemeScript defaultColorScheme="auto" />
        <meta name="color-scheme" content="light dark" />

        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-PQK8CG3MLF"
          strategy="afterInteractive"
          nonce={nonce}
        />
        <Script id="google-analytics" strategy="afterInteractive" nonce={nonce}>
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-PQK8CG3MLF');
          `}
        </Script>
      </head>
      <body>
        <NonceProvider nonce={nonce}>
          <ThemeProvider
            attribute="data-mantine-color-scheme"
            defaultTheme="system"
            enableSystem
            nonce={nonce}
            disableTransitionOnChange
          >
            <ClientLayout>{children}</ClientLayout>
          </ThemeProvider>
          </NonceProvider>
      </body>
    </html>
  );
}
