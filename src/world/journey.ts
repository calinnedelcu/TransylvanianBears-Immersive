import * as THREE from 'three';
import { PALETTE } from '../three/shapes';

/**
 * The home page is a walk through one 3D world. Every section (and every step inside
 * the long sections) is a "station": an element in the page marked `data-station`.
 * Scrolling moves the camera from station to station; nothing hijacks the scroll.
 *
 * World layout, looking down -z from the hero:
 *   hero (z 0) → four manifesto monoliths → seven project billboards → results under a
 *   night sky with medals → the team standing in a half-circle → the paw monument.
 */

export type StationKind =
  | 'hero'
  | 'pillars'
  | 'pillar'
  | 'projects'
  | 'project'
  | 'results'
  | 'team'
  | 'member'
  | 'contact';

export const SKY: Record<StationKind, string> = {
  hero: PALETTE.gold,
  pillars: PALETTE.bone,
  pillar: PALETTE.bone,
  projects: '#eadfc6',
  project: '#eadfc6',
  results: PALETTE.ink,
  team: PALETTE.sky,
  member: PALETTE.sky,
  contact: PALETTE.wine,
};

/** Winding centre line of the road. */
export const roadX = (z: number) => Math.sin(z * 0.045) * 1.6;

export const PILLAR_COUNT = 4;
export const pillarSpot = (k: number) => {
  const side = k % 2 === 0 ? 1 : -1;
  const z = -22 - k * 13;
  return { position: new THREE.Vector3(side * 4.4, 0, z), yaw: -side * 0.42 };
};

export const projectSpot = (i: number) => {
  const side = i % 2 === 0 ? 1 : -1;
  const z = -82 - i * 15;
  return { position: new THREE.Vector3(side * 4.6, 3.6, z), yaw: -side * 0.4 };
};

export const RESULTS_CENTER = new THREE.Vector3(0, 0, -202);

export const TEAM_Z = -242;
export const memberSpot = (i: number, count: number) => {
  const u = i - (count - 1) / 2;
  const position = new THREE.Vector3(u * 5.2, 0, TEAM_Z + u * u * 0.7);
  // Each standee faces the middle of the half-circle's opening.
  const yaw = Math.atan2(-position.x, TEAM_Z + 20 - position.z);
  return { position, yaw };
};

export const MONUMENT = new THREE.Vector3(0, 0, -262);

/** Sizes of the things the camera frames (width, height), for fitting them on screen. */
const SUBJECT = {
  pillar: { w: 3.4, h: 8.8, y: 4.1 },
  project: { w: 5.6, h: 3.8, y: 3.6 },
  member: { w: 4.2, h: 5.6, y: 2.5 },
};

export type Keyframe = {
  position: THREE.Vector3;
  target: THREE.Vector3;
  /** Where the subject sits on screen: shift from the centre as a fraction of width / height. */
  offset: THREE.Vector2;
  fov: number;
  sky: THREE.Color;
};

type Station = { kind: StationKind; index: number; count: number };

/** Camera distance that fits a w×h subject inside the given share of the screen. */
function fitDistance(w: number, h: number, fov: number, aspect: number, shareW: number, shareH: number) {
  const t = Math.tan(THREE.MathUtils.degToRad(fov) / 2);
  return Math.max(h / (2 * t * shareH), w / (2 * t * aspect * shareW));
}

export function keyframeFor(station: Station, aspect: number, stacked: boolean): Keyframe {
  // `stacked`: the page shows the card under the object (same breakpoint as world.css).
  const portrait = stacked;
  const fov = aspect < 1 ? 52 : 40;
  const sky = new THREE.Color(SKY[station.kind]);
  const frame = (position: THREE.Vector3, target: THREE.Vector3, offset = new THREE.Vector2()) => ({
    position,
    target,
    offset,
    fov,
    sky,
  });

  /** A subject on one side of the screen, the page's card on the other (or below, on phones). */
  const focus = (center: THREE.Vector3, yaw: number, subject: { w: number; h: number }, side: 1 | -1) => {
    const shareW = portrait ? 0.9 : 0.46;
    const shareH = portrait ? 0.4 : 0.78;
    const d = fitDistance(subject.w, subject.h, fov, aspect, shareW, shareH);
    const position = center.clone().add(new THREE.Vector3(Math.sin(yaw) * d, 0.35 + d * 0.05, Math.cos(yaw) * d));
    const offset = portrait ? new THREE.Vector2(0, 0.23) : new THREE.Vector2(0.22 * side, 0);
    return frame(position, center, offset);
  };

  switch (station.kind) {
    case 'hero':
      return frame(new THREE.Vector3(0, 3.4, 16), new THREE.Vector3(0, 4.2, 0));
    case 'pillars':
      return frame(new THREE.Vector3(0, 7.5, 4), new THREE.Vector3(0, 2.5, -34));
    case 'pillar': {
      const spot = pillarSpot(station.index);
      const center = spot.position.clone().setY(SUBJECT.pillar.y);
      return focus(center, spot.yaw, SUBJECT.pillar, 1);
    }
    case 'projects':
      return frame(new THREE.Vector3(0, 8, -62), new THREE.Vector3(0, 3, -105));
    case 'project': {
      const spot = projectSpot(station.index);
      return focus(spot.position.clone(), spot.yaw, SUBJECT.project, 1);
    }
    case 'results':
      return frame(new THREE.Vector3(0, 5, RESULTS_CENTER.z + 17), new THREE.Vector3(0, 4.4, RESULTS_CENTER.z));
    case 'team':
      return frame(new THREE.Vector3(0, 6.5, TEAM_Z + 24), new THREE.Vector3(0, 2.6, TEAM_Z));
    case 'member': {
      const spot = memberSpot(station.index, station.count);
      const center = spot.position.clone().setY(SUBJECT.member.y);
      return focus(center, spot.yaw, SUBJECT.member, -1);
    }
    case 'contact':
      return frame(new THREE.Vector3(0, 24, TEAM_Z + 14), new THREE.Vector3(0, 4, MONUMENT.z));
  }
}

export type Measured = { anchor: number; keyframe: Keyframe };

/**
 * Reads every `[data-station]` element and works out the scroll position at which the
 * camera should be exactly at it: when the element's middle meets the middle of the screen.
 */
export function measureStations(aspect: number): Measured[] {
  const elements = [...document.querySelectorAll<HTMLElement>('[data-station]')];
  const counts: Partial<Record<StationKind, number>> = {};
  for (const element of elements) {
    const kind = element.dataset.station as StationKind;
    counts[kind] = (counts[kind] ?? 0) + 1;
  }
  const viewport = window.innerHeight;
  const stacked = window.matchMedia('(max-width: 899px), (orientation: portrait)').matches;
  const maxScroll = Math.max(document.documentElement.scrollHeight - viewport, 0);
  let last = -Infinity;

  return elements.map((element) => {
    const kind = element.dataset.station as StationKind;
    const index = Number(element.dataset.index ?? 0);
    const box = element.getBoundingClientRect();
    const top = box.top + window.scrollY;
    let anchor = kind === 'hero' ? 0 : top + Math.min(box.height, viewport * 1.2) / 2 - viewport / 2;
    // The last stations may sit past the bottom of the page: they meet at the very end.
    anchor = Math.max(Math.min(anchor, maxScroll), last + 1);
    last = anchor;
    return { anchor, keyframe: keyframeFor({ kind, index, count: counts[kind] ?? 1 }, aspect, stacked) };
  });
}

/** Holds the camera at each station for a moment, then glides to the next. */
export function ease(t: number) {
  const hold = 0.16;
  const x = THREE.MathUtils.clamp((t - hold) / (1 - hold * 2), 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
}
