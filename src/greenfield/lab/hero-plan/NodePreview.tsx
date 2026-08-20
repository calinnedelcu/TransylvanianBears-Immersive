import { EVIDENCE_LABEL, PLAN_NODES, STATE_LABEL } from './planNodes';

type NodePreviewProps = {
  activeSlug: string | null;
};

/**
 * Panoul de sub plan. Demonstrează afirmația că planul este indexul: fiecare nod
 * livrează numele real, disciplina, rezumatul, prima metrică și — important pentru
 * felul în care restul site-ului tratează dovada — nivelul ei de verificare.
 *
 * Are înălțime rezervată, deci trecerea de la o stare la alta nu mișcă layout-ul.
 */
export function NodePreview({ activeSlug }: NodePreviewProps) {
  const node = PLAN_NODES.find((entry) => entry.project.slug === activeSlug);

  if (!node) {
    return (
      <div className="hp-preview" data-empty="">
        <p className="hp-preview__hint">
          07 sisteme pe inel. Treci peste un nod sau navighează cu Tab.
        </p>
      </div>
    );
  }

  const { project } = node;
  const metric = project.metrics?.[0];

  return (
    <div className="hp-preview">
      <p className="hp-preview__eyebrow">
        <span>{project.index}</span>
        {project.disciplineLabel}
      </p>
      <p className="hp-preview__title">{project.title}</p>
      <p className="hp-preview__summary">{project.summary}</p>

      <div className="hp-preview__foot">
        <span className="hp-preview__chip" data-evidence={project.evidence}>
          {EVIDENCE_LABEL[project.evidence]}
        </span>
        <span className="hp-preview__chip">{STATE_LABEL[project.state]}</span>
        <span className="hp-preview__chip">{project.year}</span>
        {metric ? (
          <span className="hp-preview__metric">
            <b>{metric.value}</b> {metric.label}
          </span>
        ) : null}
        <span className="hp-preview__link">Enter sau click &rarr; studiul de caz</span>
      </div>
    </div>
  );
}
