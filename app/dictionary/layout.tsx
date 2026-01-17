import type { Metadata } from 'next';
import { APP_DOMAIN } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Dictionary - Numu Know',
  description: 'Search the Numu language dictionary with detailed word definitions, translations, and linguistic information.',
  openGraph: {
    title: 'Dictionary - Numu Know',
    description: 'Search the Numu language dictionary with detailed word definitions and translations.',
    url: `${APP_DOMAIN}/dictionary`,
  },
};

export default function DictionaryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
