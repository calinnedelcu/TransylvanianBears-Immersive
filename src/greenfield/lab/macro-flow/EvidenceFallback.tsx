import { EVIDENCE_ARTIFACTS, type EvidenceArtifact } from './evidenceData';

export function EvidenceFallback({ activeId }: { activeId: EvidenceArtifact['id'] }) {
  return (
    <div className="ew-fallback">
      <svg className="ew-fallback__orbit" viewBox="0 0 400 400" aria-hidden="true">
        <circle cx="200" cy="200" r="154" />
        <ellipse cx="200" cy="200" rx="78" ry="154" transform="rotate(35 200 200)" />
        <path d="M80 110 322 163 183 348Z M80 110 200 200 322 163 M200 200 183 348" />
        {EVIDENCE_ARTIFACTS.map((artifact, index) => (
          <circle key={artifact.id} cx={[80, 322, 183][index]} cy={[110, 163, 348][index]}
            r={activeId === artifact.id ? 9 : 4} data-active={activeId === artifact.id || undefined} />
        ))}
        <circle className="ew-fallback__core" cx="200" cy="200" r="18" />
      </svg>
    </div>
  );
}

