import { useLayoutEffect } from 'react';
import {
  Navigate,
  Outlet,
  RouterProvider,
  ScrollRestoration,
  createBrowserRouter,
  useLocation,
  useParams,
} from 'react-router-dom';
import { memberById } from './data';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProjectPage } from './pages/ProjectPage';

/**
 * `scroll-behavior: smooth` is right for anchors on the same page, but a new page should
 * simply appear at the top. This runs just before <ScrollRestoration /> and switches the
 * glide off for the frame in which the route changes.
 */
function InstantRouteScroll() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.add('is-routing');
    // Browsers pick instant or smooth scrolling from the last computed style, and the router
    // scrolls in this same task: reading the style forces it to be recalculated first.
    void getComputedStyle(root).scrollBehavior;
    // The router scrolls a few milliseconds after it has rendered the page, so hold the
    // override a little longer than a single frame.
    const timer = window.setTimeout(() => root.classList.remove('is-routing'), 300);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return null;
}

function Layout() {
  return (
    <>
      <Header />
      <main id="continut" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
      <InstantRouteScroll />
      <ScrollRestoration />
    </>
  );
}

/** Older addresses (/work, /team, /archive, /echipa …) now point at a section of the home page. */
const toSection = (hash: string) => <Navigate to={{ pathname: '/', hash }} replace />;

function MemberRedirect() {
  const { memberId } = useParams();
  return toSection(memberId && memberById[memberId] ? `#${memberId}` : '#echipa');
}

/** The prototype lived under /next; keep its project links working. */
function PrototypeRedirect() {
  const { pathname, search, hash } = useLocation();
  const target = pathname.replace(/^\/next/, '') || '/';
  return <Navigate to={`${target.startsWith('/lab/') ? '/' : target}${search}${hash}`} replace />;
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'work/:slug', element: <ProjectPage /> },

      { path: 'work', element: toSection('#proiecte') },
      { path: 'proiecte', element: toSection('#proiecte') },
      { path: 'team', element: toSection('#echipa') },
      { path: 'team/:memberId', element: <MemberRedirect /> },
      { path: 'echipa', element: toSection('#echipa') },
      { path: 'echipa/:memberId', element: <MemberRedirect /> },
      { path: 'archive', element: toSection('#rezultate') },
      { path: 'premii', element: toSection('#rezultate') },
      { path: 'aplica', element: toSection('#contact') },
      { path: 'despre', element: toSection('#despre') },
      { path: 'story/*', element: <Navigate to="/" replace /> },
      { path: 'next/*', element: <PrototypeRedirect /> },

      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
