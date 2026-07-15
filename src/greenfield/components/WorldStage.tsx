import { sceneById } from '../data';
import type { SceneId } from '../types';

type WorldStageProps = {
  activeScene: SceneId;
};

const stationIds = ['route', 'compute', 'vision', 'bridge', 'grid', 'simulation'];

export function WorldStage({ activeScene }: WorldStageProps) {
  const scene = sceneById[activeScene];

  return (
    <div className="gf-world" data-scene={activeScene} data-tone={scene.tone} aria-hidden="true">
      <div className="gf-world__horizon" />
      <div className="gf-world__terrain gf-world__terrain--far" />
      <div className="gf-world__terrain gf-world__terrain--near" />

      <div className="gf-world__fortress">
        <div className="gf-world__wall gf-world__wall--left" />
        <div className="gf-world__wall gf-world__wall--right" />
        <div className="gf-world__core">
          <span className="gf-world__pivot" />
        </div>
      </div>

      <div className="gf-world__workshop">
        {stationIds.map((id, index) => (
          <span key={id} className={`gf-world__station gf-world__station--${index + 1}`} />
        ))}
      </div>

      <div className="gf-world__project-surface">
        <span className="gf-world__project-plane gf-world__project-plane--a" />
        <span className="gf-world__project-plane gf-world__project-plane--b" />
        <span className="gf-world__project-line" />
      </div>

      <div className="gf-world__archive-rings">
        <span />
        <span />
        <span />
      </div>

      <div className="gf-world__signal">
        <span />
      </div>

    </div>
  );
}
