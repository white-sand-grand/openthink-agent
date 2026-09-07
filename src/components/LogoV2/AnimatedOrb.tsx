import * as React from 'react';
import { useEffect, useState } from 'react';
import { Box } from '../../ink.js';
import { getInitialSettings } from '../../utils/settings/settings.js';
import { Orb, ORB_HEIGHT, ORB_WIDTH, type OrbPose } from './Orb.js';

type Frame = { pose: OrbPose; duration: number };
const IDLE: Frame = { pose: 'default', duration: 3200 };
const SEQUENCE: readonly Frame[] = [
  IDLE,
  { pose: 'blink', duration: 120 },
  { pose: 'default', duration: 1600 },
  { pose: 'look-left', duration: 450 },
  { pose: 'default', duration: 2400 },
  { pose: 'look-right', duration: 550 },
];
const MASCOT_HEIGHT = ORB_HEIGHT;

export function AnimatedOrb(): React.ReactNode {
  const { frame, onClick } = useOrbAnimation();
  const current = frame >= 0 ? SEQUENCE[frame] ?? IDLE : IDLE;
  return <Box width={ORB_WIDTH} height={MASCOT_HEIGHT} flexDirection="column" onClick={onClick}>
    <Orb pose={current.pose} />
  </Box>;
}

function useOrbAnimation(): { frame: number; onClick: () => void } {
  const [reducedMotion] = useState(() => getInitialSettings().prefersReducedMotion ?? false);
  const [frame, setFrame] = useState(0);

  const onClick = () => {
    if (reducedMotion) return;
    setFrame(1);
  };

  useEffect(() => {
    if (reducedMotion) return;
    const timer = setTimeout(() => setFrame(current => (current + 1) % SEQUENCE.length), SEQUENCE[frame]!.duration);
    return () => clearTimeout(timer);
  }, [frame, reducedMotion]);

  return { frame: reducedMotion ? 0 : frame, onClick };
}
