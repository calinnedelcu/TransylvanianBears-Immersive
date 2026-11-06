import { useEffect, useRef, type CSSProperties } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { mailto } from '../data';
import { pathIn, useContent } from '../i18n/useContent';
import { useActiveSection } from '../hooks/useActiveSection';
import { PawMark } from './PawMark';
import './Header.css';

export function Header() {
  const { pathname, hash } = useLocation();
  const { NAV, SITE, UI, lang, path } = useContent();
  const SECTION_IDS = NAV.map((item) => item.id);
  const home = path('/');
  const onHome = pathname === home;
  const inProject = pathname.includes('/work/');
  const other = lang === 'ro' ? 'en' : 'ro';
  const active = useActiveSection(SECTION_IDS, onHome);
  const menuRef = useRef<HTMLDialogElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const openMenu = () => menuRef.current?.showModal();
  const closeMenu = () => menuRef.current?.close();

  // A page change always closes the menu.
  useEffect(() => {
    const menu = menuRef.current;
    if (menu?.open) menu.close();
  }, [pathname]);

  return (
    <header className="site-header">
      <a className="skip-link" href="#continut">
        {UI.skipToContent}
      </a>

      <div className="site-header__bar wrap">
        <Link className="brand" to={home} aria-label={`${SITE.name} — ${UI.homeLabel}`}>
          <span className="brand__mark">
            <PawMark />
          </span>
          <span className="brand__name">{SITE.name}</span>
        </Link>

        <nav className="site-nav" aria-label={UI.mainNav}>
          {NAV.map((item) => {
            const isActive = active === item.id || (inProject && item.id === 'proiecte');
            return (
              <Link
                key={item.id}
                to={{ pathname: home, hash: `#${item.id}` }}
                data-active={isActive || undefined}
                aria-current={active === item.id ? 'location' : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Link
          className="lang-switch"
          to={{ pathname: pathIn(other, pathname), hash }}
          hrefLang={other}
          lang={other}
          aria-label={UI.switchTo}
          title={UI.switchTo}
        >
          {UI.switchToShort}
        </Link>

        <a className="btn btn--gold btn--sm site-header__cta" href={mailto()}>
          {UI.writeToUs}
          <ArrowUpRight aria-hidden="true" />
        </a>

        <button
          ref={toggleRef}
          type="button"
          className="menu-toggle"
          aria-haspopup="dialog"
          aria-label={UI.openMenu}
          onClick={openMenu}
        >
          <Menu aria-hidden="true" />
        </button>
      </div>

      <dialog
        ref={menuRef}
        className="menu surface-ink"
        aria-label={UI.menu}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeMenu();
        }}
        onClose={() => toggleRef.current?.focus()}
      >
        <div className="menu__top wrap">
          <span className="brand">
            <span className="brand__mark">
              <PawMark />
            </span>
            <span className="brand__name">{SITE.name}</span>
          </span>
          <button type="button" className="menu-toggle menu-toggle--close" aria-label={UI.closeMenu} onClick={closeMenu}>
            <X aria-hidden="true" />
          </button>
        </div>

        <nav className="menu__links wrap" aria-label={UI.mainMenu}>
          {NAV.map((item, index) => (
            <Link
              key={item.id}
              to={{ pathname: home, hash: `#${item.id}` }}
              onClick={closeMenu}
              style={{ '--i': index } as CSSProperties}
            >
              <span className="eyebrow">{String(index + 1).padStart(2, '0')}</span>
              <span className="menu__label">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="menu__foot wrap">
          <a className="btn btn--gold" href={mailto()}>
            {UI.writeToUs}
            <ArrowUpRight aria-hidden="true" />
          </a>
          <p className="eyebrow">
            {SITE.school} / {SITE.city}
          </p>
        </div>
      </dialog>
    </header>
  );
}
