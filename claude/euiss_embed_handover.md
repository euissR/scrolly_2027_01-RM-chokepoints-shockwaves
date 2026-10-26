# Handover: EUISS Drupal embeds (for the dashboard project)

Carry-over from the "EUISS scrollytelling" project (Levers of influence, Trump II, Arctic, Energy Risk). The subject and front-end behaviour of the new project differ (dashboard, not scrollyteller). The constants below should stay the same, or at least harmonious, across projects: the Drupal constraints, the EUISS look, and the way files are built and deployed.

Status of this document: written from the scrollytelling project files (`config.js`, `theme.js`, `fa.css`, `main.js`, `scroll.js`, `nav.js`, `chapters.js`, `hover.js`, `lineChart.js`, `landing.js`, and others) plus a worked example of the embed pair: `AF_infra.html` (the block pasted into Drupal) and `index_infra_af.html` (its dev wrapper). The colour inconsistencies found earlier have since been fixed.

---

## 1. Working with the user

- Strong in R. Can read HTML/CSS/JS but cannot write much of it. Claude writes the front-end and should explain changes in plain terms.
- Prefer **minimal, targeted edits** over rewrites. Complexity gets redirected: keep interaction simple.
- Mockup or wireframe review comes before the full build.
- Updated files are sometimes re-uploaded each round, so re-apply earlier changes alongside new ones.
- Data workflow: Claude writes the R scripts, the user runs them and sends back the exports and console checks before any chart tuning.
- **Do not** remark that R/code can't be run in the sandbox or that code is untested. The user knows and finds it tedious.
- **If a file needed for the task is missing, ask for it up front.** Do not infer its contents.
- When flagging text-versus-data issues for an author, flag only real contradictions or obvious data errors, and keep the list short.

## 2. Stack and deployment

- No build step. Plain ES modules; D3 v7 from `https://cdn.jsdelivr.net/npm/d3@7/+esm`. Mapbox GL JS is used only where a basemap is needed.
- Code and data are hosted on **GitHub Pages** (`euissr.github.io/<repo>`). Windows, Git Bash.
- **Drupal body field** gets the pasted embed block (source mode). Intro text, references and any `.fa-crumb` / `.fa-nav` divs are typed into the body outside the block.
- **Dev**: local server (`python -m http.server`) or GitHub Pages, via `index_*.html` wrapper pages with relative paths (`css/fa.css`, `js/main.js`). The wrapper fakes the Drupal body column with `.field--name-body .field__item { max-width: 1200px; margin: 0 auto; padding: 0 1.5rem; }` and a serif stand-in font. It is not part of the build.
- **Prod**: the embed block with absolute URLs. `REPO` is a placeholder replaced per project.

### The embed block (pattern from `AF_infra.html`)

```html
<!-- header comment: what it is, "paste into Drupal body (source mode)", replace REPO,
     every data-step id must exist in js/steps/{region}_{chapter}.js -->
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=PT+Sans+Narrow:wght@400;700&display=swap" />
<link rel="stylesheet" href="https://euissr.github.io/REPO/css/fa.css" />

<div class="fa-scrolly" data-region="AF" data-chapter="infra">
  <div class="fa-steps">
    <h3>Section heading</h3>
    <p class="fa-step" data-step="pro_china">Step text ...</p>
    ...
  </div>
  <div class="fa-stage"></div>   <!-- charts are injected here by main.js -->
</div>

<script type="module" src="https://euissr.github.io/REPO/js/main.js"></script>
```

- The block is self-contained: fonts, stylesheet, markup and script. PT Sans Narrow is loaded by the embed itself from Google Fonts; PT Sans and Merriweather are assumed to come from the Drupal theme.
- Step text is plain `<p>`; per-step chart state lives in `js/steps/`, not in the HTML.
- In the infrastructure example the `.fa-crumb` (top) and `.fa-nav` (bottom) divs exist in the dev page but are **not** in the embed block, so in Drupal they have to be added to the body separately.

### config.js: current behaviour has changed

The current `config.js` (re-confirmed in the latest upload) no longer toggles anything by hand:

```js
export const CONFIG = {
  BASE_URL: new URL("..", import.meta.url).href.replace(/\/$/, ""),
};
```

`BASE_URL` is derived from where `config.js` is served, so the same code runs locally and on GitHub Pages. This relies on `config.js` sitting one folder below the root that holds `data/` (i.e. in `js/`). Everything loads as `${CONFIG.BASE_URL}/data/...` (images from `${CONFIG.BASE_URL}/src/...`). If the dashboard needs an explicit dev/prod switch again, add an override field, but keep this default.

`chapters.js` has its own `isDev` check (hostname is localhost, 127.0.0.1 or `*.github.io`) used only for navigation links. Dev links go to `index_{chapter}_{region}.html`; prod links go to Drupal slugs under `PROD_ROOT`. The dashboard probably needs no equivalent unless it has several pages.

### Folder layout (`css/` and `js/` confirmed by the embed and wrapper; the rest inferred from imports)

```
js/            config.js, theme.js, main.js, scroll.js, nav.js, chapters.js, regions.js ...
js/charts/     one module per chart type, plus hover.js
js/steps/      per-chapter step configs (scrollytelling only)
data/          tidy CSVs and GeoJSON written by R
src/           static images
css/fa.css     shared styles
index_*.html   dev wrapper pages (repo root, next to css/ and js/)
embed/         the block pasted into Drupal, e.g. embed/AF_infra.html
```

## 3. Drupal constraints (the non-negotiables)

Hard-won; most of these have bitten more than one project.

1. **`position: sticky` breaks if any ancestor has `overflow: hidden` / `overflow-x: hidden`.** Do not put it on `html`, `body` or wrappers. The scrollytelling CSS uses `overflow-x: clip` on `html, body` instead, because `clip` does not create a scroll container. The earlier Ukraine publication avoided body overflow rules entirely. A dashboard that doesn't use sticky is less exposed, but keep this in mind for any sticky filter bar.
2. **Drupal injects empty paragraphs** around and inside embedded markup (e.g. `<p> </p>` inside sticky figures). This once caused a tooltip offset bug (the extra line box shifted the canvas visually while hit-testing stayed at the figure origin). Fix by hiding direct-child paragraphs of the chart container, e.g. `.db-root > p { display: none; }`. `fa.css` also has `.fa-scrolly p:empty { display: none; }`. `:empty` only matches a `<p></p>` with nothing at all inside; a paragraph containing a space, a line break or `&nbsp;` does not match. So treat `:empty` as a partial safety net and use the child-combinator rule as the real fix. Use the `.db-` prefix for the dashboard.
3. **Full-bleed breakouts fail.** The `margin-left: calc(-50vw + 50%); width: 100vw` trick gets clipped by `.field--name-body .field__item`. Design to the container width (the scrollytelling charts cap at `max-width: 1200px; margin: 2rem auto`), or use a separate Drupal field/region outside the body container.
4. **`100vw` includes the scrollbar** (~15–17px), which clips the right side. Avoid `100vw` for widths, or set a JS-measured scrollbar-width custom property.
5. **Drupal's theme styles win unless you match them.** Overrides must target Drupal's selector pattern (the drop cap lives on `.text-formatted blockquote p`, not `blockquote::first-letter`). Where needed `!important` is used (e.g. `.fa-card-title`, `.fa-card-subtitle` padding and margins).
6. **Scope everything with a prefix** so nothing leaks into the theme. The scrollytelling project uses `.fa-`. Use a different prefix for the dashboard (e.g. `.db-`) so both can coexist on one Drupal page.
7. **Responsive breakpoint is 768px**, with `100svh` as the mobile fallback for stage heights. Drupal's body column is narrow, so test inside the real Drupal template, not only the dev wrapper.
8. **Endnotes** (when text-heavy): marker `<span id="endnote-003-backlink"><a href="#endnote-003"><sup><b>(3)</b></sup></a></span>`, numbered in reading order. An `<h2>References</h2>` block holds `<p id="endnote-003"><a href="#endnote-003-backlink"><b>3.</b></a>` + tab + text.
9. **Geopolitical labelling:** wherever Palestine / Palestinian territories appears, write "Palestine*" with the standard designation footnote.

## 4. EUISS look

### Fonts
- Charts and UI: **PT Sans Narrow** (`'PT Sans Narrow', 'Arial Narrow', sans-serif`).
- Card titles and descriptions: **PT Sans**.
- Body copy: Merriweather, supplied by the Drupal theme. The scripts do not load fonts themselves; check `embed.html` for how they arrive.

### Palette (from `theme.js`)

| Token | Hex | Use |
|---|---|---|
| teal | `#309ebe` | The EU's colour. **Not for UI**, and not the neutral. |
| navy / teal3 | `#1d3956` | Headings, card numbers, back-to-top, focus rings |
| teal2 | `#376882` | Secondary blue |
| fuchsia / fuchsia2 | `#df3144` | Accent |
| fuchsia3 | `#a41e26` | Dark red |
| lightorange | `#f9b466` | Accent (the stronger `orange #f28d22` is **avoided**) |
| mint | `#99cb92` | Accent |
| egg | `#ffde75` | Accent |
| mauve | `#33163a` | Dark accent |
| grey | `#595959` | Secondary marks, axis lines |
| light | `#c6c6c6` | Borders, grid, inactive/default grey |
| nearWhite | `#f9f9f9` | Page tints |
| ink | `#1d1d1b` | Text |
| muted | `#646363` | Subtitles, footnotes, axis text |
| neutral | `#333333` | Selected tile, hover borders, reference lines (same value in `theme.js` and `fa.css`) |

Other rules:
- **No new colours**: the palette is considered maxed out. Reuse existing ones.
- The same entity keeps the same colour in every chart (`theme.actorColors`, keyed by code; anything without an entry uses `light`).
- Selection is shown by a **thick black outline**, not by fading everything else, because fading skews the perceived value. Where dimming is used, it is a flat opacity of `0.2` (`theme.dim`) that keeps the item's own colour.
- Maps: white land, `#c6c6c6` outlines, no ocean fill, disputed borders taken as-is from GISCO.
- Motion: `theme.duration = 700ms`, set to 0 when `prefers-reduced-motion` is on. CSS transitions respect the same query.

### Settled values
- **Navy** is `#1d3956` (= teal3) in `theme.js` and `fa.css`. An older note listing `#063756` is superseded.
- **Neutral** is `#333333` in both `theme.js` and `fa.css`.

### Reusable components (CSS in `fa.css`)

| Component | Classes | Notes |
|---|---|---|
| Toggle tiles / filters | `.fa-tiles`, `.fa-tile`, `aria-pressed` | White, 1px light border, 2px radius; pressed = neutral fill with white text; `:focus-visible` navy 2px outline; becomes a one-row horizontal scroller on mobile. Natural basis for dashboard filters. |
| Chart frame | `.fa-title`, `.fa-subtitle`, `.fa-map`, `.fa-foot`, `.fa-footnote`, `.fa-credit` | Title 1.5rem bold; subtitle 1.0625rem muted; footnote 0.8125–0.875rem muted; source line at the bottom |
| Symbol key | `.fa-key`, `.fa-key-item` | Inline SVG swatches with 12px muted labels |
| Cards | `.fa-card`, `.fa-card-number`, `.fa-card-title`, `.fa-card-img`, `.fa-card-subtitle`, `.fa-card-desc` | White, soft blue-tinted multi-layer shadow, navy square number, bold balanced subtitle, 13px muted description; one column on mobile |
| Tooltip | `.fa-tooltip` | White, 1px light border, 0.9375rem, max 180px, `pointer-events: none` |
| Hover marker | `hover.js`, `.fa-hover`, `.fa-hover-soft` | Dark ring just outside the hovered shape; tooltip snaps to the point's centre and flips at edges |
| Navigation | `.fa-crumb`, `.fa-nav`, `.fa-nav-btn`, `.fa-top` | Breadcrumb, previous / all / next bar, back-to-top button |
| Slider | `.fa-slider*` | Image carousel with dots and play/pause |

### Layout reference (scrollytelling)
Text left (≈34%, max 28rem) and chart right in a sticky `100vh` stage; on mobile the chart fills the screen and step cards scroll over it. Steps sit about 30vh apart with neighbours at lower opacity. Drop the scroll mechanics for the dashboard, but keep the container width, spacing and type scale.

## 5. Chart module contract (worth keeping in the dashboard)

Every chart is a factory:

```js
const chart = makeX(el, { rows, spec, actors, ...base });
chart.update(state, { animate });   // returns { el, update }
```

- `spec`: static configuration. Titles and subtitles may be strings or `(state) => text`.
- `state`: what changes between views. In the scrollyteller it comes from the active step; in the dashboard it can come straight from the filters or tiles. This is the part that transfers most directly.
- Markup skeleton: `.fa-title`/`.fa-subtitle`, `.fa-map` containing an SVG with `viewBox` and `preserveAspectRatio="xMidYMin meet"`, `.fa-foot` with footnote and source, and `.fa-tooltip`. Aspect ratio is passed in via `--fa-aspect`. SVGs carry `role="img"` and an `aria-label`.
- Keep scales stable across states (no axes jumping between views), and use **one size scale per chart** so the same number is the same size everywhere.
- A missing value (empty cell) is a gap, never a zero. Category nodes that must stay but not render are size 0, not blank.
- Entering and updating items go through `d3.transition()` with `theme.duration`; data joins use stable keys.
- All hover/tooltip behaviour goes through `makeHover(el, tooltip)`.

Chart types that exist: dotMap, rangeChart, tileGrid, sankey, milMap, stackedCols, periodRange, flowBars, panelBars, bubble, lineChart, geoBubbles, overviewMap. Most are written around actors/regions, so expect to adapt rather than reuse as-is.

Scroll engine (`scroll.js`): a plain `scroll` listener (rAF-throttled) that activates the step whose top crosses 75% of the viewport height. `IntersectionObserver` was abandoned because of back-scroll problems. Not needed for the dashboard.

## 6. Data conventions (R side)

- R does parsing, cleaning and shaping and writes tidy CSV/GeoJSON; D3 should do almost no wrangling.
- D3 data goes into one folder (`web/data`, one level above the R working directory); R scripts write there through a single path variable.
- Files follow `{dataset}_{suffix}.csv` (suffix = region code). Shared lookups such as `actors.csv` carry `order` and `label`.
- R scripts are named **with spaces, not underscores** (`0 d3 countries.R`, `dipl_2 vis.R`); region-specific ones take a lowercase suffix after an underscore (`trade_1 partners_me.R`).
- Basemaps: GeoJSON exported from GISCO via an R script (`0 d3 countries.R`), reused across projects.
- Take source data as-is and keep wrangling light. Missing data does not block the build: highlight what's there and note the gap.

## 7. Dashboard-specific points to settle early

These follow from the differences, not from files I could check:

- **State model:** filters/tiles replace scroll steps. Decide whether state is mirrored in the URL hash.
- **Height:** avoid `100vh` stages. A dashboard inside Drupal's body column should size to its content.
- **Width:** design for the container (≈1200px max), not the viewport (see constraint 3 and 4).
- **Multiple instances:** if several dashboards or charts share a page, scope selectors by root element and prefix, as `main.js` does with `.fa-scrolly`.
- **Mobile:** tile rows scroll horizontally; tooltips need a tap equivalent.
- **Naming and prefix:** pick the new CSS prefix now and keep the CSS variable names (`--*-navy`, `--*-ink`, `--*-muted`, `--*-light`, `--*-font`) so a shared base file is possible later.
- **Consider extracting** tokens, tiles, cards, tooltip and hover into one shared base file used by both projects, so the two stay in step.

## 8. What to attach in the new project

So nothing has to be guessed, add: `theme.js`, `config.js`, `fa.css`, `hover.js`, one chart module as a pattern (`lineChart.js` is compact), one embed block plus its dev wrapper (`AF_infra.html` and `index_infra_af.html`), and the R setup script that exports GeoJSON/CSV to the data folder if the dashboard has maps.
