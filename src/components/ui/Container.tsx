import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

type ContainerProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  as?: 'div' | 'section' | 'header' | 'footer' | 'nav' | 'main';
};

export function Container({ children, className, as: Tag = 'div', ...rest }: ContainerProps) {
  return (
    <Tag className={cn('container-tb', className)} {...rest}>
      {children}
    </Tag>
  );
}
