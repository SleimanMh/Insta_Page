# Innovative — Design

Design and mockup phase only. No application code yet.

## Phase 1 — Repository findings
- The repository was empty: no code, frontend stack, tokens or assets to preserve.
- The Phase 3 design system becomes the source of truth. Tokens will map 1:1 to CSS variables (and Tailwind later).

## Phase 2 — Creative directions
`creative-directions.html` is the review board, published as a claude.ai artifact. It is an artifact body (the HTML skeleton is added when it's published).

- **A · Signal** (recommended): engineered precision; a lifecycle "signal line" (Design → Build → Deploy → Maintain) runs through the whole site.
- **B · Prism**: luminous depth; one idea refracted into a spectrum of products.
- **C · Module**: bold, modular grid; real UI fragments as the visual language.

## Phase 3 — In progress
Chosen direction: **B · Prism**, with the reference's violet-black palette.

- `prism-hero.html`: the homepage hero. A canvas renders a white beam that refracts through a glass prism (Snell's law per spectrum slice) and disperses into the brand spectrum. Dust lights up in the beam, the cursor tilts the prism, and the service labels ride their bands. Respects reduced motion and pauses when off screen.

### v3 — 3D prism and naming (`prism-hero-3d.html`)
- New palette: abyss black with a deep teal lift; color only in the light (amber, coral, rose, azure, aqua).
- three.js 0.149 (jsDelivr): a glass prism turning about once every 54 s. Each side reflects a stage: the idea (sketch), the plan (blueprint), the product (live dashboard).
- One beam in, five rays out to the steps Discover, Design, Build, Launch, Care, with pulses travelling along each ray.
- Name exploration from the prism idea: Refract (recommended), Prismwork, Spectra, Fanout, plus Innovative for comparison. A review-only bar switches the name live. Domains and trademarks not checked.

### v4 — Equal-sided solid and broad spectrum
- The prism is now a regular tetrahedron: four identical triangular sides, turning so each faces the viewer in turn (idea, plan, build, product). A square pyramid with equilateral sides is available from the review bar.
- The output light is one continuous spectrum fan (amber to aqua) sized so each step sits in its own colour band. Thin rays and travelling dots removed.

### v5 — Prism dropped; three calmer concepts (`hero-concepts.html`)
Feedback: prism not wanted; needs to stay innovative but be more comfortable to look at. Name back to Innovative.
- Shared system: soft slate background (not black), muted seafoam / sky / sand accents, no glow, slow motion, dark and light themes.
- **A · Layers**: the product as an exploded 3D stack (interface, APIs, data, cloud); hovering the legend lifts a layer.
- **B · Sketch to ship**: one app window plays brief → wireframe → design → live, with a clickable timeline.
- **C · Landscape**: a slow terrain of points with services pinned on it like places on a map.

### v6 — Refract, smooth and cute (`refract-hero.html`)
Feedback: back to the prism, but smooth, cute and innovative; name confirmed as **Refract**.
- Rounded, bevelled triangular prism in a stylised "candy glass" shader (pastel tint, glossy rim, soft highlights, gentle iridescence). Light enough for phones.
- Soft beam in, broad pastel rainbow out (peach, butter, mint, sky, lilac) landing on the five steps, with twinkling sparkles.
- Springy tilt toward the cursor; clicking or tapping the prism makes it wobble like jelly and pop a ring of sparkles.
- Twilight background with slowly drifting pastel glows, rounded Outfit headlines, bouncy buttons and step cards.

### v7 — Real prism shape, traced light, glitter
- The prism is now a true triangular prism (triangle ends, flat rectangular sides) with softly rounded edges; you see the end and its sides at a three-quarter angle.
- The light is traced against the prism's pose every frame: soft beam into the left face (with dust catching the light), a faint reflection off that face, the beam bending and starting to split inside the glass, then leaving the far face.
- The outgoing spectrum is one smooth gradient (no streaks) in real dispersion order, sprinkled with drifting, twinkling glitter in each band's colour.

### v8 — Crystal pyramid (from reference photos)
- The prism is a clear crystal pyramid: square base, four triangular faces, one corner toward the viewer, sharp glowing edges (back edges visible through the glass).
- Glass shading reflects a small studio (softbox, strip light, key light) with a Fresnel falloff; rainbow bands cross the facets where dispersed light hits them.
- Inside: the beam crosses and starts to split, faint light bounces off the back faces, and specks in the glass twinkle. Lens starbursts mark the entry, exit and the brightest corners.
- It stands on a glossy floor with its mirrored reflection, a rainbow caustic and a cool light pool around the base.

### v9 — Separate rays, gentle sparkles, drag to spin
- Outgoing light is five soft rays in lighter pastels with dark gaps between them; they leave the glass merged as white and separate as they travel. Fan coordinates are computed per pixel, so ray edges stay smooth.
- Sparkles cut to ~56, riding the rays and fading in and out smoothly (no flashing).
- Step cards show titles only; "Your product, live" keeps just its title.
- Drag (or swipe) the pyramid to spin it, with inertia and a slow idle turn; a tap without dragging still wobbles it with a sparkle burst. Light is traced in a non-spinning frame so it stays correct at any angle.
