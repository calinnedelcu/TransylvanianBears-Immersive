import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { getLenis } from './hooks/useLenis';

const GreenfieldRoutes = lazy(() => import('./greenfield/GreenfieldRoutes'));
const LegacyRoutes = lazy(() => import('./legacy/LegacyRoutes'));

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(0, { immediate: true });
    else {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, [pathname]);

  return null;
}

function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route
          path="/next/*"
          element={
            <Suspense fallback={<div className="greenfield-route-loading" aria-label="Se încarcă" />}>
              <GreenfieldRoutes />
            </Suspense>
          }
        />
        <Route
          path="*"
          element={
            <Suspense fallback={null}>
              <LegacyRoutes />
            </Suspense>
          }
        />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
