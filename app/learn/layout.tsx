import type { Metadata } from 'next';
import { APP_DOMAIN } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Learn - Numu Know',
  description: 'Explore educational content, blog posts, and resources for learning the Numu language and culture.',
  openGraph: {
    title: 'Learn - Numu Know',
    description: 'Explore educational content and resources for learning the Numu language.',
    url: `${APP_DOMAIN}/learn`,
  },
};

export default function LearnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
