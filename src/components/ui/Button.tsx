import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

type Variant = 'primary' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg';

const VARIANT_STYLES: Record<Variant, string> = {
  primary:
    'bg-gradient-gold text-bear-night shadow-burgundy hover:shadow-burgundy-lg hover:scale-[1.03] active:scale-[0.98]',
  ghost:
    'bg-bear-burgundy/0 text-bear-bone hover:bg-bear-burgundy/30 hover:text-bear-gold',
  outline:
    'border border-bear-gold/60 text-bear-gold hover:bg-bear-gold/10 hover:border-bear-gold',
};

const SIZE_STYLES: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-6 text-base',
  lg: 'h-14 px-8 text-lg',
};

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-full font-sans font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bear-gold focus-visible:ring-offset-2 focus-visible:ring-offset-bear-night disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100';

type CommonProps = {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  className?: string;
};

type ButtonAsButton = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

type ButtonAsAnchor = CommonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

export type ButtonProps = ButtonAsButton | ButtonAsAnchor;

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: ButtonProps) {
  const classes = cn(BASE, VARIANT_STYLES[variant], SIZE_STYLES[size], className);

  if ('href' in rest && rest.href !== undefined) {
    return (
      <a className={classes} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {children}
      </a>
    );
  }

  return (
    <button className={classes} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
}
