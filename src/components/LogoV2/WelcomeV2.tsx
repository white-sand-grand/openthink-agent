import * as React from 'react';
import { Box, Text, useTheme } from '../../ink.js';
import { env } from '../../utils/env.js';
import { Orb } from './Orb.js';

const WELCOME_WIDTH = 58;

/** Stable welcome mark shared by onboarding and the Apple Terminal path. */
export function WelcomeV2(): React.ReactNode {
  const [theme] = useTheme();
  const isLight = ['light', 'light-daltonized', 'light-ansi'].includes(theme);
  const title = env.terminal === 'Apple_Terminal' ? 'Welcome to OpenThink' : 'Welcome to OpenThink';
  return (
    <Box width={WELCOME_WIDTH} flexDirection="column" alignItems="center">
      <Text color="claude" bold>{title}</Text>
      <Box marginY={1}><Orb /></Box>
      <Text dimColor={!isLight} color={isLight ? 'text' : undefined}>Your workspace is ready.</Text>
      <Text dimColor>Type a prompt to begin</Text>
    </Box>
  );
}
