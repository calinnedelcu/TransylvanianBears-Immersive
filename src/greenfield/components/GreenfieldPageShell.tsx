import { useRef, type ReactNode } from 'react';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { GreenfieldHeader } from './GreenfieldHeader';
import { useEditorialDirector } from '../hooks/useEditorialDirector';
import { useGreenfieldMode } from '../hooks/useGreenfieldMode';
import '../greenfield.css';
import '../editorial.css';

type GreenfieldPageShellProps = {
  children: ReactNode;
  title: string;
  tone?: 'dark' | 'paper';
};

export function GreenfieldPageShell({ children, title, tone = 'dark' }: GreenfieldPageShellProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  useGreenfieldMode(title);
  useEditorialDirector({ rootRef, reducedMotion });

  return (
    <div ref={rootRef} className="gf-app gf-page" data-page-tone={tone}>
      <a className="gf-skip" href="#gf-page-content">Sari la conținut</a>
      <GreenfieldHeader />
      <main id="gf-page-content" className="gf-page__main">
        {children}
      </main>
      <footer className="gf-footer gf-page__footer">
        <p>Transylvanian Bears</p>
        <p>C.N.I. Tudor Vianu / București</p>
        <p>{new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
