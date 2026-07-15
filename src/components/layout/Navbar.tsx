import { useEffect, useRef, useState } from 'react';
import { Menu, X, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import { LanguageToggle } from './LanguageToggle';
import { fireLogoTripleClick } from '../easter/LogoTripleClickEgg';

// href = anchor scroll on homepage | to = dedicated page route
const NAV_KEYS = [
  { to: '/despre',     key: 'nav.about' },
  { to: '/echipa',     key: 'nav.members' },
  { to: '/premii',     key: 'nav.achievements' },
  { to: '/proiecte',   key: 'nav.projects' },
  { to: '/aplica',     key: 'nav.join' },
] as const;

type NavItem = (typeof NAV_KEYS)[number];

type BreadcrumbSegment = {
  label: string;
  to?: string;
};

type NavbarProps = {
  memberSlug?: string;
  memberName?: string;
  breadcrumbs?: BreadcrumbSegment[];
};

export function Navbar({ memberSlug, memberName, breadcrumbs }: NavbarProps = {}) {
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const clickTrackerRef = useRef<{ count: number; timer: number | null }>({ count: 0, timer: null });

  const onLogoClick = () => {
    const tracker = clickTrackerRef.current;
    tracker.count += 1;
    if (tracker.timer !== null) window.clearTimeout(tracker.timer);
    if (tracker.count >= 3) {
      tracker.count = 0;
      tracker.timer = null;
      fireLogoTripleClick();
      return;
    }
    tracker.timer = window.setTimeout(() => {
      tracker.count = 0;
      tracker.timer = null;
    }, 500);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const linkClass = "font-sans text-sm uppercase tracking-widest text-bear-bone/70 hover:text-bear-gold transition-colors";
  const mobileLinkClass = "block font-display text-3xl text-bear-bone hover:text-bear-gold py-4 border-b border-bear-burgundy/20 transition-colors";

  function NavLink({ item, mobile }: { item: NavItem; mobile?: boolean }) {
    const cls = mobile ? mobileLinkClass : linkClass;
    return (
      <Link to={item.to} className={cls} onClick={() => setOpen(false)}>
        {t(item.key)}
      </Link>
    );
  }

  return (
    <header
      className={cn(
        'fixed top-0 inset-x-0 z-50 transition-all duration-300',
        scrolled
          ? 'backdrop-blur-md bg-bear-night/70 border-b border-bear-burgundy/20'
          : 'bg-transparent',
      )}
    >
      <nav
        aria-label="Primary"
        className="container-tb flex items-center justify-between h-16 md:h-20"
      >
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-3 group" onClick={onLogoClick}>
            <img
              src="/assets/logo.webp"
              alt="TransylvanianBears"
              className="w-10 h-10 rounded-lg ring-1 ring-bear-gold/30 group-hover:ring-bear-gold/70 transition-all"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
              }}
            />
            <span className="font-display text-lg md:text-xl text-bear-bone tracking-wide group-hover:text-bear-gold transition-colors">
              TransylvanianBears
            </span>
          </Link>
          {breadcrumbs && breadcrumbs.length > 0 && (
            <div className="hidden sm:flex items-center gap-2">
              {breadcrumbs.map((seg, i) => (
                <div key={i} className="flex items-center gap-2">
                  <ChevronRight size={14} className="text-bear-gold/35" />
                  {seg.to ? (
                    <Link
                      to={seg.to}
                      className="font-mono text-[11px] uppercase tracking-[0.28em] text-bear-gold/60 hover:text-bear-gold/90 transition-colors tabular"
                    >
                      {seg.label}
                    </Link>
                  ) : (
                    <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-bear-gold/80 tabular">
                      {seg.label}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          {!breadcrumbs && memberSlug && memberName && (
            <div className="hidden sm:flex items-center gap-2">
              <ChevronRight size={14} className="text-bear-gold/35" />
              <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-bear-gold/80 tabular">
                {memberSlug}
              </span>
            </div>
          )}
        </div>

        {/* Desktop nav */}
        <ul className="hidden md:flex items-center gap-8">
          {NAV_KEYS.map((link) => (
            <li key={link.to}>
              <NavLink item={link} />
            </li>
          ))}
          <li className="ml-4 pl-6 border-l border-bear-burgundy/40">
            <LanguageToggle />
          </li>
        </ul>

        {/* Mobile burger */}
        <button
          type="button"
          aria-label={open ? t('common.menuClose') : t('common.menuOpen')}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="md:hidden text-bear-bone hover:text-bear-gold transition-colors p-2 -mr-2"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div
          className="md:hidden fixed inset-0 top-16 bg-bear-night/95 backdrop-blur-lg z-40"
          onClick={() => setOpen(false)}
        >
          <ul className="container-tb flex flex-col gap-2 pt-8">
            {NAV_KEYS.map((link) => (
              <li key={link.to}>
                <NavLink item={link} mobile />
              </li>
            ))}
            <li className="pt-8">
              <LanguageToggle />
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
