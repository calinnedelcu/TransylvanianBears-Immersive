import { Github, Instagram, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GarlicFriend } from './GarlicFriend';

const NAV_KEYS = [
  { href: '#about', key: 'nav.about' },
  { href: '#members', key: 'nav.members' },
  { href: '#achievements', key: 'nav.achievements' },
  { href: '#projects', key: 'nav.projects' },
  { href: '#join', key: 'nav.join' },
] as const;

const SOCIAL = [
  { href: 'https://github.com/transylvanian-bears', label: 'GitHub', icon: Github },
  { href: 'https://instagram.com/transylvanianbears', label: 'Instagram', icon: Instagram },
  { href: '#', label: 'Discord', icon: MessageCircle },
];

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="relative bg-bear-wine border-t border-bear-burgundy/30 mt-0 overflow-hidden">
      {/* Thin gold seam — visual handoff from JoinUs */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-bear-gold/45 to-transparent"
      />

      {/* Slow-rotating brand medallion in the right gutter */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 top-1/2 -translate-y-1/2 w-[420px] h-[420px] opacity-[0.06]"
      >
        <img
          src="/assets/tb-medallion.webp"
          alt=""
          aria-hidden="true"
          draggable={false}
          className="w-full h-full select-none"
          style={{ animation: 'medallionTurn 180s linear infinite' }}
        />
      </div>

      {/* The vampire-bear's garlic companion — hangs near the medallion */}
      <GarlicFriend />

      <div className="container-wide py-20 grid gap-14 md:grid-cols-12 relative">
        <div className="md:col-span-5 space-y-4">
          <Link to="/" className="flex items-center gap-3 group w-fit">
            <img
              src="/assets/logo.webp"
              alt="TransylvanianBears"
              className="w-12 h-12 rounded-lg ring-1 ring-bear-gold/30 group-hover:ring-bear-gold/60 transition-all"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
              }}
            />
            <span className="font-display text-xl tracking-tight text-bear-bone group-hover:text-bear-gold transition-colors">
              TransylvanianBears
            </span>
          </Link>
          <p className="text-base text-bear-bone/65 max-w-sm leading-relaxed">
            {t('footer.tagline')}
          </p>
        </div>

        <nav aria-label={t('footer.sitemap')} className="md:col-span-4">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.32em] text-bear-gold/85 mb-5 tabular">
            {t('footer.sitemap')}
          </h3>
          <ul className="space-y-2.5">
            {NAV_KEYS.map((link, i) => (
              <li key={link.href} className="flex items-baseline gap-3">
                <span className="font-mono text-[9px] tracking-[0.28em] text-bear-gold/45 tabular w-6">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <a
                  href={link.href}
                  className="text-sm text-bear-bone/75 hover:text-bear-gold transition-colors"
                >
                  {t(link.key)}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="md:col-span-3">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.32em] text-bear-gold/85 mb-5 tabular">
            {t('footer.findUs')}
          </h3>
          <ul className="flex items-center gap-3">
            {SOCIAL.map(({ href, label, icon: Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="grid place-items-center w-11 h-11 rounded-full border border-bear-burgundy/40 text-bear-bone/70 hover:text-bear-gold hover:border-bear-gold/60 transition-all hover:-translate-y-0.5"
                >
                  <Icon size={18} />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-bear-burgundy/20 relative">
        <p className="container-wide py-6 text-xs text-bear-bone/50 font-mono tabular tracking-wide flex items-center justify-between flex-wrap gap-2">
          <span>{t('footer.credit', { year: new Date().getFullYear() })}</span>
          <span className="text-bear-gold/45">{t('footer.motto')}</span>
        </p>
      </div>
    </footer>
  );
}
