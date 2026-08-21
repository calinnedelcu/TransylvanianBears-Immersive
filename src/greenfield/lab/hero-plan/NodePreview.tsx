import { Link } from 'react-router-dom';
import { EVIDENCE_LABEL, PLAN_NODES, STATE_LABEL } from './planNodes';

/**
 * Ce spune planul despre nodul de sub cursor.
 *
 * Cele șapte noduri erau deja link-uri reale către capitolele lor, dar tot ce
 * făceau la hover era să se lumineze: cititorul trebuia să intre într-un sistem
 * ca să afle ce e. Panoul livrează informația în loc — index, disciplină, o
 * frază, starea dovezii și prima măsurătoare — deci planul chiar este indexul,
 * cum susține comentariul de lângă noduri.
 *
 * Nimic nu e scris de mână aici: totul vine din `PROJECTS`, prin `PLAN_NODES`.
 *
 * Înălțimea e rezervată din CSS și starea goală ocupă aceeași cutie, ca trecerea
 * cursorului peste inel să nu împingă nimic pe verticală.
 */
export function NodePreview({ activeSlug }: { activeSlug: string | null }) {
  const node = PLAN_NODES.find((candidate) => candidate.project.slug === activeSlug);

  if (!node) {
    return (
      <aside className="hp-preview" data-empty aria-live="polite">
        <p className="hp-preview__hint">Treci peste un nod · sistemul se deschide</p>
      </aside>
    );
  }

  const { project, shortDiscipline } = node;
  const metric = project.metrics?.[0];

  return (
    <aside className="hp-preview" aria-live="polite">
      <p className="hp-preview__eyebrow">
        <span>{project.index}</span>
        {/* Spațiul e explicit: golul vizual vine din `gap`, dar fără el cititorul
            de ecran anunță „01Machine learning". */}
        {` ${shortDiscipline} · ${STATE_LABEL[project.state]}`}
      </p>
      <h2 className="hp-preview__title">{project.title}</h2>
      <p className="hp-preview__summary">{project.summary}</p>
      <div className="hp-preview__foot">
        <span className="hp-preview__chip" data-evidence={project.evidence}>
          {EVIDENCE_LABEL[project.evidence]}
        </span>
        {metric ? (
          <span className="hp-preview__metric">
            <b>{metric.value}</b> {metric.label}
          </span>
        ) : null}
        {/* Singura ieșire reală din inel: nodul își deschide capitolul.
            Scos din ordinea de tab fiindcă panoul apare la focusul nodului, iar
            nodul e deja un link către aceeași adresă: două opriri de tastatură
            spre același loc, dintre care una vizibilă doar cât ține focusul. */}
        <Link className="hp-preview__enter" to={`/work/${project.slug}`} tabIndex={-1}>
          Deschide <b>{project.shortTitle}</b>
        </Link>
      </div>
    </aside>
  );
}
