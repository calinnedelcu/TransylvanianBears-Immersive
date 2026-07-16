import { useEffect, useState } from 'react';
import * as THREE from 'three';

export type SchoolActCameraVariant = 'desktop' | 'mobile';

export type SchoolActCameraSample = {
  progress: number;
  position: [number, number, number];
  target: [number, number, number];
  fovDegrees: number;
  rollDegrees: number;
};

export type SchoolActCameraCurve = {
  schemaVersion: 1;
  id: string;
  samples: SchoolActCameraSample[];
};

export type SchoolActCameraSelection = {
  variant: SchoolActCameraVariant;
  curve: SchoolActCameraCurve | null;
  ready: boolean;
  error: Error | null;
};

export type SampledSchoolActCamera = {
  fovDegrees: number;
  rollDegrees: number;
  rollRadians: number;
};

const SAMPLE_COUNT = 241;
const CAMERA_URLS: Record<SchoolActCameraVariant, string> = {
  desktop: '/assets/vertical-slice/v1/05-07-school/camera.desktop.json',
  mobile: '/assets/vertical-slice/v1/05-07-school/camera.mobile.json',
};

type SchoolActCameraCurves = Partial<Record<SchoolActCameraVariant, SchoolActCameraCurve>>;

function isFiniteVector(value: unknown): value is [number, number, number] {
  return Array.isArray(value)
    && value.length === 3
    && value.every((entry) => typeof entry === 'number' && Number.isFinite(entry));
}

function isSchoolActCameraCurve(value: unknown): value is SchoolActCameraCurve {
  if (!value || typeof value !== 'object') return false;
  const curve = value as Partial<SchoolActCameraCurve>;
  if (curve.schemaVersion !== 1 || typeof curve.id !== 'string' || curve.samples?.length !== SAMPLE_COUNT) {
    return false;
  }

  let previousProgress = Number.NEGATIVE_INFINITY;
  for (const sample of curve.samples) {
    if (
      !sample
      || typeof sample.progress !== 'number'
      || !Number.isFinite(sample.progress)
      || sample.progress <= previousProgress
      || !isFiniteVector(sample.position)
      || !isFiniteVector(sample.target)
      || !Number.isFinite(sample.fovDegrees)
      || !Number.isFinite(sample.rollDegrees)
      || sample.fovDegrees < 20
      || sample.fovDegrees > 100
    ) {
      return false;
    }
    previousProgress = sample.progress;
  }

  return curve.samples[0].progress === 0 && curve.samples[curve.samples.length - 1].progress === 1;
}

async function fetchCurve(variant: SchoolActCameraVariant, signal: AbortSignal) {
  const response = await fetch(CAMERA_URLS[variant], { signal });
  if (!response.ok) {
    throw new Error(`School camera ${variant} returned ${response.status}`);
  }
  const payload: unknown = await response.json();
  if (!isSchoolActCameraCurve(payload)) {
    throw new Error(`School camera ${variant} failed schema validation`);
  }
  return payload;
}

export function useSchoolActCamera(compact: boolean): SchoolActCameraSelection {
  const [curves, setCurves] = useState<SchoolActCameraCurves>({});
  const [error, setError] = useState<Error | null>(null);
  const variant: SchoolActCameraVariant = compact ? 'mobile' : 'desktop';

  useEffect(() => {
    const controller = new AbortController();
    setError(null);

    void Promise.all((Object.keys(CAMERA_URLS) as SchoolActCameraVariant[]).map(async (cameraVariant) => {
      const curve = await fetchCurve(cameraVariant, controller.signal);
      return [cameraVariant, curve] as const;
    })).then((entries) => {
      if (controller.signal.aborted) return;
      setCurves(Object.fromEntries(entries) as Record<SchoolActCameraVariant, SchoolActCameraCurve>);
    }).catch((reason: unknown) => {
      if (controller.signal.aborted) return;
      setCurves({});
      setError(reason instanceof Error ? reason : new Error('School camera loading failed'));
    });

    return () => controller.abort();
  }, []);

  const ready = Boolean(curves.desktop && curves.mobile);
  return {
    variant,
    curve: curves[variant] ?? null,
    ready,
    error,
  };
}

export function sampleSchoolActCamera(
  curve: SchoolActCameraCurve | null | undefined,
  localProgress: number,
  position: THREE.Vector3,
  target: THREE.Vector3,
): SampledSchoolActCamera | null {
  if (!curve) return null;

  const progress = THREE.MathUtils.clamp(localProgress, 0, 1);
  const samplePosition = progress * (curve.samples.length - 1);
  const lowerIndex = Math.floor(samplePosition);
  const upperIndex = Math.min(curve.samples.length - 1, lowerIndex + 1);
  const amount = samplePosition - lowerIndex;
  const lower = curve.samples[lowerIndex];
  const upper = curve.samples[upperIndex];

  position.set(
    THREE.MathUtils.lerp(lower.position[0], upper.position[0], amount),
    THREE.MathUtils.lerp(lower.position[1], upper.position[1], amount),
    THREE.MathUtils.lerp(lower.position[2], upper.position[2], amount),
  );
  target.set(
    THREE.MathUtils.lerp(lower.target[0], upper.target[0], amount),
    THREE.MathUtils.lerp(lower.target[1], upper.target[1], amount),
    THREE.MathUtils.lerp(lower.target[2], upper.target[2], amount),
  );

  const fovDegrees = THREE.MathUtils.lerp(lower.fovDegrees, upper.fovDegrees, amount);
  const rollDegrees = THREE.MathUtils.lerp(lower.rollDegrees, upper.rollDegrees, amount);
  return {
    fovDegrees,
    rollDegrees,
    rollRadians: THREE.MathUtils.degToRad(rollDegrees),
  };
}
