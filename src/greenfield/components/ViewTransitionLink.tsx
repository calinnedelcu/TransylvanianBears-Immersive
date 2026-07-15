import { flushSync } from 'react-dom';
import {
  Link,
  useNavigate,
  type LinkProps,
  type NavigateOptions,
  type To,
} from 'react-router-dom';
import type { MouseEvent } from 'react';

type ViewTransitionLinkProps = LinkProps & {
  transitionKind?: 'page' | 'project';
};

type TransitionDocument = Document & {
  startViewTransition?: (callback: () => void | Promise<void>) => {
    finished: Promise<void>;
    skipTransition: () => void;
  };
};

function canIntercept(event: MouseEvent<HTMLAnchorElement>, target?: string) {
  return event.button === 0
    && (!target || target === '_self')
    && !event.metaKey
    && !event.altKey
    && !event.ctrlKey
    && !event.shiftKey;
}

function waitForRouteReady() {
  return new Promise<void>((resolve) => {
    const startedAt = performance.now();
    const check = () => {
      const loading = document.querySelector('.greenfield-route-loading');
      if (!loading || performance.now() - startedAt > 1600) {
        window.setTimeout(resolve, 32);
        return;
      }
      window.setTimeout(check, 16);
    };
    check();
  });
}

export function ViewTransitionLink({
  to,
  replace,
  state,
  preventScrollReset,
  relative,
  target,
  onClick,
  transitionKind = 'page',
  ...props
}: ViewTransitionLinkProps) {
  const navigate = useNavigate();

  const navigateTo = (destination: To) => {
    const options: NavigateOptions = { replace, state, preventScrollReset, relative };
    navigate(destination, options);
  };

  return (
    <Link
      {...props}
      to={to}
      target={target}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || !canIntercept(event, target)) return;

        const transitionDocument = document as TransitionDocument;
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!transitionDocument.startViewTransition || reducedMotion) return;

        event.preventDefault();
        document.documentElement.dataset.viewTransition = transitionKind;
        const transition = transitionDocument.startViewTransition(async () => {
          flushSync(() => navigateTo(to));
          await waitForRouteReady();
        });
        transition.finished.finally(() => {
          delete document.documentElement.dataset.viewTransition;
        });
      }}
    />
  );
}
