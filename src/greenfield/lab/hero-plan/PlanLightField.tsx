import { useId } from 'react';

// Fixed geometry: pointer and ambient motion are composited by CSS, not redrawn.
const FILAMENTS = Array.from({ length: 48 }, (_, i) => (
  `M-140 ${804 + i * 6} C180 ${662 + i * 4} 430 ${1100 - i * 2} 770 ${820 - i * 6}
   S1090 ${62 - i * 3} 1760 ${124 + i * 4}`
));

export function PlanLightField() {
  const id = useId();
  return (
    <svg className="hp-light-field" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-ink`} x1="0" y1="1" x2="1" y2="0">
          <stop stopColor="#529cad" stopOpacity=".05" />
          <stop offset=".25" stopColor="#8fd8d7" stopOpacity=".55" />
          <stop offset=".49" stopColor="#426a85" stopOpacity=".12" />
          <stop offset=".73" stopColor="#a9cbe0" stopOpacity=".38" />
          <stop offset="1" stopColor="#dfbd8a" stopOpacity=".6" />
        </linearGradient>
        <linearGradient id={`${id}-edge`} x1="0" y1="1" x2="1" y2="0">
          <stop stopColor="#7dddd7" stopOpacity="0" />
          <stop offset=".24" stopColor="#7dddd7" stopOpacity=".72" />
          <stop offset=".52" stopColor="#7dddd7" stopOpacity="0" />
          <stop offset=".8" stopColor="#e4c38f" stopOpacity=".8" />
          <stop offset="1" stopColor="#e4c38f" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g className="hp-light-field__ribbon" fill="none" stroke={`url(#${id}-ink)`} strokeWidth=".8">
        {FILAMENTS.map((d, i) => <path key={i} d={d} />)}
        <path className="hp-light-field__edge" d={FILAMENTS[7]} stroke={`url(#${id}-edge)`} strokeWidth="1.4" />
        <path className="hp-light-field__edge" d={FILAMENTS[36]} stroke={`url(#${id}-edge)`} strokeWidth="1.2" />
      </g>
      <g className="hp-light-field__echo" fill="none" stroke={`url(#${id}-ink)`} strokeWidth=".65">
        {Array.from({ length: 22 }, (_, i) => (
          <path key={i} d={`M-120 ${196 + i * 7} C230 ${442 + i * 2} 488 ${-190 + i * 5} 1020 ${-155 + i * 2}`} />
        ))}
      </g>
    </svg>
  );
}
