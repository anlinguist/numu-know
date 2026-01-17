import { Loader, Center } from '@mantine/core';

export default function Loading(): React.JSX.Element {
  return (
    <Center h="100vh" w="100%">
      <Loader size="xl" />
    </Center>
  );
}
