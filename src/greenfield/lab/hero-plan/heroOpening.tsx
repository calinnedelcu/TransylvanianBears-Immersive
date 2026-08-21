import { useEffect, useRef, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ARCHIVE, PROJECTS, TEAM } from '../../data';
import { CitadelPlan, CitadelPlanShell, PlanTerrain } from './CitadelPlan';
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

/**
 * Aerul din jurul planșei.
 *
 * Primul cadru al site-ului era negru plat: cerul și orizontul descrise în CSS
 * pornesc amândouă de la `--hp-fade-in`, deci apar abia după ce planul începe să
 * se încline, iar scena 3D nu desenează nimic la progres 0. Rămâneau opt animații
 * în tot ecranul — un traseu și șapte noduri — pe un fundal fără nicio sursă de
 * lumină.
 *
 * Straturile de aici sunt lumina de dinaintea lumii: lampa de planșetă care ține
 * desenul, spălarea rece dinspre fereastră, praful din fascicul și granulația
 * care leagă totul. Toate pleacă până la progres 0.2, unde cetatea începe să se
 * ridice și lumea reală preia cadrul — atmosfera planșei n-are ce căuta peste ea.
 */
/**
 * Reticulul care ține locul cursorului în deschidere.
 *
 * Pagina susține că planul e un instrument de releveu; săgeata sistemului spune
 * altceva. Firul stă exact pe pointer, inelul se așază cu întârziere, iar când
 * cursorul e pe un nod se închid patru colțare peste el — aceeași gramatică
 * vizuală ca fasciculul care baleiază desenul.
 *
 * `cursor: none` se aplică numai după ce cârligul confirmă că desenează, prin
 * `data-reticle`. Fără pointer fin sau cu mișcare redusă, cârligul nu pornește,
 * atributul lipsește și cursorul de sistem rămâne acolo unde era.
 */
export function PlanReticle({ locked }: { locked: boolean }) {
  return (
    <div className="hp-reticle" data-locked={locked || undefined} aria-hidden="true">
      <span className="hp-reticle__ring" />
      <span className="hp-reticle__cross" />
    </div>
  );
}

export function HeroPlanAtmosphere() {
  return (
    <div className="hp-aura" aria-hidden="true">
      <div className="hp-aura__wash" />
      <div className="hp-aura__lamp" />
      <div className="hp-aura__dust" />
      <div className="hp-aura__grain" />
      <div className="hp-aura__vignette" />
    </div>
  );
}

/** Counted from the index itself, so the page cannot overstate the work. */
const EVIDENCE = [
  { value: pad(PROJECTS.length), count: PROJECTS.length, label: 'sisteme' },
  { value: pad(TEAM.length), count: TEAM.length, label: 'constructori' },
  { value: pad(ARCHIVE.length), count: ARCHIVE.length, label: 'intrări în arhivă' },
  // Perioada nu e o măsurătoare, e o etichetă: nu are de la ce să numere.
  { value: '25—26', count: null, label: 'perioadă' },
];

/** Cât durează urcarea cifrei, aliniată la intrarea benzii de dovezi. */
const COUNT_MS = 900;
const COUNT_DELAY = 920;

/**
 * Cifra urcă până la valoarea ei reală.
 *
 * Textul rămâne în DOM de la primul render cu valoarea finală, deci un cititor
 * de ecran, un crawler sau o filă cu mișcare redusă văd numărul, nu un zero care
 * se schimbă. Animația doar rescrie ce e deja acolo, și numai dacă apucă.
 */
function CountTo({ value, count }: { value: string; count: number | null }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || count === null) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Într-o filă de fundal `requestAnimationFrame` nu se declanșează deloc, deci
    // cifra ar rămâne oprită pe valoarea la care a ajuns — s-a văzut un „01" în
    // loc de „07". Dacă pagina nu e vizibilă la montare, numărul rămâne cel real
    // și nu mai are ce să înghețe.
    if (document.hidden) return;

    let raf = 0;
    let start = 0;
    const step = (now: number) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / COUNT_MS);
      // Aceeași curbă ca intrarea textului, ca cifra să nu pară un alt sistem.
      const eased = 1 - (1 - t) ** 3;
      node.textContent = pad(Math.round(count * eased));
      if (t < 1) raf = requestAnimationFrame(step);
      else node.textContent = value;
    };

    node.textContent = pad(0);
    const timer = window.setTimeout(() => { raf = requestAnimationFrame(step); }, COUNT_DELAY);
    return () => {
      window.clearTimeout(timer);
      if (raf) cancelAnimationFrame(raf);
      node.textContent = value;
    };
  }, [count, value]);

  return <dt ref={ref}>{value}</dt>;
}

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
            <CountTo value={item.value} count={item.count} />
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
        <PlanTerrain />
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

