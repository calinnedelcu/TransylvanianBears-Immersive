import { useGLTF, useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import {
  useEffect,
  useMemo,
  type MutableRefObject,
} from 'react';
import * as THREE from 'three';
import type { QualityTier } from '../../../experience/quality';
import type { MacroTraceOutcome } from '../macroFlowTypes';

const SCHOOL_ACT_MODEL_URL = '/assets/world/school-act/school-passage.glb';
const AEGIS_MEDIA_URL = '/assets/projects/aegis.webp';
const SCHOOLMATE_MEDIA_URL = '/assets/projects/schoolmate.webp';

const TURNSTILE_OPEN_RADIANS = THREE.MathUtils.degToRad(120);
const SCREEN_PLANE_GEOMETRY = new THREE.PlaneGeometry(1, 1);

const REQUIRED_NODE_NAMES = [
  'VS05_07_School_ROOT',
  'ENV_School_GothicEntry',
  'ENV_School_Corridor',
  'ENV_School_Classroom',
  'ENV_School_Secretariat',
  'ENV_School_DescentThreshold',
  'PRP_Aegis_Phone',
  'PRP_Aegis_Scanner',
  'PRP_Aegis_Turnstile',
  'PRP_Aegis_TurnstilePivot',
  'PRP_Aegis_AuditTerminal',
  'PRP_SchoolMate_ClassroomScreen',
  'PRP_SchoolMate_SecretariatScreen',
  'PRP_SchoolMate_NoticeRail',
  'FX_Aegis_ScanPlane',
  'FX_Aegis_TransactionCore',
  'FX_SchoolMate_RequestThread',
  'ANC_School_Entry',
  'ANC_Aegis_PhoneFocus',
  'ANC_Aegis_ScannerFocus',
  'ANC_Aegis_Crossing',
  'ANC_SchoolMate_ClassroomFocus',
  'ANC_SchoolMate_SecretariatFocus',
  'ANC_School_HandoffDescent',
] as const;

const REQUEST_PATH = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-13.9, 2.25, -105.2),
  new THREE.Vector3(-10, 2.18, -105.2),
  new THREE.Vector3(-6, 2.18, -105.2),
  new THREE.Vector3(-3.5, 0.1, -106),
  new THREE.Vector3(2.3, 0.1, -106),
  new THREE.Vector3(5.65, 2.9, -104),
  new THREE.Vector3(5.65, 2.9, -110),
  new THREE.Vector3(10.55, 2.72, -109.2),
], false, 'catmullrom', 0.28);

export type SchoolActPackageProps = Readonly<{
  localProgressRef: MutableRefObject<number>;
  handoffProgressRef: MutableRefObject<number>;
  traceProgress: number;
  traceOutcome: MacroTraceOutcome;
  qualityTier: QualityTier;
  reducedMotion?: boolean;
}>;

type AnimatedMaterial = THREE.MeshStandardMaterial | THREE.MeshBasicMaterial;

type ScreenOverlays = Readonly<{
  aegis: THREE.Mesh[];
  schoolMate: THREE.Mesh[];
}>;

type RuntimeNodes = Readonly<{
  modelRoot: THREE.Object3D;
  staticEnvironment: THREE.Object3D | null;
  nexusResidue: THREE.Mesh | null;
  phone: THREE.Object3D | null;
  student: THREE.Object3D | null;
  scanPlane: THREE.Object3D | null;
  turnstilePivot: THREE.Object3D | null;
  transactionContacts: THREE.Object3D[];
  requestThread: THREE.Object3D | null;
  requestPacket: THREE.Object3D | null;
  descentGuide: THREE.Object3D | null;
  noticePapers: THREE.Object3D[];
  practicalLights: THREE.Mesh[];
  tokenField: THREE.Object3D | null;
  crestBrass: THREE.Mesh[];
}>;

type RuntimePackage = Readonly<{
  scene: THREE.Group;
  nodes: RuntimeNodes;
  clonedMaterials: THREE.Material[];
  materialStates: Array<Readonly<{
    material: THREE.Material;
    opacity: number;
    transparent: boolean;
    depthWrite: boolean;
    visible: boolean;
  }>>;
  warmMaterials: THREE.MeshStandardMaterial[];
  nexusMaterials: AnimatedMaterial[];
  scanMaterials: AnimatedMaterial[];
  contactMaterials: AnimatedMaterial[][];
  requestMaterials: AnimatedMaterial[];
  descentMaterials: AnimatedMaterial[];
  screenMaterials: Readonly<{
    aegis: THREE.MeshStandardMaterial;
    schoolMate: THREE.MeshStandardMaterial;
  }>;
  overlays: ScreenOverlays;
  base: Readonly<{
    rootPosition: THREE.Vector3;
    rootScale: THREE.Vector3;
    nexusScale: THREE.Vector3 | null;
    phonePosition: THREE.Vector3 | null;
    phoneRotation: THREE.Euler | null;
    studentPosition: THREE.Vector3 | null;
    scanPosition: THREE.Vector3 | null;
    scanScale: THREE.Vector3 | null;
    pivotRotationY: number;
    contactScales: THREE.Vector3[];
    packetScale: THREE.Vector3 | null;
    noticePaperPositions: THREE.Vector3[];
  }>;
  requiredNodeCount: number;
  nodeCount: number;
  triangleCount: number;
}>;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return THREE.MathUtils.clamp(value, 0, 1);
}

function range(progress: number, start: number, end: number): number {
  return THREE.MathUtils.smoothstep(progress, start, end);
}

function materialList(object: THREE.Object3D | null): AnimatedMaterial[] {
  const materials: AnimatedMaterial[] = [];
  object?.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const candidates = Array.isArray(child.material) ? child.material : [child.material];
    candidates.forEach((material) => {
      if (
        material instanceof THREE.MeshStandardMaterial
        || material instanceof THREE.MeshBasicMaterial
      ) {
        materials.push(material);
      }
    });
  });
  return materials;
}

function triangleCount(scene: THREE.Object3D): number {
  let triangles = 0;
  scene.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const { geometry } = child;
    const count = geometry.index?.count ?? geometry.getAttribute('position')?.count ?? 0;
    triangles += count / 3;
  });
  return Math.round(triangles);
}

function makeScreenMaterial(
  name: string,
  texture: THREE.Texture,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    name,
    color: '#ffffff',
    map: texture,
    emissive: '#ffffff',
    emissiveMap: texture,
    emissiveIntensity: 0.42,
    metalness: 0,
    roughness: 0.38,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    toneMapped: true,
  });
}

function addScreenOverlay(
  parent: THREE.Object3D | null,
  name: string,
  material: THREE.Material,
  position: THREE.Vector3,
  rotation: THREE.Euler,
  size: THREE.Vector2,
): THREE.Mesh | null {
  if (!parent) return null;
  const overlay = new THREE.Mesh(SCREEN_PLANE_GEOMETRY, material);
  overlay.name = name;
  overlay.position.copy(position);
  overlay.rotation.copy(rotation);
  overlay.scale.set(size.x, size.y, 1);
  overlay.renderOrder = 8;
  overlay.castShadow = false;
  overlay.receiveShadow = false;
  overlay.frustumCulled = true;
  parent.add(overlay);
  return overlay;
}

function makeRuntimePackage(
  sourceScene: THREE.Group,
  aegisTexture: THREE.Texture,
  schoolMateTexture: THREE.Texture,
  qualityTier: QualityTier,
): RuntimePackage {
  const scene = sourceScene.clone(true);
  const clonedMaterials: THREE.Material[] = [];
  const warmMaterials: THREE.MeshStandardMaterial[] = [];
  let nodeCount = 0;

  scene.traverse((child) => {
    nodeCount += 1;
    if (!(child instanceof THREE.Mesh)) return;

    const sourceMaterials = Array.isArray(child.material) ? child.material : [child.material];
    const localMaterials = sourceMaterials.map((source) => {
      const material = source.clone();
      clonedMaterials.push(material);
      if (material instanceof THREE.MeshStandardMaterial) {
        material.envMapIntensity = qualityTier === 'cinematic' ? 0.62 : 0.42;
        if (material.name === 'Occupied school light') warmMaterials.push(material);
      }
      return material;
    });

    child.material = Array.isArray(child.material) ? localMaterials : localMaterials[0];
    child.castShadow = qualityTier === 'cinematic'
      && /student|aegis phone|aegis scanner|turnstile|schoolmate request packet/i.test(child.name);
    child.receiveShadow = qualityTier !== 'editorial';
    child.frustumCulled = true;
  });

  const modelRoot = scene.getObjectByName('VS05_07_School_ROOT') ?? scene;
  const phone = scene.getObjectByName('PRP_Aegis_Phone') ?? null;
  const auditTerminal = scene.getObjectByName('PRP_Aegis_AuditTerminal') ?? null;
  const classroomScreen = scene.getObjectByName('PRP_SchoolMate_ClassroomScreen') ?? null;
  const secretariatScreen = scene.getObjectByName('PRP_SchoolMate_SecretariatScreen') ?? null;
  const scanPlane = scene.getObjectByName('FX_Aegis_ScanPlane') ?? null;
  const requestThread = scene.getObjectByName('FX_SchoolMate_RequestThread') ?? null;
  const descentGuide = scene.getObjectByName('Descent guide line') ?? null;
  const transactionContacts = Array.from({ length: 5 }, (_, index) => (
    scene.getObjectByName(`Transaction contact ${index + 1}`)
  )).filter((node): node is THREE.Object3D => Boolean(node));

  const screenMaterials = {
    aegis: makeScreenMaterial('Runtime Aegis evidence screen', aegisTexture),
    schoolMate: makeScreenMaterial('Runtime SchoolMate evidence screen', schoolMateTexture),
  };
  clonedMaterials.push(screenMaterials.aegis, screenMaterials.schoolMate);

  const overlays: ScreenOverlays = {
    aegis: [
      addScreenOverlay(
        phone,
        'RUNTIME_Aegis_PhoneEvidence',
        screenMaterials.aegis,
        new THREE.Vector3(0, 0.24, -0.086),
        new THREE.Euler(0, 0, 0),
        new THREE.Vector2(0.63, 0.486),
      ),
      addScreenOverlay(
        auditTerminal,
        'RUNTIME_Aegis_AuditEvidence',
        screenMaterials.aegis,
        new THREE.Vector3(-0.278, 0.1, 0),
        new THREE.Euler(0, -Math.PI / 2, 0),
        new THREE.Vector2(2.03, 1.565),
      ),
    ].filter((mesh): mesh is THREE.Mesh => Boolean(mesh)),
    schoolMate: [
      addScreenOverlay(
        classroomScreen,
        'RUNTIME_SchoolMate_ClassroomEvidence',
        screenMaterials.schoolMate,
        new THREE.Vector3(-0.142, 0, 0),
        new THREE.Euler(0, -Math.PI / 2, 0),
        new THREE.Vector2(2.98, 1.746),
      ),
      addScreenOverlay(
        secretariatScreen,
        'RUNTIME_SchoolMate_SecretariatEvidence',
        screenMaterials.schoolMate,
        new THREE.Vector3(0, 0, 0.134),
        new THREE.Euler(0, 0, 0),
        new THREE.Vector2(2.92, 1.711),
      ),
    ].filter((mesh): mesh is THREE.Mesh => Boolean(mesh)),
  };

  const noticePapers: THREE.Object3D[] = [];
  const practicalLights: THREE.Mesh[] = [];
  const crestBrass: THREE.Mesh[] = [];
  scene.traverse((child) => {
    if (child.name.startsWith('Notice paper')) noticePapers.push(child);
    if (child instanceof THREE.Mesh && child.name.startsWith('Civic ceiling light diffuser')) {
      practicalLights.push(child);
    }
    if (child instanceof THREE.Mesh && /bear crest brass/i.test(child.name)) {
      crestBrass.push(child);
    }
  });
  practicalLights.sort((left, right) => left.position.z - right.position.z);

  const nodes: RuntimeNodes = {
    modelRoot,
    staticEnvironment: scene.getObjectByName('EXPORT_School_StaticEnvironment') ?? null,
    nexusResidue: scene.getObjectByName('EXPORT_School_Static_Aegis cyan signal') as THREE.Mesh | null,
    phone,
    student: scene.getObjectByName('CHR_Student_Waiting') ?? null,
    scanPlane,
    turnstilePivot: scene.getObjectByName('PRP_Aegis_TurnstilePivot') ?? null,
    transactionContacts,
    requestThread,
    requestPacket: scene.getObjectByName('SchoolMate request packet') ?? null,
    descentGuide,
    noticePapers,
    practicalLights,
    tokenField: scene.getObjectByName('Aegis phone token field') ?? null,
    crestBrass,
  };

  const contactMaterials = transactionContacts.map((contact) => materialList(contact));
  const nexusMaterials = materialList(nodes.nexusResidue);
  const requestMaterials = materialList(requestThread);
  const descentMaterials = materialList(descentGuide);

  nexusMaterials.forEach((material) => {
    material.transparent = true;
    material.depthWrite = false;
  });
  materialList(scanPlane).forEach((material) => {
    material.transparent = true;
    material.depthWrite = false;
  });
  requestMaterials.forEach((material) => {
    material.transparent = true;
  });
  descentMaterials.forEach((material) => {
    material.transparent = true;
    material.depthWrite = false;
  });

  return {
    scene,
    nodes,
    clonedMaterials,
    materialStates: clonedMaterials.map((material) => ({
      material,
      opacity: material.opacity,
      transparent: material.transparent,
      depthWrite: material.depthWrite,
      visible: material.visible,
    })),
    warmMaterials,
    nexusMaterials,
    scanMaterials: materialList(scanPlane),
    contactMaterials,
    requestMaterials,
    descentMaterials,
    screenMaterials,
    overlays,
    base: {
      rootPosition: modelRoot.position.clone(),
      rootScale: modelRoot.scale.clone(),
      nexusScale: nodes.nexusResidue?.scale.clone() ?? null,
      phonePosition: phone?.position.clone() ?? null,
      phoneRotation: phone?.rotation.clone() ?? null,
      studentPosition: nodes.student?.position.clone() ?? null,
      scanPosition: scanPlane?.position.clone() ?? null,
      scanScale: scanPlane?.scale.clone() ?? null,
      pivotRotationY: nodes.turnstilePivot?.rotation.y ?? 0,
      contactScales: transactionContacts.map((contact) => contact.scale.clone()),
      packetScale: nodes.requestPacket?.scale.clone() ?? null,
      noticePaperPositions: noticePapers.map((paper) => paper.position.clone()),
    },
    requiredNodeCount: REQUIRED_NODE_NAMES.filter((name) => scene.getObjectByName(name)).length,
    nodeCount,
    triangleCount: triangleCount(scene),
  };
}

function setMaterialOpacity(materials: AnimatedMaterial[], opacity: number): void {
  materials.forEach((material) => {
    material.opacity = opacity;
    material.visible = opacity > 0.001;
  });
}

export function SchoolActPackage({
  localProgressRef,
  handoffProgressRef,
  traceProgress,
  traceOutcome,
  qualityTier,
  reducedMotion = false,
}: SchoolActPackageProps) {
  const { scene: sourceScene } = useGLTF(SCHOOL_ACT_MODEL_URL, false, true);
  const [aegisTexture, schoolMateTexture] = useTexture([
    AEGIS_MEDIA_URL,
    SCHOOLMATE_MEDIA_URL,
  ]) as THREE.Texture[];

  if (aegisTexture.colorSpace !== THREE.SRGBColorSpace) {
    aegisTexture.colorSpace = THREE.SRGBColorSpace;
    aegisTexture.needsUpdate = true;
  }
  if (schoolMateTexture.colorSpace !== THREE.SRGBColorSpace) {
    schoolMateTexture.colorSpace = THREE.SRGBColorSpace;
    schoolMateTexture.needsUpdate = true;
  }

  const runtime = useMemo(() => makeRuntimePackage(
    sourceScene,
    aegisTexture,
    schoolMateTexture,
    qualityTier,
  ), [aegisTexture, qualityTier, schoolMateTexture, sourceScene]);

  useEffect(() => {
    const lab = document.querySelector<HTMLElement>('.mf-lab');
    if (!lab) return undefined;

    lab.dataset.schoolActModel = 'ready';
    lab.dataset.schoolActNodes = `${runtime.requiredNodeCount}/${REQUIRED_NODE_NAMES.length}`;
    lab.dataset.schoolActRuntimeNodes = String(runtime.nodeCount);
    lab.dataset.schoolActTriangles = String(runtime.triangleCount);

    return () => {
      if (lab.dataset.schoolActModel === 'ready') delete lab.dataset.schoolActModel;
      delete lab.dataset.schoolActNodes;
      delete lab.dataset.schoolActRuntimeNodes;
      delete lab.dataset.schoolActTriangles;
    };
  }, [runtime]);

  useEffect(() => () => {
    runtime.clonedMaterials.forEach((material) => material.dispose());
  }, [runtime]);

  useFrame((state) => {
    const rawProgress = localProgressRef.current;
    const progress = clamp01(rawProgress);
    const handoffProgress = clamp01(handoffProgressRef.current);
    const explicitTrace = clamp01(traceProgress);
    const scrollResolvedTrace = range(progress, 0.255, 0.455);
    const canonicalTrace = Math.max(explicitTrace, scrollResolvedTrace);
    const isAllowed = traceOutcome === 'allowed' || canonicalTrace >= 0.999;
    const entryReveal = range(progress, 0, 0.12);
    const gateOpen = isAllowed ? 1 : range(canonicalTrace, 0.82, 1);

    runtime.materialStates.forEach(({ material, opacity, visible }) => {
      material.opacity = opacity;
      material.visible = visible;
    });

    runtime.nodes.modelRoot.visible = Number.isFinite(rawProgress)
      && rawProgress >= 0
      && rawProgress <= 1;
    runtime.nodes.modelRoot.position.copy(runtime.base.rootPosition);
    runtime.nodes.modelRoot.scale.copy(runtime.base.rootScale);

    if (runtime.nodes.nexusResidue) {
      const residue = 1 - range(progress, 0.08, 0.235);
      runtime.nodes.nexusResidue.visible = residue > 0.001;
      if (runtime.base.nexusScale) {
        runtime.nodes.nexusResidue.scale.copy(runtime.base.nexusScale).multiplyScalar(
          0.94 + entryReveal * 0.06,
        );
      }
      setMaterialOpacity(runtime.nexusMaterials, residue);
      runtime.nexusMaterials.forEach((material) => {
        if (material instanceof THREE.MeshStandardMaterial) {
          material.emissiveIntensity = 1.8 + residue * 4.2;
        }
      });
    }

    if (runtime.nodes.phone && runtime.base.phonePosition && runtime.base.phoneRotation) {
      const phoneRaise = Math.max(
        range(progress, 0.145, 0.275),
        range(canonicalTrace, 0, 0.12),
      );
      runtime.nodes.phone.position.copy(runtime.base.phonePosition);
      runtime.nodes.phone.position.y -= (1 - phoneRaise) * 0.52;
      runtime.nodes.phone.rotation.set(
        runtime.base.phoneRotation.x + (1 - phoneRaise) * 0.22,
        runtime.base.phoneRotation.y,
        runtime.base.phoneRotation.z - (1 - phoneRaise) * 0.17,
        runtime.base.phoneRotation.order,
      );
    }

    if (runtime.nodes.scanPlane && runtime.base.scanPosition && runtime.base.scanScale) {
      const scanIn = range(canonicalTrace, 0, 0.08);
      const scanOut = range(canonicalTrace, 0.34, 0.5);
      const scanEnvelope = scanIn * (1 - scanOut);
      runtime.nodes.scanPlane.visible = scanEnvelope > 0.002;
      runtime.nodes.scanPlane.position.copy(runtime.base.scanPosition);
      runtime.nodes.scanPlane.position.z -= canonicalTrace * 0.46;
      runtime.nodes.scanPlane.scale.copy(runtime.base.scanScale);
      runtime.nodes.scanPlane.scale.x *= 0.82 + canonicalTrace * 0.32;
      setMaterialOpacity(runtime.scanMaterials, scanEnvelope * 0.76);
    }

    runtime.nodes.transactionContacts.forEach((contact, index) => {
      const stageStart = index / 5;
      const stageProgress = range(canonicalTrace, stageStart, stageStart + 0.16);
      const baseScale = runtime.base.contactScales[index];
      if (baseScale) {
        contact.scale.copy(baseScale).multiplyScalar(0.28 + stageProgress * 0.72);
      }
      contact.visible = stageProgress > 0.002;
      runtime.contactMaterials[index]?.forEach((material) => {
        material.opacity = 0.2 + stageProgress * 0.8;
        if (material instanceof THREE.MeshStandardMaterial) {
          material.emissiveIntensity = 1.2 + stageProgress * 5.4;
        }
      });
    });

    if (runtime.nodes.turnstilePivot) {
      runtime.nodes.turnstilePivot.rotation.y = runtime.base.pivotRotationY
        + TURNSTILE_OPEN_RADIANS * gateOpen;
    }

    if (runtime.nodes.student && runtime.base.studentPosition) {
      const crossing = range(progress, 0.455, 0.58) * (isAllowed ? 1 : 0);
      const waitBreath = reducedMotion || crossing > 0.02
        ? 0
        : Math.sin(state.clock.elapsedTime * 1.55) * 0.016;
      runtime.nodes.student.position.copy(runtime.base.studentPosition);
      runtime.nodes.student.position.y += waitBreath;
      runtime.nodes.student.position.z -= crossing * 6.2;
      runtime.nodes.student.position.x += crossing * 1.15;
      runtime.nodes.student.rotation.y = crossing * 0.22;
    }

    if (runtime.nodes.tokenField) {
      const tokenReady = Math.max(range(progress, 0.12, 0.24), range(canonicalTrace, 0, 0.18));
      runtime.nodes.tokenField.visible = tokenReady > 0.02;
      materialList(runtime.nodes.tokenField).forEach((material) => {
        if (material instanceof THREE.MeshStandardMaterial) {
          material.emissiveIntensity = 1.1 + tokenReady * 5.4 + canonicalTrace * 2.2;
        }
      });
    }

    runtime.nodes.crestBrass.forEach((mesh) => {
      const material = mesh.material;
      if (material instanceof THREE.MeshStandardMaterial) {
        material.emissive = material.emissive ?? new THREE.Color('#b29a59');
        material.emissiveIntensity = 0.08 + gateOpen * 1.15;
      }
    });

    const ambience = qualityTier === 'editorial' || reducedMotion
      ? 1
      : 0.985 + Math.sin(state.clock.elapsedTime * 1.37) * 0.015;
    const occupiedLight = range(progress, 0.34, 0.66);
    runtime.warmMaterials.forEach((material) => {
      material.emissiveIntensity = (0.72 + occupiedLight * 4.08) * ambience;
    });
    runtime.nodes.practicalLights.forEach((mesh, index) => {
      const turnOn = range(progress, 0.33 + index * 0.032, 0.41 + index * 0.032);
      const material = mesh.material;
      if (material instanceof THREE.MeshStandardMaterial) {
        material.emissiveIntensity = (0.28 + turnOn * (1.6 + gateOpen * 3.4)) * ambience;
      }
    });

    const requestProgress = range(progress, 0.565, 0.875);
    if (runtime.nodes.requestThread) {
      runtime.nodes.requestThread.visible = requestProgress > 0.001;
      setMaterialOpacity(runtime.requestMaterials, 0.16 + requestProgress * 0.84);
    }
    if (runtime.nodes.requestPacket && runtime.base.packetScale) {
      const requestPosition = REQUEST_PATH.getPointAt(requestProgress);
      runtime.nodes.requestPacket.position.copy(requestPosition);
      runtime.nodes.requestPacket.scale.copy(runtime.base.packetScale).multiplyScalar(
        0.68 + Math.sin(requestProgress * Math.PI) * 0.42,
      );
      runtime.nodes.requestPacket.visible = requestProgress > 0.001;
    }
    runtime.nodes.noticePapers.forEach((paper, index) => {
      const base = runtime.base.noticePaperPositions[index];
      if (!base) return;
      const pass = range(requestProgress, index * 0.14, index * 0.14 + 0.2);
      paper.position.copy(base);
      paper.position.x -= pass * 0.035;
      paper.rotation.z = (index - 2) * 0.015 + pass * 0.04;
      materialList(paper).forEach((material) => {
        if (material instanceof THREE.MeshStandardMaterial) {
          material.emissiveIntensity = pass * 0.55;
        }
      });
    });

    const aegisEvidence = range(progress, 0.12, 0.32);
    runtime.screenMaterials.aegis.opacity = 0.08 + aegisEvidence * 0.92;
    runtime.screenMaterials.aegis.emissiveIntensity = 0.28 + aegisEvidence * 0.48;
    runtime.overlays.aegis.forEach((overlay) => {
      overlay.visible = progress < 0.66;
    });

    const schoolMateEvidence = range(progress, 0.305, 0.37);
    runtime.screenMaterials.schoolMate.opacity = schoolMateEvidence;
    runtime.screenMaterials.schoolMate.emissiveIntensity = 0.24 + schoolMateEvidence * 0.52;
    runtime.overlays.schoolMate.forEach((overlay) => {
      overlay.visible = progress > 0.295;
    });

    const descentReveal = range(progress, 0.84, 0.985);
    setMaterialOpacity(runtime.descentMaterials, 0.12 + descentReveal * 0.88);
    runtime.descentMaterials.forEach((material) => {
      if (material instanceof THREE.MeshStandardMaterial) {
        material.emissiveIntensity = 0.8 + descentReveal * 3.4;
      }
    });
    if (runtime.nodes.descentGuide) {
      runtime.nodes.descentGuide.visible = progress > 0.78;
    }

    const worldOpacity = 1 - range(handoffProgress, 0.68, 0.98);
    runtime.materialStates.forEach(({
      material,
      transparent,
      depthWrite,
    }) => {
      material.opacity *= worldOpacity;
      material.visible = material.visible && worldOpacity > 0.001;
      const shouldBeTransparent = transparent || worldOpacity < 0.999;
      if (material.transparent !== shouldBeTransparent) {
        material.transparent = shouldBeTransparent;
        material.needsUpdate = true;
      }
      material.depthWrite = worldOpacity < 0.999 ? false : depthWrite;
    });
    runtime.nodes.modelRoot.visible = runtime.nodes.modelRoot.visible && worldOpacity > 0.001;
  });

  return <primitive object={runtime.scene} />;
}
