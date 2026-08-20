import { useFrame, useThree } from '@react-three/fiber';
import { type MutableRefObject } from 'react';
import * as THREE from 'three';
import CITADEL from '../../../../shared/citadel.json';

/**
 * Carries the plan's labels into the world.
 *
 * The drawing names every system; the moment it became solid all naming vanished
 * and the citadel read as unlabelled blocks. These are the same labels, projected
 * onto the same nodes, so the reading survives the transition.
 *
 * They are real DOM anchors updated imperatively from the frame loop: keyboard
 * reachable and styled like the drawing, without a React render per frame.
 */

const MARKER = CITADEL.nodeMarker;
const LIFT = 2.1;

const anchors = CITADEL.nodes.map((node) => {
  const a = (node.deg * Math.PI) / 180;
  return {
    id: node.id,
    point: new THREE.Vector3(
      Math.cos(a) * MARKER.radius,
      CITADEL.ring.height + CITADEL.ring.parapetHeight + LIFT,
      Math.sin(a) * MARKER.radius,
    ),
  };
});

type WorldTagsProps = {
  progressRef: MutableRefObject<number>;
  tagsRef: MutableRefObject<HTMLDivElement | null>;
  /** Labels belong to the world, so they arrive with it. */
  showFrom: number;
};

export function WorldTags({ progressRef, tagsRef, showFrom }: WorldTagsProps) {
  const { camera, size } = useThree();

  useFrame(() => {
    const container = tagsRef.current;
    if (!container) return;

    const p = progressRef.current;
    const reveal = Math.max(0, Math.min(1, (p - showFrom) / 0.12));
    container.style.opacity = String(reveal);
    container.style.pointerEvents = reveal > 0.9 ? 'auto' : 'none';
    if (reveal <= 0) return;

    const projected = new THREE.Vector3();
    // Placed boxes, so labels that would sit on top of each other are dropped.
    // Seven names around a ring collide constantly on a phone, and two labels
    // overlapping is worse than one label missing.
    const placed: Array<{ x: number; y: number; w: number; h: number }> = [];
    const gapY = 26;

    const projections = anchors.map((anchor) => {
      projected.copy(anchor.point).project(camera);
      return {
        x: (projected.x * 0.5 + 0.5) * size.width,
        y: (-projected.y * 0.5 + 0.5) * size.height,
        // Behind the camera, or off frame: drop it rather than smear it on an edge.
        onScreen:
          projected.z < 1 && Math.abs(projected.x) < 1.15 && Math.abs(projected.y) < 1.15,
      };
    });

    // Nearest the top first, so the ones behind give way to the ones in front.
    const order = projections
      .map((entry, index) => ({ entry, index }))
      .sort((a, b) => a.entry.y - b.entry.y);

    order.forEach(({ entry, index }) => {
      const element = container.children[index] as HTMLElement | undefined;
      if (!element) return;
      if (!entry.onScreen) {
        element.style.visibility = 'hidden';
        return;
      }
      const w = element.offsetWidth || 90;
      const h = element.offsetHeight || 20;
      // Centred on the node and kept inside the frame. Anchoring the top left
      // corner ran the names off the right edge on a phone, where the ring fills
      // most of the width and half the labels sit near the margin.
      const margin = 8;
      const x = Math.min(Math.max(entry.x - w / 2, margin), size.width - w - margin);
      const collides = placed.some(
        (box) =>
          Math.abs(box.x - x) < (box.w + w) / 2 &&
          Math.abs(box.y - entry.y) < Math.max(gapY, (box.h + h) / 2),
      );
      element.style.visibility = collides ? 'hidden' : 'visible';
      if (collides) return;
      placed.push({ x, y: entry.y, w, h });
      element.style.transform = `translate3d(${x.toFixed(1)}px, ${entry.y.toFixed(1)}px, 0)`;
    });
  });

  return null;
}
