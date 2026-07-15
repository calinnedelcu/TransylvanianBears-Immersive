import { useEffect } from 'react';

export function useGreenfieldMode(title?: string) {
  useEffect(() => {
    document.body.classList.add('gf-mode');
    const previousTitle = document.title;

    if (title) document.title = `${title} | Transylvanian Bears`;

    return () => {
      document.body.classList.remove('gf-mode');
      document.title = previousTitle;
    };
  }, [title]);
}
