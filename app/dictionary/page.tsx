'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const Dictionary = dynamic(() => import('@/components/Dictionary/Dictionary'), {
  ssr: false,
  loading: () => <div>Loading...</div>,
});

export default function DictionaryPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Dictionary />
    </Suspense>
  );
}
