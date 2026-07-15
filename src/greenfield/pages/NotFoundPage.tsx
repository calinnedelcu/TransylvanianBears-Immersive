import { ArrowLeft, Waypoints } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GreenfieldPageShell } from '../components/GreenfieldPageShell';

export function NotFoundPage() {
  return (
    <GreenfieldPageShell
      title="Pagina nu există"
      description="Ruta cerută nu există în experiența Transylvanian Bears."
      noIndex
    >
      <section className="gf-not-found" aria-labelledby="not-found-title">
        <div className="gf-not-found__signal" aria-hidden="true">
          <span>4</span><i /><span>4</span>
        </div>
        <div>
          <p className="gf-page-kicker">Signal lost / 404</p>
          <h1 id="not-found-title">Drumul acesta nu face parte din sistem.</h1>
          <p>Poți reveni în experiență sau poți deschide direct indexul proiectelor.</p>
          <nav aria-label="Ieșiri din pagina 404">
            <Link to="/"><ArrowLeft aria-hidden="true" /> Înapoi în experiență</Link>
            <Link to="/work">Index proiecte <Waypoints aria-hidden="true" /></Link>
          </nav>
        </div>
      </section>
    </GreenfieldPageShell>
  );
}
