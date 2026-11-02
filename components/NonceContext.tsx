'use client';

import { createContext, ReactNode, useContext, useEffect, useSyncExternalStore } from 'react';

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

// window.__NONCE__ is a plain global set by NonceProvider with no change events, so
// there is nothing to subscribe to: like before, it is read when the hook renders.
const subscribeToWindowNonce = () => () => {};
const getWindowNonce = (): string => (window as any).__NONCE__ || '';
// The server render and hydration see no window nonce, as before.
const getServerWindowNonce = (): string => '';

export function useNonce(): string {
  const context = useContext(NonceContext);
  // Prefer context value, fall back to window value for early initialization
  const windowNonce = useSyncExternalStore(subscribeToWindowNonce, getWindowNonce, getServerWindowNonce);

  return context?.nonce || windowNonce || '';
}
