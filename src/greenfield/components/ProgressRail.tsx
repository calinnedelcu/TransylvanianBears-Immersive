import { SCENES } from '../data';
import type { SceneId } from '../types';

type ProgressRailProps = {
  activeScene: SceneId;
};

export function ProgressRail({ activeScene }: ProgressRailProps) {
  return (
    <nav className="gf-progress" aria-label="Progresul poveștii">
      {SCENES.map((scene) => (
        <a
          key={scene.id}
          href={`#${scene.id}`}
          className={scene.id === activeScene ? 'is-active' : undefined}
          aria-current={scene.id === activeScene ? 'step' : undefined}
          aria-label={`${scene.index}. ${scene.navLabel}`}
          title={scene.navLabel}
        >
          <span />
        </a>
      ))}
    </nav>
  );
}
