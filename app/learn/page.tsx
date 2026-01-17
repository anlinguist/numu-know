'use client';

import dynamic from 'next/dynamic';
import { Suspense, useEffect, useState } from 'react';
import { Loader, Center } from '@mantine/core';
import { logger } from '@/lib/logger';

const LoadingFallback = () => (
  <Center h="100vh" w="100%">
    <Loader size="xl" />
  </Center>
);

const Learn = dynamic(() => import('@/components/Learn/Learn'), {
  ssr: false,
  loading: () => <LoadingFallback />,
});

export default function LearnPage() {
  const [blogPosts, setBlogPosts] = useState([]);

  useEffect(() => {
    const fetchBlogPosts = async () => {
      try {
        const response = await fetch('https://public-api.wordpress.com/wp/v2/sites/sereneanlinguist.wordpress.com/posts');
        const data = await response.json();
        setBlogPosts(data);
      } catch (error) {
        logger.error('Error fetching blog posts', { error });
        setBlogPosts([]);
      }
    };
    fetchBlogPosts();
  }, []);

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Learn blogPosts={blogPosts} />
    </Suspense>
  );
}
