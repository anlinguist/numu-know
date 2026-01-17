'use client';

import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

interface NonceContextType {
  nonce: string;
}

const NonceContext = createContext<NonceContextType | undefined>(undefined);

interface NonceProviderProps {
  nonce: string;
  children: ReactNode;
}

export function NonceProvider({ nonce, children }: NonceProviderProps) {
  // Also set it on window for immediate access before context is ready
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__NONCE__ = nonce;
    }
  }, [nonce]);

  return (
    <NonceContext.Provider value={{ nonce }}>
      {children}
    </NonceContext.Provider>
  );
}

export function useNonce(): string {
  const [nonce, setNonce] = useState<string>('');
  const context = useContext(NonceContext);

  // Prefer context value, fall back to window value for early initialization
  useEffect(() => {
    if (context?.nonce) {
      setNonce(context.nonce);
    } else if (typeof window !== 'undefined' && (window as any).__NONCE__) {
      setNonce((window as any).__NONCE__);
    }
  }, [context?.nonce]);

  return context?.nonce || nonce || '';
}
