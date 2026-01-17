'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const Store = dynamic(() => import('@/components/Store/Store'), {
  ssr: false,
  loading: () => <div>Loading...</div>,
});

export default function StorePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Store />
    </Suspense>
  );
}
