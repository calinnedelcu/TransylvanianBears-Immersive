import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { useContent } from '../i18n/useContent';
import { PawMark } from '../components/PawMark';
import { usePageMeta } from '../hooks/usePageMeta';
import './not-found.css';

export function NotFoundPage() {
  const { SITE, UI, path } = useContent();
  usePageMeta({ title: `${UI.notFoundTitle} — ${SITE.name}`, path: '/404', noindex: true });

  return (
    <section className="notfound surface-ink grain" aria-labelledby="notfound-title">
      <div className="wrap notfound__inner">
        <p className="notfound__code display" aria-hidden="true">
          <span>4</span>
          <PawMark />
          <span>4</span>
        </p>
        <div className="notfound__copy">
          <p className="eyebrow">{UI.error404}</p>
          <h1 id="notfound-title" className="display">
            {UI.notFoundHeading}
          </h1>
          <p className="lead">{UI.notFoundLead}</p>
          <div className="notfound__actions">
            <Link className="btn btn--gold" to={path('/')}>
              <ArrowLeft aria-hidden="true" />
              {UI.backHome}
            </Link>
            <Link className="btn btn--bone" to={{ pathname: path('/'), hash: '#proiecte' }}>
              {UI.seeProjects}
              <ArrowUpRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
