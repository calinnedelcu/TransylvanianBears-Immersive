import { useEffect } from 'react';
import { CONTENT, LANGS } from '../i18n/content';
import { useContent } from '../i18n/useContent';

type PageMeta = {
  title: string;
  description?: string;
  /** Path used for the canonical URL, e.g. "/work/aegis" (without the language prefix). */
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

/** One <link rel="alternate" hreflang> per language, plus x-default (Romanian). */
function upsertAlternates(path: string | null) {
  document.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((element) => element.remove());
  if (path === null) return;
  const entries: [string, string][] = [
    ...LANGS.map((lang) => [lang, CONTENT[lang].path(path)] as [string, string]),
    ['x-default', CONTENT.ro.path(path)],
  ];
  for (const [hreflang, href] of entries) {
    const element = document.createElement('link');
    element.rel = 'alternate';
    element.hreflang = hreflang;
    element.href = `${CONTENT.ro.SITE.url}${href}`;
    document.head.appendChild(element);
  }
}

/** Keeps the document title, language and the SEO / social tags in sync with the current page. */
export function usePageMeta({ title, description, path = '/', image, noindex }: PageMeta) {
  const { SITE, lang, path: localize } = useContent();
  description ??= SITE.defaultDescription;

  useEffect(() => {
    const url = `${SITE.url}${localize(path)}`;
    document.documentElement.lang = lang;
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
    upsertAlternates(noindex ? null : path);
    upsertMeta('property', 'og:locale', lang === 'en' ? 'en_GB' : 'ro_RO');

    if (noindex) upsertMeta('name', 'robots', 'noindex');
    else removeMeta('name', 'robots');
  }, [title, description, path, image, noindex, lang, localize, SITE]);
}
