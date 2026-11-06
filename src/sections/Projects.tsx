import { useContent } from '../i18n/useContent';
import { Reveal } from '../components/Reveal';
import { ProjectCard } from '../components/ProjectCard';
import './projects.css';

/** Desktop column spans (out of 12) for the flat layout, used when the 3D world is off. */
const LAYOUT = [7, 5, 4, 4, 4, 6, 6];

/**
 * With the 3D world on, each project is a stop on the road: its billboard stands in the
 * world and its card scrolls past beside it. Without it, the same cards form a grid.
 */
export function Projects() {
  const { COPY, PROJECTS, UI } = useContent();
  return (
    <section id="proiecte" className="projects section" aria-labelledby="projects-title">
      <div className="wrap">
        <Reveal className="section-head section-head--split" data-station="projects">
          <p className="section-head__index eyebrow">{UI.projectsIndex}</p>
          <h2 id="projects-title" className="display">
            {COPY.projects.title}
          </h2>
          <p>{COPY.projects.body}</p>
        </Reveal>

        <ul className="pgrid">
          {PROJECTS.map((project, index) => (
            <ProjectCard
              key={project.id}
              project={project}
              span={LAYOUT[index] ?? 4}
              spanMd={index === 0 ? 2 : 1}
              eager={index < 2}
              delay={(index % 3) * 70}
              station={index}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}
