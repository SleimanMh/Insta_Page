import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Fragment, ReactNode, RefObject, useEffect, useLayoutEffect, useRef } from 'react';

gsap.registerPlugin(ScrollTrigger);

// Motion for the sections after the story. Content is always in the HTML and readable;
// animation only ever adds to it, and none of it runs when the visitor prefers reduced motion.

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = () => matchMedia('(hover: hover) and (pointer: fine)').matches;

/** A heading whose words rise into place from behind a mask. Words stay real text for screen readers. */
export function Split({ text, as: Tag = 'h2', id, className }: { text: string; as?: 'h2' | 'h3' | 'p'; id?: string; className?: string }) {
  const words = text.split(' ');
  return (
    <Tag id={id} className={`split${className ? ` ${className}` : ''}`} data-split="">
      {words.map((w, i) => (
        <Fragment key={i}><span className="w"><span className="wi">{w}</span></span>{i < words.length - 1 ? ' ' : ''}</Fragment>
      ))}
    </Tag>
  );
}

/**
 * Scroll-driven reveals inside one section:
 *  [data-split]   words rise in, one after another
 *  [data-reveal]  fades and lifts in, staggered with its siblings
 *  [data-draw]    hairlines draw across
 *  [data-lit]     lights up while it crosses the middle of the screen
 *  [data-parallax="n"] drifts against the scroll by n pixels
 */
export function useSectionMotion(ref: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || reduced()) return;
    const ctx = gsap.context(() => {
      root.querySelectorAll<HTMLElement>('[data-split]').forEach(el => {
        gsap.from(el.querySelectorAll('.wi'), {
          yPercent: 115, rotate: 4, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: .055,
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        });
      });
      gsap.set(root.querySelectorAll('[data-reveal]'), { opacity: 0 });
      ScrollTrigger.batch(root.querySelectorAll('[data-reveal]'), {
        start: 'top 90%', once: true,
        onEnter: els => gsap.fromTo(els, { y: 46, opacity: 0, filter: 'blur(6px)' },
          { y: 0, opacity: 1, filter: 'blur(0px)', duration: 1, ease: 'power3.out', stagger: .09, clearProps: 'filter' }),
      });
      root.querySelectorAll<HTMLElement>('[data-draw]').forEach(el => {
        gsap.from(el, { scaleX: 0, transformOrigin: '0 50%', duration: 1.4, ease: 'expo.inOut', scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
      });
      root.querySelectorAll<HTMLElement>('[data-lit]').forEach(el => {
        ScrollTrigger.create({ trigger: el, start: 'top 72%', end: 'bottom 28%', toggleClass: 'is-lit' });
      });
      root.querySelectorAll<HTMLElement>('[data-parallax]').forEach(el => {
        const d = Number(el.dataset.parallax) || 60;
        gsap.fromTo(el, { y: d }, { y: -d, ease: 'none', scrollTrigger: { trigger: root, start: 'top bottom', end: 'bottom top', scrub: true } });
      });
    }, root);
    return () => ctx.revert();
  }, [ref]);
}

/**
 * Pointer effects, delegated from the document so any element can opt in:
 *  [data-glow]    a soft light follows the cursor across the element (CSS vars --mx, --my)
 *  [data-tilt]    the element tilts toward the cursor (--rx, --ry)
 *  [data-magnet]  the element leans a little toward the cursor
 */
export function usePointerFx() {
  useEffect(() => {
    if (reduced() || !fine()) return;
    const magnets = new Map<HTMLElement, { x: gsap.QuickToFunc; y: gsap.QuickToFunc }>();
    let current: HTMLElement | null = null;
    const move = (e: PointerEvent) => {
      const t = e.target as Element | null;
      t?.closest<HTMLElement>('[data-glow]') && setGlow(t.closest<HTMLElement>('[data-glow]')!, e);
      const tilt = t?.closest<HTMLElement>('[data-tilt]');
      if (tilt) {
        const r = tilt.getBoundingClientRect();
        tilt.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - .5) * 9}deg`);
        tilt.style.setProperty('--rx', `${-((e.clientY - r.top) / r.height - .5) * 7}deg`);
      }
      const mag = t?.closest<HTMLElement>('[data-magnet]') ?? null;
      if (current && current !== mag) release(current);
      current = mag;
      if (mag) {
        let q = magnets.get(mag);
        if (!q) { q = { x: gsap.quickTo(mag, 'x', { duration: .5, ease: 'power3.out' }), y: gsap.quickTo(mag, 'y', { duration: .5, ease: 'power3.out' }) }; magnets.set(mag, q); }
        const r = mag.getBoundingClientRect();
        q.x((e.clientX - r.left - r.width / 2) * .22); q.y((e.clientY - r.top - r.height / 2) * .3);
      }
    };
    const setGlow = (el: HTMLElement, e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    };
    const release = (el: HTMLElement) => { const q = magnets.get(el); q?.x(0); q?.y(0); };
    const out = (e: PointerEvent) => {
      const tilt = (e.target as Element).closest?.<HTMLElement>('[data-tilt]');
      if (tilt && !tilt.contains(e.relatedTarget as Node)) { tilt.style.setProperty('--rx', '0deg'); tilt.style.setProperty('--ry', '0deg'); }
    };
    document.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerout', out, { passive: true });
    return () => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerout', out); };
  }, []);
}

/** A thin champagne bar along the top of the page showing how far down the visitor has read. */
export function ScrollProgress() {
  const bar = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!bar.current) return;
    const st = ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: self => { bar.current!.style.transform = `scaleX(${self.progress.toFixed(4)})`; },
    });
    // fonts change the page height; re-measure once they are in
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    return () => st.kill();
  }, []);
  return <div className="scroll-progress" ref={bar} aria-hidden="true" />;
}

/** An endless band of words that leans with the speed of the scroll. */
export function Marquee({ items, reverse, children }: { items: string[]; reverse?: boolean; children?: ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = track.current;
    if (!el || reduced()) return;
    const skew = gsap.quickTo(el, 'skewX', { duration: .6, ease: 'power3.out' });
    const st = ScrollTrigger.create({
      trigger: el, start: 'top bottom', end: 'bottom top',
      onUpdate: self => skew(gsap.utils.clamp(-8, 8, self.getVelocity() / -260)),
    });
    return () => st.kill();
  }, []);
  const row = (
    <>
      {items.map((t, i) => (
        <span className="mq-item" key={i}>{t}<svg viewBox="0 0 20 18" aria-hidden="true"><path d="M10 1.5 18.5 16.5H1.5Z" /></svg></span>
      ))}
    </>
  );
  return (
    <div className={`marquee${reverse ? ' is-reverse' : ''}`} aria-hidden="true">
      <div className="mq-track" ref={track}><div className="mq-run">{row}</div><div className="mq-run">{row}</div></div>
      {children}
    </div>
  );
}
