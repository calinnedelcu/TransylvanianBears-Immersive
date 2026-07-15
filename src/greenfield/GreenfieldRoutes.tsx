import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { GreenfieldApp } from './GreenfieldApp';
import { ArchivePage } from './pages/ArchivePage';
import { MemberProfilePage } from './pages/MemberProfilePage';
import { ProjectCaseStudyPage } from './pages/ProjectCaseStudyPage';
import { TeamIndexPage } from './pages/TeamIndexPage';
import { WorkIndexPage } from './pages/WorkIndexPage';

const ControlLoopPrototype = lazy(() => import('./lab/control-loop/ControlLoopPrototype'));
const MacroFlowPrototype = lazy(() => import('./lab/macro-flow/MacroFlowPrototype'));

export default function GreenfieldRoutes() {
  return (
    <Routes>
      <Route index element={<GreenfieldApp />} />
      <Route path="work" element={<WorkIndexPage />} />
      <Route path="work/:slug" element={<ProjectCaseStudyPage />} />
      <Route path="team" element={<TeamIndexPage />} />
      <Route path="team/:memberId" element={<MemberProfilePage />} />
      <Route path="archive" element={<ArchivePage />} />
      <Route
        path="lab/control-loop"
        element={
          <Suspense fallback={<div className="greenfield-route-loading" aria-label="Se incarca" />}>
            <ControlLoopPrototype />
          </Suspense>
        }
      />
      <Route
        path="lab/macro-flow"
        element={
          <Suspense fallback={<div className="greenfield-route-loading" aria-label="Se incarca" />}>
            <MacroFlowPrototype />
          </Suspense>
        }
      />
      <Route path="*" element={<Navigate to="/next" replace />} />
    </Routes>
  );
}
