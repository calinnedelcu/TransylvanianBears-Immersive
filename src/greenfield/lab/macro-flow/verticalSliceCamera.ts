import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { getVerticalSliceAsset, resolveVerticalSliceAsset, type VerticalSliceAssetId } from './verticalSliceAssets';

export type VerticalSliceCameraChapter = 'threshold' | 'field' | 'lens' | 'proof';

type CameraSample = {
  progress: number;
  position: [number, number, number];
  target: [number, number, number];
  fovDegrees: number;
  rollDegrees: number;
};

type CameraCurve = {
  schemaVersion: 1;
  id: string;
  samples: CameraSample[];
};

export type VerticalSliceCameraCurves = Partial<Record<VerticalSliceCameraChapter, CameraCurve>>;

const CAMERA_ASSETS: Record<VerticalSliceCameraChapter, Record<'desktop' | 'mobile', VerticalSliceAssetId>> = {
  threshold: { desktop: 'thresholdCameraDesktop', mobile: 'thresholdCameraMobile' },
  field: { desktop: 'fieldCameraDesktop', mobile: 'fieldCameraMobile' },
  lens: { desktop: 'lensCameraDesktop', mobile: 'lensCameraMobile' },
  proof: { desktop: 'proofCameraDesktop', mobile: 'proofCameraMobile' },
};

type CameraRange = { chapter: VerticalSliceCameraChapter; start: number; end: number };

/**
 * Which slice of world progress each authored curve covers.
 *
 * These were hand written numbers, and they were wrong twice over. World progress
 * is measured off the document, so every time a section changed height they drifted
 * out from under the chapters they were cut for - and when world progress was
 * re-anchored to the first chapter, `field` still began at 0.064, so arriving at
 * the first chapter sampled the threshold curve instead: the reader came through
 * the gate into an aerial establishing shot of a street they were supposed to be
 * standing at the head of.
 *
 * They are measured from the sections now. A layout change carries; it cannot
 * drift.
 */
const FALLBACK_RANGES: CameraRange[] = [
  { chapter: 'field', start: 0, end: 0.074 },
  { chapter: 'lens', start: 0.074, end: 0.249 },
  { chapter: 'proof', start: 0.249, end: 0.317 },
];

/** Sections the authored curves belong to, in document order. */
const CHAPTER_SECTIONS: Array<{ chapter: VerticalSliceCameraChapter; id: string }> = [
  { chapter: 'field', id: 'mf-field' },
  { chapter: 'lens', id: 'mf-lens' },
  { chapter: 'proof', id: 'mf-proof' },
];

let cameraRanges: CameraRange[] = FALLBACK_RANGES;

/**
 * Re-derive the ranges from where the sections actually are.
 *
 * `startId` and `endId` have to match whatever world progress is anchored to, or
 * the curves land somewhere other than the chapters they were authored for.
 * Returns false and leaves the fallback in place if the document is not ready.
 */
export function measureVerticalSliceCameraRanges(
  startId = 'mf-field',
  endId = 'mf-infect',
): boolean {
  if (typeof document === 'undefined') return false;
  const topOf = (id: string) => document.getElementById(id)?.offsetTop ?? null;
  const from = topOf(startId);
  const to = topOf(endId);
  if (from === null || to === null || to <= from) return false;

  const tops = CHAPTER_SECTIONS.map(({ chapter, id }) => ({ chapter, top: topOf(id) }));
  if (tops.some((entry) => entry.top === null)) return false;

  const span = to - from;
  cameraRanges = tops.map((entry, index) => ({
    chapter: entry.chapter,
    start: ((entry.top as number) - from) / span,
    end: ((tops[index + 1]?.top as number | null) ?? to) - from >= 0
      ? (((tops[index + 1]?.top as number | null) ?? to) - from) / span
      : 1,
  }));
  return true;
}

/** What the sampler is currently using. Exposed so a probe can check it. */
export function verticalSliceCameraRanges(): readonly CameraRange[] {
  return cameraRanges;
}

const CAMERA_CHAPTERS = Object.keys(CAMERA_ASSETS) as VerticalSliceCameraChapter[];

function finiteVector(value: unknown): value is [number, number, number] {
  return Array.isArray(value)
    && value.length === 3
    && value.every((entry) => typeof entry === 'number' && Number.isFinite(entry));
}

function isCameraCurve(value: unknown): value is CameraCurve {
  if (!value || typeof value !== 'object') return false;
  const curve = value as Partial<CameraCurve>;
  if (curve.schemaVersion !== 1 || typeof curve.id !== 'string' || curve.samples?.length !== 241) return false;

  let previousProgress = Number.NEGATIVE_INFINITY;
  for (const sample of curve.samples) {
    if (
      !sample
      || typeof sample.progress !== 'number'
      || !Number.isFinite(sample.progress)
      || sample.progress <= previousProgress
      || !finiteVector(sample.position)
      || !finiteVector(sample.target)
      || !Number.isFinite(sample.fovDegrees)
      || !Number.isFinite(sample.rollDegrees)
    ) return false;
    previousProgress = sample.progress;
  }

  return curve.samples[0].progress === 0 && curve.samples[curve.samples.length - 1].progress === 1;
}

async function fetchCameraCurve(
  chapter: VerticalSliceCameraChapter,
  variant: 'desktop' | 'mobile',
  signal: AbortSignal,
) {
  const asset = resolveVerticalSliceAsset(
    getVerticalSliceAsset(CAMERA_ASSETS[chapter][variant]),
    { allowCandidate: true },
  );
  if (asset?.kind !== 'url') return null;

  const response = await fetch(asset.url, { signal });
  if (!response.ok) throw new Error(`Camera curve ${chapter} returned ${response.status}`);
  const payload: unknown = await response.json();
  if (!isCameraCurve(payload)) throw new Error(`Camera curve ${chapter} failed schema validation`);
  return payload;
}

export function useVerticalSliceCameraCurves(
  compact: boolean,
  chapter: VerticalSliceCameraChapter | null,
) {
  const variant = compact ? 'mobile' : 'desktop';
  const [curvesByVariant, setCurvesByVariant] = useState<
    Record<'desktop' | 'mobile', VerticalSliceCameraCurves>
  >({ desktop: {}, mobile: {} });
  const activeCurve = chapter ? curvesByVariant[variant][chapter] : null;

  useEffect(() => {
    if (!chapter || activeCurve) return undefined;

    const controller = new AbortController();
    void fetchCameraCurve(chapter, variant, controller.signal).then((curve) => {
      if (!curve || controller.signal.aborted) return;
      setCurvesByVariant((current) => ({
        ...current,
        [variant]: {
          ...current[variant],
          [chapter]: curve,
        },
      }));
    }).catch(() => {
      // The generic camera path remains available when an authored curve fails.
    });

    return () => controller.abort();
  }, [activeCurve, chapter, variant]);

  useEffect(() => {
    if (!chapter || !activeCurve) return undefined;
    const missingChapters = CAMERA_CHAPTERS.filter(
      (candidate) => !curvesByVariant[variant][candidate],
    );
    if (missingChapters.length === 0) return undefined;

    const controller = new AbortController();
    const schedule = window.requestIdleCallback
      ? (callback: () => void) => window.requestIdleCallback(callback, { timeout: 1_400 })
      : (callback: () => void) => window.setTimeout(callback, 700);
    const cancel = window.cancelIdleCallback
      ? (handle: number) => window.cancelIdleCallback(handle)
      : (handle: number) => window.clearTimeout(handle);
    const handle = schedule(() => {
      void Promise.all(missingChapters.map(async (candidate) => ({
        candidate,
        curve: await fetchCameraCurve(candidate, variant, controller.signal),
      }))).then((loaded) => {
        if (controller.signal.aborted) return;
        setCurvesByVariant((current) => ({
          ...current,
          [variant]: loaded.reduce<VerticalSliceCameraCurves>(
            (next, { candidate, curve }) => {
              if (curve) next[candidate] = curve;
              return next;
            },
            { ...current[variant] },
          ),
        }));
      }).catch(() => {
        // Missing authored curves continue to use the generic camera path.
      });
    });

    return () => {
      cancel(handle);
      controller.abort();
    };
  }, [activeCurve, chapter, curvesByVariant, variant]);

  return curvesByVariant[variant];
}

export function sampleVerticalSliceCamera(
  curves: VerticalSliceCameraCurves,
  worldProgress: number,
  position: THREE.Vector3,
  target: THREE.Vector3,
) {
  const range = cameraRanges.find(({ start, end }) => worldProgress >= start && worldProgress <= end);
  if (!range) return null;
  const curve = curves[range.chapter];
  if (!curve) return null;

  const localProgress = THREE.MathUtils.clamp(
    (worldProgress - range.start) / Math.max(Number.EPSILON, range.end - range.start),
    0,
    1,
  );
  const samplePosition = localProgress * (curve.samples.length - 1);
  const lowerIndex = Math.floor(samplePosition);
  const upperIndex = Math.min(curve.samples.length - 1, lowerIndex + 1);
  const mix = samplePosition - lowerIndex;
  const lower = curve.samples[lowerIndex];
  const upper = curve.samples[upperIndex];

  position.set(
    THREE.MathUtils.lerp(lower.position[0], upper.position[0], mix),
    THREE.MathUtils.lerp(lower.position[1], upper.position[1], mix),
    THREE.MathUtils.lerp(lower.position[2], upper.position[2], mix),
  );
  target.set(
    THREE.MathUtils.lerp(lower.target[0], upper.target[0], mix),
    THREE.MathUtils.lerp(lower.target[1], upper.target[1], mix),
    THREE.MathUtils.lerp(lower.target[2], upper.target[2], mix),
  );

  return {
    chapter: range.chapter,
    fovDegrees: THREE.MathUtils.lerp(lower.fovDegrees, upper.fovDegrees, mix),
    rollRadians: THREE.MathUtils.degToRad(THREE.MathUtils.lerp(lower.rollDegrees, upper.rollDegrees, mix)),
  };
}
