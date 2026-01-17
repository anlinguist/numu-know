import type { Metadata } from 'next';
import { APP_DOMAIN } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Stories - Numu Know',
  description: 'Browse and read interactive Numu language stories with word-by-word translations and linguistic annotations.',
  openGraph: {
    title: 'Stories - Numu Know',
    description: 'Browse and read interactive Numu language stories with word-by-word translations.',
    url: `${APP_DOMAIN}/stories`,
  },
};

import StoriesShell from '@/components/Stories/StoriesShell';

export default function StoriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StoriesShell>{children}</StoriesShell>;
}
