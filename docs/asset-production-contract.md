# Vertical slice 01-04: final asset production contract

Status: binding production contract for the `threshold`, `field`, `lens`, and `proof`
chapters.

Runtime source of truth:
`src/greenfield/lab/macro-flow/verticalSliceAssets.ts`.

This contract replaces procedural geometry and provisional media only after every final
asset passes the release gates below. It does not claim that the target files already
exist. The manifest reports the current truth through `placeholder`, `source-approved`,
and `proxy` stages and keeps the existing experience available through ordered
fallbacks.

## 1. Scope and ownership

| Slice | Journey chapter | Production responsibility | Handoff |
| --- | --- | --- | --- |
| 01 | `threshold` | Transylvanian neo-Gothic castle approach, bear heraldry, sparse bat flight, signal, six responses, gate apparatus | gate aperture aligns to the synthetic road |
| 02 | `field` | synthetic aerial field, drone, data keep, media aperture | field inspection point aligns to Lens center |
| 03 | `lens` | deployable optic and raw / segmentation / detection states | selected evidence plane expands into Proof |
| 04 | `proof` | evidence frame, real validation media, award mount, Aegis exit lines | detection lines become the Aegis floor plan |

The contract owns final asset delivery, not DOM content. Titles, metrics, captions,
links, mode controls, keyboard interaction, and accessible evidence remain DOM-owned.
No text is baked into a texture, model, poster, or video.

## 2. Stable delivery namespace

All final files use `/assets/vertical-slice/v1/`. URLs are logical and versioned, not
content-hashed. A final `v1` file is immutable. A breaking node, clip, camera, or media
change requires `/v2/` and a manifest update. Candidate builds may use the `v1` paths
with `Cache-Control: no-store`; final files use long-lived immutable caching and a
strong ETag.

### Required scene and camera files

| Chapter | Desktop GLB | Mobile GLB | Desktop curve | Mobile curve |
| --- | --- | --- | --- | --- |
| 01 | `/assets/vertical-slice/v1/01-threshold/scene.desktop.glb` | `/assets/vertical-slice/v1/01-threshold/scene.mobile.glb` | `/assets/vertical-slice/v1/01-threshold/camera.desktop.json` | `/assets/vertical-slice/v1/01-threshold/camera.mobile.json` |
| 02 | `/assets/vertical-slice/v1/02-field/scene.desktop.glb` | `/assets/vertical-slice/v1/02-field/scene.mobile.glb` | `/assets/vertical-slice/v1/02-field/camera.desktop.json` | `/assets/vertical-slice/v1/02-field/camera.mobile.json` |
| 03 | `/assets/vertical-slice/v1/03-lens/scene.desktop.glb` | `/assets/vertical-slice/v1/03-lens/scene.mobile.glb` | `/assets/vertical-slice/v1/03-lens/camera.desktop.json` | `/assets/vertical-slice/v1/03-lens/camera.mobile.json` |
| 04 | `/assets/vertical-slice/v1/04-proof/scene.desktop.glb` | `/assets/vertical-slice/v1/04-proof/scene.mobile.glb` | `/assets/vertical-slice/v1/04-proof/camera.desktop.json` | `/assets/vertical-slice/v1/04-proof/camera.mobile.json` |

The manifest is the only place runtime code should discover these URLs. Production
code must not reconstruct paths from chapter ids.

## 3. Asset stages and fallback behavior

| Stage | Meaning | Stable URL may load in production? |
| --- | --- | --- |
| `placeholder` | required authentic source is absent or a generic visual occupies the slot | no |
| `source-approved` | authentic source exists; crop, rights, encode, or QA is incomplete | no |
| `proxy` | geometry or behavior surrogate proves composition and interaction | no |
| `candidate` | file exists at the stable URL and is available only to an explicit review build | no |
| `final` | file and its dependencies passed every applicable rule in section 16 | yes |

`resolveVerticalSliceAsset()` returns the stable URL only for `final`, or for
`candidate` when a review build explicitly opts in. Otherwise it returns the first
ordered URL or runtime fallback. A missing target must therefore never become a 404 in
the released experience.

Final scene fallback order is:

1. approved existing GLB where one exists;
2. current procedural R3F scene;
3. responsive poster and complete semantic DOM.

Evidence media fallback order is:

1. approved existing WebP;
2. static evidence copy and source link;
3. no decorative reconstruction that could be mistaken for project output.

## 4. Blender source contract

### Coordinate and export settings

- Blender units are metric with unit scale `1.0`; one Blender unit is one meter.
- Source is Z-up. glTF export is Y-up. World forward becomes glTF `-Z`.
- Each export root has location `(0, 0, 0)`, quaternion `(0, 0, 0, 1)`, and scale
  `(1, 1, 1)` after export.
- Mesh transforms are applied. Animation targets and empties keep authored transforms.
- Positive, non-mirrored scale is required on exported nodes. Mirroring is applied to
  mesh data before export.
- Origins for moving props sit on the mechanical pivot. Static environment origins sit
  at a useful local assembly origin, not the Blender cursor.
- Render meshes use smooth normals plus authored sharp edges. Tangents are exported for
  every normal-mapped primitive.
- UV0 is the material set. UV1 is the non-overlapping baked-GI set. Collision and empty
  nodes need neither.

### Blender files and collections

The production source paths are contract targets even before the files are checked in:

```text
production/blender/vertical-slice/vs01_threshold.blend
production/blender/vertical-slice/vs02_synthetic_field.blend
production/blender/vertical-slice/vs03_lens.blend
production/blender/vertical-slice/vs04_evidence.blend
```

Each file contains these top-level collections:

```text
00_REFERENCE          excluded styleframes, source plates, scale references
10_RENDER_SOURCE      high/low source meshes and material assignments
20_EXPORT_DESKTOP     linked final desktop export objects
21_EXPORT_MOBILE      linked final mobile export objects
30_COLLISION          COL_ nodes
40_ANCHORS            HSP_ and ANC_ empties
50_CAMERA             CAM_ and CRV_ Blender-only authoring objects
60_LIGHTING           bake rig and approved realtime-light anchors
90_ARCHIVE             disabled iterations; never exported
```

Only the chapter export collection named in the manifest is selected for final export:
`VS01_THRESHOLD_EXPORT`, `VS02_FIELD_EXPORT`, `VS03_LENS_EXPORT`, or
`VS04_PROOF_EXPORT`.

### Naming grammar

```text
ENV_<Chapter>_<Assembly>__LOD<n>    static environment render node
PRP_<Chapter>_<Prop>__LOD<n>        moving or interactive render node
FX_<Chapter>_<Effect>__LOD<n>       effect carrier geometry
COL_<Chapter>_<Purpose>             non-rendering collision node
HSP_<Chapter>_<Purpose>             raycast/hotspot empty
ANC_<Chapter>_<Purpose>             media, light, or handoff empty
CAM_<Chapter>_<Tier>                Blender camera object; excluded from scene GLB
CRV_<Chapter>_<Tier>_<Pos|Tgt>      Blender camera curve; exported to JSON
VS<nn>_<Action>                     glTF animation clip
```

Bracket ranges below are exact expansions. For example,
`PRP_Threshold_GateBlade_[01..06]__LOD[0..2]` means 18 required nodes with zero-padded
blade numbers and LOD suffixes. Names are case-sensitive and may not receive Blender
`.001` suffixes.

## 5. Chapter 01: Threshold objects

Root GLB node: `VS01_Threshold_ROOT`.

### Identity direction

Chapter 01 must read immediately as a Transylvanian neo-Gothic castle, not as generic
fortress scenery. The broad fortified ring and inhabited courtyard remain grounded in
Transylvanian architecture, while the keep, steep paired spires, pointed portal,
buttresses, and restrained tracery establish a strong neo-Gothic vertical silhouette.
The silhouette must remain legible before close detail at both approved opening cameras.

Bear identity is physical architecture. A central abstract bear crest is mounted above
the gate aperture, with paired guardian emblems integrated into the flanking piers. The
forms use carved mineral relief, dark forged metal, negative space, and controlled brass
edges. They are heraldic and geometric rather than illustrated mascots. Crest and
emblems have explicit placement anchors so poster, light, and camera reviews use the
same physical reference points.

The Dracula reference is atmospheric and restrained: moonlit spire separation, deep
lancet shadow, and one sparse authored bat crossing. There is no literal character
likeness, costume, gore, coffin, or themed prop. Bats remain distant silhouettes, never
occupy the hero focus, never swarm the camera, and never obscure the title, gate pivot,
bear crest, or evidence handoff.

| Blender object family / GLB node family | Count | Requirement |
| --- | ---: | --- |
| `ENV_Threshold_Terrain__LOD[0..2]` | 3 | approach terrain, worn path, signal receiving surface |
| `ENV_Threshold_OuterRing__LOD[0..2]` | 3 | inhabited ring; repeated bays share mesh data and material atlas |
| `ENV_Threshold_Gatehouse__LOD[0..2]` | 3 | towers, arch, gate pocket, fixed track |
| `ENV_Threshold_WorkshopCore__LOD[0..2]` | 3 | six-response silhouette visible through the gate |
| `ENV_Threshold_CarpathiansNear__LOD[0..2]` | 3 | near horizon layer |
| `ENV_Threshold_CarpathiansFar__LOD[0..2]` | 3 | far horizon layer |
| `ENV_Threshold_GothicKeep__LOD[0..2]` | 3 | dominant neo-Gothic keep silhouette tied into the inhabited ring |
| `ENV_Threshold_GothicPortal__LOD[0..2]` | 3 | pointed lancet portal framing the mechanical aperture |
| `ENV_Threshold_GothicSpire_[01..02]__LOD[0..2]` | 6 | paired steep spires with asymmetric Transylvanian roof character |
| `ENV_Threshold_GothicButtress_[01..06]__LOD[0..2]` | 18 | reusable vertical supports; linked mesh data |
| `ENV_Threshold_GothicTracery_[01..03]__LOD[0..2]` | 9 | abstract stone/iron detail modules, readable only in middle and close shots |
| `ENV_Threshold_BearCrest__LOD[0..2]` | 3 | physical central bear relief above the gate aperture |
| `ENV_Threshold_BearEmblem_[L..R]__LOD[0..2]` | 6 | paired abstract guardian-bear emblems integrated into gate piers |
| `PRP_Threshold_GatePivot__LOD[0..2]` | 3 | stable origin at blade rotation center |
| `PRP_Threshold_GateBlade_[01..06]__LOD[0..2]` | 18 | six separately animated blades; numbering is clockwise from top |
| `PRP_Threshold_BatSilhouette_[01..06]__LOD[0..2]` | 18 | six authored distant silhouettes sharing no more than three mesh variants |
| `FX_Threshold_SignalRibbon__LOD[0..2]` | 3 | geometry carrier only; reveal and glow remain runtime parameters |

Required non-render nodes:

```text
COL_Threshold_Ground
COL_Threshold_Gate
HSP_Threshold_GatePivot
HSP_Threshold_WorkshopCore
ANC_Threshold_SignalStart
ANC_Threshold_SignalEnd
ANC_Threshold_HandoffField
ANC_Threshold_Response_[01..06]
ANC_Threshold_BearCrest
ANC_Threshold_BearEmblem_L
ANC_Threshold_BearEmblem_R
ANC_Threshold_BatFlightEntry
ANC_Threshold_BatFlightExit
```

Blender-only camera objects:

```text
CAM_Threshold_Desktop
CRV_Threshold_Desktop_Pos
CRV_Threshold_Desktop_Tgt
CAM_Threshold_Mobile
CRV_Threshold_Mobile_Pos
CRV_Threshold_Mobile_Tgt
```

The desktop and mobile GLBs contain the same semantic node set. Geometry and textures
differ; node, clip, anchor, and material-family names do not.

### Tier policy

| Authored feature | Cinematic | Composed | Editorial / reduced motion |
| --- | --- | --- | --- |
| Neo-Gothic silhouette | required: keep, portal, two spires | required: keep and portal; up to two spires | live nodes disabled; approved poster retains silhouette |
| Gothic buttress/tracery detail | 3-9 visible modules | optional, maximum 3 | disabled |
| Bear heraldry | required: crest and two emblems | crest required; emblems optional, maximum 3 total | live nodes disabled; approved poster retains crest |
| Sparse bat flight | optional, maximum 6 silhouettes | optional, maximum 2 silhouettes | disabled |

All modules are embedded in the existing Chapter 01 desktop/mobile scene GLBs. They do
not receive independent asset URLs or stages. `authoredFeatures` in the typed manifest
controls visibility by quality tier, while the existing scene slot, stable URL,
fallback, and promotion rules remain unchanged. Optional modules still have all named
LOD nodes in both GLBs so a tier change never depends on a second geometry download.

The added identity modules must fit the existing Chapter 01 budget. Buttresses and
tracery use linked geometry and existing atlases. Crest and emblems share the gate
material families. Bat silhouettes share at most three meshes, are rendered in one
batched/instanced draw, and add no texture request.

## 6. Chapter 02: Synthetic field objects

Root GLB node: `VS02_Field_ROOT`.

| Blender object family / GLB node family | Count | Requirement |
| --- | ---: | --- |
| `ENV_Field_Ground__LOD[0..2]` | 3 | topographic base and street shoulder |
| `ENV_Field_Road__LOD[0..2]` | 3 | route continuity from the gate |
| `ENV_Field_Block_[A..C]__LOD[0..2]` | 9 | linked building prototypes; instances share mesh data |
| `ENV_Field_DataKeep__LOD[0..2]` | 3 | distant terminal silhouette and aperture |
| `PRP_Field_SurveyDrone__LOD[0..2]` | 3 | animated aerial survey prop |
| `PRP_Field_TrackedSubject_[A..B]__LOD[0..2]` | 6 | scale references for inspection output |
| `FX_Field_DataStream_[A..C]__LOD[0..2]` | 9 | three reusable data paths; no baked labels |

Required non-render nodes:

```text
COL_Field_Ground
COL_Field_Bounds
HSP_Field_Sample
HSP_Field_Drone
ANC_Field_MediaAerial
ANC_Field_HandoffLens
```

Blender-only camera objects use `CAM_Field_Desktop`, `CRV_Field_Desktop_Pos`,
`CRV_Field_Desktop_Tgt` and the equivalent `Mobile` names.

`ANC_Field_MediaAerial` owns the Project Nexus source plate. The GLB does not embed a
facsimile of project output. The manifest supplies the replaceable KTX2 texture and DOM
WebP fallback.

## 7. Chapter 03: Lens objects

Root GLB node: `VS03_Lens_ROOT`.

| Blender object family / GLB node family | Count | Requirement |
| --- | ---: | --- |
| `PRP_Lens_Housing__LOD[0..2]` | 3 | mineral/brass outer apparatus |
| `PRP_Lens_OuterRing__LOD[0..2]` | 3 | deploy rotation channel |
| `PRP_Lens_InnerRing__LOD[0..2]` | 3 | focus rotation/translation channel |
| `PRP_Lens_Glass__LOD[0..2]` | 3 | transmissive carrier; no baked scene image |
| `FX_Lens_Reticle__LOD[0..2]` | 3 | optional spatial reticle; semantic labels remain DOM |

Required non-render nodes:

```text
COL_Lens_Pick
HSP_Lens_Optic
ANC_Lens_ModeRaw
ANC_Lens_ModeSegmentation
ANC_Lens_ModeDetection
ANC_Lens_HandoffProof
```

Blender-only camera objects use `CAM_Lens_Desktop`, `CRV_Lens_Desktop_Pos`,
`CRV_Lens_Desktop_Tgt` and the equivalent `Mobile` names.

The raw, segmentation, and detection views must be three renderings of one matching
sample before this chapter can become final. The existing industrial aerial image is a
valid field source but is not falsely presented as the unannotated counterpart to the
campus segmentation and box images.

## 8. Chapter 04: Proof objects

Root GLB node: `VS04_Proof_ROOT`.

| Blender object family / GLB node family | Count | Requirement |
| --- | ---: | --- |
| `ENV_Proof_Clearing__LOD[0..2]` | 3 | quiet physical clearing behind semantic content |
| `PRP_Proof_MediaFrame__LOD[0..2]` | 3 | media plane frame and transition hinge |
| `PRP_Proof_AwardMount__LOD[0..2]` | 3 | physical photo mount, not a fictional trophy |
| `FX_Proof_TransitionLines__LOD[0..2]` | 3 | detection-to-Aegis line carrier |

Required non-render nodes:

```text
COL_Proof_Frame
HSP_Proof_Media
HSP_Proof_SourceLink
ANC_Proof_Raw
ANC_Proof_Segmentation
ANC_Proof_Detection
ANC_Proof_RealVideo
ANC_Proof_Award
ANC_Proof_HandoffAegis
```

Blender-only camera objects use `CAM_Proof_Desktop`, `CRV_Proof_Desktop_Pos`,
`CRV_Proof_Desktop_Tgt` and the equivalent `Mobile` names.

The GLB carries frames and anchors only. Evidence images, video, captions, metrics,
authors, and links are external assets or DOM.

## 9. PBR texture contract

### Channel packing

| Suffix | Channels | Color space | KTX2 mode | Desktop max | Mobile max |
| --- | --- | --- | --- | ---: | ---: |
| `_BaseColor` | RGB base color; A only for approved alpha | sRGB | ETC1S; UASTC for gate/evidence hero | 2048 | 1024 |
| `_Normal` | RGB OpenGL tangent normal, positive Y | linear | UASTC + Zstd | 2048 | 1024 |
| `_ORM` | R AO, G roughness, B metalness, A=1 | linear | ETC1S | 2048 | 1024 |
| `_Emissive` | RGB emissive color/mask, no bloom | sRGB | ETC1S | 1024 | 512 |
| `_GI` | RGB indirect diffuse, `TEXCOORD_1` | sRGB as glTF emissive input | UASTC + Zstd | 2048 | 1024 |

Rules:

- All runtime PBR images at 512 px or larger are KTX2 with a complete mip chain.
- Texture dimensions are power-of-two and multiples of four.
- Base color, emissive, and GI are tagged sRGB. Normal and ORM are linear.
- DirectX normal maps are rejected; the green channel is not flipped at runtime.
- Height is baked to normal and is not delivered as a separate runtime texture.
- Opacity is allowed only for banners, glass masks, and explicitly approved cutouts.
- Alpha-blended materials are sorted separately and never share an opaque atlas.
- Repeated environment assemblies share one material and texture set.
- No 4K scene texture is allowed in this slice. Documentary images may retain a larger
  DOM derivative only when zoom inspection requires it and the media budget still passes.

### Material families

| Material | Maps | Resolution desktop/mobile | Notes |
| --- | --- | --- | --- |
| `MAT_Limestone` | BaseColor, Normal, ORM, GI | 2048 / 1024 | high roughness; no metallic pixels |
| `MAT_Plaster` | BaseColor, Normal, ORM, GI | 2048 / 1024 | no pure white; subtle normal only |
| `MAT_Timber` | BaseColor, Normal, ORM, GI | 2048 / 1024 | near-black brown; anisotropy is optional runtime enhancement |
| `MAT_Ground` | BaseColor, Normal, ORM, GI | 2048 / 1024 | tile boundary must not cross hero path |
| `MAT_Brass` | BaseColor, Normal, ORM | 1024 / 512 | metalness is binary except oxidized dirt |
| `MAT_Glass` | optional Normal and mask | 512 / 512 | transmission stays runtime-controlled |
| `MAT_Signal` | Emissive mask | 512 / 256 | no cyan tint in surrounding base color |
| `MAT_Field` | BaseColor, Normal, ORM, GI | 2048 / 1024 | three segment classes use masks, not duplicate atlases |
| `MAT_HeraldicStone` | shared Limestone maps + GI | shared atlas | crest relief uses physical depth, not texture-only embossing |
| `MAT_DarkIron` | shared gate BaseColor, Normal, ORM | shared atlas | forged emblem edge and tracery; no new texture set |
| `MAT_BatSilhouette` | none | n/a | shared opaque near-black material; no emissive or documentary detail |

The final GLB embeds its scene PBR KTX2 images. Documentary/project media stays
external so it can be audited and replaced without re-exporting geometry.

## 10. Meshopt, Draco, and KTX2 policy

### Canonical GLB

- `EXT_meshopt_compression` is the only canonical geometry compression.
- `KHR_mesh_quantization` is required when quantized accessors are used.
- `KHR_texture_basisu` is required for embedded KTX2 textures.
- Meshopt optimization order is `dedup -> instance -> weld -> simplify LOD source ->
  reorder -> quantize -> meshopt compress`.
- Morph and animation tolerances must be checked after quantization. A smaller file that
  changes a gate endpoint or camera handoff fails.

### Draco

Draco is not nested with Meshopt and is not shipped as the default GLB. A separate
`.draco.glb` candidate may be benchmarked only when it:

1. saves at least 15% transfer bytes against the canonical Meshopt GLB;
2. adds no more than 20 ms decode time on the reference mobile device;
3. keeps node names, animation tracks, extras, and visual output identical;
4. has an explicit alternate URL and codec in a future manifest revision.

If any condition fails, the Draco candidate is deleted. The release never downloads
both variants.

### KTX2

- UASTC is mandatory for normal maps, baked GI, glass detail, and evidence textures.
- ETC1S is preferred for ORM, ordinary base color, and emissive masks.
- The threshold gate BaseColor may use UASTC where an A/B screenshot proves ETC1S
  introduces visible edge or plaster artifacts.
- KTX2 evidence textures have WebP/AVIF DOM derivatives; a browser without the required
  GPU path receives the editorial derivative, not an uncompressed PNG.

## 11. LOD contract

Every render family listed in sections 5-8 has `__LOD0`, `__LOD1`, and `__LOD2` nodes.
The runtime selects named siblings; `MSFT_lod` is not required.

| Level | Maximum triangles relative to LOD0 | Use |
| --- | ---: | --- |
| LOD0 | 100% | hero close-up and authored inspection |
| LOD1 | 50% | middle distance and default mobile close-up |
| LOD2 | 20% | background and chapter-neighbor residency |

Selection uses projected bounding-sphere diameter as a fraction of viewport height:

| Tier | LOD0 -> LOD1 | LOD1 -> LOD2 | Cull decorative node |
| --- | ---: | ---: | ---: |
| Desktop | below 0.14 | below 0.04 | below 0.007 |
| Mobile | below 0.20 | below 0.065 | below 0.007 |

A 10% hysteresis band prevents flicker. Hotspots, collision, anchors, silhouettes that
occlude evidence, and gate blade pivots are never culled. Only one render LOD in a family
may be visible. LODs preserve material slots, pivot, bounding-box center, UV seams, and
animation target hierarchy. Screen-space silhouette drift is at most two pixels at the
switch threshold in a 1440x900 reference capture.

The castle keep, portal, and central bear crest are identity-critical silhouette nodes
and may not be distance-culled while Chapter 01 is active. Gothic detail and bat nodes
follow their tier maxima and may cull earlier. A bat below the decorative cull threshold
disappears at the end of its authored flight, never by popping in the central viewport.

## 12. Baked lighting

Static environment receives indirect diffuse only. Direct blue-hour light, signal,
gate highlight, Lens response, and proof transition remain runtime lights/shaders so
the timeline remains reversible.

- Bake renderer: Cycles, 128 samples, no display transform baked into texture data.
- UV: non-overlapping UV1, 16 px dilation at 2048, equivalent proportional padding at
  1024, no island overlap, and at least 8 px between final 2K islands.
- Delivery: `_GI` UASTC texture bound as glTF `emissiveTexture` using `texCoord: 1`.
- GI atlas: one 2048 atlas per desktop chapter GLB and one 1024 atlas per mobile GLB.
- AO: baked separately into ORM R. It is not multiplied into BaseColor.
- Exclusions: every `PRP_`, `FX_`, `HSP_`, and `ANC_` node; gate tracks may receive GI,
  gate blades may not.
- The static `ENV_Threshold_BearCrest`, bear emblems, and Gothic modules receive GI.
  Moving bat silhouettes remain unbaked and use the shared opaque silhouette material.
- Emissive-strength factors are fixed per material and recorded in the GLB. Runtime
  does not compensate for an over-dark bake with arbitrary light intensity.
- Light leaks, black UV islands, denoise smears, and seams visible from any approved
  camera are release blockers.

Maximum realtime lights are part of the chapter budgets. Desktop Threshold allows four
lights and two shadow casters. Mobile has no realtime shadow caster; contact and
architectural grounding come from GI, AO, and restrained blob/contact treatment.

## 13. Animation clips

All authored clips are 30 fps source actions baked to glTF node TRS or morph-weight
tracks. Material, light, and visibility animation is not exported from Blender. Those
values remain deterministic runtime timeline parameters.

| Chapter | Clip | Duration | Driver | Targets |
| --- | --- | ---: | --- | --- |
| 01 | `VS01_Signal_Arrive` | 2.0 s | scroll, clamp | signal ribbon reveal carrier |
| 01 | `VS01_Response_Sequence` | 2.4 s | scroll, clamp | six response anchors in numeric order |
| 01 | `VS01_Gate_Open` | 3.0 s | scroll, clamp | gate pivot and six blades |
| 01 | `VS01_Bat_Flight` | 6.0 s | optional ambient loop | six authored bat silhouette transforms |
| 02 | `VS02_Field_Reveal` | 2.0 s | scroll, clamp | field environment assembly |
| 02 | `VS02_Drone_Flyby` | 4.0 s | scroll, clamp | survey drone transform |
| 02 | `VS02_Data_Flow` | 3.0 s | ambient loop | three data-stream carriers |
| 03 | `VS03_Lens_Deploy` | 1.5 s | scroll, clamp | housing and rings |
| 03 | `VS03_Lens_Focus` | 1.0 s | scroll, clamp | inner ring and reticle carrier |
| 04 | `VS04_Evidence_Unfold` | 2.0 s | scroll, clamp | media frame and award mount |
| 04 | `VS04_Handoff_Aegis` | 1.8 s | scroll, clamp | transition-line carrier |

Scroll clips never autoplay. Runtime sets exact clip time from normalized chapter
progress, including reverse direction. Ambient loops stop when the chapter deactivates,
the tab is hidden, or reduced motion is enabled. Clip endpoints are intentional stable
poses, and no track may rely on extrapolation beyond its declared duration.

`VS01_Bat_Flight` is a fixed authored path between `ANC_Threshold_BatFlightEntry` and
`ANC_Threshold_BatFlightExit`; it is not randomized or simulated. Each bat has a phase
offset inside the clip, at most two silhouettes overlap in the same screen quadrant,
and the loop seam remains outside the approved camera frusta. Tier policy controls how
many clip targets are visible.

## 14. Camera curve contract

Each chapter has separately authored desktop and mobile curves. The mobile curve is a
recomposition, not a crop of the desktop rail.

The Blender source has one camera plus position and target curves for each tier.
`scripts/blender/build_vertical_slice_cameras.py` constructs those named Blender curves
and deterministically writes exactly 241 samples at progress `0/240` through `240/240`:

```json
{
  "schemaVersion": 1,
  "id": "vs01.camera.desktop",
  "samples": [
    {
      "progress": 0,
      "position": [0, 0, 0],
      "target": [0, 0, -1],
      "fovDegrees": 48,
      "rollDegrees": 0
    }
  ]
}
```

Values are glTF Y-up meters, finite, and rounded to four decimals. `progress` is strictly
increasing and includes exactly `0` and `1`. Runtime interpolation between samples is
linear; the Blender curves own easing before sampling. This makes forward and reverse
evaluation identical.

Curve ids are:

```text
vs01.camera.desktop    vs01.camera.mobile
vs02.camera.desktop    vs02.camera.mobile
vs03.camera.desktop    vs03.camera.mobile
vs04.camera.desktop    vs04.camera.mobile
```

At each 01 -> 02, 02 -> 03, and 03 -> 04 handoff, desktop and mobile curves must meet
within `0.02 m` position, `0.5 degrees` look direction, `0.25 degrees` roll, and
`0.25 degrees` FOV. Pointer free-look is added after curve evaluation and is capped at
two degrees desktop and 0.75 degrees mobile. Reduced motion uses the approved poster or
static chapter frame instead of traversing a long rail.

## 15. Collision, hotspot, and media anchors

`COL_` nodes are simple extraction geometry, never render geometry. `HSP_` and `ANC_`
are Blender empties exported as glTF nodes. Every node has glTF `extras`:

```json
{
  "tb": {
    "kind": "collision | hotspot | anchor",
    "semanticId": "chapter.purpose",
    "shape": "box | sphere | capsule | mesh | plane",
    "radiusMeters": 0.5,
    "domOwner": "optional-element-id"
  }
}
```

Required spatial nodes and behavior:

| Chapter | Node | Shape/size | Owner/purpose |
| --- | --- | --- | --- |
| 01 | `COL_Threshold_Ground` | low-poly mesh | pointer projection and grounding only |
| 01 | `COL_Threshold_Gate` | box assembly | prevent camera/path crossing closed gate |
| 01 | `HSP_Threshold_GatePivot` | sphere r=0.55 m | gate response target |
| 01 | `HSP_Threshold_WorkshopCore` | sphere r=1.0 m | continuity focus |
| 01 | `ANC_Threshold_BearCrest` | empty at relief origin | central physical crest placement/light reference |
| 01 | `ANC_Threshold_BearEmblem_[L..R]` | paired empties | flank emblem placement and symmetry review |
| 01 | `ANC_Threshold_BatFlightEntry` | empty outside hero frustum | authored flight start |
| 01 | `ANC_Threshold_BatFlightExit` | empty outside hero frustum | authored flight end and loop seam |
| 02 | `COL_Field_Ground` | low-poly mesh | field projection |
| 02 | `COL_Field_Bounds` | box | authoring safety boundary |
| 02 | `HSP_Field_Sample` | sphere r=0.75 m | inspection target |
| 02 | `HSP_Field_Drone` | sphere r=0.8 m | bounded pointer/WASD/Arrow flight owner |
| 02 | `HSP_Field_Core_Source` | sphere r=0.7 m | Source evidence proximity pickup |
| 02 | `HSP_Field_Core_Structure` | sphere r=0.7 m | Structure evidence proximity pickup |
| 02 | `HSP_Field_Core_Decision` | sphere r=0.7 m | Decision evidence proximity pickup |
| 03 | `COL_Lens_Pick` | sphere r=1.2 m | Lens pointer volume |
| 03 | `HSP_Lens_Optic` | sphere r=1.2 m | DOM owner `mf-lens` |
| 04 | `COL_Proof_Frame` | box | plane alignment only |
| 04 | `HSP_Proof_Media` | plane | DOM owner `mf-proof` |
| 04 | `HSP_Proof_SourceLink` | sphere r=0.35 m | visual alignment; DOM link owns input |

All `ANC_*_Handoff*` nodes are mandatory even when they are not raycast targets. Media
anchors define center, orientation, and scale of a unit 16:9 plane. Runtime derives the
actual aspect fit without changing anchor transform. DOM owners retain focus, labels,
and click behavior; the WebGL hotspot never becomes a second inaccessible control.

The bear crest anchor must match the relief origin within `0.005 m` and `0.25 degrees`.
Left/right emblem anchors must be mirrored about the gate centerline within `0.01 m`,
while preserving intentional sculptural asymmetry inside the emblem mesh itself. Bat
entry and exit anchors remain outside every approved hero camera frustum.

## 16. Placeholder and final media slots

| Slot | Current stage | Authentic source | Final derivatives | Release blocker |
| --- | --- | --- | --- | --- |
| `media.threshold.poster` | `proxy` | current First Light render | desktop/mobile AVIF + WebP | final model, grade, and both approved crops |
| `media.nexus.synthetic-aerial` | `source-approved` | `ue5-industrial-aerial.png` | desktop/mobile KTX2 + editorial WebP | final crop, color review, provenance caption |
| `media.nexus.raw-aligned` | `placeholder` | missing | desktop/mobile KTX2 | unannotated RGB matching the segmentation/boxes sample |
| `media.nexus.segmentation` | `source-approved` | `synthetic-segmentation.png` | desktop/mobile KTX2 + DOM derivative | verified crop preserves class colors and labels |
| `media.nexus.detection` | `source-approved` | `synthetic-boxes.png` | desktop/mobile KTX2 + DOM derivative | verified crop preserves every authentic box |
| `media.nexus.real-proof` | `source-approved` | Stanford validation master | 1080p/720p WebM + MP4 + AVIF posters | rights, attribution, final 4 s excerpt, frame review |
| `media.nexus.award` | `source-approved` | `project-nexus-2026.webp` | desktop/mobile AVIF | official result wording and attendee identity/crop review |

The current source-approved web fallback for `media.nexus.synthetic-aerial` is
`/assets/projects/nexus-ue5-aerial.webp` (`1280 x 960`, derived directly from the
original frame without generative alteration). It remains a fallback until the KTX2
desktop/mobile derivatives are commissioned.

The source-approved Lens exports are available as
`/assets/projects/nexus-segmentation.webp` (`904 x 684`) and
`/assets/projects/nexus-detection.webp` (`1203 x 906`). Both are direct WebP
derivatives of the registered PNG sources. They are authentic Project Nexus outputs,
but they are not pixel-aligned with the Stanford validation frame; the proof inspector
must preserve that distinction in its captions.

Final media URLs are the exact URLs in `verticalSliceAssets.ts`. The video is at most
four seconds, muted by default, `playsinline`, and never required for reverse scroll.
Only one supported video codec is fetched. The poster is shown before decode and is the
permanent fallback.

No AI-generated or recreated image can fill a documentary slot. Color grade, crop,
masking, transcoding, and verified vector reconstruction of existing boxes are allowed;
inventing detections, dataset samples, UI, charts, awards, or people is not.

## 17. Desktop and mobile budgets

Bytes use binary KiB/MiB. Transfer is measured after HTTP content encoding. GPU texture
memory includes all resident mip levels. Total GPU includes textures, geometry,
render targets, and chapter-owned buffers but excludes the shared renderer baseline.
Total transfer measures one selected delivery path: GPU KTX2 or editorial WebP, one
poster codec, and one video codec. Alternate encodings are never fetched together.

### Whole slice

| Metric | Desktop | Mobile |
| --- | ---: | ---: |
| Critical poster | 360 KiB | 220 KiB |
| Initial realtime bytes after poster | 2.5 MiB | 1.25 MiB |
| Total distinct 01-04 transfer | 17.5 MiB | 9 MiB |
| Peak texture GPU | 96 MiB | 48 MiB |
| Peak total GPU | 128 MiB | 64 MiB |
| Visible triangles | 300,000 | 100,000 |
| Draw calls | 70 | 40 |
| Resident heavy chapter packages | 2 | 2 |
| Activation long task | 100 ms | 80 ms |
| Target frame time | 16.7 ms | 33.3 ms |

### Chapter activation ceilings

| Chapter | Tier | Transfer | Scene | Media | Triangles | Draws | Texture GPU | Total GPU | Lights/shadows |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 01 | desktop | 2.50 MiB | 2.15 MiB | 360 KiB | 300k | 70 | 96 MiB | 128 MiB | 4 / 2 |
| 01 | mobile | 1.25 MiB | 1.02 MiB | 220 KiB | 100k | 40 | 48 MiB | 64 MiB | 2 / 0 |
| 02 | desktop | 3.80 MiB | 2.50 MiB | 1.25 MiB | 220k | 58 | 72 MiB | 96 MiB | 3 / 1 |
| 02 | mobile | 1.90 MiB | 1.20 MiB | 650 KiB | 75k | 30 | 36 MiB | 52 MiB | 2 / 0 |
| 03 | desktop | 1.85 MiB | 680 KiB | 1.10 MiB | 45k | 18 | 16 MiB | 24 MiB | 1 / 0 |
| 03 | mobile | 0.93 MiB | 330 KiB | 560 KiB | 20k | 12 | 8 MiB | 14 MiB | 1 / 0 |
| 04 | desktop | 7.00 MiB | 780 KiB | 6.10 MiB | 55k | 24 | 48 MiB | 64 MiB | 1 / 0 |
| 04 | mobile | 3.85 MiB | 390 KiB | 3.40 MiB | 30k | 18 | 24 MiB | 36 MiB | 1 / 0 |

Only the active chapter and one neighbor may retain heavy resources. The neighbor uses
LOD2 and no video decode, realtime shadow, or ambient animation. Evidence texture modes
are mutually exclusive; only the active Lens mode must be GPU-resident. Video transfer
is measured for the one selected codec, never WebM plus MP4.

## 18. Validation and release gates

### Automated file validation

1. Every manifest `stableUrl` is unique, starts with
   `/assets/vertical-slice/v1/`, contains no query/hash, and has the expected MIME type.
2. Every `candidate` or `final` URL exists in the production output. Stages below
   `candidate` must resolve to a usable fallback without requesting the target URL.
3. Khronos glTF Validator returns zero errors. Final warnings require a written allowlist;
   the default allowlist is empty.
4. Canonical GLBs use Meshopt, not Draco, and contain no embedded PNG/JPEG scene texture
   at 512 px or above.
5. Root and required node names occur exactly once. No exported name ends in a Blender
   numeric suffix such as `.001`.
   Chapter 01 additionally requires every Gothic, bear, bat, crest/emblem anchor, and
   bat-flight anchor family declared in `authoredFeatures`. Every feature node base must
   resolve to all three LODs, and `VS01_Bat_Flight` must target only the six declared bat
   silhouettes.
6. Root transform, meters, up-axis conversion, positive scale, normals, tangents, UV0,
   and required UV1 all pass inspection.
7. Every LOD family has all three named levels. Triangle counts strictly decrease and
   LOD1/LOD2 do not exceed 50%/20% of LOD0.
8. Texture suffix, channel packing, color space, dimensions, KTX2 mode, and mip count
   match section 9.
9. GI uses `TEXCOORD_1`; dynamic nodes are absent from the bake; every baked island has
   valid texel coverage.
10. Required clips occur exactly once, have the declared duration within one 30 fps
    frame, target approved nodes only, and reproduce approved start/end transforms.
11. Camera JSON has schema version 1, exactly 241 finite samples, strict progress order,
    declared ids, and handoff tolerances from section 14.
12. Collision/hotspot/anchor nodes include valid `extras.tb`; render materials are not
    assigned to `COL_` nodes.
13. Compressed bytes, decoded texture memory, total GPU memory, visible triangles, draw
    calls, lights, shadows, and activation task time are at or below manifest budgets.

### Visual and behavioral validation

Reference viewports are 1440x900 desktop and 390x844 mobile. Also test 1280x720,
1920x1080, 360x800, and 430x932.

- Approved framing is checked at chapter progress 0, 0.25, 0.5, 0.75, and 1 for both
  tiers and every Lens mode.
- No blank canvas, texture flash, black GI island, LOD pop, media distortion, clipping,
  text overlap, or evidence occlusion is accepted.
- At the opening, recognition, and gate frames, the keep/portal silhouette reads as a
  Transylvanian neo-Gothic castle and the physical bear crest remains legible without a
  caption. Composed retains the same identity with fewer detail modules.
- Cinematic never shows more than six bats, composed never more than two, and editorial
  or reduced motion shows none. Bats remain distant, avoid the hero copy/crest/aperture,
  and follow the authored flight with no random spawn or camera-facing swarm.
- Forward then reverse scrub returns each node, clip, media mode, and camera to the same
  state within numeric tolerance.
- A fast scroll jump from each chapter boundary never exposes an unloaded origin pose.
- Browser console, rejected promises, glTF decode, KTX2 transcode, and video decode are
  clean.
- WebGL-disabled, reduced-motion, keyboard-only, touch, and offline-after-load paths
  preserve all semantic evidence and links.
- Runtime fallback tests intentionally fail every target asset request and verify the
  ordered URL/runtime fallback.
- Desktop cinematic targets 60 fps; mobile composed must sustain at least 30 fps on the
  reference devices after warm-up.

### Evidence and final-stage gate

- Source provenance, publication permission, crop, color, caption, alt text, and factual
  claims are approved for every documentary slot.
- Synthetic aerial, aligned raw, segmentation, detection, and real proof are never
  relabeled as the same sample unless source identity proves that relationship.
- Placeholder, source-approved, proxy, and candidate are all non-final states. Release
  approval requires every `requiredForFinal` media slot and every chapter scene/camera
  slot to be `final`.
- Chapter 01 cannot become final until its neo-Gothic silhouette, bear heraldry,
  crest/emblem anchors, bat LODs, bat flight clip, and tier policy pass both reference
  viewports without increasing the existing Chapter 01 budgets.
- Fallbacks remain in the manifest after promotion and continue to pass.

## 19. Production handoff checklist

1. Approve desktop and mobile graybox cameras before detailed modeling.
2. Freeze root, render-family, clip, collision, hotspot, anchor, and camera names.
   For Chapter 01 this includes all Gothic, bear, and bat names in section 5.
3. Produce LOD0, derive and inspect LOD1/LOD2, then build the mobile export set.
4. UV, texture, and bake against the channel and resolution rules above.
5. Export uncompressed review GLB, validate hierarchy/animation, then optimize the final
   Meshopt/KTX2 GLB.
6. Export camera JSON from the same Blender revision and validate handoffs.
7. Produce documentary derivatives from approved sources without changing evidence.
8. Record measured transfer, GPU memory, triangles, draws, lights, task time, and frame
   time for both tiers.
9. Move slots to `candidate`, run every automated and visual gate, then move to `final`.
10. Never overwrite a final `v1` contract incompatibly; publish a new release namespace.
