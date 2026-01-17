'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { useParams } from 'next/navigation';

import { Loader, Center } from '@mantine/core';

const LoadingFallback = () => (
  <Center h="100vh" w="100%">
    <Loader size="xl" />
  </Center>
);

const ReadBlog = dynamic(() => import('@/components/Learn/ReadBlog'), {
  ssr: false,
  loading: () => <LoadingFallback />,
});

export default function ReadBlogPage() {
  const params = useParams();
  const slug = params.slug as string;

  return (
    <Suspense fallback={<LoadingFallback />}>
      <ReadBlog slug={slug} />
    </Suspense>
  );
}
