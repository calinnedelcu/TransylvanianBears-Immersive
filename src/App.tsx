import { lazy, Suspense, useEffect } from 'react';
import { useLenis } from 'lenis/react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { SmoothScrollProvider } from './components/SmoothScrollProvider';

const GreenfieldRoutes = lazy(() => import('./greenfield/GreenfieldRoutes'));

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const lenis = useLenis();

  useEffect(() => {
    let frame = 0;
    let attempts = 0;

    const move = () => {
      if (hash) {
        const target = document.getElementById(hash.slice(1));
        if (!target && attempts < 120) {
          attempts += 1;
          frame = window.requestAnimationFrame(move);
          return;
        }
        if (target) {
          if (lenis) lenis.scrollTo(target, { immediate: true });
          else target.scrollIntoView({ block: 'start' });
        }
        return;
      }

      if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
      else window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    };

    frame = window.requestAnimationFrame(move);
    return () => window.cancelAnimationFrame(frame);
  }, [pathname, hash, lenis]);

  return null;
}

function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route
          path="/*"
          element={
            <Suspense fallback={<div className="greenfield-route-loading" aria-label="Se încarcă" />}>
              <GreenfieldRoutes />
            </Suspense>
          }
        />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <SmoothScrollProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </SmoothScrollProvider>
  );
}
