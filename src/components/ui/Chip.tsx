import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

type Variant = 'default' | 'gold' | 'outline';
type Size = 'sm' | 'md';

const VARIANTS: Record<Variant, string> = {
  default: 'bg-bear-burgundy/30 text-bear-bone border border-bear-burgundy/40',
  gold: 'bg-bear-gold/15 text-bear-goldlight border border-bear-gold/40',
  outline: 'bg-transparent text-bear-bone/80 border border-bear-bone/20',
};

const SIZES: Record<Size, string> = {
  sm: 'h-6 px-2.5 text-[10px]',
  md: 'h-7 px-3 text-xs',
};

type ChipProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
};

export function Chip({
  variant = 'default',
  size = 'md',
  className,
  children,
  ...rest
}: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-mono uppercase tracking-wider whitespace-nowrap',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
