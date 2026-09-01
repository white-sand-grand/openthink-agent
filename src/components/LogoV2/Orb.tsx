import * as React from 'react';
import { Box, Text } from '../../ink.js';

export type OrbPose = 'default' | 'blink' | 'look-left' | 'look-right';

type Props = { pose?: OrbPose };

export const ORB_WIDTH = 11;
export const ORB_HEIGHT = 5;

/** Fixed-width blue orb with two white rectangular eyes. */
export function Orb({ pose = 'default' }: Props): React.ReactNode {
  const eyeBlock = pose === 'blink' ? '▄▄' : '██';
  return (
    <Box flexDirection="column" width={ORB_WIDTH} height={ORB_HEIGHT}>
      <Text color="mascot_body" backgroundColor="mascot_body">   █████   </Text>
      <Text color="mascot_body" backgroundColor="mascot_body">  █     █  </Text>
      <Text color="mascot_body" backgroundColor="mascot_body">
        {'  █'}
        <Text color="ansi:whiteBright" backgroundColor="ansi:whiteBright">{eyeBlock}</Text>
        {' '}
        <Text color="ansi:whiteBright" backgroundColor="ansi:whiteBright">{eyeBlock}</Text>
        {'█  '}
      </Text>
      <Text color="mascot_body" backgroundColor="mascot_body">  █     █  </Text>
      <Text color="mascot_body" backgroundColor="mascot_body">   █████   </Text>
    </Box>
  );
}
