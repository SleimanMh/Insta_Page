import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { CAPABILITIES, SIZES, STAGES } from '../data/process';
import { Marquee, Num, Split, useSectionMotion } from '../motion/fx';
import { story } from '../story/controller';

const Arrow = () => <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 11.5 11.5 4.5M5.5 4.5h6v6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;

export const Mark = () => (
  <svg className="brand-mark" viewBox="0 0 32 28" aria-hidden="true">
    <path d="M16 2.5 30 26H2Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M19.6 17.4a4.2 4.2 0 1 1 0-4.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

// ---------------------------------------------------------------- header
export function Header() {
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const on = () => {
      const st = document.querySelector('.story') as HTMLElement | null;
      const end = st ? st.offsetTop + st.offsetHeight - 90 : 0;
      setSolid(story.mode === 'stack' ? window.scrollY > 8 : window.scrollY > end);
    };
    on(); window.addEventListener('scroll', on, { passive: true }); window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); };
  }, []);
  return (
    <header className={`site-header${solid ? ' is-solid' : ''}`} id="siteHeader">
      <a className="brand" href="#top" aria-label="Innovative, back to top"><Mark /><span>innovative</span></a>
      <nav className="site-nav" aria-label="Main">
        <a href="#work">Work</a>
        <a href="#process" onClick={e => { e.preventDefault(); story.goTo(0); }}>Process</a>
        <a href="#expertise">Expertise</a>
      </nav>
      <a className="header-cta" href="#contact">Start a project <Arrow /></a>
    </header>
  );
}

// ---------------------------------------------------------------- ambient light behind a section
/** Slow-drifting pools of champagne and lavender light; purely decorative. */
const Aurora = ({ tone = 'a' }: { tone?: 'a' | 'b' | 'c' }) => (
  <div className={`aurora aurora-${tone}`} aria-hidden="true"><i data-parallax="90" /><i data-parallax="-70" /></div>
);

/** Between the story and the sections: two bands of what we do, drifting in opposite directions. */
export function Band() {
  return (
    <div className="band">
      <Marquee items={['Strategy', 'Product design', 'Web platforms', 'Mobile apps', 'Integrations', 'AI where useful', 'Cloud', 'Ongoing care']} />
      <Marquee reverse items={['Discover', 'Design', 'Build', 'Connect', 'Launch', 'Evolve']} />
    </div>
  );
}

// ---------------------------------------------------------------- work (placeholders)
const WORK = [
  { kind: 't1', title: 'Web platform', desc: 'Strategy, design and build of a customer-facing web application.' },
  { kind: 't2', title: 'Mobile application', desc: 'A mobile app with its backend, launch and ongoing care.' },
  { kind: 't3', title: 'Workflow automation', desc: 'Integrations and AI-assisted automation for an operations team.' },
];
/** Small living illustrations: a page assembling itself, a feed scrolling, data flowing between systems. */
const Thumb = ({ kind }: { kind: string }) => (
  <div className={`work-thumb ${kind}`} aria-hidden="true">
    <span className="thumb-sweep" />
    <svg viewBox="0 0 200 150">
      {kind === 't1' && <>
        <rect x="30" y="24" width="140" height="102" rx="6" />
        <path d="M30 40h140" opacity=".5" /><circle cx="40" cy="32" r="2" /><circle cx="48" cy="32" r="2" /><circle cx="56" cy="32" r="2" />
        <path className="build b1" d="M42 54h56" /><path className="build b2" d="M42 64h40" /><path className="build b3" d="M42 74h48" />
        <rect className="build b4" x="42" y="88" width="34" height="26" rx="3" /><rect className="build b5" x="82" y="88" width="34" height="26" rx="3" />
        <g className="t1-prism"><path d="M140 54 158 86H122Z" /><path className="t1-beam" d="M104 72h24" /><path className="t1-fan f1" d="M152 74l18-6" /><path className="t1-fan f2" d="M152 76l18 0" /><path className="t1-fan f3" d="M152 78l18 6" /></g>
      </>}
      {kind === 't2' && <>
        <rect x="72" y="16" width="56" height="118" rx="11" /><path d="M92 22h16" opacity=".5" />
        <defs><clipPath id="t2clip"><rect x="76" y="30" width="48" height="96" rx="4" /></clipPath></defs>
        <g clipPath="url(#t2clip)"><g className="t2-feed">
          {[0, 1, 2, 3, 4, 5, 6, 7].map(i => <g key={i} transform={`translate(0 ${30 + i * 24})`}><rect x="80" y="2" width="12" height="12" rx="3" /><path d="M97 5h22M97 11h14" opacity=".55" /></g>)}
        </g></g>
        <circle className="t2-ping" cx="124" cy="22" r="3" />
      </>}
      {kind === 't3' && <>
        <path className="flow" d="M100 59V30M116 75h34M100 91v29M84 75H50" />
        <circle className="hub" cx="100" cy="75" r="16" /><circle cx="100" cy="75" r="7" opacity=".5" />
        <circle className="node n1" cx="100" cy="28" r="5" /><circle className="node n2" cx="152" cy="75" r="5" /><circle className="node n3" cx="100" cy="122" r="5" /><circle className="node n4" cx="48" cy="75" r="5" />
      </>}
    </svg>
  </div>
);
export function Work() {
  const ref = useRef<HTMLElement>(null);
  useSectionMotion(ref);
  return (
    <section className="section work" id="work" aria-labelledby="work-title" ref={ref}>
      <Aurora tone="a" />
      <header className="section-head">
        <p className="eyebrow" data-reveal>Selected work</p>
        <Split id="work-title" text="Case studies are on their way." />
        <p className="section-lede" data-reveal>These tiles are placeholders. Real projects, shared with each client’s permission, will replace them.</p>
      </header>
      <ul className="work-grid">
        {WORK.map((w, i) => (
          <li className="work-item" key={w.kind} data-reveal>
            <div className="work-card" data-tilt data-glow>
              <Thumb kind={w.kind} />
              <div className="work-meta"><span className="work-num">{String(i + 1).padStart(2, '0')}</span><p className="tag">Placeholder project</p></div>
              <h3>{w.title}</h3>
              <p>{w.desc}</p>
              <span className="work-more">Case study coming soon <Arrow /></span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------- expertise
export function Expertise() {
  const ref = useRef<HTMLElement>(null);
  useSectionMotion(ref);
  return (
    <section className="section expertise" id="expertise" aria-labelledby="expertise-title" ref={ref}>
      <Aurora tone="b" />
      <header className="section-head">
        <p className="eyebrow" data-reveal>Expertise</p>
        <Split id="expertise-title" text="Every discipline your product needs." />
        <p className="section-lede" data-reveal>Each capability belongs to one layer of the process. Choose one, or bring them together in a single team.</p>
      </header>
      <ul className="expertise-list">
        {CAPABILITIES.map((c, i) => (
          <li key={c.id} data-reveal data-lit data-glow>
            <div className="exp-top">
              <span className="exp-glyph" aria-hidden="true"><svg viewBox="0 0 20 18"><path d="M10 1.5 18.5 16.5H1.5Z" /></svg></span>
              <span className="exp-stage">{STAGES[c.stage].num} / {STAGES[c.stage].name}</span>
              <span className="exp-count" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
            </div>
            <h3>{c.name}</h3>
            <p>{c.desc}</p>
            <span className="exp-line" aria-hidden="true" />
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------- estimate (illustrative)
// round to a sensible step for the size of the number, so small monthly figures stay exact
const eur = (n: number) => { const step = n >= 10000 ? 500 : 100; return `€${(Math.round(n / step) * step).toLocaleString('en-GB')}`; };
const weeks = (n: number) => String(Math.round(n));

/** Six slabs drawn in the same exploded arrangement as the hero; selected layers light up. */
function LayerDiagram({ on }: { on: boolean[] }) {
  return (
    <svg className="est-layers" viewBox="0 0 360 150" aria-hidden="true">
      <path d="M0 98 360 70" className="est-beam" />
      <path d="M0 98 360 70" className="est-beam-flow" />
      {STAGES.map((s, i) => {
        const x = 26 + i * 52, sc = 1 - i * .07, h = 104 * sc, w = 70 * sc, y = 20 + i * 5;
        return (
          <g key={s.id} className={on[i] ? 'is-on' : ''} transform={`translate(${x} ${y})`}>
            <path d={`M${w / 2} 0 L${w} ${h} L0 ${h}Z`} />
            <text x={w / 2} y={h + 22} textAnchor="middle">{s.num}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function Estimate({ onRequest }: { onRequest: (summary: string) => void }) {
  const ref = useRef<HTMLElement>(null);
  useSectionMotion(ref);
  const [picked, setPicked] = useState<string[]>(['uxui', 'web']);
  const [size, setSize] = useState('standard');
  const k = SIZES.find(s => s.id === size)!.k;
  const chosen = CAPABILITIES.filter(c => picked.includes(c.id));
  const lines = chosen.filter(c => c.price);
  const lo = lines.reduce((a, c) => a + c.price![0] * k, 0), hi = lines.reduce((a, c) => a + c.price![1] * k, 0);
  // stages overlap in practice, so the timeline is shorter than the sum of the parts
  const wLo = Math.max(1, Math.round(lines.reduce((a, c) => a + c.weeks![0], 0) * k * .7));
  const wHi = Math.max(wLo + 1, Math.round(lines.reduce((a, c) => a + c.weeks![1], 0) * k * .75));
  const care = chosen.find(c => c.monthly);
  const layers = useMemo(() => STAGES.map((_, i) => chosen.some(c => c.stage === i)), [chosen]);

  const toggle = (id: string) => setPicked(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]));

  return (
    <section className="section estimate" id="estimate" aria-labelledby="estimate-title" ref={ref}>
      <Aurora tone="c" />
      <header className="section-head">
        <p className="eyebrow" data-reveal>Project estimate</p>
        <Split id="estimate-title" text="Shape your project, see the layers." />
        <p className="section-lede" data-reveal>Choose what you need for an illustrative range. Every figure here is an example, not a quote; a real proposal follows a short conversation.</p>
      </header>
      <div className="estimate-grid">
        <div className="est-controls" data-reveal>
          <fieldset>
            <legend>What do you need?</legend>
            <div className="cap-grid">
              {CAPABILITIES.map(c => (
                <label key={c.id} className={`cap${picked.includes(c.id) ? ' is-on' : ''}`} data-glow>
                  <input type="checkbox" checked={picked.includes(c.id)} onChange={() => toggle(c.id)} />
                  <span className="cap-name">{c.name}</span>
                  <span className="cap-stage">{STAGES[c.stage].num} {STAGES[c.stage].name}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>How big is the first release?</legend>
            <div className="size-grid">
              {SIZES.map(s => (
                <label key={s.id} className={`size${size === s.id ? ' is-on' : ''}`} data-glow>
                  <input type="radio" name="size" value={s.id} checked={size === s.id} onChange={() => setSize(s.id)} />
                  <span className="cap-name">{s.name}</span><span className="cap-stage">{s.desc}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <aside className="est-summary" aria-labelledby="sum-title" aria-live="polite" data-reveal>
          <LayerDiagram on={layers} />
          <h3 id="sum-title">Your illustrative estimate</h3>
          {chosen.length === 0 ? <p className="est-empty">Choose at least one capability to see a range.</p> : (
            <ul className="est-lines">
              {chosen.map(c => (
                <li key={c.id}><span>{c.name}</span>
                  <span>{c.price ? <><Num value={c.price[0] * k} format={eur} />–<Num value={c.price[1] * k} format={eur} /></> : `${eur(c.monthly![0])}–${eur(c.monthly![1])} / month`}</span></li>
              ))}
            </ul>
          )}
          <dl className="est-totals">
            <div><dt>One-off range</dt><dd>{lines.length ? <><Num value={lo} format={eur} />–<Num value={hi} format={eur} /></> : '–'}</dd></div>
            <div><dt>Timeline</dt><dd>{lines.length ? <><Num value={wLo} format={weeks} />–<Num value={wHi} format={weeks} /> weeks</> : '–'}</dd></div>
            {care && <div><dt>Ongoing care</dt><dd>{eur(care.monthly![0])}–{eur(care.monthly![1])} / month</dd></div>}
          </dl>
          <p className="est-note">Illustrative pricing only. The diagram shows which layers your project touches; it does not calculate the price.</p>
          <a className="btn btn-outline" data-magnet href="#contact" onClick={() => onRequest(chosen.map(c => c.name).join(', '))}>Request a detailed quote <Arrow /></a>
        </aside>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- contact
export function Contact({ needs }: { needs: string }) {
  const ref = useRef<HTMLElement>(null);
  useSectionMotion(ref);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [needsValue, setNeedsValue] = useState(needs);
  useEffect(() => { if (needs) setNeedsValue(needs); }, [needs]);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const missing = [['name', 'your name'], ['email', 'an email address'], ['message', 'a short project description']]
      .filter(([k]) => !String(f.get(k) ?? '').trim()).map(([, label]) => label);
    const list = missing.length > 1 ? `${missing.slice(0, -1).join(', ')} and ${missing[missing.length - 1]}` : missing[0];
    if (missing.length) { setError(`Please add ${list}.`); return; }
    if (!/^\S+@\S+\.\S+$/.test(String(f.get('email')))) { setError('Please check the email address; it should look like name@company.com.'); return; }
    setError(''); setSent(true);
  };

  return (
    <section className="section contact" id="contact" aria-labelledby="contact-title" ref={ref}>
      <Aurora tone="a" />
      <svg className="contact-orbit" viewBox="0 0 400 400" aria-hidden="true" data-parallax="80">
        <circle cx="200" cy="200" r="150" /><circle cx="200" cy="200" r="190" />
        <path d="M200 92 293 254H107Z" />
      </svg>
      <header className="section-head">
        <p className="eyebrow" data-reveal>Start a project</p>
        <Split id="contact-title" text="Tell us about the idea." />
        <p className="section-lede" data-reveal>A few details are enough to start. We will come back with questions, not a sales script.</p>
      </header>
      <div className="contact-grid">
        {sent ? (
          <div className="sent" role="status">
            <svg className="sent-check" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24" /><path d="M15 27l7 7 15-16" /></svg>
            <h3>Thank you. Your enquiry is ready.</h3>
            <p>This is a prototype, so nothing has been sent yet. In the live site this form will reach the team directly.</p>
          </div>
        ) : (
          <form className="contact-form" onSubmit={submit} noValidate data-reveal>
            <div className="field"><label htmlFor="cName">Name</label><input id="cName" name="name" autoComplete="name" /></div>
            <div className="field"><label htmlFor="cEmail">Email</label><input id="cEmail" name="email" type="email" autoComplete="email" /></div>
            <div className="field"><label htmlFor="cCompany">Company <span>optional</span></label><input id="cCompany" name="company" autoComplete="organization" /></div>
            <div className="field"><label htmlFor="cBudget">Budget</label>
              <select id="cBudget" name="budget" defaultValue=""><option value="">Select a range</option><option>Under €10k</option><option>€10k–€25k</option><option>€25k–€60k</option><option>€60k+</option><option>Not sure yet</option></select></div>
            <div className="field"><label htmlFor="cTimeline">Timeline</label>
              <select id="cTimeline" name="timeline" defaultValue=""><option value="">Select a timeline</option><option>As soon as possible</option><option>Within 3 months</option><option>3–6 months</option><option>Flexible</option></select></div>
            <div className="field field-wide"><label htmlFor="cNeeds">What do you need?</label>
              <input id="cNeeds" name="needs" value={needsValue} onChange={e => setNeedsValue(e.target.value)} placeholder="For example: UI and UX design, web development" /></div>
            <div className="field field-wide"><label htmlFor="cMessage">Project description</label><textarea id="cMessage" name="message" rows={5} placeholder="What are you building, and for whom?" /></div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="btn btn-outline btn-glow" type="submit" data-magnet>Send enquiry <Arrow /></button>
          </form>
        )}
        <aside className="contact-side" data-reveal>
          <h3>What happens next</h3>
          <ol className="next">
            <li data-lit><span>01</span>We read your brief and note our questions.</li>
            <li data-lit><span>02</span>We arrange a short call to understand the goals.</li>
            <li data-lit><span>03</span>You receive a scoped proposal with a clear price and timeline.</li>
          </ol>
          <p className="contact-direct">Prefer email? <span>hello@innovative.example</span></p>
        </aside>
      </div>
    </section>
  );
}

export function Footer() {
  const ref = useRef<HTMLElement>(null);
  useSectionMotion(ref);
  return (
    <footer className="site-footer" ref={ref}>
      <div className="footer-top">
        <a className="brand" href="#top"><Mark /><span>innovative</span></a>
        <p>Strategy, design, engineering and care for digital products.</p>
        <a className="btn btn-outline footer-up" href="#top" data-magnet onClick={e => { e.preventDefault(); story.goTo(-1); }}>Back to top <Arrow /></a>
      </div>
      <p className="footer-word" aria-hidden="true" data-split="">
        {'innovative'.split('').map((ch, i) => <span className="w" key={i}><span className="wi">{ch}</span></span>)}
      </p>
      <p className="copy">© 2026 Innovative · Prototype build. Placeholder content is marked as such.</p>
    </footer>
  );
}
