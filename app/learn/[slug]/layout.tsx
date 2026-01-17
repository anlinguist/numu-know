import type { Metadata } from 'next';
import { APP_DOMAIN } from '@/lib/constants';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;

  // Format slug for display (replace hyphens with spaces, capitalize)
  const title = slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    title: `${title} - Learn - Numu Know`,
    description: `Read about ${title} on Numu Know's learning platform.`,
    openGraph: {
      title: `${title} - Numu Know`,
      description: `Read about ${title} on Numu Know's learning platform.`,
      url: `${APP_DOMAIN}/learn/${slug}`,
    },
  };
}

export default function LearnSlugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
