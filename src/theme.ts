// Colour for the whole site, page and 3D scene alike, from one place: the page tokens, a colour per
// process stage, and the tints the glass, floor, sky and panel artwork use. One theme: Aurora,
// midnight blue with teal, violet and pink, northern lights through glass.

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
  /** the night sky behind everything: aurora curtain colours (low, middle, crown) and the sky's top and horizon */
  sky: { aurora: [string, string, string]; top: string; horizon: string };
}

export const palette: Palette = {
  css: {
    '--bg': '#090C18', '--bg-2': '#111631',
    '--ink': '#EDF0FA', '--ink-2': '#C3C8DE', '--ink-3': '#8D94B5', '--ink-4': '#5A6080',
    '--gold': '#36E2C8', '--gold-2': '#2AA898', '--lav': '#9B7CFF', '--aqua': '#6FB7FF', '--coral': '#FF8AD8',
  },
  stages: ['#6FB7FF', '#36E2C8', '#7BE8B0', '#9B7CFF', '#FF8AD8', '#FFB38A'],
  pyramid: ['#FF8AD8', '#9B7CFF', '#36E2C8', '#6FB7FF'],
  backdrop: ['#1A2142', '#080B17'],
  floor: ['#080B16', '#121935'],
  launch: '#36E2C8',
  ring: '#9B7CFF',
  sky: { aurora: ['#3CF0B4', '#36C8E2', '#B46CFF'], top: '#04061A', horizon: '#121A3A' },
};

/**
 * How far the aurora's hues have drifted at a given time, in radians: a slow swing through greens,
 * teals, blues and violets and back, a little over a minute each way. Shared by the 3D sky and the page sky.
 */
export const auroraHue = (seconds: number) => Math.sin(seconds * Math.PI * 2 / 140) * .75;

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
}
