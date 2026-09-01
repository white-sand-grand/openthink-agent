import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Box } from '../../ink.js';
import { getInitialSettings } from '../../utils/settings/settings.js';
import { Orb, ORB_HEIGHT, type OrbPose } from './Orb.js';

type Frame = { pose: OrbPose; offset: number };
const IDLE: Frame = { pose: 'default', offset: 0 };
const SEQUENCE: readonly Frame[] = [
  { pose: 'default', offset: 1 }, { pose: 'default', offset: 0 },
  { pose: 'look-left', offset: 0 }, { pose: 'look-right', offset: 0 },
  IDLE,
];
const FRAME_MS = 90;
const MASCOT_HEIGHT = ORB_HEIGHT;

export function AnimatedOrb(): React.ReactNode {
  const { frame, onClick } = useOrbAnimation();
  const current = frame >= 0 ? SEQUENCE[frame] ?? IDLE : IDLE;
  return <Box height={MASCOT_HEIGHT} flexDirection="column" onClick={onClick}>
    <Box marginTop={current.offset} flexShrink={0}><Orb pose={current.pose} /></Box>
  </Box>;
}

function useOrbAnimation(): { frame: number; onClick: () => void } {
  const [reducedMotion] = useState(() => getInitialSettings().prefersReducedMotion ?? false);
  const [frame, setFrame] = useState(-1);
  const frameRef = useRef(frame);
  frameRef.current = frame;

  const onClick = () => {
    if (reducedMotion || frameRef.current !== -1) return;
    setFrame(0);
  };

  useEffect(() => {
    if (frame < 0) return;
    const timer = setTimeout(() => setFrame(current => current + 1), FRAME_MS);
    return () => clearTimeout(timer);
  }, [frame]);

  return { frame: frame < SEQUENCE.length ? frame : -1, onClick };
}
