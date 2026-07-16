# The Citadel of Seven Systems

## Production Storyboard: Chapters 01-04

| Field | Contract |
| --- | --- |
| Scope | `01 Threshold`, `02 Synthetic field`, `03 Lens knot`, `04 Evidence` |
| Keyframe count | Exactly 16 (`KF-01` through `KF-16`) |
| Status | Production storyboard and animatic brief |
| Visual authority | [`vertical-slice-art-bible.md`](./vertical-slice-art-bible.md) |
| Runtime anchors | `#mf-threshold`, `#mf-field`, `#mf-lens`, `#mf-proof` |
| Reference viewports | Desktop `1440 x 900`; mobile `390 x 844` |

This storyboard covers the opening Project Nexus vertical slice in the live 16-chapter
journey. It replaces the older macro-storyboard numbering for this scope. The four
chapters are the exact registry entries in `src/greenfield/experience/chapters.ts`.

The experience must remain one continuous web route. Keyframes describe authored
states, not cuts in a film. Scroll may pause between them, reverse through them, skip
past them, or reach them through a chapter anchor.

---

## 1. Reading the Board

### 1.1 Coordinate and progress notation

- `p` is chapter-local normalized progress from `0.00` to `1.00`.
- Screen positions are normalized `(x, y)` from the top-left after the persistent
  header safe region is removed.
- Desktop camera baseline is `48deg` vertical FOV; mobile baseline is `57deg`.
- The current chapter min-heights (`185dvh`, `170dvh`, `185dvh`, `190dvh`) are animatic
  baselines, not locked timing.
- Structural motion is progress-driven and reversible. Ambient motion is time-driven
  only where explicitly allowed.
- Sound cues are silent unless the visitor has explicitly enabled audio.

### 1.2 Persistent layers

These layers survive all 16 frames:

| Layer | Behavior |
| --- | --- |
| Header | Brand, quality, audio, and Work Index remain visible and operable |
| Chapter rail | Shows all 16 journey entries; active state follows the 46% viewport sentinel |
| Skip link | Keyboard-first link targets `#mf-proof` and becomes visible on focus |
| World | Fixed full-viewport canvas/poster through Chapters 01-03; de-emphasized under Chapter 04 |
| Narrative track | Semantic DOM copy, controls, metrics, captions, authors, and links |

The header and rail may simplify on mobile, but their actions remain available. No
frame may place a subject or essential label underneath them.

### 1.3 Keyframe map

| Frame | Chapter | `p` / trigger | Name | Primary read |
| --- | --- | --- | --- | --- |
| KF-01 | 01 | `0.00` | First inhabited light | Team + place |
| KF-02 | 01 | `0.24` | Recognition in the gate | Identity + common core |
| KF-03 | 01 | `0.52` | The signal arrives | System response |
| KF-04 | 01 | `0.84` | Six blades calibrate | Gate becomes instrument |
| KF-05 | 02 | `0.06` | Crossing the aperture | One-world continuity |
| KF-06 | 02 | `0.30` | The field assembles | Synthetic data world |
| KF-07 | 02 | `0.58` | Survey in motion | Capture and scenario scale |
| KF-08 | 02 | `0.86` | Authentic environment | Proxy yields to project source |
| KF-09 | 03 | `0.12` | Lens offered / Raw | Agency is explicit |
| KF-10 | 03 | mode event | Segmentation reading | Semantic surfaces |
| KF-11 | 03 | mode event | Detection reading | Observable boundaries |
| KF-12 | 03 | `0.88` | Reading becomes evidence | Selected state is conserved |
| KF-13 | 04 | `0.06` | Paper clearing | Project and claim |
| KF-14 | 04 | `0.30` | Source inspection | Authentic frame + explicit modes |
| KF-15 | 04 | `0.62` | Method and scale | Three facts + process |
| KF-16 | 04 | `0.90` | Verified handoff | Authors, source, next boundary |

`KF-10` and `KF-11` are interaction stateframes at the same settled camera hold. They
are part of the required 16-frame production board but are not mandatory scroll gates.
If the visitor does not select them, the Lens remains in Raw mode and progress continues
from `KF-09` to `KF-12` without loss of content.

---

## 2. Chapter 01: Threshold

### KF-01 - First inhabited light

**State:** `threshold`, `p=0.00`; first paint and hydrated state must match.

**Narrative beat:** This is a real team inhabiting a specific Transylvanian castle, not
a loader or a detached fantasy prelude.

**Central image:** A Carpathian neo-Gothic citadel at blue hour. The camera looks across
one worn foreground edge toward a pointed gate, physical Transylvanian Bears crest,
working portcullis, paired faceted guardian bears, and the visible common core. Steep
controlled roofs and three mountain depth layers hold the silhouette. One moon-cut
shadow and a sparse authored bat flight supply abstract Dracula/folklore tension; warm
occupied openings prove that the castle is lived in.

**Desktop composition:** Brand copy occupies the left 42% of the viewport. Gate pivot
sits near `(0.67, 0.49)` and the common core remains visible behind it. The near wall
enters from the lower-right and creates depth without covering the path. Crest is fully
visible above the gate; both guardians read at its base. `3-9` bats travel through the
upper-center/right sky, outside the title, crest, gate opening, header, and rail. The
gate and title do not overlap at `1024 x 768`.

**Mobile composition:** Use the dedicated lower/closer camera. Gate pivot sits near
`(0.50, 0.40)`, common core directly above/behind it, and title occupies the lower
third above the statement. Crest remains complete; one guardian is complete and the
second may crop deliberately at the outer edge. Use `2-5` bats above the gate/title
clearance line. Remove lateral camera travel. Mountains reduce to two clear silhouettes.

**Camera:** Stable 3/4 establishing frame. A maximum `1.5%` forward settle may occur
after hydration; no orbit, auto-pan, or focus pull.

**Light / material:** Cool sky fill and one moon edge reveal pointed stonework, matte
oxblood crest recess, aged-metal bear relief, portcullis, and guardian silhouettes.
Warm occupied lights are sparse and below the title contrast field; up to two controlled
flame fixtures may support the gate. Signal cyan and vermilion are not yet dominant.
Grain and particles may be present only in cinematic tier.

**DOM / copy:** Use the current hierarchy as baseline:

- kicker: `The Citadel of Seven Systems / Transylvania`;
- H1: `Transylvanian Bears`;
- statement: `Șapte sisteme. O singură cetate.`;
- literal descriptor: software, games, machine learning, and applied research;
- visible scroll cue only when motion is allowed.

**Interaction:** Work Index, audio, quality, chapter rail, and keyboard skip are active
immediately. No entry button or mandatory gesture.

**Sound:** Silence by default. If audio is already enabled, broad filtered wind and a
very low occupied-timber resonance fade in; one subtle wing-air pass may follow the bat
departure. No bat screech, howl, organ, thunder hit, vampire sting, or chapter sting on
initial page load.

**Transition out:** The camera's look target shifts from the whole castle to the crest
and gate pivot while the title field remains stable. Bats depart once toward the upper
edge; the path becomes easier to read before the signal activates. Reverse scroll
restores their authored prior positions without replaying a random loop.

**Asset status:** The current Carpathian castle massing, `BearCrest`, `GuardianBear`,
portcullis, and `BatFlock` are FINAL design foundations. Their present geometry,
materials, bat density/timing, and responsive framing are PLACEHOLDER deliveries to
refine. Architecture GLB and desktop poster remain PLACEHOLDER; mobile poster is
MISSING. Camera and semantic layout are approved targets.

**Frame acceptance:** Pass only if at least four of five cold viewers identify a
Transylvanian/Carpathian castle and Transylvanian Bears within five seconds, the castle
reads as inhabited rather than Halloween/theme-park staging, bat counts and clearances
match this frame, and no essential first-viewport content waits for WebGL.

### KF-02 - Recognition in the gate

**State:** `threshold`, `p=0.24`.

**Narrative beat:** The architecture belongs to Transylvanian Bears; the identity is
discovered in its structure.

**Central image:** The camera has settled closer and lower. The physical Transylvanian
Bears crest is now readable above the pointed gate; paired faceted guardian bears hold
the base, the iron portcullis establishes depth, and six folded blades surround the
central pivot behind it. Gate cut and blades produce a secondary bear negative space.
The common core remains visible through the opening. Seven project bays are latent in
the inhabited ring; they are not all forced into the foreground.

**Desktop composition:** Gate occupies the center-right 44% of the frame. The title
remains in the left field but reduces in dominance as the gate becomes recognizable.
The full crest and both guardian silhouettes remain legible, while the portcullis bars
frame rather than obscure the pivot. `2-4` remaining bats clear the upper gate axis.
At least one wall bay and the common center remain visible so the shot does not become
a detached logo animation.

**Mobile composition:** Gate fills the middle 58% of width. Crest remains fully visible
and large enough to recognize as bear heraldry; one guardian is complete and the other
may crop symmetrically at the edge. Negative-space mark remains a secondary read. The
wordmark stays in DOM below the visual center; crest, pivot, and core share the center
line. Use no more than `3` remaining bats.

**Camera:** Axial alignment begins. Desktop may move laterally by no more than one gate
bay to establish the negative space. Mobile moves forward only.

**Light / material:** A narrow cool edge reveals the gate cut, crest relief, and
guardian planes; brass appears on the crest relief and pivot track. Occupied lights
remain warm. Up to two practical flames are valid, but there is no glowing red eye,
internal crest glow, or theatrical heraldic spotlight.

**DOM / copy:** Keep the team name and literal descriptor. The chapter rail announces
`01. Threshold`. Dracula/folklore remains abstract visual grammar; do not add lore
exposition or an explanation of the logo construction.

**Interaction:** Pointer parallax may reveal at most `2deg` of local depth on desktop.
It does not move the mark relative to the gate or change the chapter state.

**Sound:** One quiet mineral resonance may follow the first user-initiated scroll after
audio activation. It is tactile, not triumphant, and contains no creature or vampire
vocalization.

**Transition out:** A single path seam becomes the signal route. Crest, guardians, and
portcullis remain physical architecture; no mark flies forward, detaches, or dissolves.

**Asset status:** The current crest, guardian bears, portcullis, restrained flame
practicals, and bat-flight concept are FINAL design foundations. Their current mesh
finish, crest drawing, lighting, density, and motion are PLACEHOLDER deliveries to
refine. Identity-construction v2 remains the approved compact/negative-space companion
direction and requires final vector lock.

**Frame acceptance:** Pass only if the physical crest reads as original Transylvanian
Bears heraldry, the guardians read as abstract stone bears, portcullis depth is clear,
remaining bats are sparse and authored, and the shot still reads as an inhabited
Carpathian neo-Gothic castle when all UI is temporarily hidden. Fail literal Dracula,
glowing eyes, mascot anatomy, stock heraldry, or Halloween staging.

### KF-03 - The signal arrives

**State:** `threshold`, `p=0.52`.

**Narrative beat:** A problem enters the shared system and receives a coordinated
response.

**Central image:** One cyan-white filament travels in a shallow groove in the worn path.
It bends once, passes through the foreground, and reaches the vermilion gate pivot.
Exactly six response points answer in a controlled sequence around the aperture. The
crest, guardians, and portcullis remain readable castle structure; the authored bat
flight has cleared the title and opening axis before the six-count response begins.

**Desktop composition:** Signal begins near `(0.17, 0.79)`, crosses the lower third, and
terminates near `(0.65, 0.50)`. Copy remains left but lifts enough to avoid the path.
The route never crosses body text or the chapter rail.

**Mobile composition:** Signal begins below the fold edge, travels upward on the center
axis, and terminates near `(0.50, 0.43)`. The lower copy band darkens locally, not as a
full opaque panel.

**Camera:** Slow forward descent tied to scroll. Pointer response affects signal halo
only and never pulls the route away from its authored groove.

**Light / material:** Cyan contributes a restrained local bounce to adjacent stone.
Six response points use warm-to-neutral white, not six different colors. Vermilion is
confined to the pivot.

**DOM / copy:** The literal category descriptor remains available but begins to yield.
No metric or project claim appears yet. The visible prompt is a simple continuation cue,
not `Press Start` or a mission instruction.

**Interaction:** Scroll velocity may slightly increase signal reveal speed and audio
filter brightness. When scroll stops, the pulse stops at its deterministic position.

**Sound:** Six soft architectural contacts answer in sequence only if audio is enabled.
They are low in the mix and countable without becoming a melody.

**Transition out:** Each response point moves mechanically into one of six aperture
blades. The filament's terminal point remains fixed at the pivot.

**Asset status:** Current `ApproachSignal` behavior is a PLACEHOLDER implementation
reference. Final path groove, response anchors, local-light response, and six-count
sound are MISSING.

**Frame acceptance:** Pass only if there is exactly one signal, six responses, one
pivot, no decorative network, and stopping/reversing scroll stops/reverses the reveal
without lag or residue.

### KF-04 - Six blades calibrate

**State:** `threshold`, `p=0.84`; Chapter 01 exit master.

**Narrative beat:** Identity becomes an instrument capable of observing the next
system.

**Central image:** The iron portcullis lifts with measured weight and the timber leaves
release enough to expose six mineral blades. The blades unlock around the pivot and
reveal smoked glass. Through the opening, a first legible portion of the Project Nexus
synthetic field is already visible. The physical crest stays fixed above the gate while
gate and field share one central axis; there is no dark tunnel between them.

**Desktop composition:** Aperture occupies 46-58% of viewport height and sits near
`(0.62, 0.50)`. Remaining architecture forms an irregular mineral frame. The left title
has receded but the brand remains in the persistent header.

**Mobile composition:** Aperture occupies 48-56% of viewport width. Blade tips never
touch the title or bottom controls. Field detail behind the aperture is simplified but
recognizable as a street/data environment.

**Camera:** Axial push toward the smoked-glass center. No lens distortion beyond the
stable FOV. Portcullis lift and timber-door release use restrained, mechanically
credible travel with no speed ramp, impact shake, orbit, or exaggerated door swing.

**Light / material:** A narrow brass highlight travels once along the track. Cyan is
visible beyond the gate, not washing the gate itself. Exterior light compresses behind
camera as the field becomes the key.

**DOM / copy:** Threshold hero copy has completed its exit before the aperture reaches
the title area. Header, rail, Work Index, audio, and quality remain stable.

**Interaction:** Progress is scroll-only. Blade motion cannot be replayed as a button
toy. Fast scroll resolves immediately to the fully calibrated state.

**Sound:** The latched aperture-commit event triggers `threshold-open`: six contacts
resolve into one soft mechanical lock. No bass drop, roar, or portal swell, and raw
progress sampling may not retrigger the cue.

**Transition out:** Blade inner edges become the converging street/frame vectors in
`KF-05`. Smoked glass clears to the field; no fade-to-black.

**Asset status:** Carpathian gate, crest, timber-door, and portcullis concepts are FINAL
design foundations; their current geometry, rigging, and finish remain PLACEHOLDER.
Six-blade apparatus, smoked glass, and gate-to-field continuity are PLACEHOLDER/MISSING
deliveries. The current circular oculus is valid only where rebuilt as the subordinate
mechanical aperture inside the pointed castle threshold.

**Frame acceptance:** Pass only if the portcullis clears the opening before blade
calibration, the fixed crest remains attributable, a frame-by-frame overlay shows
conserved vectors between `KF-04` and `KF-05`, reverse scroll closes each gate layer in
the exact opposite order, and mobile retains the same cause/effect without reducing the
castle threshold to a generic circular portal.

---

## 3. Chapter 02: Synthetic Field

### KF-05 - Crossing the aperture

**State:** `field`, `p=0.06`.

**Narrative beat:** The website does not teleport to a project; the same instrument
crosses into the problem space.

**Central image:** Mineral blade edges pass outside the viewport while their vectors
resolve as street boundaries, survey rails, and the first data frame. A thin fragment
of the gate remains in peripheral depth long enough to prove continuity.

**Desktop composition:** View is centered on the route. The leftmost blade exits toward
the upper-left; the rightmost becomes a curb/frame near the right third. The field
already occupies at least 70% of the visible area before chapter copy enters.

**Mobile composition:** Use a straight-through push. The top and bottom blade edges
become vertical scene boundaries, then leave. No sideways tunnel or horizontal wipe.

**Camera:** Forward crossing with a shallow descent. The camera looks through the
aperture before its position crosses the pivot plane, preventing a blind frame.

**Light / material:** Exterior warm practicals fall behind. Neutral-cool survey light
reveals street, path, and simple building massing. One brass line survives as a trim
join for several frames.

**DOM / copy:** Chapter rail updates to `02. Synthetic field` at the sentinel. Project
copy waits until the world is stable; do not place a paragraph over the transition.

**Interaction:** Native scroll only. The Work Index remains clickable during the
crossing; route navigation cannot wait for the aperture animation.

**Sound:** Gate lock decays behind the listener while exterior wind narrows. A faint
capture-bed texture enters with no beat or sci-fi pulse.

**Transition out:** Gate fragments leave through physical camera travel. Sparse point
structure appears at ground/building anchors, preparing `KF-06`.

**Asset status:** Camera path exists as FINAL behavior baseline. Final transition
geometry and gate/field shared vectors are MISSING. Current procedural street is a
PLACEHOLDER proxy.

**Frame acceptance:** Pass only if no viewport state is empty, black, or dominated by
a loading fallback during slow, fast, and reverse traversal.

### KF-06 - The field assembles

**State:** `field`, `p=0.30`.

**Narrative beat:** A world becomes structured material for observation.

**Central image:** The synthetic field grows from sparse survey points into restrained
solid massing. Rows resolve by depth, not as buildings popping up simultaneously. The
common signal continues down the center route and the Carpathian horizon remains as a
quiet continuity cue.

**Desktop composition:** Field occupies full bleed. Chapter copy uses a right-side
negative region no wider than `32rem`; the strongest data assembly remains in center/
left. Horizon stays in the upper third until the later survey descent.

**Mobile composition:** Buildings resolve in three depth groups around a centered
street. Copy occupies the lower band with subject-safe space above. Reduce furniture,
windows, and point density before reducing silhouette clarity.

**Camera:** A shallow survey descent begins but does not become top-down yet. Building
scale animation is monotonic and follows row depth.

**Light / material:** Desaturated mineral greens, charcoal roofs, moss horizon, and
quiet occupied windows. Cyan appears in the active center route and sparse survey
points only.

**DOM / copy:** Current baseline:

- kicker: `Project Nexus / synthetic field`;
- title: `Camera intră în problemă, nu într-o galerie.`;
- short explanation that streets, buildings, and signals become dataset material.

**Interaction:** None required. Pointer parallax may separate depth subtly on cinematic
desktop; touch and composed tiers use the authored camera only.

**Sound:** Narrow wind, low spatial room/field tone, and a distant rotor-like texture
below conscious focus. No UI beeps.

**Transition out:** Survey points begin moving along three controlled capture streams;
one small drone silhouette enters as an operator, not a hero.

**Asset status:** Procedural city, point field, horizon, and street furniture are
PLACEHOLDER. Their assembly behavior may be retained after the visual simplification
pass. Copy is baseline, not part of art lock.

**Frame acceptance:** Pass only if viewers read `synthetic environment becoming data`
rather than `cyber city`, `game level`, or `generic 3D background`.

### KF-07 - Survey in motion

**State:** `field`, `p=0.58`.

**Narrative beat:** Project Nexus creates variation and captures structured training
material.

**Central image:** The camera and a small survey drone travel along the same authored
route. Three data streams connect environment anchors to the distant keep/aperture
echo. Scenario variation is communicated by controlled changes in light, weather
layer, and sampled area, not eleven invented thumbnails.

**Desktop composition:** Drone stays in a side third and below 4% of frame area. The
survey path remains the primary line. A restrained counter may resolve from `01` to
`11 scenarios`; only the final value persists.

**Mobile composition:** Drone may be omitted in composed tier if it crowds the field.
The route and final `11 scenarios` value carry the capture idea. Counter sits above the
lower copy/control exclusion zone.

**Camera:** Continue the descent toward an aerial angle while retaining enough oblique
depth to show traversal. Ambient rotor motion is disabled in reduced motion.

**Light / material:** Field remains neutral. Weather/time variation affects atmosphere
within source-supported ranges; it does not recolor semantic objects or imply unverified
results.

**DOM / copy:** One accessible metric appears: `11 synthetic scenarios`. It is DOM,
not a canvas counter. Do not introduce accuracy, cost savings, or training outcome.

**Interaction:** Scroll controls route progress while pointer movement steers the survey
drone inside a bounded flight envelope. WASD/Arrow control activates only while the Lens
surface owns focus, so native page navigation remains available everywhere else. The
authored camera path never follows the drone. Passing through the three evidence cores
records Source, Structure, and Decision without blocking chapter exit.

**Sound:** The field bed gains a light filtered rotor texture and occasional dry data
contact. Scroll velocity changes filter brightness by a restrained amount.

**Transition out:** The final survey footprint aligns with the aspect and orientation
of the authentic `ue5-industrial-aerial.png` plane entering `KF-08`.

**Asset status:** `11 scenarios` is FINAL verified content. Bounded steering, three-mode
flight, and optional proximity evidence collection are FINAL behavior baselines. The
drone model, data streams, core geometry, and weather/time variants remain PLACEHOLDER
visual/sound deliveries pending source and art review.

**Frame acceptance:** Pass only if the metric includes its unit, the drone does not
become the subject, and the route remains understandable when drone and audio are
disabled.

### KF-08 - Authentic environment

**State:** `field`, `p=0.86`; Chapter 02 exit master.

**Narrative beat:** The atmospheric proxy yields to an authentic Project Nexus source.

**Central image:** `ue5-industrial-aerial.png` enters as a large, correctly proportioned
evidence plane and then occupies the field. The procedural city remains visible only
at the edges long enough to show the handoff. A source caption identifies the image as
an original Unreal Engine 5 environment capture.

**Desktop composition:** Authentic media reaches 65-78% of viewport area. It is not a
small floating monitor. The caption sits on a quiet mineral/paper edge outside the
image. The next Lens focus point is placed over actual inspectable content.

**Mobile composition:** Use an approved vertical crop with stored focal point. Media
fills the upper/middle field and preserves recognizable environment context. Do not
stretch or center-crop blindly.

**Camera:** The world camera settles before the image becomes dominant. Media plane
motion is a shallow flattening toward screen alignment, not a hologram float.

**Light / material:** Surrounding world desaturates slightly so source color is primary.
Media is color-managed sRGB and compared against a DOM image fallback.

**DOM / copy:** Source caption, project name, and factual medium remain semantic. Do not
claim that unrelated segmentation/box captures are the same sample.

**Interaction:** No click is required. The image may become the Lens target on pointer
or focus, but the visitor can continue by scroll alone.

**Sound:** Rotor texture falls away. A short neutral glass/contact cue marks the plane
alignment; then the bed quiets to prepare agency.

**Transition out:** A circular-but-not-eye-shaped six-segment Lens frame resolves from
the aperture geometry around the authentic media. It does not obscure the source.

**Asset status:** `ue5-industrial-aerial.png` is FINAL source. Color-managed web
derivative and mobile crop are MISSING. Current `EvidencePanel` using
`project-nexus.webp` is a PLACEHOLDER role assignment for this frame.

**Frame acceptance:** Pass only if source and proxy are visually and verbally distinct,
the authentic image is the dominant subject, and its caption remains available without
WebGL.

---

## 4. Chapter 03: Lens Knot

### KF-09 - Lens offered / Raw

**State:** `lens`, `p=0.12`, `lensMode=raw`.

**Narrative beat:** The visitor is offered one meaningful operation: inspect how the
same scene changes when the system reads it differently.

**Central image:** The source field remains full bleed. A six-segment aperture-derived
reticle rests over one useful region. The reticle is an optical instrument with a thin
cyan boundary, not an eye, radar, or generic target HUD.

**Desktop composition:** Heading sits in the upper-left quiet field; inspectable source
occupies center/right. Reticle begins near `(0.76, 0.46)` and follows pointer only
inside a clamped safe region. The three-mode segmented control spans the lower safe
area without covering the source focal point.

**Mobile composition:** Heading uses at most the upper-left 45% width. Reticle is fixed
near the most informative focal point unless the visitor taps another region. Three
equal mode buttons sit above the bottom safe area; labels remain visible.

**Camera:** Settled operational hold. The world camera no longer follows the pointer;
only the Lens moves locally. Reduced motion uses a fixed focus region.

**Light / material:** Raw mode retains authentic source color. Reticle cyan has low
halo and no global relight. Smoked-glass fill is nearly neutral and below 6% opacity.

**DOM / copy:** Current baseline:

- kicker: `Agency knot / Lens`;
- title: `Aceeași scenă. Trei moduri de a o înțelege.`;
- controls: `Raw`, `Segmentation`, `Detection` with icons and `aria-pressed`.

**Interaction:** Pointer, touch, and keyboard can select modes. Within the focused Lens
surface, pointer/WASD/Arrow input steers the drone; outside it, scroll and native
navigation remain untouched. The camera stays fully authored. Mode selection and core
collection enrich the scene but are never required to reach proof or continue.

**Sound:** Raw selection uses one soft glass tick only when explicitly selected. No
looping scan sound.

**Transition out:** A mode selection changes semantic surfaces within the Lens and then
the wider scene; camera and source composition remain fixed for comparison.

**Asset status:** Lens mode selection, bounded direct-flight input, and persistent
evidence-core state are FINAL behavior baselines. Current circular reticle, drone/core
models, and tiny control type are PLACEHOLDER. Final six-segment aperture-derived Lens
is missing.

**Frame acceptance:** Pass only if all three controls are operable with pointer, touch,
and keyboard; Raw is understandable without hover; and the source image does not move
when modes change.

### KF-10 - Segmentation reading

**State:** `lens`, explicit event `LENS_SELECTED: segmentation`; spatial hold matches
`KF-09`.

**Narrative beat:** The same source becomes classed surfaces.

**Central image:** Inside the Lens, source regions resolve into a limited semantic
palette. Outside the Lens, the source remains visible at reduced emphasis, providing a
direct comparison. If the wider field transitions too, it does so after the local Lens
state is understood.

**Desktop composition:** Lens stays at the visitor-selected point or default focal
point. Segmentation control is selected with filled background, icon, label, and
pressed state. A short caption identifies whether the overlay is authentic project
output or explanatory visualization.

**Mobile composition:** The segmented state may use a larger fixed comparison window
instead of following touch. The mode control remains visible, and no explanatory label
is hidden behind hover.

**Camera:** Locked to the `KF-09` comparison position. No mode-specific zoom, shake,
or orbit.

**Light / material:** Brass is the mode accent. It changes reticle edge, selected
control, and relevant semantic surfaces only. Source media remains color-referenced.

**DOM / copy:** Visible mode label `Segmentation`; concise explanation `Classes become
surfaces`. If using current synthetic overlay shapes, add `Explanatory overlay` and do
not call it model output.

**Interaction:** Re-selecting the active mode has no effect. Left/Right Arrow may move
between mode buttons once the group has focus; Tab leaves the group normally.

**Sound:** Explicit selection updates the mode tuning and triggers `lens-lock`, heard as
one dry brass tap no longer than `180ms`; no sound on scroll-driven re-entry or state
restoration.

**Transition out:** Selecting another mode replaces semantic state in place. Continuing
scroll preserves the current choice until `KF-12`.

**Asset status:** `synthetic-segmentation.png` is FINAL authentic output but is not
guaranteed to align with the `KF-09` source. Current procedural color masks are
PLACEHOLDER explanation. A matching source/segmentation pair is MISSING.

**Frame acceptance:** Pass only if a reviewer can state whether the visible overlay is
authentic or explanatory without consulting external documentation, and brass remains
local rather than recoloring the world.

### KF-11 - Detection reading

**State:** `lens`, explicit event `LENS_SELECTED: detection`; spatial hold matches
`KF-09`.

**Narrative beat:** The same scene becomes observable boundaries that can carry into
the next system.

**Central image:** Thin detection rectangles resolve around subjects or source-aligned
regions. Corners are crisp and screen-space stable. The visual emphasizes boundaries,
not confidence-score spectacle.

**Desktop composition:** Detection control is selected with icon, label, filled state,
and pressed state. Rectangles remain inside the media/Lens region and never frame DOM
copy, header controls, or architecture by accident.

**Mobile composition:** Use fewer, larger source-aligned rectangles. Labels sit outside
busy subjects or in a separate legend. No label is smaller than the art-bible minimum.

**Camera:** Locked to the comparison position. Detection boundaries do not track random
time-based subjects; their state is deterministic for the displayed frame.

**Light / material:** Vermilion is the selected mode accent. Cyan may still identify
pedestrian/other classes only when class mapping is sourced and also pattern/label
coded. No red global alarm state.

**DOM / copy:** Visible mode label `Detection`; concise explanation `Signals become
boundaries`. Remove current fake confidence values unless extracted from authentic
output.

**Interaction:** Mode changes are instant at the state level with a visual transition
under `260ms`. Keyboard and touch receive the same result and accessible name.

**Sound:** Explicit selection updates the mode tuning and triggers `lens-lock`, heard as
one short muted edge click. No scanline hum or alarm.

**Transition out:** One verified rectangle is designated as the conserved boundary for
`KF-12`. Other rectangles reduce in prominence; they do not explode into particles.

**Asset status:** `synthetic-boxes.png` is FINAL authentic output. Current hard-coded
detection positions/classes/confidences are PLACEHOLDER. Source-aligned vector
extraction is MISSING.

**Frame acceptance:** Pass only if lines remain one-to-two physical pixels across DPR
tiers, labels are factual or absent, and detection can be distinguished without relying
on vermilion alone.

### KF-12 - Reading becomes evidence

**State:** `lens`, `p=0.88`; Chapter 03 exit master. Uses the selected Lens mode, with
Raw as the deterministic default.

**Narrative beat:** The visitor's reading becomes a stable, inspectable web artifact.

**Central image:** The Lens stops following the pointer. Its aperture aligns to the
source plane and flattens toward the screen. The selected contour or one neutral source
boundary becomes the rectangular frame of the Chapter 04 evidence viewport.

**Desktop composition:** Lens moves from visitor position to an authored alignment
without crossing the heading. Mode control recedes only after the evidence boundary is
established. A light paper edge enters from below/behind the frame.

**Mobile composition:** Lens alignment is primarily scale/depth, not lateral travel.
The mode control remains until the paper clearing has enough contrast to receive focus
and reading order.

**Camera:** World camera remains settled while the media/Lens object flattens. No camera
push and object push at the same time.

**Light / material:** Mode color contracts to a thin edge. World saturation falls;
paper plaster rises without a white flash. Evidence source maintains color continuity.

**DOM / copy:** Lens heading exits before the evidence title enters. Accessibility tree
order transitions from Lens controls to evidence heading without focus loss.

**Interaction:** If a mode button has focus during scroll, keep it mounted until focus
moves or the user continues beyond the transition threshold; never destroy focused UI.

**Sound:** Selected mode resonance narrows into one neutral paper/glass contact. The
synthetic field bed drops by about `3 LU`, not to hard silence.

**Transition out:** Detection/source frame becomes the `NexusProofInspector` viewport
edge. Paper clearing fills the surrounding page in `KF-13`.

**Asset status:** Transition concept is FINAL. DOM/WebGL media alignment, focus-safe
mount lifecycle, and selected-mode visual carry are PLACEHOLDER/MISSING.

**Frame acceptance:** Pass only if all three possible mode exits converge to the same
stable evidence layout, Raw works without prior interaction, and reverse scroll restores
the previous selected mode and Lens position.

---

## 5. Chapter 04: Evidence

### KF-13 - Paper clearing

**State:** `proof`, `p=0.06`.

**Narrative beat:** Atmosphere gives way to a native reading and verification surface.

**Central image:** Warm-gray paper plaster fills the page around the conserved dark
evidence frame. `Project Nexus` becomes the dominant title. The world remains visible
only as a narrow transition edge, then stops competing.

**Desktop composition:** Full-width clearing. Top rule carries `Editorial clearing /
NX-01` on the left and `Applied machine learning` on the right. Title grid places
`Project Nexus` and a concise factual description above the evidence surface. No
floating card contains the section.

**Mobile composition:** Single-column flow. Kicker, discipline, title, description,
and evidence surface stack in that order. Title wraps deliberately and does not exceed
three lines. Paper begins below the `60px` header safe region.

**Camera:** Camera motion is complete before paragraph reading begins. Canvas may retain
the transition edge but does not update hidden world objects.

**Light / material:** Paper plaster `#C9C4B9`, ink `#111718`, and dark evidence viewport
`#071011`. Texture is subtle enough not to reduce text contrast. No beige lifestyle
grade or drop-shadow card treatment.

**DOM / copy:** Baseline factual copy:

- `Editorial clearing / NX-01`;
- `Applied machine learning`;
- `Project Nexus`;
- Unreal Engine 5 and AirSim synthetic environments used for aerial detection training,
  followed by validation on real data.

**Interaction:** Normal document scrolling resumes. Header, rail, and Work Index remain
fixed. Direct navigation to `#mf-proof` lands on this stable state without replaying
Chapters 01-03.

**Sound:** Field bed becomes near-silent paper/room tone. When the proof panel becomes
available, one latched `evidence-reveal` cue may play. No celebratory cue and no repeat
from raw scroll sampling.

**Transition out:** Evidence viewport expands to its final inspectable size while the
title settles above it. Source mode is the default.

**Asset status:** Clearing structure and semantic content are FINAL behavior baseline.
`Cinzel` remains a FINAL visual-direction foundation for the citadel/brand register and
may persist in a restrained kicker; `Project Nexus`, proof headings, body, and actions
transition to Manrope. Current font delivery audit, undersized labels, responsive type,
paper texture, and final hierarchy/spacing pass remain PLACEHOLDER/MISSING.

**Frame acceptance:** Pass only if the project name, discipline, claim, and source
surface are readable with canvas removed and direct-anchor entry causes no layout jump.

### KF-14 - Source inspection

**State:** `proof`, `p=0.30`, inspector mode `source`.

**Narrative beat:** The visitor inspects an authentic available project frame before
seeing explanatory overlays.

**Central image:** `public/assets/projects/project-nexus.webp` fills the dark evidence
viewport at a credible scale and correct aspect behavior. A side/bottom rail explains
that one source supports three readings. The image is the subject, not a thumbnail.

**Desktop composition:** Evidence viewport uses the wide left region; inspector rail
uses the narrower right region. The source remains at least 70% of the component area.
Caption, mode controls, and source metadata align to one grid.

**Mobile composition:** Viewport spans full content width. Rail stacks below. Three mode
buttons are equal `44px+` targets with visible labels. The image focal point is stored
for the vertical crop; hover loupe is omitted.

**Camera:** No world camera motion. Pointer loupe may operate inside the viewport on
precise-pointer devices; it is enhancement only and disappears immediately on leave.

**Light / material:** Source image receives only documented display correction. Dark
rail and viewport isolate it from paper without a decorative card shadow.

**DOM / copy:** Include:

- `Evidence surface / 01`;
- `One source. Three readings.`;
- statement that the available capture is authentic and explanatory overlays are not
  presented as additional project output;
- source dimensions and provenance, if verified.

Remove or verify the current coordinates. Do not show fake class confidences in source
mode.

**Interaction:** Source, Segmentation/Classes, and Detection/Objects controls use
`aria-pressed`. The image alt text identifies the visible evidence, not the UI action.
The mode group follows the source in reading order.

**Sound:** Explicit mode changes use the same restrained cues as Chapter 03. Pointer
loupe and hover produce no sound.

**Transition out:** The inspector remains available while the page reveals metrics
below. It does not collapse into a card or pin the reader indefinitely.

**Asset status:** `project-nexus.webp` is FINAL but resolution-limited. Inspector
semantic structure is FINAL behavior baseline. Hard-coded overlays, fake confidence
labels, coordinates, looping scanline, and current tiny type are PLACEHOLDER.

**Frame acceptance:** Pass only if the source is inspectable at desktop and mobile,
mode controls work without hover, explanatory status is explicit, and all metadata is
verified or omitted.

### KF-15 - Method and scale

**State:** `proof`, `p=0.62`.

**Narrative beat:** The evidence is supported by a concise, sourced production method
and three measurable facts.

**Central image:** The evidence surface remains visible above as the page reveals three
large values and a three-step method. Values appear in reading order, not as a dashboard
or animated scoreboard.

**Desktop composition:** Three metrics share one full-width rule:

- `11` / `synthetic scenarios`;
- `~9,500` / `images`;
- `>140,000` / `automatic annotations`.

Below, a method sequence uses `01 Generate environments and conditions`, `02 Segment
and annotate automatically`, and `03 Train YOLOv8 and validate on real data`. Source CTA
aligns to the final column.

**Mobile composition:** Metrics stack as one value per row at `<=360px`; at `390px`, a
three-column layout is allowed only if labels remain at least `10px` and values do not
collide. Method remains a vertical ordered list. CTA spans content width or fits its
label without truncation.

**Camera:** None. DOM layout owns the beat. Values may reveal through a short opacity/
translate treatment only when motion is allowed; no count-up is required.

**Light / material:** Paper remains neutral and readable. Cyan identifies source/
verified method references, not every number. Evidence media above retains richer color.

**DOM / copy:** Units are mandatory. Do not add accuracy, savings, ranking, or the
`1,366 hours` estimate without the documented assumptions. Keep Project Nexus classified
as applied ML/computer vision, not a research paper.

**Interaction:** CTA is a real anchor to the public source presentation and navigates
immediately. Metrics are selectable text. No hover reveals missing methodology.

**Sound:** Proof surface remains quiet. A single soft dry contact may accompany the
method block entering, but silence is preferred if it competes with reading.

**Transition out:** One detection-frame corner reappears beside the method/source CTA,
preparing the boundary handoff in `KF-16`.

**Asset status:** Three metrics and method claims are FINAL verified content. Current
layout is FINAL behavior baseline but typography/spacing require production pass.
Training-series graphs remain MISSING and must not be invented.

**Frame acceptance:** Pass only if all three values include units, match source records,
remain legible at `360px`, and the CTA works with JavaScript and WebGL unavailable.

### KF-16 - Verified handoff

**State:** `proof`, `p=0.90`; Chapter 04 exit master and Chapter 05 preload zone.

**Narrative beat:** The first system is credible, attributable, and structurally able
to continue into the next one.

**Central image:** The source link, confirmed authors, and evidence status form the
final proof cluster. One verified bounding rectangle extends beyond the paper clearing;
its corners lengthen into access-plan rails for Chapter 05. The transition is a function
change: observation becomes decision.

**Desktop composition:** Authors and source occupy a calm final row beneath method/
metrics. The boundary exits toward the next chapter's visual axis without crossing the
CTA. A next-beat label may identify `Detection becomes decision`, but does not obscure
the proof.

**Mobile composition:** Authors stack in one compact semantic list. Source CTA remains
full-width or intrinsic without truncation. Boundary exits vertically/downward so the
handoff is visible within portrait flow.

**Camera:** None until the visitor enters Chapter 05. The conserved boundary may detach
into the world layer only after the evidence row is stable and accessible.

**Light / material:** Paper stays bright. The boundary begins in source-aligned mode
color, then neutralizes toward cyan/brass access rails. No full-page color wash.

**DOM / copy:** Required authors:

- Nedelcu Călin;
- Cheroiu Andrei;
- Buloi Cristian;
- Colan Vlad.

Use Romanian diacritics in final names where the approved credit source does. Include
the presentation source. Show competition name/result only after official wording is
confirmed; otherwise omit it rather than using a placeholder award title.

**Interaction:** Source and case-study routes are real anchors. Chapter-rail selection
for `05 Aegis passage` may move directly to the next stable state. Focus must remain on
the activated link through route transition.

**Sound:** One short boundary impulse pans subtly toward the next route. It does not
play if the visitor activates a link before the spatial handoff completes. Proof content
itself remains silent.

**Transition out:** The single rectangle's four corners become floor-plan/access rails
in Chapter 05. Reverse scroll retracts the rails into the exact evidence boundary.

**Asset status:** Author list and source route are FINAL content. Official competition
wording and full event-person credits are PENDING. Boundary-to-access transition is
PLACEHOLDER/MISSING and belongs to the integration seam with Chapter 05.

**Frame acceptance:** Pass only if authors and source are available without canvas,
pending award copy is absent, the boundary transformation is reversible, and the user
can navigate away before animation completion without lost focus or delayed routing.

---

## 6. Transition Choreography

### 6.1 Master transition table

| Transition | Progress window | Conserved object | Forward action | Reverse action |
| --- | --- | --- | --- | --- |
| KF-01 -> KF-02 | Ch01 `0.10-0.34` | Crest / gate / common axis | Camera aligns, physical crest resolves, and sparse bats depart once | Camera widens; bats and full castle context return deterministically |
| KF-02 -> KF-03 | Ch01 `0.34-0.64` | Crest / portcullis / path seam / pivot | One filament reveals and six points answer while identity remains architectural | Responses return to practical lights; filament retracts |
| KF-03 -> KF-04 | Ch01 `0.64-0.94` | Crest / gate axis / six response points | Portcullis lifts, timber releases, points become blade joints, and blades calibrate | Blades fold, timber returns, portcullis lowers, and points relight |
| KF-04 -> KF-05 | Ch01 `0.88` to Ch02 `0.16` | Pointed gate / blade/street vectors | Camera crosses the physical castle threshold; mineral vectors become field boundaries | Field boundaries become blades before portcullis, crest, and exterior return |
| KF-05 -> KF-06 | Ch02 `0.10-0.40` | Signal route | Sparse points become solid field by depth | Solids return to point scaffold without popping |
| KF-06 -> KF-07 | Ch02 `0.40-0.68` | Survey route | Capture streams and operator enter | Streams settle back to anchors; drone exits path |
| KF-07 -> KF-08 | Ch02 `0.68-0.96` | Survey footprint | Authentic media aligns and proxy yields | Media returns to plane; proxy regains depth |
| KF-08 -> KF-09 | Ch02 `0.88` to Ch03 `0.18` | Aperture edge / focal point | Lens resolves around authentic source | Lens edge flattens back to aperture/media join |
| KF-09 <-> KF-10/11 | Explicit event | Source composition | Semantic reading changes in place | Previous mode restores without camera change |
| KF-09/10/11 -> KF-12 | Ch03 `0.72-0.96` | Selected contour / source frame | Lens aligns and flattens to evidence boundary | Evidence boundary regains aperture depth and selected mode |
| KF-12 -> KF-13 | Ch03 `0.88` to Ch04 `0.14` | Evidence boundary | Paper clearing rises around dark viewport | Paper retreats; viewport returns to Lens plane |
| KF-13 -> KF-14 | Ch04 `0.14-0.40` | Evidence viewport | Source reaches final inspectable size | Source returns to title-level frame without unload |
| KF-14 -> KF-15 | Ch04 `0.40-0.74` | Evidence/source relation | Normal DOM flow reveals metrics and method | Reading order reverses without sticky jump |
| KF-15 -> KF-16 | Ch04 `0.74-1.00` | One verified boundary | Boundary moves toward Chapter 05 axis | Access rails retract into exact source boundary |

### 6.2 Transition invariants

- No transition owns more than one camera move and one primary object transformation at
  the same time.
- UI exits after its object has transferred meaning, never before.
- A route click wins over animation immediately.
- Hidden chapters do not keep animated objects or audio sources alive.
- Fast scroll evaluates destination state directly; it does not replay intermediate
  time-based cues.
- Reverse scroll restores mode, focus-safe DOM, and material state without remount flash.
- Fallback transitions use the same conserved shapes through SVG/DOM where possible.

---

## 7. Interaction Contract

### 7.1 Always-available actions

| Action | Pointer | Keyboard | Touch | Requirement |
| --- | --- | --- | --- | --- |
| Open Work Index | Click icon/link | Tab + Enter/Space | Tap | Works from first paint; pauses autonomous motion/audio response |
| Toggle audio | Click icon | Tab + Enter/Space | Tap | Explicit opt-in; visible state; `44 x 44px` target |
| Cycle quality | Click icon | Tab + Enter/Space | Tap | Current tier has accessible label; upgrade only at boundary |
| Select chapter | Click rail entry | Tab + Enter | Tap | Native anchor behavior and stable destination state |
| Skip to proof | Focus + activate | First keyboard focus path | Accessible link/menu | Lands at `#mf-proof` without replaying intro |

### 7.2 Lens and proof actions

| Action | Behavior | Nonblocking rule |
| --- | --- | --- |
| Move Lens | Precise pointer moves within clamped safe region | Fixed authored position on touch/reduced motion |
| Select Raw | Restores authentic source reading | Default state; no prior interaction needed |
| Select Segmentation | Shows sourced output or explicit explanatory overlay | Camera and scroll remain unchanged |
| Select Detection | Shows sourced boundaries or explicit explanatory overlay | Fake confidences/coordinates remain absent |
| Inspect proof | Optional loupe on precise pointer | No exclusive content in loupe or hover |
| Open source | Immediate real-anchor navigation | Does not wait for View Transition or canvas |
| Steer drone with pointer/WASD/Arrows | Bounded local agency inside the focused Lens surface | Native navigation remains available outside the surface; camera stays authored |
| Collect evidence cores by proximity | Optional Source/Structure/Decision pickups persist across modes | Never gate proof, chapter exit, source links, or route navigation |

### 7.3 Focus and state

- Focus order follows DOM/visual order: persistent header -> chapter content -> Lens/
  proof controls -> source CTA -> next content.
- A focused control is not unmounted during a progress transition. Delay visual cleanup
  or move focus intentionally after an explicit action.
- Lens mode persists from Chapter 03 into its transition representation, but Chapter 04
  proof defaults to Source unless the product explicitly maps a sourced equivalent.
- Browser Back restores route, chapter anchor, scroll position where available, and a
  valid stable visual state.
- No information is available only through pointer position, hover, color, motion, or
  sound.

---

## 8. Sound Cue Sheet

| Cue ID | Frame / event | Runtime mapping | Character | Duration | Spatial behavior | Status |
| --- | --- | --- | --- | --- | --- | --- |
| S-01 | KF-01 ambient | `citadel` stem | Filtered wind + occupied stone/timber; optional single wing-air departure | Loop + one `<450ms` pass | Broad stereo, slow restrained pan; wing air crosses once only after opt-in | PLACEHOLDER implementation candidate |
| S-02 | KF-02 recognition | `citadel` + `threshold` crossfade | Low mineral/mechanical resonance | Continuous | Gate-weighted, no one-shot required | PLACEHOLDER implementation candidate |
| S-03 | KF-03 responses | `threshold` stem detail | Six countable soft contacts | `6 x 90-140ms` | Move along blade positions | PLACEHOLDER; not yet a separate cue API |
| S-04 | KF-04 lock | `threshold-open` | One soft mechanical resolve | `0.7-1.0s` | HRTF at gate commit | PLACEHOLDER implementation candidate |
| S-05 | KF-05 crossing | `citadel`/`threshold` -> `nexus` crossfade | Exterior narrows into field bed | `1.2-1.8s` | Front-to-rear image in continuous stems | PLACEHOLDER implementation candidate |
| S-06 | KF-07 survey | `nexus` stem | Filtered distant rotor/data texture | Loop while active | Moving HRTF path | PLACEHOLDER implementation candidate |
| S-07 | KF-08 alignment | `nexus` stem settles | No automatic one-shot | N/A | Media plane stays visually primary | FINAL cue decision |
| S-08 | Raw selection | `lens-lock`, Raw tuning | Soft glass/low lock | `<180ms` | HRTF at Lens | PLACEHOLDER implementation candidate |
| S-09 | Segmentation selection | `lens-lock`, Segmentation tuning | Dry brass lock | `<180ms` | HRTF at Lens | PLACEHOLDER implementation candidate |
| S-10 | Detection selection | `lens-lock`, Detection tuning | Muted edge lock | `<180ms` | HRTF at Lens | PLACEHOLDER implementation candidate |
| S-11 | KF-12 flatten | `nexus` -> `evidence` crossfade | No automatic one-shot | N/A | Selected tuning persists quietly | FINAL cue decision |
| S-12 | KF-13/14 proof | `evidence` stem + `evidence-reveal` | Quiet room tone plus one panel contact | Loop + `<350ms` | Near-center, low level | PLACEHOLDER implementation candidate |
| S-13 | KF-16 handoff | Future cue | One boundary impulse | `<350ms` | Subtle move toward next axis | PLACEHOLDER; not in controller |

The controller receives progress normalized over Chapters 01-04, not the global
16-chapter journey progress. One-shots do not fire on initial state restoration, rapid
scrub, raw progress crossing, or programmatic anchor positioning. `VerticalSliceSoundscape`
is a production candidate until it is integrated and commissioned; the live experience
still uses `AmbientAudioEngine`.

---

## 9. Responsive and Fallback Board

### 9.1 Desktop deliverables

For every keyframe, art must provide a `1440 x 900` composition and verify a
`1024 x 768` crop/layout. Deliverables include:

- clean world plate without UI;
- UI-safe overlay showing header, rail, copy, controls, and focus bounds;
- focal-point coordinates for media;
- forward and reverse transition handles;
- grayscale/silhouette check for Threshold frames;
- source/proxy/explanatory labels for Nexus frames.

### 9.2 Mobile deliverables

For every keyframe, art must provide a separately composed `390 x 844` frame and verify
`360 x 800`. Deliverables include:

- dedicated camera or vertical poster;
- safe-area and browser-chrome overlay;
- source focal point and crop rule;
- one-thumb control region;
- longest Romanian and English label test;
- no-hover interaction state;
- landscape fallback decision.

### 9.3 Editorial / reduced-motion sequence

The minimum no-canvas/reduced-motion board uses these stable states:

| State | Source frame | Content preserved |
| --- | --- | --- |
| RM-01 | KF-01 | Team, category, Carpathian castle, physical crest, guardian bears, static sparse bats, Work Index, controls |
| RM-02 | KF-04 | Crest, portcullis, pointed gate/aperture relation, and continuation |
| RM-03 | KF-08 | Authentic synthetic-environment source and caption |
| RM-04 | KF-09 plus mode controls | Raw/Segmentation/Detection comparison |
| RM-05 | KF-13 through KF-16 in normal flow | Claim, source, metrics, method, authors, CTA |

Crossfades are optional and capped at `200ms`. Scanning, parallax, camera travel, drone,
particles, count-up, and velocity sound are absent.

---

## 10. Frame Asset Matrix

The binary FINAL/PLACEHOLDER status follows the art bible. A `source-approved` registry
slot makes the source content FINAL, but its stable delivery remains PLACEHOLDER until
the file exists and passes crop, color, rights, responsive, and runtime QA.

| Frame | Final sources available | Placeholder / missing before art lock |
| --- | --- | --- |
| KF-01 | Runtime layout; approved Carpathian castle, crest, guardian-bear, portcullis, bat, Cinzel/Manrope/JetBrains Mono direction | Final neo-Gothic citadel finish, desktop/mobile posters, material pass, crest drawing, bat timing/density |
| KF-02 | Physical crest/guardian/portcullis foundation and identity v2 compact-mark direction | Final crest vector/relief, guardian meshes, portcullis finish, restrained flame/light pass, authored sparse bat departure |
| KF-03 | Scroll-driven signal behavior | Final physical path, six response anchors, light and sound |
| KF-04 | Approved pointed gate, crest, timber-door, and portcullis foundations | Six-blade apparatus, smoked glass, final layered gate rig, reverse timing, and transition geometry |
| KF-05 | Existing continuous camera baseline | Shared gate/street vectors, load-safe transition |
| KF-06 | Existing procedural assembly behavior | Simplified final proxy field, final materials, mobile composition |
| KF-07 | Verified `11 scenarios` metric; bounded steering and three optional evidence cores | Final survey operator/streams/core models, sourced variation states, spatial sound |
| KF-08 | `ue5-industrial-aerial.png` | Web derivative, mobile crop, caption metadata, DOM/WebGL alignment |
| KF-09 | Lens mode state machine, controls, bounded drone steering, persistent core state | Final aperture-derived Lens, control typography, touch flight behavior, accessible focus cues |
| KF-10 | `synthetic-segmentation.png` | Matching source pair or explicit explanatory treatment |
| KF-11 | `synthetic-boxes.png` | Authentic vector extraction, removal of fake labels/confidences |
| KF-12 | Approved transition concept | Selected-mode carry, focus-safe lifecycle, paper edge |
| KF-13 | Semantic clearing structure, factual claim, and approved Cinzel-to-Manrope register shift | Font delivery audit, final paper texture, type hierarchy, and responsive spacing |
| KF-14 | `project-nexus.webp`, inspector structure | Higher-resolution original if available, verified metadata, authentic overlays |
| KF-15 | Verified metrics and method | Production typography/spacing; source series only if delivered |
| KF-16 | Confirmed authors and source presentation | Official award wording, event credits, boundary-to-Aegis integration |

---

## 11. Storyboard Acceptance Criteria

### 11.1 Frame completion

- **SB-01:** All 16 frames exist at `1440 x 900` and `390 x 844`, with safe-area/UI
  overlays and an explicit FINAL/PLACEHOLDER asset call.
- **SB-02:** Every frame has one dominant subject, one narrative purpose, and no more
  than one title, one supporting statement, and three facts over moving imagery.
- **SB-03:** The iconic Carpathian aperture-threshold read is established in `KF-01`,
  retains its physical crest, guardian-bear, portcullis, and pointed-gate hierarchy
  through `KF-04`, and visibly seeds `KF-05`, `KF-09`, `KF-12`, and `KF-13`.
- **SB-04:** `KF-01`/`KF-02` unmistakably read as an inhabited Transylvanian neo-Gothic
  castle with bear identity and sparse authored bats. Review finds no literal Dracula,
  Halloween/theme-park staging, stock fantasy clutter, mascot anatomy, random bat swarm,
  steampunk, cyberpunk, fake science, or generated evidence prohibited by the art bible.

### 11.2 Animatic behavior

- **SB-05:** A progress-driven animatic interpolates all scroll frames in both
  directions without cuts, empty frames, stale copy, or non-deterministic endpoints.
- **SB-06:** `KF-10` and `KF-11` can be entered by explicit mode selection at the
  `KF-09` camera hold; neither is required to reach `KF-12`.
- **SB-07:** Raw, Segmentation, and Detection all produce a valid `KF-12 -> KF-13`
  transition and reverse to the selected state.
- **SB-08:** Slow wheel, trackpad, touch, keyboard paging, scrollbar drag, anchor jump,
  Home/End, and rapid reverse reach the same stable keyframes.
- **SB-09:** Route links and Work Index navigate immediately at every keyframe; no
  animation delays history or focus.

### 11.3 Responsive behavior

- **SB-10:** At `1440 x 900`, `1024 x 768`, `390 x 844`, and `360 x 800`, header, rail,
  title, focal subject, controls, captions, and metrics do not overlap or clip.
- **SB-11:** Mobile uses separate cameras/crops/layouts for all 16 frames; no frame is
  accepted as a desktop crop alone.
- **SB-12:** All touch targets are at least `44 x 44px`, Lens modes remain labeled, and
  no hover-only content is lost.
- **SB-13:** The five-state reduced-motion/editorial board preserves every claim,
  source, control, author, and route in logical reading order.

### 11.4 Truth and source handling

- **SB-14:** Proxy field, authentic project media, and explanatory overlays are visually
  and verbally distinct in every applicable frame.
- **SB-15:** No source image is stretched, silently upscaled, or paired as a matching
  sample without evidence.
- **SB-16:** Metrics are exactly `11 synthetic scenarios`, `~9,500 images`, and
  `>140,000 automatic annotations`; no unsourced performance claim appears.
- **SB-17:** Coordinates, class labels, confidence values, competition wording, author
  spelling, credits, and source status are verified or omitted.

### 11.5 UI, audio, and performance handoff

- **SB-18:** All copy and controls are represented as DOM-safe layers in the board;
  nothing essential is baked into a poster or WebGL texture.
- **SB-19:** Focus order, active/pressed states, skip behavior, and focused-control
  retention are demonstrated in the animatic or interactive prototype.
- **SB-20:** Audio cue triggers, ramps, repeat suppression, mute behavior, and reduced-
  motion behavior are documented and tested; the experience remains complete muted.
- **SB-21:** Keyframe asset packages fit the art-bible memory, draw-call, triangle,
  payload, frame-rate, and long-task budgets after final export.
- **SB-22:** Before implementation sign-off, every shipping asset in the frame matrix is
  FINAL. Required castle, physical crest, guardian-bear, portcullis, and authored-bat
  roles cannot pass by omission; their current PLACEHOLDER deliveries must be refined
  or replaced without reversing the approved design foundation. Only non-required
  placeholder visuals may be intentionally omitted.
- **SB-23:** Direct drone steering is bounded, reversible, and active only inside the
  focused Lens surface. The three proximity cores persist across modes but never gate
  scroll, proof, source, route, fallback, or reduced-motion outcomes when unused.

Approval requires the art director, interaction owner, content/evidence owner, frontend
owner, and accessibility/QA reviewer to sign the same 16-frame animatic. Approval of a
still without its reverse transition, mobile composition, source status, and fallback
does not approve the frame.
