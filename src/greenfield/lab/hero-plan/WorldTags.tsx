import { useFrame, useThree } from '@react-three/fiber';
import { useRef, type MutableRefObject } from 'react';
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
  /**
   * Label sizes, measured once per viewport width rather than once per frame.
   *
   * offsetWidth forces the browser to lay the page out to answer, and asking
   * seven times a frame put a synchronous layout in the middle of every render.
   * These are fixed strings in a fixed font: they only change when the viewport
   * does.
   */
  const metricsRef = useRef<{
    width: number;
    boxes: Array<{ w: number; h: number }>;
    /** The band the labels may occupy. Outside it another panel takes the click. */
    top: number;
    bottom: number;
  }>({ width: 0, boxes: [], top: 0, bottom: 0 });

  useFrame(() => {
    const container = tagsRef.current;
    if (!container) return;

    const p = progressRef.current;
    const reveal = Math.max(0, Math.min(1, (p - showFrom) / 0.12));
    container.style.opacity = String(reveal);
    container.style.pointerEvents = reveal > 0.9 ? 'auto' : 'none';
    if (reveal <= 0) return;

    const metrics = metricsRef.current;
    if (metrics.width !== size.width || metrics.boxes.length !== anchors.length) {
      metrics.width = size.width;
      metrics.boxes = anchors.map((_, index) => {
        const element = container.children[index] as HTMLElement | undefined;
        return { w: element?.offsetWidth || 90, h: element?.offsetHeight || 20 };
      });
      // The header above and the reading panel below both paint over these and
      // both take the click. A label outside the band between them is visible,
      // looks live, highlights on hover and does nothing when pressed, which is
      // the worst state a control can be in.
      const doc = container.ownerDocument;
      const header = doc.querySelector('.hp-header');
      const panel = doc.querySelector('.hp-preview');
      metrics.top = header ? header.getBoundingClientRect().bottom + 8 : 0;
      const panelTop = panel ? panel.getBoundingClientRect().top : 0;
      metrics.bottom = panelTop > 0 ? panelTop - 8 : 0;
    }

    const projected = new THREE.Vector3();
    // Placed boxes, so labels that would sit on top of each other are moved apart.
    //
    // These used to be dropped on collision, which read as tidy and was in fact
    // the worst thing the component did: seven names around a ring collide
    // constantly, so four of the seven systems were simply not on screen and
    // could not be clicked. The ring claims to be the index. An index that hides
    // most of its entries is not one.
    const placed: Array<{ centreX: number; y: number; w: number; h: number }> = [];
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
    //
    // Where a label lands must not depend on whether it is being pointed at.
    // Giving the hovered one priority looked like the considerate thing to do and
    // broke clicking outright: becoming active moved the label to its unnudged
    // position, so the press and the release landed on different elements and the
    // browser never formed a click at all. Hover changes how a label looks and
    // nothing about where it is.
    //
    // Ties break on index for the same reason: two labels at nearly the same
    // height used to swap places on a hair of camera movement, and whichever lost
    // the swap vanished for a frame.
    const order = projections
      .map((entry, index) => ({
        entry,
        index,
        active: (container.children[index] as HTMLElement | undefined)?.dataset.active !== undefined,
      }))
      .sort((a, b) => {
        if (a.entry.y !== b.entry.y) return a.entry.y - b.entry.y;
        return a.index - b.index;
      });

    order.forEach(({ entry, index, active }) => {
      const element = container.children[index] as HTMLElement | undefined;
      if (!element) return;
      if (!entry.onScreen) {
        element.style.visibility = 'hidden';
        return;
      }
      const { w, h } = metrics.boxes[index] ?? { w: 90, h: 20 };
      // Centred on the node and kept inside the frame. Anchoring the top left
      // corner ran the names off the right edge on a phone, where the ring fills
      // most of the width and half the labels sit near the margin.
      const margin = 8;
      const top = Math.max(margin, metrics.top);
      const floor = metrics.bottom > top
        ? Math.min(size.height - margin, metrics.bottom)
        : size.height - margin;
      const x = Math.min(Math.max(entry.x - w / 2, margin), size.width - w - margin);
      // Centres, not left edges. Comparing left edges against a threshold built
      // from half widths let two labels of different lengths sit on top of each
      // other and call it clear, which is how the two longest names in the ring
      // ended up printed over one another.
      const centreX = x + w / 2;
      const overlapping = (candidate: number) => placed.find(
        (box) =>
          Math.abs(box.centreX - centreX) < (box.w + w) / 2 &&
          Math.abs(box.y - candidate) < Math.max(gapY, (box.h + h) / 2),
      );

      // Slide down past whatever is already there. Bounded, because a pathological
      // frame should cost one badly placed label rather than a hung loop.
      let y = entry.y;
      for (let attempt = 0; attempt < anchors.length; attempt += 1) {
        const hit = overlapping(y);
        if (!hit) break;
        y = hit.y + Math.max(gapY, (hit.h + h) / 2) + 1;
      }
      y = Math.min(Math.max(y, top), floor - h);

      // Only if it still cannot fit does it go, and never the one being read.
      if (!active && overlapping(y)) {
        element.style.visibility = 'hidden';
        return;
      }
      element.style.visibility = 'visible';
      placed.push({ centreX, y, w, h });
      element.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    });
  });

  return null;
}
