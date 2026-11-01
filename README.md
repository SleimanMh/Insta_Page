# Refract

Marketing site for Refract, built around the "Parallax" direction: one crystal pyramid that breaks into six glass blocks (the process), explains each one, then re-forms around the finished product.

## Run it

```bash
npm install
npm run dev        # local development
npm run build      # typecheck + production build into dist/
npm run preview    # serve the production build
```

The build uses a relative base, so `dist/` can be served from any folder or static host.

## Stack

- React 19 + TypeScript, built with Vite
- three.js through React Three Fiber, one persistent canvas, rendered on demand
- GSAP (ScrollTrigger and ScrollTo) for scroll progress and click navigation

## How it is organised

| Concern | Where |
| --- | --- |
| Process content, capabilities and client projects | `src/data/process.ts` |
| Story state model (one progress value → every visual) | `src/story/progress.ts` |
| Scroll and navigation coordination | `src/story/controller.ts` |
| Pyramid and block geometry | `src/three/geometry.ts` |
| Glass material | `src/three/glass.ts` |
| Beam, launch path and return ring | `src/three/ribbon.ts` |
| Product-plane artwork per stage | `src/three/stageArt.ts` |
| Camera and sculpture choreography | `src/three/choreography.ts` |
| Scene assembly and per-frame updates | `src/three/Scene.tsx` |
| Accessible HTML for the story | `src/components/Story.tsx` |
| Header, work, services, expertise, contact, footer | `src/components/Sections.tsx` |

### The state model

Scroll position is the single source of truth. On desktop the story section is pinned with CSS `position: sticky` and ScrollTrigger reports its progress `p` (0–1). A damped copy of `p` drives everything through `stateFromProgress(p)`:

Closed (0–0.06) → Opening (0.06–0.18) → Exploring stages 1–6 (0.18–0.84) → Reassembling (0.84–0.95) → Complete.

Clicking a stage label scrolls the page to that stage's rest point, so scrolling, clicking, resizing and reversing never start competing animations. Wheel input is never intercepted; a click-triggered scroll stops as soon as the visitor scrolls themselves.

### Layouts

- **Wide (desktop):** sculpture left, process copy right, pinned story of about 5.4 viewport heights.
- **Stacked (under 900px wide, and whenever reduced motion is on):** a smaller pinned sculpture and stage chips at the top, with each stage as an ordinary section below. With reduced motion the scene jumps between rest states instead of travelling.
- **No WebGL:** an intentional static drawing of the six layers; all content and navigation still work.

## Content status

- Selected work lists live client sites from `PROJECTS`. Each shows a short mark until a logo file is added under `src/assets/work` and set as that project's `logo`; a one-line `note` is shown when filled in.
- The "What we build" cards describe services. Their "Plan a …" links fill in the contact form's "What do you need?" field.
- The contact form validates but does not send anything yet.

## Earlier design exploration

`design/` holds the standalone concept pages from the design phase.
