import type { CSSProperties, ElementType, ReactNode } from 'react';
import { useReveal } from '../hooks/useReveal';

type RevealProps = {
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  /** Stagger in milliseconds. */
  delay?: number;
  children: ReactNode;
};

/** Fades and lifts its content in the first time it enters the viewport. */
export function Reveal({ as: Tag = 'div', className = '', style, delay = 0, children }: RevealProps) {
  const ref = useReveal<HTMLElement>();
  const merged = delay ? ({ ...style, '--delay': `${delay}ms` } as CSSProperties) : style;

  return (
    <Tag ref={ref} className={`reveal ${className}`.trim()} style={merged}>
      {children}
    </Tag>
  );
}
