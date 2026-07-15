import { useEffect, useRef, useState } from 'react';
import { useLenis } from 'lenis/react';
import { Menu, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { ViewTransitionLink } from './ViewTransitionLink';

const FAST_LINKS = [
  { index: '00', label: 'Poveste', detail: 'Experiența imersivă', to: '/' },
  { index: '01', label: 'Work', detail: '7 proiecte / 4 domenii', to: '/work' },
  { index: '02', label: 'Echipa', detail: '6 contribuții distincte', to: '/team' },
  { index: '03', label: 'Arhivă', detail: 'Rezultate și surse', to: '/archive' },
  { index: '04', label: 'Contact', detail: 'Deschide canalul', to: 'mailto:calin.nedelcu08@gmail.com?subject=Transylvanian%20Bears' },
] as const;

export function GreenfieldHeader() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef(false);
  const lenis = useLenis();

  useEffect(() => {
    if (!open) {
      if (restoreFocusRef.current) toggleRef.current?.focus();
      restoreFocusRef.current = false;
      return;
    }

    restoreFocusRef.current = true;
    lenis?.stop();

    const previousOverflow = document.documentElement.style.overflow;
    const inertTargets = Array.from(
      document.querySelectorAll<HTMLElement>('.gf-story, .gf-page__main, .gf-footer, .gf-progress'),
    );
    document.documentElement.style.overflow = 'hidden';
    inertTargets.forEach((target) => { target.inert = true; });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        return;
      }

      if (event.key !== 'Tab') return;
      const links = Array.from(overlayRef.current?.querySelectorAll<HTMLElement>('a[href]') ?? []);
      const focusable = [toggleRef.current, ...links].filter((item): item is HTMLElement => Boolean(item));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.documentElement.style.overflow = previousOverflow;
      inertTargets.forEach((target) => { target.inert = false; });
      lenis?.start();
    };
  }, [lenis, open]);

  return (
    <>
      <header className="gf-header" data-menu-open={open || undefined}>
        <ViewTransitionLink className="gf-brand" to="/" aria-label="Transylvanian Bears, pagina principală" tabIndex={open ? -1 : undefined}>
          <span className="gf-mark" aria-hidden="true">
            <span />
          </span>
          <span className="gf-brand__name">Transylvanian Bears</span>
        </ViewTransitionLink>

        <nav className="gf-header__links" aria-label="Navigație principală">
          {[
            { to: '/work', label: 'Work' },
            { to: '/team', label: 'Echipa' },
            { to: '/archive', label: 'Arhivă' },
          ].map((item) => {
            const active = location.pathname.startsWith(item.to);
            return (
              <ViewTransitionLink
                key={item.to}
                to={item.to}
                className={active ? 'active' : undefined}
                aria-current={active ? 'page' : undefined}
                tabIndex={open ? -1 : undefined}
              >
                {item.label}
              </ViewTransitionLink>
            );
          })}
        </nav>

        <button
          ref={toggleRef}
          className="gf-icon-button"
          type="button"
          aria-label={open ? 'Închide navigația rapidă' : 'Deschide navigația rapidă'}
          aria-controls="gf-fast-access"
          aria-expanded={open}
          title={open ? 'Închide meniul' : 'Navigație rapidă'}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </header>

      <div
        ref={overlayRef}
        id="gf-fast-access"
        className="gf-fast-access"
        data-open={open || undefined}
        aria-hidden={!open}
        role="dialog"
        aria-modal="true"
        aria-label="Navigație rapidă"
      >
        <div className="gf-fast-access__head">
          <p>Acces rapid</p>
          <p>{String(FAST_LINKS.length).padStart(2, '0')} destinații</p>
        </div>
        <nav aria-label="Toate destinațiile">
          {FAST_LINKS.map((item) => {
            const content = (
              <>
              <span>{item.index}</span>
              <strong>{item.label}</strong>
              <small>{item.detail}</small>
              </>
            );
            const sharedProps = {
              'data-current': item.to === '/'
                ? location.pathname === '/' || undefined
                : (!item.to.startsWith('mailto:') && location.pathname.startsWith(item.to)) || undefined,
              onClick: () => setOpen(false),
              tabIndex: open ? 0 : -1,
            };

            return item.to.startsWith('mailto:') ? (
              <a key={item.to} href={item.to} {...sharedProps}>{content}</a>
            ) : (
              <ViewTransitionLink key={item.to} to={item.to} {...sharedProps}>{content}</ViewTransitionLink>
            );
          })}
        </nav>
      </div>
    </>
  );
}
