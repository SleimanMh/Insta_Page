import { useEffect, useRef } from 'react';
import { auroraHue, palette, rgb } from '../theme';

// A night sky behind the page: a fixed field of stars that twinkles, and
// curtains of aurora that fold and drift across the top of the screen while their hues slowly shift.
// The aurora is computed at low resolution and stretched, which keeps it soft and cheap; it pauses
// while the story's own 3D sky fills the screen, and holds still for visitors who prefer reduced motion.

const AW = 224, AH = 126;

/** turn a colour around the grey axis (the same drift as the 3D sky) */
function turn(c: [number, number, number], a: number): [number, number, number] {
  const k = .57735, ca = Math.cos(a), sa = Math.sin(a), d = k * (c[0] + c[1] + c[2]) * (1 - ca);
  const cx = k * (c[2] - c[1]), cy = k * (c[0] - c[2]), cz = k * (c[1] - c[0]);   // cross(k, c)
  return [c[0] * ca + cx * sa + k * d, c[1] * ca + cy * sa + k * d, c[2] * ca + cz * sa + k * d];
}

function drawStars(cv: HTMLCanvasElement, seed: number) {
  const dpr = Math.min(2, window.devicePixelRatio || 1), w = innerWidth, h = innerHeight;
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const g = cv.getContext('2d')!; g.scale(dpr, dpr); g.clearRect(0, 0, w, h);
  let r = seed;
  const rand = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
  const n = Math.round((w * h) / 3200);
  for (let i = 0; i < n; i++) {
    const x = rand() * w, y = Math.pow(rand(), 1.35) * h, s = .35 + Math.pow(rand(), 3) * 1.25;
    g.globalAlpha = .25 + rand() * .7 * (1 - y / h * .6);
    g.fillStyle = rand() > .85 ? '#CFE0FF' : '#FFFFFF';
    g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.fill();
  }
}

function SkyLayers() {
  const auroraRef = useRef<HTMLCanvasElement>(null);
  const starsA = useRef<HTMLCanvasElement>(null), starsB = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const paintStars = () => { if (starsA.current) drawStars(starsA.current, 1234567); if (starsB.current) drawStars(starsB.current, 7654321); };
    paintStars();
    window.addEventListener('resize', paintStars);
    return () => window.removeEventListener('resize', paintStars);
  }, []);

  useEffect(() => {
    const cv = auroraRef.current;
    if (!cv) return;
    cv.width = AW; cv.height = AH;
    const g = cv.getContext('2d')!, img = g.createImageData(AW, AH), px = img.data;
    const [A, B, C] = palette.sky.aurora.map(rgb);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0, last = 0;
    const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const paint = (t: number) => {
      const h = auroraHue(t), a = turn(A, h), b = turn(B, h), c = turn(C, h);
      for (let y = 0; y < AH; y++) {
        const v = y / AH;
        for (let x = 0; x < AW; x++) {
          const u = x / AW;
          let R = 0, G = 0, Bl = 0, I = 0;
          for (let k = 0; k < 2; k++) {
            const uu = u + t * (k ? -.018 : .024);   // each curtain drifts sideways at its own pace
            const yc = .34 + k * .14 + .07 * Math.sin(uu * 5.5 + t * .32 + k * 2.1) + .045 * Math.sin(uu * 12.7 - t * .24 + k * 4.3);
            const d = yc - v;   // height above the curtain's lower hem
            const band = d < 0 ? Math.exp(-d * d / .0007) : Math.exp(-d * d / (.028 + k * .02));
            const ray = .5 + .5 * Math.sin(uu * (62 + k * 21) + Math.sin(uu * 8 + t * .6 + k) * 3.2 + t * .4);
            const it = band * (.3 + .7 * ray * ray) * (.55 + .45 * Math.sin(uu * 3.6 + t * .45 + k * 1.7)) * (k ? .7 : 1);
            const m1 = smooth(0, .1, d), m2 = smooth(.08, .26, d);
            R += it * ((a[0] * (1 - m1) + b[0] * m1) * (1 - m2) + c[0] * m2);
            G += it * ((a[1] * (1 - m1) + b[1] * m1) * (1 - m2) + c[1] * m2);
            Bl += it * ((a[2] * (1 - m1) + b[2] * m1) * (1 - m2) + c[2] * m2);
            I += it;
          }
          const o = (y * AW + x) * 4, al = Math.min(1, I);
          const n = I > 0 ? 1 / I : 0;
          px[o] = Math.min(255, R * n * 255); px[o + 1] = Math.min(255, G * n * 255); px[o + 2] = Math.min(255, Bl * n * 255); px[o + 3] = al * 200;
        }
      }
      g.putImageData(img, 0, 0);
    };
    const storyEl = document.querySelector('.story');
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last < 33 || document.hidden) return;                 // about thirty frames a second keeps the drift smooth
      if (storyEl && storyEl.getBoundingClientRect().bottom > innerHeight) return;   // the story's own sky covers the screen
      last = now; paint(now / 1000);
    };
    paint(0);
    if (!reduce) raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="sky" aria-hidden="true" style={{ background: `radial-gradient(120% 70% at 50% 0%, ${palette.sky.horizon}, ${palette.sky.top} 75%)` }}>
      <canvas className="sky-stars" ref={starsA} />
      <canvas className="sky-stars is-b" ref={starsB} />
      <canvas className="sky-aurora" ref={auroraRef} />
    </div>
  );
}

export const Sky = SkyLayers;
