import { Link } from 'react-router-dom';
import { ArrowUp, ArrowUpRight } from 'lucide-react';
import { NAV, SITE, mailto } from '../data';
import { PawMark } from './PawMark';
import './Footer.css';

export function Footer() {
  return (
    <footer className="footer surface-ink">
      <div className="footer__inner wrap">
        <div className="footer__brand">
          <span className="brand">
            <span className="brand__mark">
              <PawMark />
            </span>
            <span className="brand__name">{SITE.name}</span>
          </span>
          <p>Produse, jocuri și cercetare aplicată.</p>
        </div>

        <nav className="footer__nav" aria-label="Navigație secundară">
          <p className="eyebrow">Pe site</p>
          <ul>
            {NAV.map((item) => (
              <li key={item.id}>
                <Link to={{ pathname: '/', hash: `#${item.id}` }}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="footer__contact">
          <p className="eyebrow">Scrie-ne</p>
          <a className="footer__mail" href={mailto()}>
            {SITE.email}
            <ArrowUpRight aria-hidden="true" />
          </a>
        </div>

        <button
          type="button"
          className="footer__top"
          aria-label="Înapoi sus"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <ArrowUp aria-hidden="true" />
        </button>
      </div>

      <div className="footer__wordmark display" aria-hidden="true" data-text={SITE.name} />

      <div className="footer__legal wrap">
        <p className="eyebrow">
          {SITE.school} / {SITE.city}
        </p>
        <p className="eyebrow">© {new Date().getFullYear()} {SITE.name}</p>
      </div>
    </footer>
  );
}
