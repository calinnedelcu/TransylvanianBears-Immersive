import { useEffect, type ReactNode } from 'react';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { ExperienceActorContext } from './experienceContext';
import { detectCapabilities } from './quality';

function ExperienceCapabilityBridge() {
  const actor = ExperienceActorContext.useActorRef();
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    actor.send({ type: 'MOTION_CHANGED', reduced: reducedMotion });
    actor.send({ type: 'CAPABILITIES_CHANGED', capabilities: detectCapabilities(reducedMotion) });

    let frame = 0;
    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        actor.send({ type: 'CAPABILITIES_CHANGED', capabilities: detectCapabilities(reducedMotion) });
      });
    };

    window.addEventListener('resize', update);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', update);
    };
  }, [actor, reducedMotion]);

  useEffect(() => {
    actor.send({ type: 'READY' });
  }, [actor]);

  return null;
}

export function ExperienceProvider({ children }: { children: ReactNode }) {
  const reducedMotion = usePrefersReducedMotion();
  const capabilities = detectCapabilities(reducedMotion);

  return (
    <ExperienceActorContext.Provider options={{ input: { capabilities, reducedMotion } }}>
      <ExperienceCapabilityBridge />
      {children}
    </ExperienceActorContext.Provider>
  );
}
