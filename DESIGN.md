---
name: Orbit
description: A music player whose playlist is a doubly linked list, drawn as a printed mission flight plan.
colors:
  burn: "#ff7a1a"
  burn-hover: "#ff8c3a"
  burn-press: "#f06a0a"
  burn-ink: "#a33a00"
  burn-wash: "#fff1e6"
  chart: "#1f6fad"
  chart-soft: "#5ba8e0"
  chart-wash: "#d6e8f6"
  sky: "#e8f1f8"
  paper: "#f7fafc"
  mist: "#dce9f3"
  mist-strong: "#cbdcea"
  ink: "#10324a"
  ink-2: "#3d5a72"
  ink-3: "#4a6880"
  rule: "rgb(16 50 74 / 0.16)"
  rule-strong: "rgb(16 50 74 / 0.34)"
  danger: "#b3261e"
  danger-wash: "#fde8e6"
  success: "#1d6b45"
  success-wash: "#e3f4ea"
typography:
  display:
    fontFamily: "Unbounded, Hanken Grotesk, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 1.2rem + 1.9vw, 2.75rem)"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.02em"
  wordmark:
    fontFamily: "Unbounded, Hanken Grotesk, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    letterSpacing: "0.14em"
  headline:
    fontFamily: "Unbounded, Hanken Grotesk, system-ui, sans-serif"
    fontSize: "clamp(1rem, 0.94rem + 0.25vw, 1.125rem)"
    fontWeight: 600
    letterSpacing: "0.01em"
  title:
    fontFamily: "Hanken Grotesk, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.5
  body-lg:
    fontFamily: "Hanken Grotesk, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.5
  body:
    fontFamily: "Hanken Grotesk, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "tnum"
  label:
    fontFamily: "Hanken Grotesk, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "0.8125rem"
    fontWeight: 500
  mono-sm:
    fontFamily: "JetBrains Mono, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
  landing-hero:
    fontFamily: "Unbounded, Hanken Grotesk, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 1.4rem + 3.6vw, 4.75rem)"
    fontWeight: 600
    lineHeight: 1.02
    letterSpacing: "-0.03em"
  landing-close:
    fontFamily: "Unbounded, Hanken Grotesk, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 1.4rem + 3.4vw, 4.5rem)"
    fontWeight: 600
    lineHeight: 1.06
    letterSpacing: "-0.02em"
  landing-section:
    fontFamily: "Unbounded, Hanken Grotesk, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 1.2rem + 2vw, 3rem)"
    fontWeight: 600
    lineHeight: 1.06
    letterSpacing: "-0.02em"
  landing-lead:
    fontFamily: "Hanken Grotesk, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(1.0625rem, 1rem + 0.3vw, 1.25rem)"
    fontWeight: 400
    lineHeight: 1.55
  landing-karaoke:
    fontFamily: "Hanken Grotesk, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(1.125rem, 1rem + 0.6vw, 1.5rem)"
    fontWeight: 500
    lineHeight: 1.35
  cta-label:
    fontFamily: "Unbounded, Hanken Grotesk, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 600
  gate-title:
    fontFamily: "Unbounded, Hanken Grotesk, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 1.3rem + 1.6vw, 2.5rem)"
    fontWeight: 600
    lineHeight: 1.1
rounded:
  sm: "8px"
  md: "12px"
  lg: "20px"
  pill: "999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "24px"
  "6": "32px"
  "7": "48px"
components:
  button-primary:
    backgroundColor: "{colors.burn}"
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.burn-hover}"
  button-quiet:
    backgroundColor: "{colors.mist}"
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "40px"
  button-quiet-hover:
    backgroundColor: "{colors.mist-strong}"
  play-burn:
    backgroundColor: "{colors.burn}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    size: "72px"
  play-burn-hover:
    backgroundColor: "{colors.burn-hover}"
  icon-button:
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    size: "44px"
  icon-button-hover:
    backgroundColor: "{colors.mist}"
  icon-button-pressed:
    backgroundColor: "{colors.burn-wash}"
    textColor: "{colors.burn-ink}"
  chip:
    backgroundColor: "{colors.sky}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 12px 0 10px"
    height: "32px"
  chip-hover:
    backgroundColor: "{colors.mist-strong}"
  chip-active:
    backgroundColor: "{colors.burn}"
    textColor: "{colors.ink}"
  input-search:
    backgroundColor: "{colors.sky}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "0 44px 0 42px"
    height: "44px"
  input-search-focus:
    backgroundColor: "{colors.paper}"
  input-position:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.mono}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "36px"
    width: "76px"
  chart-panel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "24px 24px 12px"
  waypoint-row:
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "6px 8px"
  waypoint-row-hover:
    backgroundColor: "{colors.sky}"
  waypoint-row-current:
    backgroundColor: "{colors.burn-wash}"
    textColor: "{colors.ink}"
  list-node:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "6px 7px"
    height: "52px"
  list-node-hover:
    backgroundColor: "{colors.sky}"
  list-node-current:
    backgroundColor: "{colors.burn-wash}"
    textColor: "{colors.ink}"
  badge:
    backgroundColor: "{colors.chart-wash}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "2px 12px"
  badge-preview:
    backgroundColor: "{colors.burn-wash}"
    textColor: "{colors.burn-ink}"
  tab-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.title}"
    rounded: "{rounded.pill}"
    height: "44px"
  toast:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "12px 8px 12px 16px"
  cta-burn:
    backgroundColor: "{colors.burn}"
    textColor: "{colors.ink}"
    typography: "{typography.cta-label}"
    rounded: "{rounded.pill}"
    padding: "0 32px"
    height: "56px"
  cta-burn-hover:
    backgroundColor: "{colors.burn-hover}"
  button-outline:
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    rounded: "{rounded.pill}"
    padding: "9px 16px"
  button-outline-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  satellite-label:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-2}"
    typography: "{typography.title}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
  satellite-label-hover:
    backgroundColor: "{colors.sky}"
    textColor: "{colors.ink}"
  satellite-label-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  satellite-dot:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    size: "14px"
  satellite-dot-active:
    backgroundColor: "{colors.burn}"
  docked-instrument:
    backgroundColor: "{colors.sky}"
    rounded: "{rounded.pill}"
    size: "104px"
  chain-demo:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.lg}"
    padding: "16px"
  chain-demo-node:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 10px"
  chain-demo-node-current:
    backgroundColor: "{colors.burn-wash}"
  chain-demo-action:
    backgroundColor: "{colors.sky}"
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "38px"
  chain-demo-action-hover:
    backgroundColor: "{colors.mist-strong}"
  karaoke-line:
    textColor: "{colors.ink-3}"
    typography: "{typography.landing-karaoke}"
  karaoke-line-active:
    textColor: "{colors.ink}"
  plan-row:
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "4px 12px 4px 0"
    height: "52px"
  plan-row-current:
    backgroundColor: "{colors.burn-wash}"
  services-row:
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "16px 12px"
  services-row-hover:
    backgroundColor: "{colors.paper}"
  services-row-soon:
    textColor: "{colors.ink-2}"
  gate-card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
    height: "72px"
  gate-card-soon:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
  gate-badge-default:
    backgroundColor: "{colors.burn-wash}"
    textColor: "{colors.burn-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "1px 8px"
---

# Design System: Orbit

## Overview

**Creative North Star: "The Flight Plan"**

Orbit reads as a printed mission chart laid on pale sky paper. Navy ink carries every word and every structural line; one burn orange marks the active vector (the current song, the play burn, the progress fill, the selected insert action); chart blue plots the secondary lines (the trajectory spine of the queue, the prev pointers, focus rings, the corner registration ticks). The page itself is a dotted plotting grid, and every panel is a sheet of paper on it with registration ticks at its four corners.

The playlist is drawn as a trajectory, not a track table. The queue is a numbered column of waypoints threaded on a chart-blue spine; the linked list dock below the deck plots the same data as a HEAD to TAIL chain whose node widths scale with song duration, annotated in monospaced pointer notation. Behind everything, the current song is a particle planet rendered in the same three inks, with a burn orange ring. Motion explains change: titles cascade in character by character when the song changes, and list operations animate the rows and nodes that moved.

As built, the chart language is softened for touch and legibility: panels carry a gently rounded corner (12px) and a hairline ring rather than square printed borders, and every control is a pill. The chart identity lives in the ink palette, the ticks, the dotted grid, the plotted spine and the mono annotations, not in hard edges. The interface is always light; there is no dark mode.

The same world carries three surfaces: the player at /app/, the provider gate that opens it ("How do you want to listen?"), and the landing page at /. The landing page is a Persuade surface in the same inks, grid and type; what it adds is scale (a landing-only display step) and a sticky orbital stage where the particle planet holds the centre and each section is a satellite on its plotted ring.

**Key Characteristics:**
- Pale sky ground with a 24px dotted plotting grid; paper panels framed by a hairline ring and four chart-blue corner ticks.
- Navy ink for all text and structure, one burn orange for the active vector, chart blue for plotted secondary lines.
- Unbounded for titles and callsigns, Hanken Grotesk for reading, JetBrains Mono for pointers, positions and times.
- Tabular numerals everywhere, so elapsed time, durations and positions never jitter.
- Data structure as the visible interface: waypoint spine, HEAD and TAIL tags, next and prev arrows, null terminals.

## Colors

Three inks on paper: navy for words and structure, burn orange for the one thing that is happening now, chart blue for plotted lines.

### Primary
- **Burn Orange** (#ff7a1a): the active vector. Fills the play button, the progress track fill, the primary Insert button, the expanded insert chip, the current waypoint dot, the current list node border and the planet ring. On the landing page it fills the Open Orbit CTA pill and the dot of the front (current) satellite, and the fallback orbit ellipse when the particle scene is unavailable. Text on it is always navy ink, never white.
- **Burn Hover** (#ff8c3a) and **Burn Press** (#f06a0a): hover fill for burn surfaces; the pressed tone used for the seek thumb, the wordmark glyph, the current dot rim and the loading arc.
- **Burn Ink** (#a33a00): orange text that must pass contrast on light grounds, such as the T+ clock label, the current waypoint number, HEAD and TAIL tags and the current node pointer line.
- **Burn Wash** (#fff1e6): the background of whatever is current (current waypoint row, current list node, pressed toggle, preview badge).

### Secondary
- **Chart Blue** (#1f6fad): plotted structure that must read at small sizes. Corner registration ticks, prev pointer arrows and legend, waypoint dot rims, input focus borders and the focus ring.
- **Chart Soft** (#5ba8e0): lighter plotted lines that sit behind content: the queue trajectory spine, the orbit circle around the cover and the cool particles of the planet. Never used for text.
- **Chart Wash** (#d6e8f6): the halo behind focused inputs and the background of informational badges and toasts.

### Neutral
- **Sky Paper** (#e8f1f8): the page ground under the dotted grid; also the fill of search fields, chips, hovered rows and keycaps.
- **Chart Paper** (#f7fafc): every panel surface (rails, dock, toasts, popovers, list nodes, the cover lens).
- **Mist** (#dce9f3) and **Mist Strong** (#cbdcea): quiet button fills and their hover, artwork placeholders, skeletons, the empty progress track, list node borders and the null terminal outline.
- **Navy Ink** (#10324a): all primary text, icons and the next pointer arrows; the fill of the active mobile tab.
- **Ink Two** (#3d5a72): secondary text, metadata, artist lines, mono times and positions.
- **Ink Three** (#4a6880): placeholders and the null terminal labels.
- **Hairline Rule** (rgb(16 50 74 / 0.16)) and **Strong Rule** (rgb(16 50 74 / 0.34)): the 1px panel ring and minor seek ticks; the dashed insert divider and the minute ticks on the seek scale.

### Status
- **Danger** (#b3261e) on **Danger Wash** (#fde8e6): unavailable songs (struck through title, dashed dot), invalid position input, error toasts, remove hover.
- **Success** (#1d6b45) on **Success Wash** (#e3f4ea): success toast icon only.

### Named Rules
**The One Burn Rule.** Burn orange marks only the current song and the single primary action in view. If two unrelated things on a screen are orange, one of them is wrong.

**The Ink On Burn Rule.** Text and icons on a burn fill are navy ink. Orange text on light grounds uses Burn Ink, never Burn Orange.

**The Plotted Line Rule.** Chart blue draws lines, rims, ticks and rings; it does not fill buttons or carry body text.

## Typography

**Display Font:** Unbounded (with Hanken Grotesk, system-ui)
**Body Font:** Hanken Grotesk (with system-ui, -apple-system, Segoe UI)
**Label/Mono Font:** JetBrains Mono (with ui-monospace, SF Mono, Menlo)

**Character:** Unbounded is the wide, engineered callsign voice of the chart; Hanken Grotesk is a calm, readable grotesk for everything a person reads; JetBrains Mono is the plotter's annotation, reserved for pointers, positions and times.

### Hierarchy
- **Display** (600, clamp(1.75rem to 2.75rem), line-height 1.08, tracking -0.02em): the current song title in the deck only, balanced and clamped to two lines, cascading in per character on change.
- **Wordmark** (700, 1.125rem, tracking 0.14em, uppercase): the ORBIT name in the masthead. Identity only; not a heading style.
- **Headline** (600, clamp(1rem to 1.125rem), tracking 0.01em): panel titles such as Search and Flight plan, the dock title, empty state and popover titles.
- **Title** (Hanken 600, 0.875rem): waypoint titles, button labels, tab labels, toast titles. Search result titles use the same weight at the body size (1rem).
- **Body Large** (400, 1.0625rem): the artist and album line under the display title.
- **Body** (400, 1rem, line-height 1.5): default reading text and inputs.
- **Label** (600, 0.8125rem): chips, badges, captions, counts and hints (captions drop to weight 400).
- **Mono** (500, 0.8125rem): waypoint positions and durations, the mission clock.
- **Mono Small** (500, 0.75rem): list node index and time, dock pointer annotations, legend, keycaps; 0.6875rem only for HEAD and TAIL tags and null terminals.
- **Gate Title** (Unbounded 600, clamp(1.75rem to 2.5rem), line-height 1.1): the provider gate question only. It is the largest type inside /app/ and stays within the player's display range.

### Landing Step
The landing page at / adds one deliberate step above the player's Display on the same Unbounded voice. These sizes exist only on the landing page; the player and the gate never use them.
- **Landing Hero** (600, clamp(2.5rem to 4.75rem), line-height 1.02, tracking -0.03em): the one h1, held to 13ch and balanced.
- **Landing Close** (600, clamp(2.25rem to 4.5rem), line-height 1.06, tracking -0.02em): the closing headline above the final CTA, a bookend one step under the hero.
- **Landing Section** (600, clamp(1.75rem to 3rem), line-height 1.06, tracking -0.02em): chapter titles and the services title, held to 16ch. Its floor equals the player Display floor; its ceiling sits one step above it.
- **Landing Lead** (Hanken 400, clamp(1.0625rem to 1.25rem), line-height 1.55): the hero lead, held to 46ch. Chapter and section paragraphs use Body Large at line-height 1.6, held to 52ch.
- **Karaoke Line** (Hanken 500, clamp(1.125rem to 1.5rem), line-height 1.35): sample lyric lines; the active line steps to 600.
- **CTA Label** (Unbounded 600, 1.0625rem): the Open Orbit burn pill. Service names in the landing manifest use Unbounded 600 at 1.125rem.

### Named Rules
**The Tabular Clock Rule.** Tabular numerals are on globally; every number that changes over time sits in a fixed-width slot.

**The Mono Is Notation Rule.** JetBrains Mono appears only where the interface speaks the data structure or time: positions, durations, pointers, size, null, HEAD, TAIL, the T+ clock. Never for headings or prose.

**The Callsign Rule.** Unbounded is used for titles, the wordmark, landing service names and the landing CTA label only, never below 0.875rem and never for running text.

**The Landing Step Rule.** The Landing Hero, Close and Section sizes belong to the landing page alone. Inside /app/ the largest type is the Gate Title and the deck Display; a player screen that reaches for a landing size is out of system.

## Layout

The player lives at /app/. Desktop is a two-column central stage on a full-height viewport (no page scroll): the deck fills the left column and the flight plan rail sits on the right (`--rail-queue: clamp(380px, 34vw, 460px)`, 320 to 360px below 1100px). A masthead row spans both columns. Search lives in the masthead, centred over the stage column, and opens as a popover over the stage. The optional linked list dock sits under the deck. There is no left rail. Gutters and outer padding are 16px. While the search popover is open on desktop, the deck dims to 40%.

At 920px and below the layout collapses to one panel at a time, switched by a bottom pill tab bar (Search, Now, Flight plan); gutters tighten to 12px. In the Search view the field and its results fill the panel. The dock appears only with the flight plan view, stacked under the queue. Below 480px waypoint rows tighten, the duration moves inline under the title and the start-time column is hidden.

Spacing follows a 4px base scale (4, 8, 12, 16, 24, 32, 48). Panel headers sit on 24px insets; row content on 8 to 12px. The deck centers its stack (cover lens, mission clock, title, artist, source badge, progress, transport) with 24px gaps, tightening to 12px on short desktop viewports.

Before the player mounts, the provider gate centres a single 560px column (full width minus 16px gutters on phones) on the dotted sky ground at full viewport height: wordmark, Gate Title, one lead line and a stack of service cards 8px apart.

The landing page at / scrolls. Its orbit section is a two-column grid (0.95fr reading flow, 1.05fr stage) with outer padding of clamp(16px, 4vw, 48px). The stage is sticky at the top of the right column and fills 100svh; the orbit radius is min(80svh, 44vw, 720px) / 2 and the planet sits 17% inside the ring. The hero fills at least 100svh with 120px top padding; each chapter fills at least 92svh with 48px block padding and is centred vertically, so one chapter is in front at a time. Below the orbit, the services manifest (up to 1080px) and the close each sit on 96px section padding, the close centred with its footer 96px further down. At 900px and below the landing collapses to one column: the stage stacks above the flow at radius min(64vw, 380px) / 2 with 96px top padding, the leader line is hidden, chapter and services titles reserve 112px on the right, and once the hero scrolls away the stage docks as a small fixed instrument in the top right corner, hidden again when the orbit section leaves the viewport.

**The Sticky Stage Rule.** On the landing page the planet never scrolls away while chapters are being read: it is sticky beside them on wide screens and docked as the instrument on narrow ones. Sections turn the orbit; they never replace it.

**The Fixed Stage Rule.** The cover lens has one fixed scale range (150 to 220px, 200 to 240px when the video is showing, never below the 200px playback minimum in video state) on one paper ground. Artwork never goes full bleed.

## Elevation & Depth

Depth is mostly paper on paper: panels sit flat on the sky ground, separated by a 1px hairline ring rather than a shadow. Soft navy-tinted shadows appear only on things that float above the chart: the cover lens, toasts, the shortcuts popover, the mobile tab bar and a row being dragged. The particle planet behind everything is the real depth of the page; it fades in over 900ms and never carries UI.

### Shadow Vocabulary
- **Low** (shadow-1): the seek thumb and the current list node.
- **Floating** (shadow-2): toasts and the mobile tab bar.
- **Lifted** (shadow-3): the cover lens, the shortcuts popover and a dragged waypoint.
- **Burn Glow** (shadow-burn): the play button and the landing CTA pill, tinted from Burn Press. Nothing else glows.

### Named Rules
On the landing page the same vocabulary holds: figures and service rows rest on hairline rings and rules; the docked mobile instrument floats with the Floating shadow on Sky at 86% opacity; the current chain demo node takes Low. Provider gate cards rest on the hairline ring and gain the Strong Rule ring plus Low on hover.

**The Paper On Paper Rule.** Resting panels are separated by the hairline ring, not by shadow. A shadow means the element floats above the chart.

## Shapes

Corners are gently rounded: 8px for artwork thumbnails, the position input and skeletons; 12px for panels, rows, list nodes and toasts; 20px for the shortcuts popover; full pills for every button, chip, search field, badge and tab. Round shapes are reserved for the play button, waypoint dots and the orbit rings.

The recurring chart geometry: four 9px corner registration ticks drawn 7px inside each rail and the dock in Chart Blue at 70% opacity; a 24px dotted plotting grid on the page ground; a continuous 2px spine through the waypoint dots; dashed outlines for null terminals, unavailable dots and the insert divider; tilted elliptical orbit lines around the cover (a chart-soft circle and a burn ellipse rotated -24 degrees) when the particle scene is unavailable.

The landing stage adds the plotted orbit: a full 1px dashed Chart Soft circle at 80% opacity, satellites as 14px dots with a 2px Chart Blue rim riding on it, and a 1.5px dashed Chart Blue leader line ending in an 8px Chart Blue dot. Landing figures use the large corner (20px) for the chain demo frame and 12px for rows and nodes; the services manifest has no container at all, only full-width hairline rules between rows.

Icons are line icons on a 24px grid with a 1.75 stroke and round caps and joins; transport glyphs (play, pause, next, previous) are filled.

## Components

### Buttons
- **Shape:** full pill (999px), 40px tall, 34px in the small variant.
- **Primary:** Burn Orange fill with navy label, 16px horizontal padding, weight 600 at 0.875rem. Used for the one committing action in view (Insert).
- **Quiet:** Mist fill with navy label, Mist Strong on hover. Used for Cancel and secondary actions.
- **Icon button:** 44px round hit area (32px small), transparent at rest, Mist on hover, Burn Wash with Burn Ink when pressed as a toggle (shuffle, repeat), 0.38 opacity when disabled. The danger variant turns Danger Wash on hover (remove).
- **Hover / Focus:** fills change over 200ms with the out curve; press scales to 0.92 to 0.96 over 120ms. Focus is a 2px paper gap plus a 2px Chart Blue ring.
- **Outline (landing header):** a pill with a 1.5px inset Navy Ink ring, navy label at 0.875rem 600, 9px by 16px padding; hover fills Navy Ink with paper text. Used for the secondary Open Orbit link in the landing header so the hero CTA stays the only burn.
- **Text link (landing):** navy 600 label with a 2px Chart Soft underline at 6px offset that turns Chart Blue on hover ("See how the list works"). Footer links use the plain navy underline at 4px offset.

### CTA Burn (landing signature)
The landing's one action, Open Orbit: a 56px tall burn pill with 32px horizontal padding, the navy CTA Label in Unbounded and the Burn Glow shadow. Hover lightens to Burn Hover over 200ms; press scales to 0.96 over 120ms and drops the glow. It appears twice, under the hero lead and under the closing headline, never both in one viewport.

### Play Burn (signature)
A 72px burn orange disc (64px on mobile) with a navy 30px glyph and the Burn Glow shadow; hover lightens to Burn Hover; press scales to 0.94 and flattens the glow; loading draws a spinning Burn Press arc just outside the disc. It is the single largest action on the page.

### Chips
- **Style:** Sky fill, navy label at 0.8125rem 600, 32px tall pill with a 16px leading icon (First, Last, At #).
- **State:** Mist Strong on hover; the expanded At # chip turns Burn Orange while its position form is open, and sibling chips drop to Mist.

### Cards / Containers
- **Chart panel (rails and dock):** Chart Paper surface, 12px corners, 1px Hairline Rule ring, four corner registration ticks, no shadow, 24px header inset.
- **Toast:** Chart Paper, 12px corners, hairline ring plus Floating shadow, a 28px round status icon on its wash color.

### Inputs / Fields
- **Search and filter:** Sky fill pill, 44px tall (38px for the queue filter), 18px leading search icon, transparent 1px border that becomes Mist Strong on hover.
- **Focus:** fill turns Chart Paper, border Chart Blue, plus a 3px Chart Wash halo.
- **Position input:** 76px wide, 36px tall, 8px corners, Mist Strong border, mono numerals.
- **Error:** Danger border with a 3px Danger Wash halo and a bold Danger message below.

### Navigation
- **Masthead:** wordmark with the orbit glyph in Burn Press on the left, the search field centred over the stage, and on the right undo, redo, player mode, the volume slider and a More button.
- **More menu:** a Chart Paper popover with the hairline ring and Lifted shadow, holding 44px rows with a 20px icon and label (Sleep timer, Settings, Keyboard shortcuts). An active sleep timer shows its countdown as a Burn badge on the More button.
- **Mobile tabs:** three equal pill tabs inside a Chart Paper pill bar with the Floating shadow; the active tab is a navy ink pill with paper text.

### Waypoint Row (signature)
Each queued song is a 12px rounded row: a mono two-digit position, a chart dot on the continuous spine, a 40px artwork thumbnail, title and artist, and a mono duration. Hover or focus tints the row Sky and swaps the duration for up and down move buttons on fine pointers; the position number swaps for a drag grip. The current row is Burn Wash with a Burn Ink number and a 14px burn dot that pulses while playing. Remove sits apart from the move buttons, separated by empty space.

The rail header puts the "Flight plan" title and the playlist picker on one line, with one Ink Two summary line under it: song count, total time and, while playing, "Lands at 15:39". While playing, each upcoming row stacks its duration over its start time (mono 0.6875rem, Ink Two, 24 hour English clock). The current row shows no start time.

### Search Popover
Anchored under the masthead field, as wide as the field, up to 70svh tall, Chart Paper with 16px corners, the hairline ring and Lifted shadow. Escape or a click outside closes it. With an empty field it shows "Recently played" (with Clear) and then "Top charts · <country name>": the top 10 with mono ranks in Ink Two and a quiet "Show all" button. Section titles are Unbounded 600 at 1rem in Ink. Rows are 56px: a 24px rank column, a 40px cover, then title and "artist · length". On wide panels (container 440px and up) a row's actions (Play, Next, First, Last, At #) appear on hover or focus as an overlay on the right with a Sky fade, and the title ellipsizes before it. Touch screens always show the actions on their own line, with Play in the quiet Mist fill.

### Lyrics
Opened from the Lyrics chip, the block sits under the song title on the stage, up to 560px wide and 8.5 to 12.5rem tall (6.5 to 9rem on viewports under 820px tall). Lines are Hanken Grotesk 500 at 1.125rem, centred, in Ink Three. The active line is Ink 600 with a small burn dot, held at about 35% of the block height. The bottom of the block fades out.

### Video Monitor
While a full track plays from YouTube, the monitor is a flush footer of the flight plan rail: a hairline top rule, a caption line with the source and the 200px tall video. The queue list above it ends with a 24px fade. On phones it sits over the cover lens at 200 by 200px.

### Deck Chips
The source ("Full track", "30 s preview") is plain Ink Two caption text, not a chip. Toggle chips (Lyrics, Live sound) are paper pills with a hairline ring; pressed, they take Burn Wash with Burn Ink, like shuffle and repeat. The artist is one line with an ellipsis, with the album on a smaller Ink Three line under it.

### Auto DJ Chip
A toggle chip in the deck chip row, labelled "Auto DJ" with a record and tonearm icon. Pressed, it takes Burn Wash with Burn Ink. While a mix runs only the record turns: the label and width stay fixed so the row never shifts. Under reduced motion the record does not turn.

### Mix Dialog
A modal Chart Paper dialog, 560px wide, with 16px corners, the hairline ring and Lifted shadow over a light navy scrim. Every block sits on one 24px inset: the Unbounded title, the lead, the 44px seed field with a 44px "Make mix" button, the list and the footer. "Make mix" is the Burn primary until results arrive, then turns quiet so "Create playlist" is the only Burn fill. The preview rows carry mono positions (01, 02…), a 40px cover, the title and "artist · length", and a leave-out button. The footer always has Cancel; the mono summary ("Mix · seed · 20 songs · 1:40:24") and Create playlist appear with results. On phones the two buttons share the full width.

### List Node Chain (signature)
The dock plots the list from a null terminal to a null terminal. Each node is a Chart Paper card with 12px corners and a Mist Strong border whose width grows with song duration (minimum 30px); container queries drop the title below 120px, stack index and time below 64px and hide the time below 42px. Between nodes, a paired arrow draws next in Navy Ink and prev in Chart Blue, matching the legend. HEAD and TAIL tags sit above the end nodes in Burn Ink mono. The current node takes the Burn border, Burn Wash fill and Low shadow, and a mono line below names it.

### Progress
A 4px pill track in Mist Strong filled with Burn Orange, a 16px Burn Press thumb with a 3px paper rim, and a seek scale of minute and quarter-minute ticks drawn in rule tones under the track.

### Orbit Stage (landing signature)
The sticky stage holds the particle planet inside the dashed orbit ring. Four satellites (The list, Auto DJ, Lyrics, Landing time) sit on the ring at 90 degree intervals; when a chapter crosses the middle of the viewport, the orbit turns (an animated --turn angle over 1100ms on the out curve) so its satellite swings to the front position at 200 degrees. Without the particle scene (no WebGL or reduced motion) the planet is a flat Chart Wash disc with a paper highlight and a Chart Soft rim, and a 1.5px Burn ellipse rotated -24 degrees at 55% opacity stands in for the planet ring; the ellipse fades out over 600ms once the scene is live.

### Satellites
Each satellite is an in-page link: a 14px paper dot with a 2px Chart Blue rim, beside a paper label pill (4px by 12px, hairline ring, 0.875rem 600 in Ink Two). Labels flip to the side with room so they never leave the viewport. Hover tints the label Sky with navy text. The front satellite is current: its dot fills Burn with a Burn Press rim and a 7px Burn Wash halo, scaled to 1.2 (the active burn dot), and its label becomes a Navy Ink pill with paper text. Only one satellite is current at a time.

### Leader Line
On wide screens a 1.5px dashed Chart Blue line runs from the front satellite's label back to the left edge of the reading column, ending in an 8px Chart Blue dot, so the current chapter is literally plotted to its satellite. It redraws from the satellite outward (scale-x from the right) each time the front changes: hidden for the first 45% of 1100ms, then drawn on the out curve. Hidden at 900px and below.

### Docked Instrument (mobile)
At 900px and below, once the hero has scrolled away, the stage frame docks fixed 12px from the top right corner as a 104px circle on Sky at 86% opacity with the Floating shadow, entering with a 420ms scale-up from 0.6. Inside it the orbit ring and satellites keep turning; labels and the fallback ellipse are hidden and dots shrink to 10px, so the front burn dot alone says which chapter is current.

### Chain Demo
The list chapter's live figure: a Chart Paper frame with 20px corners, the hairline ring and 16px padding. A horizontally scrolling chain runs from a null terminal to a null terminal (dashed Mist Strong outline, 8px corners, Ink Three mono 0.6875rem). Nodes are 112 to 150px wide paper cards with 12px corners, a Mist Strong ring, a mono index in Ink Two and an ellipsized 0.875rem 600 title; HEAD and TAIL tags sit above the end nodes in Burn Ink mono. Between nodes, a 30px link draws next as a Navy Ink arrow and prev as a Chart Blue arrow, matching the player dock. The current node takes Burn Wash with a 1.5px Burn ring and Low shadow. A Burn Ink mono pointer line ("size 4 · current → Dreams") sits under the chain, then a row of 38px Sky action pills (Add first, Add last, Insert at 2, Next, Previous; Mist Strong on hover, 0.95 press) and a polite live log line in Ink Two at 0.875rem explaining which pointers changed. A newly added node drops in over 520ms. At 900px and below the chain's right edge fades out to show it scrolls.

### Auto DJ Volume Plot
A 400 by 164 SVG plot (up to 520px wide) on the paper ground: three hairline grid lines in Hairline Rule, the current song's volume as a 3px round Navy Ink stroke that falls in the last 8 seconds, the next song as a 3px round Chart Blue stroke that rises over 2.5 seconds, and dashed (4 5) Chart Soft markers at the handover points, annotated in Ink Two mono (11 units, 15 on phones). A caption legend pairs 18 by 3px Navy and Chart Blue keys with "Current song" and "Next song".

### Karaoke Sample Lines
Four sample lyric lines in Karaoke Line type and Ink Three, 8px apart. The active line turns Navy Ink 600, scales to 1.03 from its left edge over 500ms and gains a 10px Burn dot before it, echoing the player's lyrics block. While the figure is visible the active line advances every 2.2 seconds; under reduced motion it holds still. An Ink Two caption states the lines were written for the page.

### Sample Flight Plan
The landing time chapter's figure (up to 460px): a Navy Ink mono "Lands at 15:39" line at 0.875rem, then four 52px rows on a 2px Chart Soft spine. Each row is a 36px dot column (12px paper dot with a 2px Chart Blue rim), title (0.875rem 600) over artist (caption, Ink Two), and a mono start time in Ink Two. The current row is Burn Wash with a Burn dot and Burn Press rim and reads "now". Times come from the visitor's clock and refresh every 30 seconds.

### Services Manifest
A full-width list with a hairline rule above the first row and under every row; no cards. Each row is a three-column grid (name, line, status at 230px) on 16px by 12px padding: the service name in Unbounded 600 at 1.125rem, the description in Ink Two, and the status right-aligned at 0.875rem 600. Ready services are link rows into /app/ with the service chosen: hover fills the row Chart Paper and the status carries a drawn chevron. Coming soon and not-set-up services are plain rows with name and status in Ink Two at weight 500. At 900px and below the row becomes name and status on one line with the description wrapping under.

### Landing Header
Absolutely positioned over the hero: the wordmark (Wordmark type with a 28px Burn Press orbit glyph) on the left; on the right a quiet "Source on GitHub" link in Ink Two (underlined on hover, hidden at 900px and below) and the outline Open Orbit pill.

### Provider Gate Cards
Each service is a full-width 72px button card: Chart Paper, 12px corners, hairline ring, 12px by 16px padding, name (1rem 600) over a 0.875rem Ink Two line on the left and the action ("Continue", "Connect", "Coming soon", "Not set up") on the right with an 18px arrow on ready cards. Hover strengthens the ring to Strong Rule and adds Low; press scales to 0.99. The default service (YouTube) carries a 2px Burn ring and a "Default" Burn Wash pill with Burn Ink caption text beside its name; it is the one burn in view. Coming soon and not-set-up cards drop to a transparent ground with an Ink Two action at weight 500; pressing one reveals a polite caption note under the card instead of acting.

## Do's and Don'ts

### Do:
- **Do** keep the page light: Sky Paper ground, Chart Paper panels, navy ink text.
- **Do** frame every primary panel with the hairline ring and the four Chart Blue corner registration ticks.
- **Do** reserve Burn Orange for the current song and the one primary action, with navy ink on top of it.
- **Do** set every changing number (times, positions, sizes) in tabular figures, and data-structure notation in JetBrains Mono.
- **Do** show list structure literally: numbered waypoints on a spine, HEAD and TAIL tags, next in navy and prev in chart blue, null terminals.
- **Do** keep remove actions isolated by space from move and play controls.
- **Do** honor reduced motion: all durations collapse to zero and the title appears without the cascade.
- **Do** give any second Open Orbit link on the landing page the navy outline pill, so the 56px Burn CTA stays the single burn action in view.
- **Do** keep exactly one landing satellite current: burn dot, navy label and, on wide screens, the leader line drawn from it.

### Don't:
- **Don't** build a dark theme or dark full surfaces; navy ink fills only small active elements such as the selected mobile tab.
- **Don't** fall back to the streaming default of sidebar, track table and bottom transport bar.
- **Don't** use white text on Burn Orange or Burn Orange as small text on light grounds.
- **Don't** put shadows on resting panels; reserve them for floating layers.
- **Don't** use Unbounded for body text or JetBrains Mono for headings.
- **Don't** let artwork grow past the fixed lens scale or bleed to the edge.
