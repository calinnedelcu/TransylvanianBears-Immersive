# The Buried Hands / Production Contract 08-10

## Intent

The school passage does not end at a portal. Its brass request rail bends downward,
oxidises, and becomes a mercury channel cut into the floor of a Qin-inspired
mausoleum. Chapters 08-10 remain one continuous place:

1. **Rule descent** - institutional rules become physical architecture.
2. **Lamp chamber** - one lamp reveals three confirmed systems: oil, mechanisms,
   and mercury vapour.
3. **Build proof** - authentic gameplay is encountered as occupied apertures in the
   mausoleum, followed by a compact editorial proof band.
4. **Pixel handoff** - the flame is compressed into the first live pixel of
   `infect.exe`.

The route is canonical. Interaction changes illumination, focus, and sound, never
the order, ending, or availability of evidence.

## Visual grammar

- **Stone:** charcoal rammed earth, hand-cut limestone edges, visible block seams.
- **Terracotta:** muted iron oxide, used for guards and carved reliefs.
- **Brass:** inherited from Aegis and SchoolMate, aged into pulleys and lamp parts.
- **Mercury:** cold mirrored channels with a restrained cyan-white glint.
- **Light:** practical amber pools only; no decorative neon architecture.
- **Media:** gameplay frames sit behind physical stone reveals and metal shutters.
  They are not cards, slides, billboards, or full-screen web backgrounds.

The low-poly language of the game is preserved in the guards and mechanisms, while
the enclosing architecture has enough bevels, seams, depth, and material variation
to avoid the appearance of unmodified primitives.

## Authored camera timeline

Local progress covers `#mf-descent` through the top of `#mf-infect`.

| Range | Camera beat | World event | Editorial layer |
| --- | --- | --- | --- |
| 0.00-0.08 | school handoff | brass rail folds into a mercury capillary | continuity label only |
| 0.08-0.18 | mineral stair | camera descends between stepped ribs and terracotta sentries | chapter 08 thesis |
| 0.18-0.28 | chamber reveal | central lamp and suspended mechanism appear in a wide orbit | chapter 09 title |
| 0.28-0.39 | oil focus | lamp turns toward the oil reservoir | rule 01 readout |
| 0.39-0.50 | mechanism focus | pulleys, counterweight, and chain wake in sequence | rule 02 readout |
| 0.50-0.61 | mercury focus | mirrored channel and vapour volume reveal the unsafe route | rule 03 readout |
| 0.61-0.70 | acoustic passage | first evidence aperture reveals the guards frame | evidence 01 |
| 0.70-0.79 | toxic gallery | second aperture reveals the mercury frame | evidence 02 |
| 0.79-0.90 | royal hall | architecture opens around the Royal Hall frame | evidence 03 |
| 0.90-0.96 | proof wide | all evidence remains spatially legible while the website proof band enters | metrics and links |
| 0.96-1.00 | pixel compression | lamp iris closes from circle to square | `infect.exe` handoff |

Desktop and mobile have separate camera curves. Mobile uses closer targets and fewer
simultaneously visible props; it does not scale the desktop composition down.

## Interaction contract

The lamp has one explicit command: `Ridică lampa`. Click, tap, `Enter`, and `Space`
resolve the same deterministic animation: the lamp rises into its hook, its iris
opens, and the practical light makes the route legible. Scroll past the middle of
chapter 09 resolves the same canonical state automatically, so nothing is gated.

After the lamp is raised, scroll directs its authored beam across oil, mechanism,
and mercury in that order. Those are evidence beats, not hotspots or choices. There
is no discovery counter, pointer-following spotlight, selector, alternate route, or
replay loop. The action changes the physical world and sound mix without changing
the story.

## Required GLB nodes

### Environment

- `VS08_10_Buried_ROOT`
- `ENV_Buried_SchoolFold`
- `ENV_Buried_Descent`
- `ENV_Buried_LampChamber`
- `ENV_Buried_EvidenceGallery`
- `ENV_Buried_RoyalHall`
- `ENV_Buried_PixelGate`

### Props and moving parts

- `PRP_Buried_LampRig`
- `PRP_Buried_LampIris`
- `PRP_Buried_Mechanism`
- `PRP_Buried_MechanismWheel`
- `PRP_Buried_Counterweight`
- `PRP_Buried_OilReservoir`
- `PRP_Buried_MercuryBasin`
- `PRP_Buried_GuardPair`
- `PRP_Buried_PixelCore`

### Authentic media anchors

- `SCR_Buried_Mechanism`
- `SCR_Buried_Guards`
- `SCR_Buried_Mercury`
- `SCR_Buried_RoyalHall`

### Effects and interaction anchors

- `FX_Buried_SchoolResidue`
- `FX_Buried_MercuryChannels`
- `FX_Buried_VapourVolume`
- `FX_Buried_LampCone`
- `FX_Buried_PixelCompression`
- `ANC_Buried_Entry`
- `ANC_Buried_OilFocus`
- `ANC_Buried_MechanismFocus`
- `ANC_Buried_MercuryFocus`
- `ANC_Buried_GuardsEvidence`
- `ANC_Buried_MercuryEvidence`
- `ANC_Buried_RoyalHallEvidence`
- `ANC_Buried_PixelHandoff`

## Runtime and budget

- GLB after Meshopt: target under 1.8 MB, hard limit 2.8 MB.
- Geometry: target under 90k triangles desktop, under 55k visible on mobile.
- Four source images remain external WebP textures and are loaded once.
- Repeated blocks, guards, chains, and floor modules use linked geometry or runtime
  instancing where practical.
- At most one shadow-casting practical light; other glows are emissive materials.
- The package reports required node coverage, node count, triangle count, camera
  status, and active evidence through `data-*` attributes for QA.
- Reduced motion keeps the ordered evidence and semantic lamp controls, removes
  free camera interpolation, vapour drift, and mechanical secondary motion.

## Source integrity

The site-authored mausoleum, props, animation, and soundscape are interpretive web
material, not exported game assets or an archaeological reconstruction.

Confirmed by the public submission and project materials:

- the setting is the mausoleum of Qin Shi Huang;
- traps, mercury, and guards are explicit threats;
- the player character is presented as a craftsman;
- the lamp consumes oil, while the game exposes a separate stronger-light command;
- the public build targets Windows and lists Godot 4.6, GDScript, Jolt Physics,
  and Forward Plus.

The second-place result is confirmed at 01:37 in RGDA's official ranking video,
immediately before the event segment for The Buried Hands.

## Authentic assets still requested later

- a clean 20-30 second 1080p capture containing lamp use, one mechanism, mercury,
  and guard avoidance;
- the four original screenshots at source resolution without recompression;
- exact member roles and credits for this build;
- optional isolated lamp, mechanism, guard, and vapour sound effects.

Current public frames are sufficient to complete this vertical slice without
blocking on those files.
