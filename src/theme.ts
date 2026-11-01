// Colour for the whole site, page and 3D scene alike, from one place. Each palette names its page
// tokens, a colour per process stage (the "spectrum" the prism throws), and the tints the glass,
// floor and panel artwork use. Switch palettes by changing ACTIVE.

export type PaletteName = 'spectrum' | 'aurora';

export interface Palette {
  /** page tokens, written onto :root as CSS custom properties */
  css: Record<string, string>;
  /** one colour per stage, in order: Discover … Evolve */
  stages: string[];
  /** the pyramid's faces: front, right, left, base */
  pyramid: [string, string, string, string];
  /** the studio around the sculpture: backdrop centre and edge, floor far and near */
  backdrop: [string, string];
  floor: [string, string];
  /** launch path and the ring that closes the story */
  launch: string;
  ring: string;
}

export const PALETTES: Record<PaletteName, Palette> = {
  // Graphite and champagne, with the colours a prism actually throws.
  spectrum: {
    css: {
      '--bg': '#0B0B0F', '--bg-2': '#15151B',
      '--ink': '#F1ECE3', '--ink-2': '#CBC5BC', '--ink-3': '#9A94A3', '--ink-4': '#66616D',
      '--gold': '#E8C48C', '--gold-2': '#B8956A', '--lav': '#8C7BFF', '--aqua': '#47E0C0', '--coral': '#FF7E6B',
    },
    stages: ['#FF7E6B', '#E8C48C', '#47E0C0', '#5BB8FF', '#8C7BFF', '#F27BD4'],
    pyramid: ['#F27BD4', '#FF8A5B', '#47E0C0', '#E8C48C'],
    backdrop: ['#302E36', '#0F0F14'],
    floor: ['#0D0D12', '#1A1920'],
    launch: '#E8C48C',
    ring: '#8C7BFF',
  },
  // Midnight blue with teal, violet and pink: northern lights through glass.
  aurora: {
    css: {
      '--bg': '#090C18', '--bg-2': '#111631',
      '--ink': '#EDF0FA', '--ink-2': '#C3C8DE', '--ink-3': '#8D94B5', '--ink-4': '#5A6080',
      '--gold': '#36E2C8', '--gold-2': '#2AA898', '--lav': '#9B7CFF', '--aqua': '#6FB7FF', '--coral': '#FF8AD8',
    },
    stages: ['#6FB7FF', '#36E2C8', '#7BE8B0', '#9B7CFF', '#FF8AD8', '#FFB38A'],
    pyramid: ['#FF8AD8', '#9B7CFF', '#36E2C8', '#6FB7FF'],
    backdrop: ['#1E2648', '#080B17'],
    floor: ['#080B16', '#121935'],
    launch: '#36E2C8',
    ring: '#9B7CFF',
  },
};

export const ACTIVE: PaletteName = 'spectrum';
export const palette = PALETTES[ACTIVE];

/** A display-space colour as 0…1 components (the shaders convert to linear themselves). */
export function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** The colour of a fractional stage, blending between neighbours as the story moves on. */
export function stageColor(f: number): [number, number, number] {
  const k = Math.max(0, Math.min(palette.stages.length - 1, f)), i = Math.floor(k), t = k - i;
  const a = rgb(palette.stages[i]), b = rgb(palette.stages[Math.min(palette.stages.length - 1, i + 1)]);
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Write the page tokens onto the document, including the stage colours and the spectrum gradient. */
export function applyPalette() {
  const s = document.documentElement.style;
  Object.entries(palette.css).forEach(([k, v]) => s.setProperty(k, v));
  palette.stages.forEach((c, i) => s.setProperty(`--c${i + 1}`, c));
  s.setProperty('--stage', palette.stages[0]);
  document.documentElement.dataset.palette = ACTIVE;
}
