import { CSSProperties, FormEvent, useEffect, useRef, useState } from 'react';
import { CAPABILITIES, PROJECTS, STAGES } from '../data/process';
import logoHorizontal from '../assets/brand/logo-horizontal.png';
import logoStacked from '../assets/brand/logo-stacked.png';
import wordmark from '../assets/brand/wordmark.png';
import { Marquee, Split, useSectionMotion } from '../motion/fx';
import { palette } from '../theme';
import { story } from '../story/controller';

const Arrow = () => <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 11.5 11.5 4.5M5.5 4.5h6v6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;

/** The brand: mark and wordmark side by side for the header, stacked for the footer. */
export const Logo = ({ stacked = false }: { stacked?: boolean }) => (
  <img className={stacked ? 'brand-stacked' : 'brand-logo'} src={stacked ? logoStacked : logoHorizontal} alt="refract" />
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
      <a className="brand" href="#top" aria-label="Refract, back to top"><Logo /></a>
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

// ---------------------------------------------------------------- selected work
/** Sites we have built and look after. Each card carries the client's own mark, name and address. */
export function Work() {
  const ref = useRef<HTMLElement>(null);
  useSectionMotion(ref);
  return (
    <section className="section selected" id="work" aria-labelledby="selected-title" ref={ref}>
      <Aurora tone="a" />
      <header className="section-head">
        <p className="eyebrow" data-reveal>Selected work</p>
        <Split id="selected-title" text="Products already live." />
        <p className="section-lede" data-reveal>Three sites we designed, built and still look after. Open any of them to see the work in use.</p>
      </header>
      <ul className="proj-grid">
        {PROJECTS.map((p, i) => (
          <li key={p.id} data-reveal style={{ '--c': palette.stages[i * 2] } as CSSProperties}>
            <a className="proj" href={p.url} target="_blank" rel="noreferrer noopener" data-glow>
              <span className="proj-logo" aria-hidden="true">
                {p.logo ? <img src={p.logo} alt="" /> : <b>{p.mark}</b>}
              </span>
              <h3>{p.name}</h3>
              {p.note && <p className="proj-note">{p.note}</p>}
              <span className="proj-foot"><span className="proj-host">{p.host}</span><span className="proj-go">Visit site <Arrow /></span></span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------- what we build
const WORK = [
  { kind: 't1', tag: 'Web', title: 'Web platforms', need: 'Web platform', cta: 'Plan a web platform',
    desc: 'Customer portals, marketplaces and SaaS products, designed around your users and built to grow with your business.' },
  { kind: 't2', tag: 'Mobile', title: 'Mobile apps', need: 'Mobile app', cta: 'Plan a mobile app',
    desc: 'iOS and Android apps with the backend, payments and store launch taken care of, and updates after release.' },
  { kind: 't3', tag: 'Automation and AI', title: 'Automation and AI', need: 'Workflow automation and AI', cta: 'Plan an automation',
    desc: 'Integrations, internal tools and AI assistants that take repetitive work off your team, added only where they help.' },
];
/** Ask the contact form to note what the visitor is interested in, then take them to it. */
const requestNeed = (need: string) => window.dispatchEvent(new CustomEvent('refract:need', { detail: need }));
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
export function Services() {
  const ref = useRef<HTMLElement>(null);
  useSectionMotion(ref);
  return (
    <section className="section work" id="services" aria-labelledby="work-title" ref={ref}>
      <Aurora tone="a" />
      <header className="section-head">
        <p className="eyebrow" data-reveal>What we build</p>
        <Split id="work-title" text="Products we bring to life." />
        <p className="section-lede" data-reveal>Three kinds of product we design, build and look after. Each one goes through the same six steps, from the first conversation to every release after launch.</p>
      </header>
      <ul className="work-grid">
        {WORK.map((w, i) => (
          <li className="work-item" key={w.kind} data-reveal>
            <div className="work-card" data-tilt data-glow>
              <Thumb kind={w.kind} />
              <div className="work-meta"><span className="work-num">{String(i + 1).padStart(2, '0')}</span><p className="tag">{w.tag}</p></div>
              <h3>{w.title}</h3>
              <p>{w.desc}</p>
              <a className="work-more" href="#contact" onClick={() => requestNeed(w.need)}>{w.cta} <Arrow /></a>
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
  // the capabilities, gathered under the step of the process each one belongs to
  const bands = STAGES.map((st, i) => ({ st, i, items: CAPABILITIES.filter(c => c.stage === i) }));
  return (
    <section className="section expertise" id="expertise" aria-labelledby="expertise-title" ref={ref}>
      <Aurora tone="b" />
      <header className="section-head">
        <p className="eyebrow" data-reveal>Expertise</p>
        <Split id="expertise-title" text="Every discipline your product needs." />
        <p className="section-lede" data-reveal>One team, linked across the six steps of the process. Take a single step, or the whole chain.</p>
      </header>
      <ol className="chain">
        {bands.map(({ st, i, items }) => (
          <li key={st.id} data-reveal data-lit style={{ '--c': palette.stages[i] } as CSSProperties}>
            <span className="chain-link" aria-hidden="true" />
            <span className="chain-dot" aria-hidden="true" />
            <p className="chain-step"><span>{st.num}</span>{st.name}</p>
            <ul>
              {items.map(c => (
                <li key={c.id}><h3>{c.name}</h3><p>{c.keys.join(' · ')}</p></li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ---------------------------------------------------------------- contact
// Enquiries are delivered by Web3Forms to refract@refract-tech.com. The access key only lets a form send
// to that inbox, so it is safe to ship in the page.
const WEB3FORMS_KEY = '1a1d6b2c-6057-4d87-b8c4-314f803d54d2';
const EMAIL = 'refract@refract-tech.com';

export function Contact() {
  const ref = useRef<HTMLElement>(null);
  useSectionMotion(ref);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [needsValue, setNeedsValue] = useState('');
  // "Plan a …" links elsewhere on the page fill in what the visitor needs
  useEffect(() => {
    const on = (e: Event) => {
      const need = (e as CustomEvent<string>).detail;
      setSent(false);
      setNeedsValue(v => (!v ? need : v.split(', ').includes(need) ? v : `${v}, ${need}`));
    };
    window.addEventListener('refract:need', on);
    return () => window.removeEventListener('refract:need', on);
  }, []);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sending) return;
    const f = new FormData(e.currentTarget);
    const missing = [['name', 'your name'], ['email', 'an email address'], ['message', 'a short project description']]
      .filter(([k]) => !String(f.get(k) ?? '').trim()).map(([, label]) => label);
    const list = missing.length > 1 ? `${missing.slice(0, -1).join(', ')} and ${missing[missing.length - 1]}` : missing[0];
    if (missing.length) { setError(`Please add ${list}.`); return; }
    if (!/^\S+@\S+\.\S+$/.test(String(f.get('email')))) { setError('Please check the email address; it should look like name@company.com.'); return; }
    setError(''); setSending(true);
    const v = (k: string) => String(f.get(k) ?? '').trim();
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject: `New project enquiry from ${v('name')}${v('company') ? ` (${v('company')})` : ''}`,
          from_name: 'Refract website',
          replyto: v('email'),
          name: v('name'), email: v('email'), company: v('company') || '-',
          budget: v('budget') || 'Not given', timeline: v('timeline') || 'Not given', needs: v('needs') || '-',
          message: v('message'),
          botcheck: Boolean(f.get('botcheck')),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.message || 'send failed');
      setSent(true);
    } catch {
      setError(`Sorry, your enquiry could not be sent. Please try again, or write to us at ${EMAIL}.`);
    } finally {
      setSending(false);
    }
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
            <h3>Thank you. Your enquiry is on its way.</h3>
            <p>We will read it and come back to you shortly, usually with a few questions and a time for a short call.</p>
          </div>
        ) : (
          <form className="contact-form" onSubmit={submit} noValidate data-reveal>
            <div className="field"><label htmlFor="cName">Name</label><input id="cName" name="name" autoComplete="name" /></div>
            <div className="field"><label htmlFor="cEmail">Email</label><input id="cEmail" name="email" type="email" autoComplete="email" /></div>
            <div className="field"><label htmlFor="cCompany">Company <span>optional</span></label><input id="cCompany" name="company" autoComplete="organization" /></div>
            <div className="field"><label htmlFor="cBudget">Budget</label>
              <select id="cBudget" name="budget" defaultValue=""><option value="">Select a range</option><option>Under $1k</option><option>$1k–$5k</option><option>Above $5k</option><option>Other, or not sure yet</option></select></div>
            <div className="field"><label htmlFor="cTimeline">Timeline</label>
              <select id="cTimeline" name="timeline" defaultValue=""><option value="">Select a timeline</option><option>As soon as possible</option><option>Within 3 months</option><option>3–6 months</option><option>Flexible</option></select></div>
            <div className="field field-wide"><label htmlFor="cNeeds">What do you need?</label>
              <input id="cNeeds" name="needs" value={needsValue} onChange={e => setNeedsValue(e.target.value)} placeholder="For example: UI and UX design, web development" /></div>
            <div className="field field-wide"><label htmlFor="cMessage">Project description</label><textarea id="cMessage" name="message" rows={5} placeholder="What are you building, and for whom?" /></div>
            {/* a field people never see; bots fill it in, and the form service then discards the message */}
            <input type="checkbox" name="botcheck" className="botcheck" tabIndex={-1} autoComplete="off" aria-hidden="true" />
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="btn btn-outline btn-glow" type="submit" data-magnet disabled={sending} aria-busy={sending}>{sending ? 'Sending…' : <>Send enquiry <Arrow /></>}</button>
          </form>
        )}
        <aside className="contact-side" data-reveal>
          <h3>What happens next</h3>
          <ol className="next">
            <li data-lit><span>01</span>We read your brief and note our questions.</li>
            <li data-lit><span>02</span>We arrange a short call to understand the goals.</li>
            <li data-lit><span>03</span>You receive a scoped proposal with a clear price and timeline.</li>
          </ol>
          <p className="contact-direct">Prefer email? <a href={`mailto:${EMAIL}`}>{EMAIL}</a></p>
        </aside>
      </div>
    </section>
  );
}

export function Footer() {
  const ref = useRef<HTMLElement>(null);
  const privacyRef = useRef<HTMLDialogElement>(null);
  useSectionMotion(ref);
  const toTop = (e: React.MouseEvent) => { e.preventDefault(); story.goTo(-1); };
  return (
    <footer className="site-footer" ref={ref}>
      <div className="footer-cta">
        <p className="eyebrow" data-reveal>Have an idea?</p>
        <Split as="h2" className="footer-cta-title" text="Let’s refract it into a product." />
        <div className="footer-cta-actions" data-reveal>
          <a className="btn btn-outline btn-glow" href="#contact" data-magnet>Start a project <Arrow /></a>
          <a className="footer-mail" href="mailto:refract@refract-tech.com">refract@refract-tech.com</a>
        </div>
      </div>

      <div className="footer-grid">
        <div className="footer-brand" data-reveal>
          <a href="#top" aria-label="Refract, back to top" onClick={toTop}><Logo stacked /></a>
          <p>Strategy, design, engineering and care for digital products, from the first idea to every release after launch.</p>
        </div>
        <nav className="footer-col" aria-label="Footer" data-reveal>
          <h3>Explore</h3>
          <ul>
            <li><a href="#work">Work</a></li>
            <li><a href="#services">Services</a></li>
            <li><a href="#process" onClick={e => { e.preventDefault(); story.goTo(0); }}>Process</a></li>
            <li><a href="#expertise">Expertise</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>
        </nav>
        <div className="footer-col" data-reveal>
          <h3>Process</h3>
          <ul>
            {STAGES.map((st, i) => (
              <li key={st.id}><button type="button" className="footer-link" onClick={() => story.goTo(i)}><span>{st.num}</span>{st.name}</button></li>
            ))}
          </ul>
        </div>
        <div className="footer-col" data-reveal>
          <h3>Get in touch</h3>
          <ul>
            <li><a href={`mailto:${EMAIL}`}>{EMAIL}</a></li>
            <li><a href="#contact">Start a project</a></li>
            <li><button type="button" className="footer-link" onClick={() => privacyRef.current?.showModal()}>Privacy</button></li>
          </ul>
        </div>
      </div>

      {/* the wordmark, lit by a slow passing sheen */}
      <div className="footer-word" aria-hidden="true" data-reveal style={{ '--wm': `url(${wordmark})` } as CSSProperties} />

      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} Refract. All rights reserved. <span className="footer-sep">·</span> <button type="button" className="footer-link" onClick={() => privacyRef.current?.showModal()}>Privacy</button></p>
        <a className="footer-up" href="#top" onClick={toTop}>Back to top <Arrow /></a>
      </div>

      <dialog className="privacy" ref={privacyRef} aria-labelledby="privacy-title" onClick={e => { if (e.target === e.currentTarget) e.currentTarget.close(); }}>
        <div className="privacy-body">
          <h2 id="privacy-title">Privacy</h2>
          <p>When you send an enquiry, we receive what you enter in the form: your name, email address, company, budget, timeline and project description. We use it only to reply to you and to prepare a proposal.</p>
          <p>The form is delivered to our inbox by Web3Forms. We do not sell or share your details, and we delete them on request. Write to <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.</p>
          <p>This site uses no advertising or tracking cookies. It is hosted on Vercel and loads its typeface from Google Fonts, which may record technical details such as your IP address.</p>
          <p className="privacy-date">Last updated November 2026</p>
          <form method="dialog"><button className="btn btn-outline" type="submit">Close</button></form>
        </div>
      </dialog>
    </footer>
  );
}
