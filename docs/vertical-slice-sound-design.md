# Vertical slice sound design

## Scope

`VerticalSliceSoundscape` is a standalone Web Audio controller for chapters 01-04:

1. Threshold
2. Synthetic field
3. Lens knot
4. Evidence

It is intentionally not wired into the current experience yet. It owns one lazily created
`AudioContext`, has no runtime dependencies, fetches no audio assets, and remains silent until
`resume()` is called from an explicit user action.

The existing `AmbientAudioEngine` established the useful baseline: deterministic filtered noise,
low oscillators, smooth `AudioParam` automation, velocity-reactive filtering, chapter cues, and
explicit cleanup. The slice controller keeps those constraints while separating the authored
layers and making Lens state and spatial events first-class parameters.

## Sound map

All continuous material is synthesized in the browser from seeded noise buffers and oscillators.
Four independent gain buses feed a conservative compressor and the owned master bus.

| Stem | Material | Progress behavior |
| --- | --- | --- |
| `citadel` | dark wind plus low stone resonance | dominant at first light, then remains as a quiet spatial anchor |
| `threshold` | gate friction, low mechanical body, slow amplitude drift | rises inside chapter 01 and clears as the synthetic field resolves |
| `nexus` | moving HRTF drone, three harmonics, filtered data air | crossfades in across 01-02, responds to Lens mode, then recedes beneath proof |
| `evidence` | sparse air and stable sine partials | enters late in chapter 03 and stays deliberately quiet through chapter 04 |

The authored crossfades overlap rather than switching at exact quarter marks:

- citadel withdrawal: `0.12 -> 0.43`;
- threshold body: attack `0.015 -> 0.10`, release `0.24 -> 0.37`;
- Nexus entry: `0.20 -> 0.34`, withdrawal `0.78 -> 0.93`;
- evidence entry: `0.70 -> 0.83`.

`progress` must therefore be normalized over this four-chapter slice. Do not pass the current
16-chapter global journey progress directly. A later integration should derive slice progress from
the first-light/threshold start and the end of the proof section, then clamp it to `0..1`.

Scroll velocity changes bed gain and filter openness within narrow limits. It does not change cue
pitch. With reduced motion enabled, velocity contributes zero modulation while progress and Lens
state continue to shape the mix.

## Lens language

The Nexus stem uses one tonal family with three tunings so changing modes reads as a change of
analysis, not as a new composition.

| Mode | Root | Character |
| --- | --- | --- |
| `raw` | 49 Hz | dark, narrow spectrum, slow pulse |
| `segmentation` | 55 Hz | warmer upper field and a slightly faster pulse |
| `detection` | 61.74 Hz | most open filter and clearest data pulse |

The evidence partials track the selected Lens mode at a much lower level. This carries the chosen
reading into proof without turning the evidence surface into a musical climax.

## Spatial cues

`trigger()` creates short procedural voices through an HRTF `PannerNode`. Coordinates are in metres
relative to the Web Audio listener: positive X is right, positive Y is up, and negative Z is in
front. The controller supplies defaults, but scene code may pass event-specific positions.

| Cue | Intended event | Default position |
| --- | --- | --- |
| `threshold-open` | gate aperture commits | `{-1.4, 0.1, -2.8}` |
| `lens-lock` | Raw/Segmentation/Detection selection commits | `{0.9, 0.35, -1.7}` |
| `evidence-reveal` | proof panel becomes available | `{0, 0.2, -1.3}` |

Cues are explicit interaction events. Neither `update()` nor a progress crossing fires a cue, so
scrolling backward or rapidly scrubbing cannot create repeated impacts. `trigger()` returns `false`
unless the graph is already running and audible; it never circumvents browser autoplay policy.

## API

```ts
import {
  VerticalSliceSoundscape,
  type VerticalSliceLensMode,
} from '../lab/macro-flow/VerticalSliceSoundscape';

const soundscape = new VerticalSliceSoundscape({
  reducedMotion,
  masterLevel: 0.68,
});
```

### Lifecycle

| Member | Contract |
| --- | --- |
| `resume(): Promise<boolean>` | Lazily creates/resumes the context, clears mute, and fades in. Call from a click or key action. Returns `true` only when the context is running. |
| `mute(): void` | Fades the owned master to zero in 80 ms. The graph remains available for cheap, click-free parameter updates. |
| `dispose(): void` | Stops continuous and active one-shot sources, disconnects all nodes, and closes the owned context. The instance cannot be reused. |
| `status` | `idle`, `running`, `muted`, `suspended`, `silent`, or `disposed`. |
| `isSupported` | `false` for SSR, missing Web Audio, forced silent mode, or a disposed instance. |

### Adaptation

| Member | Contract |
| --- | --- |
| `update({ progress?, velocity?, lensMode? }): void` | Stores clamped parameters and smoothly retargets the graph if it exists. It never creates or resumes audio. |
| `setReducedMotion(value): void` | Enables/disables velocity modulation at runtime without muting sound. |
| `setStemLevel(stem, level): void` | Applies a `0..1.5` commissioning trim to one stem without changing crossfade logic. |
| `trigger(cue, position?): boolean` | Schedules an audible spatial one-shot only when the context is running. |

The controller clamps `progress` to `0..1`, velocity to `-1.25..1.25`, master level to `0..1`, and
stem trims to `0..1.5`. Non-finite numeric input retains the previous valid value.

## Integration sketch

This is a call-site sketch only; the current prototype remains unchanged.

```ts
const soundscape = new VerticalSliceSoundscape({ reducedMotion });

async function toggleAudio() {
  if (soundscape.status === 'running') {
    soundscape.mute();
    persistAudioPreference(false);
    return;
  }

  if (await soundscape.resume()) persistAudioPreference(true);
}

function onJourneySample(
  sliceProgress: number,
  velocity: number,
  lensMode: VerticalSliceLensMode,
) {
  soundscape.update({ progress: sliceProgress, velocity, lensMode });
}

function onGateOpened() {
  soundscape.trigger('threshold-open');
}

function onLensSelected(mode: VerticalSliceLensMode) {
  soundscape.update({ lensMode: mode });
  soundscape.trigger('lens-lock');
}

function onEvidenceRevealed() {
  soundscape.trigger('evidence-reveal');
}

// Component or route teardown:
soundscape.dispose();
```

The application remains responsible for session preference persistence and its visible audio
control. A document-visibility handler may call `mute()`; returning to a browser-suspended context
should call `resume()` from the next accepted user gesture.

## Fallback and accessibility

- `new VerticalSliceSoundscape({ silent: true })` is an intentional silent implementation with the
  same API.
- SSR, an unavailable `AudioContext`, or graph construction failure moves the instance to `silent`;
  `resume()` returns `false` and all other calls remain safe.
- A browser-blocked resume leaves the instance `suspended` and may be retried from another user
  gesture.
- Reduced motion does not imply muted audio. It removes velocity swells and keeps progress/Lens
  transitions intact.
- The compressor is a peak guard, not a loudness target. Proof remains the quietest active stem.
- No timers or animation loops are owned by the controller. Updates are driven by the existing
  journey clock, and muting does not add background work.

## Commissioning checks

Before integration is accepted:

1. Confirm the first `AudioContext` is created only by the visible audio control.
2. Test rapid forward/backward scrubbing; stem transitions must remain smooth and cues must not
   retrigger from progress alone.
3. Compare `raw`, `segmentation`, and `detection` on headphones and laptop speakers.
4. Verify mute, browser tab suspension, resume, route teardown, and React Strict Mode teardown.
5. Verify reduced-motion mode at high scroll velocity; no velocity-driven gain or filter swell
   should remain.
6. Confirm silent mode preserves every visual and semantic interaction with no console errors.
7. Measure the final integrated mix on macOS Safari and Windows Chrome before changing the limiter
   or authored stem trims.
