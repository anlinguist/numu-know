'use client';

import { ReactNode, useState } from 'react';
import Header from '@/components/Header/Header';
import { MantineProviders } from './MantineProviders';
import { Notifications } from '@mantine/notifications';

interface ClientRootLayoutProps {
  children: ReactNode;
}

export default function ClientRootLayout({
  children,
}: ClientRootLayoutProps) {
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const openLoginModal = () => {
    setLoginModalOpen(true);
  };

  return (

        <MantineProviders>
          <Notifications />
            <>
              <Header openLoginModal={openLoginModal} />
              {children}
            </>
        </MantineProviders>
  );
}
