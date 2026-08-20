import { type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { CitadelPlan, CitadelPlanShell } from './CitadelPlan';
import { NodePreview } from './NodePreview';
import { PLAN_NODES } from './planNodes';
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

/**
 * The labels and the reading panel.
 *
 * Positions are written by the render loop; only content and behaviour live here,
 * so they stay real links rather than painted text.
 */
export function HeroSystemIndex({ opening }: { opening: HeroOpening }) {
  const { activeSlug, visited, setHoverSlug, selectNode, tagsRef } = opening;
  return (
    <>
      <div className="hp-tags" ref={tagsRef} aria-label="Sistemele cetatii">
        {PLAN_NODES.map(({ project }) => (
          <Link
            key={project.slug}
            className="hp-tag"
            to={`/next/work/${project.slug}`}
            data-active={activeSlug === project.slug || undefined}
            data-visited={visited.has(project.slug) || undefined}
            onMouseEnter={() => setHoverSlug(project.slug)}
            onMouseLeave={() => setHoverSlug(null)}
            onFocus={() => setHoverSlug(project.slug)}
            onBlur={() => setHoverSlug(null)}
            onClick={(event) => {
              event.preventDefault();
              selectNode(project.slug);
            }}
          >
            <span>{project.index}</span>
            {project.shortTitle}
          </Link>
        ))}
      </div>
      <NodePreview activeSlug={activeSlug} />
    </>
  );
}
