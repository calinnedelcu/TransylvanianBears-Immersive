import { useEffect } from 'react';
import { SITE } from '../data';

type PageMeta = {
  title: string;
  description?: string;
  /** Path used for the canonical URL, e.g. "/work/aegis". */
  path?: string;
  /** Absolute or root-relative image used for social previews. */
  image?: string;
  noindex?: boolean;
};

function upsertMeta(attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function removeMeta(attribute: 'name' | 'property', key: string) {
  document.head.querySelector(`meta[${attribute}="${key}"]`)?.remove();
}

function upsertCanonical(href: string) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!element) {
    element = document.createElement('link');
    element.rel = 'canonical';
    document.head.appendChild(element);
  }
  element.href = href;
}

/** Keeps the document title and the SEO / social tags in sync with the current page. */
export function usePageMeta({ title, description = SITE.defaultDescription, path = '/', image, noindex }: PageMeta) {
  useEffect(() => {
    const url = `${SITE.url}${path === '/' ? '/' : path}`;
    const imageUrl = image ? (image.startsWith('http') ? image : `${SITE.url}${image}`) : `${SITE.url}/og-image.jpg`;

    document.title = title;
    upsertMeta('name', 'description', description);
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:image', imageUrl);
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', imageUrl);
    upsertCanonical(url);

    if (noindex) upsertMeta('name', 'robots', 'noindex');
    else removeMeta('name', 'robots');
  }, [title, description, path, image, noindex]);
}
