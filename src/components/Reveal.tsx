import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from 'react';
import { useReveal } from '../hooks/useReveal';

type RevealProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  /** Stagger in milliseconds. */
  delay?: number;
  children: ReactNode;
  /** Other attributes (data-station, ids …) are passed on to the element. */
  [data: `data-${string}`]: string | number | undefined;
};

/** Fades and lifts its content in the first time it enters the viewport. */
export function Reveal({ as: Tag = 'div', className = '', style, delay = 0, children, ...rest }: RevealProps) {
  const ref = useReveal<HTMLElement>();
  const merged = delay ? ({ ...style, '--delay': `${delay}ms` } as CSSProperties) : style;

  return (
    <Tag ref={ref} className={`reveal ${className}`.trim()} style={merged} {...rest}>
      {children}
    </Tag>
  );
}
