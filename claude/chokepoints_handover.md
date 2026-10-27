# Handover: EUISS chokepoints dashboard (state at the end of chat 1)

Read with the project instructions. This note holds what was decided and built in the first chat. Upload it, together with the `chokepoints/` folder, to the project files.

## 1. Where things stand

- **Built and running in dev:** the Drupal-conforming port of the colleague's mockup (`Shockwaves_and_chokepoints_mockup.html`), as a repo folder `chokepoints/` (tree in the README inside it).
- **Tested** in a headless browser against stand-in world shapes: render, selection, sticky map, hash links, endnote links, Patterns tab, phone layout. No console errors.
- **Not yet done:** the real Drupal page test; the real GISCO layers in `data/`; the user's own CSS observations; real content.
- **Wireframes** (approved): https://claude.ai/artifact/5Cy8rbEHyWuNVvT7HFXMvH (landing, chokepoint desktop, chokepoint phone).

## 2. Decisions taken

**Layout**
- Desktop: map left (50%, sticky, 560px tall), chapter text right in normal page flow (no inner scrollbar), endnotes full width under both. Container max 1200px (the real `.content-main` is 1680px wide; cap kept).
- Phone (<= 768px): map on top (340px), text below, "Back to map" button. Optional pinned map in the top third: attribute `data-mobile-sticky` on `.db-root` (built, off by default).
- Map and Patterns tabs and the guiding-questions toggle are kept for now; the user is undecided and leans towards dropping them. Each is easy to remove.
- Region and theme tiles sit above the map (EUISS tile style, 44px touch height).
- No globe: considered and rejected (one hemisphere hides cross-theatre links, drag-rotate fights page scroll, needs canvas). Could return later as an optional view.

**Look**
- Chokepoints = teal `#309ebe` (the user lifted the "teal not for UI" rule for this project: no EU references, it is the parent page's UI colour). Shockwaves = fuchsia2 `#df3144`. No orange anywhere.
- Linked theatre labels = navy fill, white text. Selection = thick black outline. Dimming = flat 0.2, own colour kept.
- Shockwave glow: only the blurred wash breathes (5s per breath, three breaths, then rests; on load and on selection). The sharp rings are static. Reduced motion: nothing animates.
- Fonts: PT Sans Narrow (UI, map), PT Sans (titles, card titles), body copy left to the Drupal theme.

**Map**
- Three GISCO layers drawn bottom to top: country fills (white, no outline), borders (`pol_stat != 0` dashed), coastline. Robinson projection, no ocean fill, no graticule.
- Default view frames all markers (k up to 2.5); zooming out reaches the whole world. Marker and label size never drops below 85%; theatre labels hide when the whole world is shown.
- Wheel zoom only with Ctrl or Cmd, so the page keeps scrolling. Touch: the + and - buttons. One-finger vertical swipes scroll the page.
- Marker tooltips on mouse hover only (via `makeHover`); a tap selects.

**Content and text**
- Chokepoint and shockwave chapters: five sections (stake, risks, bites, prepare, partners), about 140 words each in two paragraphs, 600-800 words per chapter. Region and theme overviews keep their original lengths.
- Endnotes: markers `[[3]]` in the text become Drupal-style links to `#db-endnote-3`; references listed under the map and text. Ids are prefixed `db-` so they never clash with the page's own endnotes.
- `data/content.json` is scrambled placeholder text (lorem ipsum, same shape). Headings, names, card type/value/label captions, the five guiding questions and the author prompts are still real. The real texts exist only in the mockup file the user holds locally. GitHub Pages is public: do not commit real or sensitive text until cleared.

**Link state (URL hash)**
- `#db=choke:c_malacca`, `#db=shock:s_scs`, `#db=theatre:malacca`, `#db=theme:gas`, `#db=region:indo`, `#db=patterns`.
- Written with `replaceState` (no scroll jumps, no back-button clutter); only on user action. Anything not starting `#db=` (Drupal endnotes) is ignored. A shared link scrolls the dashboard into view once. First dashboard on a page only; `data-hash="off"` disables it.

## 3. Content model (`data/content.json`)

Top level: `overview`, `prompts`, `ui`, `sections`, `groups` (indo, west, atl, arc), `theatres` (10), `chokepoints` (11), `shockwaves` (13), `themes` (2).
- Chokepoint: `id, theatre|theme, name, kind, lat, lon, angle, blurb, sections{stake,risks,bites,prepare,partners: [paragraphs]}, data[cards], refs[{n,text}]`.
- Shockwave: same, plus `status, scope, spread[], reach[[lat,lon,label,dy]]`, and `at: <chokepoint id>` when it sits on a chokepoint (position taken from it).
- Theatre: `id, name, short?, group, at, lab{dx,dy,a}, line, themes{}, author`. The `lab` offsets place the map label.
- `ui` holds the mockup's placeholder strings ("Status: placeholder", the card note, the overview note); blank them to remove them.
- Text is escaped, so no HTML in content. If authors need emphasis or links, add a small markup rule.

## 4. Pipeline and files

- **R:** `0 d3 world.R` writes `world_countries.geojson`, `world_borders.geojson`, `world_coast.geojson` to `d3_dir` (1:10M, coordinate precision 3, Antarctica cropped, `PSE` named "Palestine*"). Last run: 259 countries, 348 border segments (24 disputed), 209 coast lines; files 1.8 + 0.3 + 1.3 MB; planar validity TRUE.
- **Front end:** plain ES modules, D3 v7 from the CDN. `config.js` stays in `js/` (BASE_URL from `import.meta.url`). Deploy: push to GitHub Pages; paste `embed/chokepoints.html` into the Drupal body (source mode), replacing `REPO`. Dev: `python -m http.server`, open `index_chokepoints.html` (the wrapper fakes `.content-main` at 1680px and an injected empty paragraph).
- **Chart contract:** `makeDashMap(el, {rows, geo, spec, on})` returns `{el, update(state, {animate})}`. The camera moves only when the focus (selection, theme, region, link) changes.

## 5. Open items, in order

1. **Real Drupal test** (draft page): what the theme overrides; add `!important` only where needed. The sticky offset is `--db-sticky-top` at the top of `db.css` (raise it if the theme has a fixed header).
2. **The user's CSS observations**, ideally collected from the Drupal page with screenshots.
3. **Real map files** into `data/`, then check: label overlaps in the Gulf and South China Sea (adjust `lab`), coastline detail at high zoom, file load time. At 1:10M the Suez and Panama canals are not cut (solid land under the marker). The user mentioned setting "precision to 10": unclear whether that means `res` or `COORDINATE_PRECISION`; check the file sizes of the new run.
4. **Decide:** keep or drop the tabs and the guiding-questions toggle; phone map sticky or not.
5. **Palestine\* footnote:** the name is set in the R script, but the dashboard has no footnote text yet. Add the standard designation footnote wherever Palestine appears in chapter text.
6. **Real content:** agree how authors enter text and references; replace the `ui` placeholder strings; decide whether the guiding questions and prompts stay in the public build.
7. **Later, optional:** URL state for the link (connection) selection in a region; marker tooltips on tap; a globe view.

## 6. Working rules reminder

R does the wrangling and writes tidy CSV/GeoJSON; D3 only draws. The user runs scripts and sends back console output and file sizes before any chart tuning. Minimal, targeted edits; no rewrites. If a needed file is missing, ask; never infer its contents. Do not remark that code cannot be run or is untested.
