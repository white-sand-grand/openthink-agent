import * as React from 'react';
import { Box, Text } from '../../ink.js';
import { env } from '../../utils/env.js';
export type ClawdPose = 'default' | 'arms-up' // tail fan flicked up (used during jump)
| 'look-left' // eye shifted left
| 'look-right'; // eye shifted right

type Props = {
  pose?: ClawdPose;
};

// Shrimp mascot. Standard-terminal pose fragments. Each row is split into
// segments so we can vary only the parts that change (eye, tail) while
// keeping the body/bg spans stable. All poses end up 11 cols wide.
//
//   row 1: antennae | arched back (bg) | tail fan tip
//   row 2: head front | body with eye notch (bg) | tail fan
//   row 3: legs | fan tip
//
// arms-up: the tail fan lifts one row (▚ at rows 1-2 + ▞ below becomes
// ▞ at row 1 + ▚ at row 2, bottom slot empty) — reads as the shrimp's
// tail-flip, same one-row glyph trick the crab used for its arms.
//
// look-* move the single eye notch across the top body row: default ▛
// (notch bottom-right), look-left ▜ (notch bottom-left = pupil left),
// look-right ▛ one cell right (pupil right). Row 2 is a plain body span.
type Segments = {
  /** row 1 left (no bg): antennae */
  r1L: string;
  /** row 1 body top (with bg): arched back */
  r1E: string;
  /** row 1 right (no bg): tail fan tip */
  r1R: string;
  /** row 2 left (no bg): head front */
  r2L: string;
  /** row 2 body (with bg): body with eye notch */
  r2E: string;
  /** row 2 right (no bg): tail fan */
  r2R: string;
  /** row 3 (no bg): legs + fan tip */
  r3: string;
};
const POSES: Record<ClawdPose, Segments> = {
  default: {
    r1L: '▘▘ ',
    r1E: '▟▛████▙',
    r1R: '▚',
    r2L: '▐',
    r2E: '████████▙',
    r2R: '▚',
    r3: ' ▝▘ ▘▘ ▝▝ ▞'
  },
  'look-left': {
    r1L: '▘▘ ',
    r1E: '▟▜████▙',
    r1R: '▚',
    r2L: '▐',
    r2E: '████████▙',
    r2R: '▚',
    r3: ' ▝▘ ▘▘ ▝▝ ▞'
  },
  'look-right': {
    r1L: '▘▘ ',
    r1E: '▟█▛███▙',
    r1R: '▚',
    r2L: '▐',
    r2E: '████████▙',
    r2R: '▚',
    r3: ' ▝▘ ▘▘ ▝▝ ▞'
  },
  'arms-up': {
    r1L: '▘▘ ',
    r1E: '▟▛████▙',
    r1R: '▞',
    r2L: '▐',
    r2E: '████████▙',
    r2R: '▚',
    r3: ' ▝▘ ▘▘ ▝▝  '
  }
};

// Apple Terminal uses a bg-fill trick (see below), so only eye poses make
// sense. Tail poses fall back to default.
const APPLE_EYES: Record<ClawdPose, string> = {
  default: ' ▗   ▖ ',
  'look-left': ' ▘   ▘ ',
  'look-right': ' ▝   ▝ ',
  'arms-up': ' ▗   ▖ '
};
export function Clawd(t0) {
  const {
    pose = 'default'
  } = t0 ?? {};
  if (env.terminal === 'Apple_Terminal') {
    return <AppleTerminalClawd pose={pose} />;
  }
  const p = POSES[pose];
  return <Box flexDirection="column">
      <Text>
        <Text color="clawd_body">{p.r1L}</Text>
        <Text color="clawd_body" backgroundColor="clawd_background">
          {p.r1E}
        </Text>
        <Text color="clawd_body">{p.r1R}</Text>
      </Text>
      <Text>
        <Text color="clawd_body">{p.r2L}</Text>
        <Text color="clawd_body" backgroundColor="clawd_background">
          {p.r2E}
        </Text>
        <Text color="clawd_body">{p.r2R}</Text>
      </Text>
      <Text color="clawd_body">{p.r3}</Text>
    </Box>;
}
function AppleTerminalClawd({
  pose
}: {
  pose: ClawdPose;
}): React.ReactNode {
  // Apple's Terminal renders vertical space between chars by default.
  // It does NOT render vertical space between background colors
  // so we use background color to draw the main shape.
  return <Box flexDirection="column" alignItems="center">
      <Text>
        <Text color="clawd_body">▗</Text>
        <Text color="clawd_background" backgroundColor="clawd_body">
          {APPLE_EYES[pose]}
        </Text>
        <Text color="clawd_body">▖</Text>
      </Text>
      <Text backgroundColor="clawd_body">{" ".repeat(7)}</Text>
      <Text color="clawd_body">▝▘ ▘▘▞</Text>
    </Box>;
}
