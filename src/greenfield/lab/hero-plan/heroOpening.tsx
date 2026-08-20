import { type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ARCHIVE, PROJECTS, TEAM } from '../../data';
import { CitadelPlan, CitadelPlanShell } from './CitadelPlan';
import type { HeroOpening } from './useHeroOpening';

/**
 * The opening's DOM layer and the state it shares with the 3D scene.
 *
 * This exists in two places at once: the lab page gives the sequence a canvas of
 * its own, and the story mounts it inside the canvas its sixteen chapters share.
 * The plan, the labels and the node state are identical in both, and the camera
 * derives its pose from the measured rectangle of the drawing, so they cannot be
 * two copies that drift.
 */

const pad = (count: number) => String(count).padStart(2, '0');

/** Counted from the index itself, so the page cannot overstate the work. */
const EVIDENCE = [
  { value: pad(PROJECTS.length), label: 'sisteme' },
  { value: pad(TEAM.length), label: 'constructori' },
  { value: pad(ARCHIVE.length), label: 'intrări în arhivă' },
  { value: '25—26', label: 'perioadă' },
];

/**
 * The title of the whole thing.
 *
 * The wordmark at full size beside the drawing, the claim under it, and the count
 * of what backs the claim. This is the front page, so it is allowed to look like
 * one: a line of small type in a corner is a caption, not an opening.
 */
export function HeroPlanTitle({ onFollow }: { onFollow?: () => void }) {
  return (
    <div className="hp-copy">
      <p className="hp-kicker">Șapte sisteme. O singură cetate.</p>
      <h1 className="hp-wordmark">
        <span>Transylvanian</span>
        <span>Bears</span>
      </h1>
      <p className="hp-line">
        Software, jocuri, machine learning și cercetare — construite de șase elevi,
        într-un singur sistem.
      </p>

      <div className="hp-cta">
        <a
          className="hp-btn hp-btn--primary"
          href="#mf-threshold"
          onClick={(event) => {
            if (!onFollow || event.metaKey || event.ctrlKey || event.shiftKey) return;
            event.preventDefault();
            onFollow();
          }}
        >
          Urmează semnalul
          <i aria-hidden="true" />
        </a>
        <Link className="hp-btn" to="/next/work">
          Deschide indexul
          <i aria-hidden="true" />
        </Link>
      </div>

      <dl className="hp-evidence">
        {EVIDENCE.map((item) => (
          <div key={item.label}>
            <dt>{item.value}</dt>
            <dd>{item.label}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * Extrudarea e făcută din felii stivuite pe Z. Zidul are pas mic și rămâne jos;
 * nucleul are pas mare, ca să se citească drept clădirea centrală.
 */
const EXTRUSIONS = [
  { part: 'wall', layers: 8, step: '16px', taperFrom: 99 },
  { part: 'core', layers: 12, step: '26px', taperFrom: 8 },
] as const;

/** Ultimele felii ale nucleului se strâng, ca volumul să capete acoperiș, nu capac plat. */
function layerScale(index: number, taperFrom: number): string {
  if (index < taperFrom) return '1';
  return (1 - (index - taperFrom + 1) * 0.15).toFixed(3);
}

export type { HeroOpening } from './useHeroOpening';

/** The drawing itself: the sheet that tips, and the shell layers behind it. */
export function HeroPlanSheet({
  opening,
  interactive,
}: {
  opening: HeroOpening;
  interactive: boolean;
}) {
  return (
    <div className="hp-stage">
      <div className="hp-tilt" ref={opening.planRef}>
        <div className="hp-ground-shadow" aria-hidden="true" />
        {/* Straturile CSS raman doar ca schita in timpul desenului; de la
            pragul de inclinare preia geometria reala din shared/citadel.json. */}
        {EXTRUSIONS.map((extrusion) => (
          <div
            key={extrusion.part}
            className="hp-extrude"
            aria-hidden="true"
            style={{ '--step': extrusion.step } as CSSProperties}
          >
            {Array.from({ length: extrusion.layers }, (_, i) => (
              <div
                key={`${extrusion.part}-${i}`}
                className="hp-extrude__layer"
                data-crown={i === extrusion.layers - 1 || undefined}
                style={{
                  '--layer': String(i + 1),
                  '--scale': layerScale(i, extrusion.taperFrom),
                } as CSSProperties}
              >
                <CitadelPlanShell part={extrusion.part} />
              </div>
            ))}
          </div>
        ))}
        <CitadelPlan
          activeSlug={opening.activeSlug}
          onNodeFocus={opening.setHoverSlug}
          interactive={interactive}
        />
      </div>
    </div>
  );
}

