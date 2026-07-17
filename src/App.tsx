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
    const confirmations: number[] = [];
    const deadline = window.performance.now() + 15_000;

    const scrollToTarget = (target: HTMLElement) => {
      if (lenis) lenis.scrollTo(target, { immediate: true, force: true });
      else target.scrollIntoView({ block: 'start' });
    };

    const move = () => {
      if (hash) {
        if (window.location.hash !== hash) return;
        const target = document.getElementById(hash.slice(1));
        if (!target && window.performance.now() < deadline) {
          frame = window.requestAnimationFrame(move);
          return;
        }
        if (target) {
          scrollToTarget(target);
          [240, 820].forEach((delay) => {
            confirmations.push(window.setTimeout(() => {
              if (window.location.hash !== hash) return;
              const currentTarget = document.getElementById(hash.slice(1));
              if (!currentTarget) return;
              const scrollPaddingTop = Number.parseFloat(
                window.getComputedStyle(document.documentElement).scrollPaddingTop,
              ) || 0;
              const distance = Math.abs(currentTarget.getBoundingClientRect().top - scrollPaddingTop);
              if (distance > 2) scrollToTarget(currentTarget);
            }, delay));
          });
        }
        return;
      }

      if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
      else window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    };

    frame = window.requestAnimationFrame(move);
    return () => {
      window.cancelAnimationFrame(frame);
      confirmations.forEach((timer) => window.clearTimeout(timer));
    };
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
