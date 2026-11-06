import { useThree } from '@react-three/fiber';
import { Outlines } from '@react-three/drei';
import { PALETTE } from './shapes';

/**
 * A comic-book ink outline of constant on-screen width, like the 2.5px borders
 * used across the site. (drei's Outlines measures `thickness` in drawing-buffer
 * pixels unless `screenspace` is set, so the device pixel ratio is applied here.)
 */
export function Ink({ width = 3 }: { width?: number }) {
  const dpr = useThree((state) => state.viewport.dpr);
  return <Outlines thickness={width * dpr} color={PALETTE.ink} />;
}
