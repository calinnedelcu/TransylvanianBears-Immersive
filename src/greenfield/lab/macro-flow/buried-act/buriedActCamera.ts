import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { publicAssetUrl } from './publicAssetUrl';

export type BuriedActCameraVariant = 'desktop' | 'mobile';

export type BuriedActCameraSample = {
  progress: number;
  position: [number, number, number];
  target: [number, number, number];
  fovDegrees: number;
  rollDegrees: number;
};

export type BuriedActCameraCurve = {
  schemaVersion: 1;
  id: string;
  samples: BuriedActCameraSample[];
};

export type BuriedActCameraSelection = {
  variant: BuriedActCameraVariant;
  curve: BuriedActCameraCurve | null;
  ready: boolean;
  error: Error | null;
};

export type SampledBuriedActCamera = {
  fovDegrees: number;
  rollDegrees: number;
  rollRadians: number;
};

type CameraPoseContract = {
  progress: number;
  position: readonly [number, number, number];
  target: readonly [number, number, number];
  fovDegrees: number;
  rollDegrees: number;
};

const SAMPLE_COUNT = 241;
const LAST_SAMPLE_INDEX = SAMPLE_COUNT - 1;
const SAMPLE_KEYS = ['progress', 'position', 'target', 'fovDegrees', 'rollDegrees'] as const;
const CURVE_KEYS = ['schemaVersion', 'id', 'samples'] as const;
const MAX_ROLL_DEGREES = 1;
const MINIMUM_TARGET_DISTANCE_SQUARED = 1.25 ** 2;
const VALUE_TOLERANCE = 1e-4;

const CAMERA_URLS: Record<BuriedActCameraVariant, string> = {
  desktop: publicAssetUrl('assets/vertical-slice/v1/08-10-buried/camera.desktop.json'),
  mobile: publicAssetUrl('assets/vertical-slice/v1/08-10-buried/camera.mobile.json'),
};

const CAMERA_IDS: Record<BuriedActCameraVariant, string> = {
  desktop: 'vs08-10.buried.camera.desktop',
  mobile: 'vs08-10.buried.camera.mobile',
};

const FOV_RANGES: Record<BuriedActCameraVariant, readonly [number, number]> = {
  desktop: [42, 53],
  mobile: [52, 64],
};

const HANDOFF_CONTRACTS: Record<
  BuriedActCameraVariant,
  Readonly<{ start: CameraPoseContract; end: CameraPoseContract }>
> = {
  desktop: {
    start: {
      progress: 0,
      position: [0, 3.8, -120],
      target: [0, 1.65, -128],
      fovDegrees: 50,
      rollDegrees: 0,
    },
    end: {
      progress: 1,
      position: [0, -0.45, -191.85],
      target: [0, -0.52, -195.35],
      fovDegrees: 42,
      rollDegrees: 0,
    },
  },
  mobile: {
    start: {
      progress: 0,
      position: [0, 4.25, -120],
      target: [0, 1.7, -128],
      fovDegrees: 60,
      rollDegrees: 0,
    },
    end: {
      progress: 1,
      position: [0, -0.35, -191.85],
      target: [0, -0.52, -195.35],
      fovDegrees: 54,
      rollDegrees: 0,
    },
  },
};

const HOLD_WINDOWS = [
  { startIndex: 48, endIndex: 64, target: [0, -0.45, -154.15] },
] as const;

type BuriedActCameraLoad = {
  variant: BuriedActCameraVariant;
  curve: BuriedActCameraCurve | null;
  error: Error | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  const actualKeys = Object.keys(value);
  return actualKeys.length === keys.length
    && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isFiniteVector(value: unknown): value is [number, number, number] {
  return Array.isArray(value)
    && value.length === 3
    && value.every(isFiniteNumber);
}

function closeNumber(first: number, second: number) {
  return Math.abs(first - second) <= VALUE_TOLERANCE;
}

function closeVector(
  first: readonly [number, number, number],
  second: readonly [number, number, number],
) {
  return first.every((value, index) => closeNumber(value, second[index]));
}

function matchesPose(sample: BuriedActCameraSample, contract: CameraPoseContract) {
  return closeNumber(sample.progress, contract.progress)
    && closeVector(sample.position, contract.position)
    && closeVector(sample.target, contract.target)
    && closeNumber(sample.fovDegrees, contract.fovDegrees)
    && closeNumber(sample.rollDegrees, contract.rollDegrees);
}

function matchesFraming(first: BuriedActCameraSample, second: BuriedActCameraSample) {
  return closeVector(first.position, second.position)
    && closeVector(first.target, second.target)
    && closeNumber(first.fovDegrees, second.fovDegrees)
    && closeNumber(first.rollDegrees, second.rollDegrees);
}

function hasSafeTargetDistance(
  position: readonly [number, number, number],
  target: readonly [number, number, number],
) {
  const x = target[0] - position[0];
  const y = target[1] - position[1];
  const z = target[2] - position[2];
  return x * x + y * y + z * z >= MINIMUM_TARGET_DISTANCE_SQUARED;
}

function hasValidHolds(samples: BuriedActCameraSample[]) {
  return HOLD_WINDOWS.every(({ startIndex, endIndex, target }) => {
    const reference = samples[startIndex];
    if (!reference || !closeVector(reference.target, target)) return false;
    for (let index = startIndex; index <= endIndex; index += 1) {
      if (!matchesFraming(reference, samples[index])) return false;
    }
    return true;
  });
}

function isBuriedActCameraCurve(
  value: unknown,
  variant: BuriedActCameraVariant,
): value is BuriedActCameraCurve {
  if (!isRecord(value) || !hasExactKeys(value, CURVE_KEYS)) return false;
  if (
    value.schemaVersion !== 1
    || value.id !== CAMERA_IDS[variant]
    || !Array.isArray(value.samples)
    || value.samples.length !== SAMPLE_COUNT
  ) {
    return false;
  }

  const [minimumFov, maximumFov] = FOV_RANGES[variant];
  for (let index = 0; index < value.samples.length; index += 1) {
    const sample = value.samples[index];
    if (!isRecord(sample) || !hasExactKeys(sample, SAMPLE_KEYS)) return false;

    const expectedProgress = Number((index / LAST_SAMPLE_INDEX).toFixed(8));
    if (
      !isFiniteNumber(sample.progress)
      || sample.progress !== expectedProgress
      || !isFiniteVector(sample.position)
      || !isFiniteVector(sample.target)
      || !isFiniteNumber(sample.fovDegrees)
      || sample.fovDegrees < minimumFov
      || sample.fovDegrees > maximumFov
      || !isFiniteNumber(sample.rollDegrees)
      || Math.abs(sample.rollDegrees) > MAX_ROLL_DEGREES
      || !hasSafeTargetDistance(sample.position, sample.target)
    ) {
      return false;
    }
  }

  const samples = value.samples as BuriedActCameraSample[];
  const handoffs = HANDOFF_CONTRACTS[variant];
  return matchesPose(samples[0], handoffs.start)
    && matchesPose(samples[LAST_SAMPLE_INDEX], handoffs.end)
    && hasValidHolds(samples);
}

async function fetchCurve(variant: BuriedActCameraVariant, signal: AbortSignal) {
  const response = await fetch(CAMERA_URLS[variant], { signal });
  if (!response.ok) {
    throw new Error(`Buried camera ${variant} returned ${response.status}`);
  }
  const payload: unknown = await response.json();
  if (!isBuriedActCameraCurve(payload, variant)) {
    throw new Error(`Buried camera ${variant} failed schema validation`);
  }
  return payload;
}

export function useBuriedActCamera(
  compact: boolean,
  enabled = true,
): BuriedActCameraSelection {
  const variant: BuriedActCameraVariant = compact ? 'mobile' : 'desktop';
  const [load, setLoad] = useState<BuriedActCameraLoad>(() => ({
    variant,
    curve: null,
    error: null,
  }));
  const selectedLoad = load.variant === variant ? load : null;
  const hasSelectedCurve = Boolean(selectedLoad?.curve);

  useEffect(() => {
    if (!enabled || hasSelectedCurve) return undefined;

    const controller = new AbortController();
    setLoad({ variant, curve: null, error: null });

    void fetchCurve(variant, controller.signal).then((curve) => {
      if (controller.signal.aborted) return;
      setLoad({ variant, curve, error: null });
    }).catch((reason: unknown) => {
      if (controller.signal.aborted) return;
      setLoad({
        variant,
        curve: null,
        error: reason instanceof Error ? reason : new Error(`Buried camera ${variant} loading failed`),
      });
    });

    return () => controller.abort();
  }, [enabled, hasSelectedCurve, variant]);

  return {
    variant,
    curve: selectedLoad?.curve ?? null,
    ready: Boolean(selectedLoad?.curve),
    error: selectedLoad?.error ?? null,
  };
}

export function sampleBuriedActCamera(
  curve: BuriedActCameraCurve | null | undefined,
  localProgress: number,
  position: THREE.Vector3,
  target: THREE.Vector3,
): SampledBuriedActCamera | null {
  if (!curve) return null;

  const finiteProgress = Number.isFinite(localProgress) ? localProgress : 0;
  const progress = THREE.MathUtils.clamp(finiteProgress, 0, 1);
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
