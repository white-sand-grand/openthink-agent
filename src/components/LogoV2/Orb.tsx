import * as React from 'react';
import { Box, Text } from '../../ink.js';

export type OrbPose = 'default' | 'blink' | 'look-left' | 'look-right';

type Props = { pose?: OrbPose };

export const ORB_WIDTH = 9;
export const ORB_HEIGHT = 3;

/** Fixed-width blue orb with two white rectangular eyes. */
export function Orb({ pose = 'default' }: Props): React.ReactNode {
  const left = pose === 'look-left' ? 2 : pose === 'look-right' ? 4 : 3;
  const eye = pose === 'blink' ? '▄' : '█';
  return (
    <Box flexDirection="column" width={ORB_WIDTH} height={ORB_HEIGHT}>
      <Text color="mascot_body">{' ▄'}<Text backgroundColor="mascot_body">{'     '}</Text>{'▄ '}</Text>
      <Text color="mascot_body" backgroundColor="mascot_body">
        {' '.repeat(left)}
        <Text color="ansi:whiteBright" backgroundColor="mascot_body">{eye}</Text>
        {' '}
        <Text color="ansi:whiteBright" backgroundColor="mascot_body">{eye}</Text>
        {' '.repeat(6 - left)}
      </Text>
      <Text color="mascot_body">{' ▀'}<Text backgroundColor="mascot_body">{'     '}</Text>{'▀ '}</Text>
    </Box>
  );
}
