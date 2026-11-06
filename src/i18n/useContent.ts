import { useLocation } from 'react-router-dom';
import { CONTENT, type Lang } from './content';

export const langOf = (pathname: string): Lang => (pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'ro');

/** The same page in the other language: /work/aegis ↔ /en/work/aegis. */
export function pathIn(lang: Lang, pathname: string) {
  const bare = langOf(pathname) === 'en' ? pathname.replace(/^\/en/, '') || '/' : pathname;
  return CONTENT[lang].path(bare);
}

/** Texts and data in the language of the current URL. */
export function useContent() {
  const { pathname } = useLocation();
  return CONTENT[langOf(pathname)];
}
