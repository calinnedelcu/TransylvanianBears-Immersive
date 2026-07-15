import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_URL = 'https://www.transylvanianbears.com';
const DEFAULT_DESCRIPTION = 'Transylvanian Bears construiește produse software, jocuri și cercetare aplicată la C.N.I. Tudor Vianu din București.';

type GreenfieldMetadata = {
  title: string;
  description?: string;
  absoluteTitle?: boolean;
  noIndex?: boolean;
};

function ensureMeta(attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

function ensureCanonical(href: string) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!element) {
    element = document.createElement('link');
    element.rel = 'canonical';
    document.head.appendChild(element);
  }
  element.href = href;
}

export function useGreenfieldMode(metadata?: string | GreenfieldMetadata) {
  const { pathname } = useLocation();
  const config = typeof metadata === 'string' ? { title: metadata } : metadata;
  const pageTitle = config?.title;
  const description = config?.description;
  const absoluteTitle = config?.absoluteTitle;
  const noIndex = config?.noIndex;

  useEffect(() => {
    document.body.classList.add('gf-mode');
    if (!pageTitle) return () => document.body.classList.remove('gf-mode');

    const title = absoluteTitle ? pageTitle : `${pageTitle} | Transylvanian Bears`;
    const summary = description ?? DEFAULT_DESCRIPTION;
    const canonicalPath = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
    const canonical = `${SITE_URL}${canonicalPath}`;

    document.title = title;
    ensureCanonical(canonical);
    ensureMeta('name', 'description', summary);
    ensureMeta('name', 'robots', noIndex ? 'noindex, nofollow' : 'index, follow');
    ensureMeta('property', 'og:title', title);
    ensureMeta('property', 'og:description', summary);
    ensureMeta('property', 'og:url', canonical);
    ensureMeta('name', 'twitter:title', title);
    ensureMeta('name', 'twitter:description', summary);

    return () => {
      document.body.classList.remove('gf-mode');
    };
  }, [absoluteTitle, description, noIndex, pageTitle, pathname]);
}
