import { CSSProperties, KeyboardEvent, useEffect, useRef, useSyncExternalStore } from 'react';
import { STAGES } from '../data/process';
import { story } from '../story/controller';
import { SceneHost } from './SceneHost';
import { palette } from '../theme';

const Arrow = ({ down = false }: { down?: boolean }) => down
  ? <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M4 9l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
  : <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 11.5 11.5 4.5M5.5 4.5h6v6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;

export function Story() {
  const snap = useSyncExternalStore(story.subscribe, story.getSnapshot);
  const rootRef = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const finalRef = useRef<HTMLDivElement>(null);
  const stageRefs = useRef<HTMLElement[]>([]);
  const lineRef = useRef<SVGLineElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const wide = snap.mode === 'wide';

  useEffect(() => {
    story.root = rootRef.current; story.heroEl = heroRef.current; story.finalEl = finalRef.current;
    story.stageEls = stageRefs.current; story.canvasWrapEl = wrapRef.current; story.navEl = navRef.current;
    story.leader = lineRef.current && dotRef.current ? { line: lineRef.current, dot: dotRef.current } : null;
    story.bindScroll();
    // deep links such as #stage-design open the matching stage
    const fromHash = () => {
      const i = STAGES.findIndex(s => `#stage-${s.id}` === location.hash);
      if (i >= 0) story.goTo(i);
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => { window.removeEventListener('hashchange', fromHash); story.unbind(); };
  }, [snap.mode]);

  // when the stage bar scrolls sideways (phones), keep the current stage's chip in view
  useEffect(() => {
    const nav = navRef.current, btn = nav?.children[snap.stage] as HTMLElement | undefined;
    if (!nav || !btn || nav.scrollWidth <= nav.clientWidth) return;
    nav.scrollTo({ left: btn.offsetLeft - (nav.clientWidth - btn.offsetWidth) / 2, behavior: snap.reduce ? 'auto' : 'smooth' });
  }, [snap.stage, snap.reduce]);

  const onNavKey = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const buttons = Array.from(navRef.current?.querySelectorAll('button') ?? []);
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    e.preventDefault();
    const next = (i + (e.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next].focus(); story.goTo(next);
  };

  // In the wide layout only the visible pane is reachable; stacked, everything is plain content.
  const paneProps = (on: boolean) => (wide && !on ? { inert: true, 'aria-hidden': true } : {});

  return (
    <section className="story" id="top" ref={rootRef} aria-label="Our process, from one idea to one complete product"
      style={{ '--stage': palette.stages[snap.stage] } as CSSProperties}
      onPointerMove={e => { if (wide) story.setPointer((e.clientX / innerWidth - .5) * 2, (e.clientY / innerHeight - .5) * 2); }}
      onPointerLeave={() => story.setPointer(0, 0)}>
      <div className="story-sticky">
        <div className="canvas-wrap" ref={wrapRef}>
          <SceneHost />
          <svg className="leader" aria-hidden="true"><line ref={lineRef} /><circle ref={dotRef} r="3" /></svg>
        </div>

        <div className="pane hero-copy" ref={heroRef} {...paneProps(snap.heroOn)}>
          <h1><span>One</span> <span className="soft">idea.</span><br /><span>Extraordinary</span> <span className="soft">possibilities.</span></h1>
          <p className="lede">We bring strategy, design and engineering together to turn your vision into a working digital product.</p>
          <div className="actions">
            <a className="btn btn-outline" href="#process" onClick={e => { e.preventDefault(); story.goTo(0); }}>Explore the process <Arrow down /></a>
            <a className="btn btn-text" href="#work">See our work</a>
          </div>
        </div>

        <div className="pane process" {...paneProps(snap.processOn)}>
          {STAGES.map((s, i) => {
            const active = snap.stage === i;
            return (
              <article key={s.id} id={`stage-${s.id}`} className={`stage${active ? ' is-active' : ''}`}
                ref={el => { if (el) stageRefs.current[i] = el; }}
                aria-labelledby={`h-${s.id}`} {...(wide && !active ? { inert: true, 'aria-hidden': true } : {})}>
                <p className="stage-label">{s.num} / {s.name}</p>
                <h2 id={`h-${s.id}`}>{s.heading}</h2>
                <p className="stage-body">{s.body}</p>
                <ul className="deliverables">{s.deliverables.map(d => <li key={d}><span>{d}</span><Arrow /></li>)}</ul>
                <a className="btn btn-outline" href="#expertise">Explore this stage <Arrow /></a>
              </article>
            );
          })}
        </div>

        <nav className={`stage-nav${snap.navOn || !wide ? ' is-on' : ''}`} aria-label="Process stages" ref={navRef} onKeyDown={onNavKey}>
          {STAGES.map((s, i) => (
            <button key={s.id} type="button" style={{ '--c': palette.stages[i] } as CSSProperties} aria-current={snap.stage === i && snap.processOn ? 'step' : undefined}
              aria-controls={`stage-${s.id}`}
              onClick={() => story.goTo(i)}
              onMouseEnter={() => story.setHover(i)} onMouseLeave={() => story.setHover(-1)}
              onFocus={() => story.setHover(i)} onBlur={() => story.setHover(-1)}>
              <small>{s.num}</small>{s.name}
            </button>
          ))}
        </nav>

        <div className="pane final-copy" ref={finalRef} {...paneProps(snap.finalOn)}>
          <h2 className="final-title"><span>Everything</span> <span className="soft">aligned.</span><br /><span>Ready for</span> <span className="soft">what’s next.</span></h2>
          <p className="lede">One coherent product, with the expertise to build, launch and improve it.</p>
          <div className="actions">
            <a className="btn btn-outline" href="#work">Explore our work <Arrow /></a>
            <a className="btn btn-text" href="#contact">Discuss your project</a>
          </div>
        </div>

        <div className="story-hints">
          <span className="hint-scroll" aria-hidden={!snap.heroOn}>Scroll to explore the process <Arrow down /></span>
          <a className="hint-skip" href="#work">Skip to our work <Arrow down /></a>
        </div>
      </div>
      <span className="anchor" id="process" aria-hidden="true" />
    </section>
  );
}
