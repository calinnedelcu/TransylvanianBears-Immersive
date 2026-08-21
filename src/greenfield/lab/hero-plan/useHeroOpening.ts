import { useEffect, useRef, useState } from 'react';

/**
 * The state the opening shares with its 3D scene.
 *
 * It lives in a hook because the drawing is DOM and the citadel is in a canvas:
 * they are different React trees and can only meet at a common parent. On the
 * lab page that parent is the page; in the story it is the whole experience.
 */

export type PlanFrame = { cx: number; cy: number; radius: number };

export function useHeroOpening() {
  const planRef = useRef<HTMLDivElement>(null);
  // Unde sta desenul pe ecran. Scena 3D isi deriva pozitia camerei din asta,
  // ca modelul sa aterizeze exact peste plan la orice latime.
  const planFrameRef = useRef<PlanFrame | null>(null);

  /**
   * Which system the pointer is over, and nothing more.
   *
   * There used to be a chosen system as well, kept apart from the hovered one
   * because merging them made the labels unusable: the camera walked to whatever
   * was chosen and the labels were projected from that camera, so hovering sent a
   * label out from under the cursor and ended its own hover. Choosing is gone with
   * the index it belonged to - the story is one scroll now - and what survives is
   * the drawing lighting a system up as you pass over it.
   */
  const [hoverSlug, setHoverSlug] = useState<string | null>(null);
  const activeSlug = hoverSlug;

  useEffect(() => {
    const measure = () => {
      const node = planRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      planFrameRef.current = {
        cx: rect.left + rect.width / 2,
        cy: rect.top + rect.height / 2,
        // Inelul are raza 300 intr-un viewBox de 920.
        radius: (300 / 920) * rect.width,
      };
    };

    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, { passive: true });
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure);
    };
  }, []);

  /**
   * Unde e pointerul în deschidere, ca -1..1 pe ambele axe.
   *
   * Scris pe secțiune, nu pe rădăcină, fiindcă valoarea e folosită numai de
   * lucruri care trăiesc sub `.hp-opening` și trebuie să moară odată cu ea. Se
   * scrie o singură dată pe frame: pointermove poate ajunge la 120Hz pe
   * trackpad, iar două scrieri de custom property în același frame înseamnă un
   * recalc de stil aruncat.
   *
   * Numai pentru dispozitive cu pointer fin. Pe touch, `pointermove` vine doar
   * în timpul unui drag, deci desenul s-ar înclina la scroll și ar rămâne strâmb.
   */
  useEffect(() => {
    const frame = planRef.current?.closest<HTMLElement>('.hp-opening');
    if (!frame) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Reticulul înlocuiește cursorul de sistem, deci desenul lui trebuie să fie
    // pornit înainte ca `cursor: none` să aibă efect — altfel există un frame în
    // care nu se vede niciun cursor.
    frame.dataset.reticle = 'on';

    let queued = 0;
    let targetX = 0;
    let targetY = 0;
    let px = 0;
    let py = 0;
    // Poziția în pixeli: exactă pentru firul reticulului, urmărită pentru inel.
    let cursorX = -200;
    let cursorY = -200;
    let ringX = -200;
    let ringY = -200;

    /**
     * Valoarea urmărește ținta, nu o ia direct.
     *
     * O tranziție CSS pe `.hp-tilt` ar fi fost mai simplă, dar aceeași proprietate
     * `transform` e rescrisă la fiecare frame din progresul de scroll: o tranziție
     * peste ea ar fi transformat derularea într-o alunecare cu întârziere. Deci
     * netezirea stă aici, pe valoare, și transformul rămâne instantaneu.
     */
    const write = () => {
      px += (targetX - px) * 0.09;
      py += (targetY - py) * 0.09;
      frame.style.setProperty('--hp-px', px.toFixed(4));
      frame.style.setProperty('--hp-py', py.toFixed(4));

      // Firul stă exact pe cursor. Inelul rămâne în urmă, ca un instrument care
      // se așază: dacă ar rămâne în urmă și firul, reticulul ar părea stricat,
      // fiindcă el este singurul cursor pe care îl vede cititorul.
      frame.style.setProperty('--hp-cx', `${cursorX.toFixed(1)}px`);
      frame.style.setProperty('--hp-cy', `${cursorY.toFixed(1)}px`);
      ringX += (cursorX - ringX) * 0.19;
      ringY += (cursorY - ringY) * 0.19;
      frame.style.setProperty('--hp-rx', `${ringX.toFixed(1)}px`);
      frame.style.setProperty('--hp-ry', `${ringY.toFixed(1)}px`);

      const settled =
        Math.abs(targetX - px) < 0.0015 &&
        Math.abs(targetY - py) < 0.0015 &&
        Math.abs(cursorX - ringX) < 0.4 &&
        Math.abs(cursorY - ringY) < 0.4;
      queued = settled ? 0 : requestAnimationFrame(write);
    };

    const onMove = (event: PointerEvent) => {
      targetX = (event.clientX / window.innerWidth) * 2 - 1;
      targetY = (event.clientY / window.innerHeight) * 2 - 1;
      cursorX = event.clientX;
      cursorY = event.clientY;
      if (!queued) queued = requestAnimationFrame(write);
    };

    // Fără pointer, desenul se întoarce drept — altfel rămâne înclinat la ultima
    // poziție a cursorului după ce acesta a părăsit fereastra.
    const onLeave = () => {
      targetX = 0;
      targetY = 0;
      if (!queued) queued = requestAnimationFrame(write);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      if (queued) cancelAnimationFrame(queued);
      delete frame.dataset.reticle;
      ['--hp-px', '--hp-py', '--hp-cx', '--hp-cy', '--hp-rx', '--hp-ry'].forEach((name) => {
        frame.style.removeProperty(name);
      });
    };
  }, []);

  return {
    planRef,
    planFrameRef,
    activeSlug,
    setHoverSlug,
  };
}

export type HeroOpening = ReturnType<typeof useHeroOpening>;
