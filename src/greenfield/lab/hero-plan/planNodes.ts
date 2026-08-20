import { projectById } from '../../data';
import type { ProjectDefinition } from '../../types';
import { NODE_ANGLES } from './citadelGeometry';

/**
 * Un nod al planului: poziția pe inel plus proiectul real din datele echipei.
 *
 * Nimic din ce se vede pe plan nu este scris de mână aici. Indexul, numele,
 * disciplina, starea și metricile vin din `PROJECTS`, deci planul nu poate
 * ajunge să contrazică indexul de proiecte. `projectById` este tipat pe
 * `ProjectId`, deci un slug greșit e eroare de compilare, nu nod lipsă.
 */
export type PlanNode = {
  deg: number;
  project: ProjectDefinition;
  /** Prima jumătate a etichetei de disciplină; cea completă intră în panou. */
  shortDiscipline: string;
};

export const PLAN_NODES: PlanNode[] = NODE_ANGLES.map(({ id, deg }) => {
  const project = projectById[id];
  return {
    deg,
    project,
    shortDiscipline: project.disciplineLabel.split(' / ')[0],
  };
});

/** Etichete în română pentru starea proiectului, folosite în panoul de nod. */
export const STATE_LABEL: Record<ProjectDefinition['state'], string> = {
  shipped: 'Livrat',
  active: 'În lucru',
  research: 'Cercetare',
  archived: 'Arhivat',
};

/** Nivelul de dovadă e distincția pe care restul site-ului o face peste tot. */
export const EVIDENCE_LABEL: Record<ProjectDefinition['evidence'], string> = {
  verified: 'Dovadă verificată',
  'team-confirmed': 'Confirmat de echipă',
  pending: 'În verificare',
};
