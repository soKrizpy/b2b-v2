'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { animate, stagger } from 'animejs';

export function ParentReportMotion({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const sections = root.querySelectorAll<HTMLElement>('[data-report-motion]');
    const animation = animate(sections, {
      opacity: [0, 1],
      translateY: [14, 0],
      delay: stagger(90),
      duration: 520,
      ease: 'outCubic',
    });

    const cards = root.querySelectorAll<HTMLElement>('[data-report-card]');
    const handlers = Array.from(cards).map((card) => {
      const enter = () => animate(card, { translateY: -3, scale: 1.008, duration: 180, ease: 'outQuad' });
      const leave = () => animate(card, { translateY: 0, scale: 1, duration: 220, ease: 'outQuad' });
      card.addEventListener('pointerenter', enter);
      card.addEventListener('pointerleave', leave);
      return () => {
        card.removeEventListener('pointerenter', enter);
        card.removeEventListener('pointerleave', leave);
      };
    });

    return () => {
      animation?.revert?.();
      handlers.forEach((cleanup) => cleanup());
    };
  }, []);

  return <div ref={rootRef}>{children}</div>;
}
