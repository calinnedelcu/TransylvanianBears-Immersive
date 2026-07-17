import { readFile, stat } from 'node:fs/promises';
import sharp from 'sharp';

const modelPath = 'public/assets/world/buried-act/buried-mausoleum.glb';
const cameraContracts = [
  {
    path: 'public/assets/vertical-slice/v1/08-10-buried/camera.desktop.json',
    id: 'vs08-10.buried.camera.desktop',
    fov: [42, 53],
    start: { position: [0, 3.8, -120], target: [0, 1.65, -128], fovDegrees: 50, rollDegrees: 0 },
    end: { position: [0, -0.45, -191.85], target: [0, -0.52, -195.35], fovDegrees: 42, rollDegrees: 0 },
  },
  {
    path: 'public/assets/vertical-slice/v1/08-10-buried/camera.mobile.json',
    id: 'vs08-10.buried.camera.mobile',
    fov: [52, 64],
    start: { position: [0, 4.25, -120], target: [0, 1.7, -128], fovDegrees: 60, rollDegrees: 0 },
    end: { position: [0, -0.35, -191.85], target: [0, -0.52, -195.35], fovDegrees: 54, rollDegrees: 0 },
  },
];
const cameraPaths = cameraContracts.map(({ path }) => path);
const frameNames = ['mechanism', 'guards', 'mercury', 'royal-hall'];
const imagePaths = frameNames.flatMap((name) => [
  `public/assets/projects/buried-hands/${name}.webp`,
  `public/assets/projects/buried-hands/mobile/${name}.webp`,
]);
const requiredAssets = [modelPath, ...cameraPaths, ...imagePaths];
const requiredNodes = [
  'VS08_10_Buried_ROOT',
  'ENV_Buried_SchoolFold',
  'ENV_Buried_Descent',
  'ENV_Buried_LampChamber',
  'ENV_Buried_EvidenceGallery',
  'ENV_Buried_RoyalHall',
  'ENV_Buried_PixelGate',
  'PRP_Buried_LampRig',
  'PRP_Buried_LampIris',
  'PRP_Buried_Mechanism',
  'PRP_Buried_MechanismWheel',
  'PRP_Buried_Counterweight',
  'PRP_Buried_OilReservoir',
  'PRP_Buried_MercuryBasin',
  'PRP_Buried_GuardPair',
  'PRP_Buried_PixelCore',
  'SCR_Buried_Mechanism',
  'SCR_Buried_Guards',
  'SCR_Buried_Mercury',
  'SCR_Buried_RoyalHall',
  'FX_Buried_SchoolResidue',
  'FX_Buried_MercuryChannels',
  'FX_Buried_VapourVolume',
  'FX_Buried_LampCone',
  'FX_Buried_PixelCompression',
  'ANC_Buried_Entry',
  'ANC_Buried_OilFocus',
  'ANC_Buried_MechanismFocus',
  'ANC_Buried_MercuryFocus',
  'ANC_Buried_GuardsEvidence',
  'ANC_Buried_MercuryEvidence',
  'ANC_Buried_RoyalHallEvidence',
  'ANC_Buried_PixelHandoff',
];

function invariant(condition, message) {
  if (!condition) throw new Error(`[check-buried-assets] ${message}`);
}

function finiteVector(value) {
  return Array.isArray(value)
    && value.length === 3
    && value.every((entry) => Number.isFinite(entry));
}

function closeNumber(first, second) {
  return Math.abs(first - second) <= 1e-4;
}

function closeVector(first, second) {
  return finiteVector(first)
    && finiteVector(second)
    && first.every((value, index) => closeNumber(value, second[index]));
}

function sameFraming(first, second) {
  return closeVector(first.position, second.position)
    && closeVector(first.target, second.target)
    && closeNumber(first.fovDegrees, second.fovDegrees)
    && closeNumber(first.rollDegrees, second.rollDegrees);
}

function matchesPose(sample, pose, progress) {
  return closeNumber(sample.progress, progress)
    && closeVector(sample.position, pose.position)
    && closeVector(sample.target, pose.target)
    && closeNumber(sample.fovDegrees, pose.fovDegrees)
    && closeNumber(sample.rollDegrees, pose.rollDegrees);
}

function glbJson(buffer) {
  invariant(buffer.length >= 20, `${modelPath} is too small to be a GLB`);
  invariant(buffer.toString('utf8', 0, 4) === 'glTF', `${modelPath} has an invalid magic header`);
  invariant(buffer.readUInt32LE(4) === 2, `${modelPath} is not glTF 2.0`);
  invariant(buffer.readUInt32LE(8) === buffer.length, `${modelPath} declares the wrong byte length`);

  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32LE(offset);
    const type = buffer.readUInt32LE(offset + 4);
    const start = offset + 8;
    const end = start + length;
    invariant(end <= buffer.length, `${modelPath} contains a truncated chunk`);
    if (type === 0x4e4f534a) {
      return JSON.parse(buffer.toString('utf8', start, end).replace(/[\u0000\s]+$/u, ''));
    }
    offset = end;
  }
  throw new Error(`[check-buried-assets] ${modelPath} has no JSON chunk`);
}

for (const path of requiredAssets) {
  const metadata = await stat(path).catch(() => null);
  invariant(metadata?.isFile(), `${path} is missing`);
  invariant(metadata.size > 0, `${path} is empty`);
}

const modelMetadata = await stat(modelPath);
invariant(modelMetadata.size <= 2.8 * 1024 * 1024, `${modelPath} exceeds the 2.8 MiB hard limit`);
const gltf = glbJson(await readFile(modelPath));
invariant(gltf.asset?.version === '2.0', `${modelPath} JSON asset version is not 2.0`);
invariant(
  gltf.extensionsRequired?.includes('EXT_meshopt_compression'),
  `${modelPath} is missing required Meshopt compression`,
);
const nodeNames = new Set((gltf.nodes ?? []).map((node) => node.name));
const missingNodes = requiredNodes.filter((name) => !nodeNames.has(name));
invariant(missingNodes.length === 0, `${modelPath} is missing runtime nodes: ${missingNodes.join(', ')}`);

for (const contract of cameraContracts) {
  const { path } = contract;
  const payload = JSON.parse(await readFile(path, 'utf8'));
  invariant(payload.schemaVersion === 1, `${path} uses an unsupported schema version`);
  invariant(payload.id === contract.id, `${path} has the wrong camera id`);
  invariant(Array.isArray(payload.samples) && payload.samples.length === 241, `${path} must contain 241 samples`);
  payload.samples.forEach((sample, index) => {
    const expectedProgress = Number((index / 240).toFixed(8));
    invariant(
      sample.progress === expectedProgress,
      `${path} sample ${index} has non-monotonic progress`,
    );
    invariant(finiteVector(sample.position), `${path} sample ${index} has an invalid position`);
    invariant(finiteVector(sample.target), `${path} sample ${index} has an invalid target`);
    invariant(
      Number.isFinite(sample.fovDegrees)
        && sample.fovDegrees >= contract.fov[0]
        && sample.fovDegrees <= contract.fov[1],
      `${path} sample ${index} has an invalid FOV`,
    );
    invariant(
      Number.isFinite(sample.rollDegrees) && Math.abs(sample.rollDegrees) <= 1,
      `${path} sample ${index} has an invalid roll`,
    );
    invariant(
      Math.hypot(...sample.target.map((value, axis) => value - sample.position[axis])) >= 1.25,
      `${path} sample ${index} has an unsafe target distance`,
    );
  });
  invariant(matchesPose(payload.samples[0], contract.start, 0), `${path} has the wrong entry handoff`);
  invariant(matchesPose(payload.samples.at(-1), contract.end, 1), `${path} has the wrong exit handoff`);
  const hold = payload.samples[48];
  invariant(closeVector(hold.target, [0, -0.45, -154.15]), `${path} has the wrong lamp hold target`);
  invariant(
    payload.samples.slice(48, 65).every((sample) => sameFraming(sample, hold)),
    `${path} does not preserve the authored lamp hold`,
  );
}

for (const name of frameNames) {
  const desktopPath = `public/assets/projects/buried-hands/${name}.webp`;
  const mobilePath = `public/assets/projects/buried-hands/mobile/${name}.webp`;
  const [desktop, mobile, desktopStat, mobileStat] = await Promise.all([
    sharp(desktopPath).metadata(),
    sharp(mobilePath).metadata(),
    stat(desktopPath),
    stat(mobilePath),
  ]);
  invariant(desktop.format === 'webp', `${desktopPath} is not WebP`);
  invariant(mobile.format === 'webp', `${mobilePath} is not WebP`);
  invariant(desktop.width >= 1800 && desktop.height >= 900, `${desktopPath} is below the desktop resolution floor`);
  invariant(mobile.width >= 900 && mobile.width <= 1024, `${mobilePath} is outside the mobile width budget`);
  invariant(mobile.height >= 470 && mobile.height <= 600, `${mobilePath} has an invalid mobile height`);
  invariant(desktopStat.size <= 300 * 1024, `${desktopPath} exceeds 300 KiB`);
  invariant(mobileStat.size <= 150 * 1024, `${mobilePath} exceeds 150 KiB`);
  const desktopRatio = desktop.width / desktop.height;
  const mobileRatio = mobile.width / mobile.height;
  invariant(Math.abs(desktopRatio - mobileRatio) <= 0.015, `${mobilePath} changes the source aspect ratio`);
}

console.log(
  `[check-buried-assets] ${requiredAssets.length} assets, ${requiredNodes.length} nodes, 482 camera samples validated`,
);
