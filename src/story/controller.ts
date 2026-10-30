import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { SNAPS, StoryState, clamp, stageCenter, stateFromProgress } from './progress';

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

export type Mode = 'wide' | 'stack';

export interface Snapshot {
  mode: Mode;
  reduce: boolean;
  stage: number;
  heroOn: boolean;
  processOn: boolean;
  finalOn: boolean;
  navOn: boolean;
}

/**
 * Coordinates scroll, navigation and the scene. Scroll (or the stacked sections on small screens)
 * sets a target progress; one damped value follows it, and every visual reads from that value.
 * Clicking a stage only scrolls the page, so there is never a second animation competing with scroll.
 */
class StoryController {
  target = 0;
  shown = 0;
  state: StoryState = stateFromProgress(0);
  hover = -1;
  pointer = { x: 0, y: 0 };
  snapshot: Snapshot;
  invalidate: (() => void) | null = null;
  root: HTMLElement | null = null;
  leader: { line: SVGLineElement; dot: SVGCircleElement } | null = null;
  stageEls: HTMLElement[] = [];
  heroEl: HTMLElement | null = null;
  finalEl: HTMLElement | null = null;
  canvasWrapEl: HTMLElement | null = null;
  navEl: HTMLElement | null = null;

  private raf = 0;
  private last = 0;
  private listeners = new Set<() => void>();
  private trigger: ScrollTrigger | null = null;
  private onStackScroll = () => this.setTarget(this.stackProgress());
  private reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  private narrowMQ = matchMedia('(max-width: 899px)');
  readonly finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  constructor() {
    const reduce = this.reduceMQ.matches;
    this.snapshot = { mode: this.computeMode(), reduce, stage: 0, heroOn: true, processOn: false, finalOn: false, navOn: false };
    const onMedia = () => this.updateMode();
    this.reduceMQ.addEventListener('change', onMedia);
    this.narrowMQ.addEventListener('change', onMedia);
  }

  get mode() { return this.snapshot.mode; }
  get reduce() { return this.snapshot.reduce; }

  private computeMode(): Mode { return this.narrowMQ.matches || this.reduceMQ.matches ? 'stack' : 'wide'; }

  private updateMode() {
    const mode = this.computeMode(), reduce = this.reduceMQ.matches;
    if (mode !== this.snapshot.mode || reduce !== this.snapshot.reduce) {
      this.snapshot = { ...this.snapshot, mode, reduce };
      this.emit();
      // the layout changes under the new mode; rebind once React has re-rendered it
      requestAnimationFrame(() => this.bindScroll());
    }
  }

  // ---- React subscription (only discrete changes, never per frame) ----
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  getSnapshot = () => this.snapshot;
  private emit() { this.listeners.forEach(fn => fn()); }

  // ---- Scroll binding ----
  bindScroll() {
    this.trigger?.kill(); this.trigger = null;
    window.removeEventListener('scroll', this.onStackScroll);
    window.removeEventListener('resize', this.onStackScroll);
    if (!this.root) return;
    if (this.mode === 'wide') {
      this.trigger = ScrollTrigger.create({
        trigger: this.root, start: 'top top', end: 'bottom bottom',
        onUpdate: self => this.setTarget(self.progress),
        onRefresh: self => this.setTarget(self.progress),
      });
      this.setTarget(this.trigger.progress);
    } else {
      window.addEventListener('scroll', this.onStackScroll, { passive: true });
      window.addEventListener('resize', this.onStackScroll);
      this.onStackScroll();
    }
  }

  unbind() {
    this.trigger?.kill(); this.trigger = null;
    window.removeEventListener('scroll', this.onStackScroll);
    window.removeEventListener('resize', this.onStackScroll);
    cancelAnimationFrame(this.raf); this.raf = 0;
  }

  /** Stacked layout: progress follows whichever block is passing the reading line. */
  private stackProgress() {
    const blocks = [this.heroEl, ...this.stageEls, this.finalEl];
    if (blocks.some(b => !b)) return 0;
    const line = window.innerHeight * .68;
    const centers = blocks.map(b => { const r = b!.getBoundingClientRect(); return r.top + Math.min(r.height, window.innerHeight * .5) * .5; });
    if (line <= centers[0]) return 0;
    for (let i = 0; i < centers.length - 1; i++) {
      if (line <= centers[i + 1]) {
        const t = clamp((line - centers[i]) / (centers[i + 1] - centers[i]));
        // in the stacked layout each block snaps into place rather than drifting between states
        const eased = this.reduce ? (t < .5 ? 0 : 1) : t < .35 ? 0 : t > .65 ? 1 : (t - .35) / .3;
        return SNAPS[i] + (SNAPS[i + 1] - SNAPS[i]) * eased;
      }
    }
    return 1;
  }

  // ---- Progress ----
  setTarget(p: number) {
    p = clamp(p);
    if (this.reduce) p = SNAPS.reduce((a, b) => (Math.abs(b - p) < Math.abs(a - p) ? b : a));
    this.target = p;
    this.kick();
  }

  setHover(i: number) { this.hover = i; this.invalidate?.(); }
  setPointer(x: number, y: number) { this.pointer.x = x; this.pointer.y = y; this.invalidate?.(); }

  kick() {
    if (!this.raf) { this.last = performance.now(); this.raf = requestAnimationFrame(this.tick); }
  }

  private tick = (now: number) => {
    this.raf = 0;
    const dt = Math.min(.05, (now - this.last) / 1000); this.last = now;
    if (this.reduce) this.shown = this.target;
    else {
      this.shown += (this.target - this.shown) * (1 - Math.exp(-dt * 7));
      if (Math.abs(this.target - this.shown) < .0002) this.shown = this.target;
    }
    this.state = stateFromProgress(this.shown);
    this.apply();
    this.invalidate?.();
    if (this.shown !== this.target) this.kick();
  };

  private apply() {
    const s = this.state, r = this.root;
    if (r) {
      r.style.setProperty('--hero', s.hero.toFixed(4));
      r.style.setProperty('--process', s.process.toFixed(4));
      r.style.setProperty('--final', s.final.toFixed(4));
      r.style.setProperty('--nav', s.nav.toFixed(4));
      r.style.setProperty('--open', s.open.toFixed(4));
    }
    const next = { heroOn: s.hero > .5, processOn: s.process > .5, finalOn: s.final > .5, navOn: s.nav > .3, stage: s.stage };
    const cur = this.snapshot;
    if (next.stage !== cur.stage || next.heroOn !== cur.heroOn || next.processOn !== cur.processOn || next.finalOn !== cur.finalOn || next.navOn !== cur.navOn) {
      this.snapshot = { ...cur, ...next };
      this.emit();
    }
  }

  // ---- Navigation ----
  /** Scroll to a stage (0–5), the hero (-1) or the complete state (6). The scroll position stays the single source of truth. */
  goTo(i: number) {
    const target = i < 0 ? 0 : i > 5 ? 1 : stageCenter(i);
    if (this.mode === 'wide' && this.root) {
      const top = this.root.getBoundingClientRect().top + window.scrollY;
      const range = this.root.offsetHeight - window.innerHeight;
      const y = top + target * range;
      if (this.reduce) { window.scrollTo(0, y); return; }
      const distance = Math.abs(window.scrollY - y) / window.innerHeight;
      gsap.to(window, { duration: clamp(.45 + distance * .25, .5, 1.6), ease: 'power2.inOut', scrollTo: { y, autoKill: true }, overwrite: true });
    } else {
      const el = i < 0 ? this.heroEl : i > 5 ? this.finalEl : this.stageEls[i];
      if (!el) return;
      // the sculpture and stage chips stay pinned at the top; land the section just below them
      const header = document.getElementById('siteHeader')?.offsetHeight ?? 0;
      const pinned = header + (this.canvasWrapEl?.offsetHeight ?? 0) + (this.navEl?.offsetHeight ?? 0);
      const y = el.getBoundingClientRect().top + window.scrollY - (i < 0 ? header : pinned) - 4;
      if (this.reduce) window.scrollTo(0, y);
      else gsap.to(window, { duration: .6, ease: 'power2.inOut', scrollTo: { y, autoKill: true }, overwrite: true });
    }
  }
}

export const story = new StoryController();
