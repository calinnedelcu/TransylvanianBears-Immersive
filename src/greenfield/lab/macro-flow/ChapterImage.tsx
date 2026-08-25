import { useEffect, useState, type ImgHTMLAttributes } from 'react';
import { chapterIndex, isJourneyChapter, type JourneyChapter } from '../../experience/chapters';

/**
 * Dacă cititorul a ajuns în apropierea unui capitol. O dată adevărat, rămâne.
 *
 * Citește `data-active-chapter` de pe rădăcina poveștii, care e scris deja de
 * regizorul de scroll, deci nu cere niciun prop nou prin cinci componente.
 * Starea nu se întoarce niciodată la fals: o imagine descărcată n-are de ce să
 * fie aruncată dacă cititorul derulează înapoi.
 */
export function useChapterApproach(chapter: JourneyChapter, lead = 1): boolean {
  const [reached, setReached] = useState(false);

  useEffect(() => {
    if (reached) return undefined;
    const root = document.querySelector<HTMLElement>('.mf-lab');
    if (!root) return undefined;

    const target = chapterIndex(chapter) - lead;
    const check = () => {
      const current = root.dataset.activeChapter;
      if (isJourneyChapter(current) && chapterIndex(current) >= target) setReached(true);
    };

    check();
    const observer = new MutationObserver(check);
    observer.observe(root, { attributes: true, attributeFilter: ['data-active-chapter'] });
    return () => observer.disconnect();
  }, [chapter, lead, reached]);

  return reached;
}

type ChapterImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'loading'> & {
  /** Capitolul căruia îi aparține imaginea. */
  chapter: JourneyChapter;
  src: string;
  /** Cu câte capitole înainte se începe descărcarea. */
  lead?: number;
};

/**
 * O imagine care nu are `src` până când capitolul ei nu se apropie.
 *
 * `loading="lazy"` nu era suficient. Pe pagina de start — 45.000px de document,
 * capitol activ `threshold` — **fiecare** imagine cu `src` din tot documentul se
 * descărca într-un singur val de 3ms, la 221ms, inclusiv unele aflate la 17.000
 * și 37.000 de pixeli mai jos. Nu e euristica de lazy care greșește imagine cu
 * imagine: foaia de stil era deja aplicată de 84ms, toate aveau `width`/`height`
 * și `loading="lazy"`, iar tiparul — tot documentul deodată — arată o baleiere a
 * paginii la inițializare, cel mai probabil `ScrollTrigger.refresh()`, care mută
 * poziția de scroll ca să măsoare declanșatoarele fixate.
 *
 * Fix-ul nu depinde de cauză: un `<img>` fără `src` nu poate fi descărcat de
 * nicio baleiere. Atributele de dimensiune rămân, deci cutia e rezervată de la
 * primul layout și nu apare nicio deplasare când imaginea sosește.
 */
export function ChapterImage({ chapter, src, lead = 1, ...rest }: ChapterImageProps) {
  const reached = useChapterApproach(chapter, lead);
  return <img {...rest} src={reached ? src : undefined} loading="lazy" decoding="async" />;
}
