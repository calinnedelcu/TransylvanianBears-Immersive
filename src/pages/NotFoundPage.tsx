import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { SITE } from '../data';
import { PawMark } from '../components/PawMark';
import { usePageMeta } from '../hooks/usePageMeta';
import './not-found.css';

export function NotFoundPage() {
  usePageMeta({ title: `Pagina nu există — ${SITE.name}`, path: '/404', noindex: true });

  return (
    <section className="notfound surface-ink grain" aria-labelledby="notfound-title">
      <div className="wrap notfound__inner">
        <p className="notfound__code display" aria-hidden="true">
          <span>4</span>
          <PawMark />
          <span>4</span>
        </p>
        <div className="notfound__copy">
          <p className="eyebrow">Eroare 404</p>
          <h1 id="notfound-title" className="display">
            Drumul acesta nu face parte din sistem.
          </h1>
          <p className="lead">Ruta cerută nu există. Revino pe pagina principală sau deschide direct proiectele.</p>
          <div className="notfound__actions">
            <Link className="btn btn--gold" to="/">
              <ArrowLeft aria-hidden="true" />
              Înapoi acasă
            </Link>
            <Link className="btn btn--bone" to={{ pathname: '/', hash: '#proiecte' }}>
              Vezi proiectele
              <ArrowUpRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
