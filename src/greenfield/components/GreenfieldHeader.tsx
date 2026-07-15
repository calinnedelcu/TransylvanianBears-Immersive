import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Link, NavLink, useLocation } from 'react-router-dom';

const FAST_LINKS = [
  { index: '00', label: 'Story', detail: 'Immersive home', to: '/next' },
  { index: '01', label: 'Work', detail: '6 case studies', to: '/next/work' },
  { index: '02', label: 'Echipa', detail: '6 disciplines', to: '/next/team' },
  { index: '03', label: 'Arhivă', detail: 'Results & evidence', to: '/next/archive' },
  { index: '04', label: 'Contact', detail: 'Open signal', to: '/next#join' },
] as const;

export function GreenfieldHeader() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.documentElement.style.overflow;
    const inertTargets = Array.from(
      document.querySelectorAll<HTMLElement>('.gf-story, .gf-page__main, .gf-footer, .gf-progress'),
    );
    document.documentElement.style.overflow = 'hidden';
    inertTargets.forEach((target) => { target.inert = true; });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.documentElement.style.overflow = previousOverflow;
      inertTargets.forEach((target) => { target.inert = false; });
    };
  }, [open]);

  return (
    <>
      <header className="gf-header" data-menu-open={open || undefined}>
        <Link className="gf-brand" to="/next" aria-label="Transylvanian Bears, pagina principală" tabIndex={open ? -1 : undefined}>
          <span className="gf-mark" aria-hidden="true">
            <span />
          </span>
          <span className="gf-brand__name">Transylvanian Bears</span>
        </Link>

        <nav className="gf-header__links" aria-label="Navigație principală">
          <NavLink to="/next/work" tabIndex={open ? -1 : undefined}>Work</NavLink>
          <NavLink to="/next/team" tabIndex={open ? -1 : undefined}>Echipa</NavLink>
          <NavLink to="/next/archive" tabIndex={open ? -1 : undefined}>Arhivă</NavLink>
        </nav>

        <button
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

      <div id="gf-fast-access" className="gf-fast-access" data-open={open || undefined} aria-hidden={!open}>
        <div className="gf-fast-access__head">
          <p>Fast access</p>
          <p>{String(FAST_LINKS.length).padStart(2, '0')} destinations</p>
        </div>
        <nav aria-label="Toate destinațiile">
          {FAST_LINKS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              data-current={
                item.to === '/next'
                  ? location.pathname === '/next' || undefined
                  : location.pathname.startsWith(item.to.split('#')[0]) || undefined
              }
              onClick={() => setOpen(false)}
              tabIndex={open ? 0 : -1}
            >
              <span>{item.index}</span>
              <strong>{item.label}</strong>
              <small>{item.detail}</small>
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
