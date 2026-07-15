import { createContext, useContext, type ReactNode } from 'react';
import { useCapeSweep } from '../../hooks/useCapeSweep';
import { CapeSweep } from './CapeSweep';

type CapeSweepContextValue = {
  /** Triggers a sweep; runs `midAction` at peak coverage. */
  trigger: (midAction?: () => void) => void;
};

const CapeSweepContext = createContext<CapeSweepContextValue | null>(null);

export function CapeSweepProvider({ children }: { children: ReactNode }) {
  const { active, trigger } = useCapeSweep();

  return (
    <CapeSweepContext.Provider value={{ trigger }}>
      {children}
      <CapeSweep active={active} />
    </CapeSweepContext.Provider>
  );
}

export function useCapeSweepTrigger() {
  const ctx = useContext(CapeSweepContext);
  if (!ctx) throw new Error('useCapeSweepTrigger must be used inside <CapeSweepProvider>');
  return ctx.trigger;
}
