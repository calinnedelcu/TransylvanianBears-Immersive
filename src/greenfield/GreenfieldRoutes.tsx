import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';

/**
 * The citadel is the front page and the story is somewhere it sends you.
 *
 * Scrolling the opening ends at the citadel with its index live; it does not
 * pour the reader into sixteen chapters they never asked for. A system is
 * entered by choosing it, which is what an index is for.
 */
const CitadelOpening = lazy(() => import('./lab/hero-plan/HeroPlanPrototype'));
const ImmersiveStory = lazy(() => import('./lab/macro-flow/MacroFlowPrototype'));
const ArchivePage = lazy(() => import('./pages/ArchivePage').then((module) => ({ default: module.ArchivePage })));
const MemberProfilePage = lazy(() => import('./pages/MemberProfilePage').then((module) => ({ default: module.MemberProfilePage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })));
const ProjectCaseStudyPage = lazy(() => import('./pages/ProjectCaseStudyPage').then((module) => ({ default: module.ProjectCaseStudyPage })));
const TeamIndexPage = lazy(() => import('./pages/TeamIndexPage').then((module) => ({ default: module.TeamIndexPage })));
const WorkIndexPage = lazy(() => import('./pages/WorkIndexPage').then((module) => ({ default: module.WorkIndexPage })));

function PageFallback() {
  return <div className="greenfield-route-loading" aria-label="Se încarcă" />;
}

function DeferredPage({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>;
}

function NextRouteRedirect() {
  const location = useLocation();
  const suffix = location.pathname.replace(/^\/next/, '') || '/';
  const target = suffix.startsWith('/lab/') ? '/' : suffix;
  return <Navigate to={`${target}${location.search}${location.hash}`} replace />;
}

function LegacyMemberRedirect() {
  const { memberId } = useParams();
  return <Navigate to={memberId ? `/team/${memberId}` : '/team'} replace />;
}

export default function GreenfieldRoutes() {
  return (
    <Routes>
      <Route
        index
        element={
          <Suspense fallback={<PageFallback />}>
            <CitadelOpening />
          </Suspense>
        }
      />
      <Route
        path="story/:act"
        element={
          <Suspense fallback={<PageFallback />}>
            <ImmersiveStory />
          </Suspense>
        }
      />
      <Route path="story" element={<Navigate to="/story/project-nexus" replace />} />
      <Route path="work" element={<DeferredPage><WorkIndexPage /></DeferredPage>} />
      <Route path="work/:slug" element={<DeferredPage><ProjectCaseStudyPage /></DeferredPage>} />
      <Route path="team" element={<DeferredPage><TeamIndexPage /></DeferredPage>} />
      <Route path="team/:memberId" element={<DeferredPage><MemberProfilePage /></DeferredPage>} />
      <Route path="archive" element={<DeferredPage><ArchivePage /></DeferredPage>} />


      <Route path="next/*" element={<NextRouteRedirect />} />
      <Route path="proiecte" element={<Navigate to="/work" replace />} />
      <Route path="premii" element={<Navigate to="/archive" replace />} />
      <Route path="echipa" element={<Navigate to="/team" replace />} />
      <Route path="echipa/:memberId" element={<LegacyMemberRedirect />} />
      <Route path="despre" element={<Navigate to="/" replace />} />
      <Route path="aplica" element={<Navigate to="/#mf-open-paths" replace />} />
      <Route path="*" element={<DeferredPage><NotFoundPage /></DeferredPage>} />
    </Routes>
  );
}
