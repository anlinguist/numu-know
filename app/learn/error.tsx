'use client';

import { useEffect } from 'react';
import { Container, Title, Text, Button, Stack } from '@mantine/core';
import { logger } from '@/lib/logger';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.JSX.Element {
  useEffect(() => {
    logger.error('Learn page error', { error: error.message, digest: error.digest });
  }, [error]);

  return (
    <Container size="sm" py="xl">
      <Stack gap="lg" align="center">
        <Title order={1}>Error loading content</Title>
        <Text size="lg" c="dimmed" ta="center">
          {error.message || 'Unable to load learning content. Please try again.'}
        </Text>
        <Button
          size="md"
          onClick={reset}
          variant="filled"
          color="dark"
        >
          Try again
        </Button>
      </Stack>
    </Container>
  );
}
