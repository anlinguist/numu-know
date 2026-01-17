import { Suspense } from 'react';
import { Loader, Center } from '@mantine/core';
import Home from '@/components/Home/Home';
import { logger } from '@/lib/logger';
import type { BlogPost } from '@/types/story';

const LoadingFallback = (): React.JSX.Element => (
  <Center h="100vh" w="100%">
    <Loader size="xl" />
  </Center>
);

async function getBlogPosts(): Promise<BlogPost[]> {
  try {
    const response = await fetch('https://public-api.wordpress.com/wp/v2/sites/sereneanlinguist.wordpress.com/posts', {
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch posts: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    logger.error('Error fetching blog posts', { error });
    return [];
  }
}

export default async function HomePage(): Promise<React.JSX.Element> {
  const blogPosts = await getBlogPosts();

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Home blogPosts={blogPosts} />
    </Suspense>
  );
}
