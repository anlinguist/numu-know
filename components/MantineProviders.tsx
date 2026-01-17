'use client';

import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { theme } from '@/theme';

export function MantineProviders({ children }: { children: React.ReactNode }) {
    return (
        <MantineProvider theme={theme} defaultColorScheme="auto">
            <ModalsProvider>
                {children}
            </ModalsProvider>
        </MantineProvider>
    );
}
