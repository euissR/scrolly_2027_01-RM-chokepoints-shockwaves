// dashboard.js: one dashboard inside one .db-root element.
//
//   makeDashboard(root, { content, geo, useHash });
//
// State lives here; filters, tiles and the text drive it, and the map follows:
//   view    "map" | "pat"
//   sel     { t: "theatre" | "choke" | "shock", id } | null
//   theme   theme id | null          region   region id | null          link   index of a connection in a region | null
//   layers  { th, ch, sh }           gq       guiding questions on or off
//
// Optional attributes on .db-root:
//   data-hash="off"        no link state in the page address (the first dashboard on a page has it by default)
//   data-mobile-sticky     phone layout: the map stays in the top third of the screen while the text scrolls under it

import { makeDashMap } from "./charts/dashMap.js";
import { panelHTML, notesHTML } from "./panel.js";
import { patternsHTML } from "./patterns.js";
import { readRoute, routeOf, writeRoute } from "./hash.js";
import { esc } from "./content.js";

const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
let instances = 0;

export function makeDashboard(root, { content: D, geo, useHash = true }) {
  const uid = `db${++instances}`;
  const state = {
    view: "map",
    sel: null,
    theme: null,
    region: null,
    link: null,
    layers: { th: true, ch: true, sh: true },
    gq: true,
  };

  // ── markup ──────────────────────────────────────────────────────────────
  const regionTiles = Object.keys(D.groups)
    .map((g) => `<button type="button" class="db-tile" data-region="${g}" aria-pressed="false">${esc(D.groups[g].name)}</button>`)
    .join("");
  const themeTiles = D.themes
    .map((th) => `<button type="button" class="db-tile" data-theme="${th.id}" aria-pressed="false">${esc(th.name)}</button>`)
    .join("");

  root.innerHTML = `
    <div class="db-bar">
      <div class="db-tabs" role="tablist" aria-label="Views">
        <button type="button" class="db-tile db-tab" role="tab" id="${uid}-tab-map" aria-controls="${uid}-map" aria-selected="true" data-view="map">Map</button>
        <button type="button" class="db-tile db-tab" role="tab" id="${uid}-tab-pat" aria-controls="${uid}-pat" aria-selected="false" data-view="pat">Patterns</button>
      </div>
      <button type="button" class="db-tile db-gq" aria-pressed="true" title="Show the guiding question under each heading">Guiding questions</button>
    </div>
    <div class="db-filters">
      <div class="db-tiles" role="group" aria-label="Regions"><span class="db-flabel">Region</span>${regionTiles}</div>
      <div class="db-tiles" role="group" aria-label="Themes"><span class="db-flabel">Theme</span>${themeTiles}</div>
    </div>
    <div class="db-view" id="${uid}-map" role="tabpanel" aria-labelledby="${uid}-tab-map">
      <div class="db-main">
        <div class="db-mapcol"><div class="db-map"></div></div>
        <div class="db-textcol"><div class="db-panel" aria-live="polite"></div></div>
      </div>
      <div class="db-notes" hidden></div>
    </div>
    <div class="db-view db-pat" id="${uid}-pat" role="tabpanel" aria-labelledby="${uid}-tab-pat" hidden></div>`;

  const q = (s) => root.querySelector(s);
  const panel = q(".db-panel");
  const notes = q(".db-notes");
  const mapView = q(`#${uid}-map`);
  const patView = q(`#${uid}-pat`);
  const mapcol = q(".db-mapcol");
  const textcol = q(".db-textcol");
  const gqBtn = q(".db-gq");

  const map = makeDashMap(q(".db-map"), {
    rows: D,
    geo,
    on: {
      select: (t, id) => select(t, id),
      toggleLayer: (k) => {
        state.layers[k] = !state.layers[k];
        render();
      },
    },
  });

  // ── state changes (what a click means) ──────────────────────────────────
  function clear() {
    state.sel = null;
    state.theme = null;
    state.region = null;
    state.link = null;
  }
  // a chokepoint or shockwave that belongs to a theme opens with that theme lit
  function setSel(t, id) {
    state.sel = { t, id };
    const e = t === "choke" ? D.C[id] : t === "shock" ? D.S[id] : null;
    if (e?.theme) {
      state.theme = e.theme;
      state.region = null;
    }
  }
  function select(t, id) {
    setSel(t, id);
    render({ user: true });
  }
  function back() {
    clear();
    render({ user: true });
  }
  function pickTheme(id) {
    clear();
    state.theme = id;
    render({ user: true });
  }
  function pickRegion(g) {
    clear();
    state.region = g;
    render({ user: true });
  }
  function pickLink(i) {
    state.link = state.link === i ? null : i;
    render({ user: false });
  }
  function setView(v, { user = true } = {}) {
    state.view = v;
    const isMap = v === "map";
    mapView.hidden = !isMap;
    patView.hidden = isMap;
    gqBtn.hidden = !isMap;
    root.querySelectorAll(".db-tab").forEach((b) => b.setAttribute("aria-selected", b.dataset.view === v));
    if (isMap) {
      render({ user, scroll: false });
    } else {
      patView.innerHTML = patternsHTML(D);
      if (user && useHash) writeRoute(routeOf(state));
    }
  }

  // ── drawing ─────────────────────────────────────────────────────────────
  const activeRegion = () => {
    if (state.region && !state.sel && !state.theme) return state.region;
    const s = state.sel;
    if (!s) return null;
    const e = s.t === "theatre" ? D.T[s.id] : s.t === "choke" ? D.C[s.id] : D.S[s.id];
    const t = s.t === "theatre" ? e : D.T[e.theatre];
    return t?.group ?? null;
  };
  function syncTiles() {
    const rg = activeRegion();
    root.querySelectorAll("[data-region].db-tile").forEach((b) => b.setAttribute("aria-pressed", b.dataset.region === rg));
    root.querySelectorAll("[data-theme].db-tile").forEach((b) => b.setAttribute("aria-pressed", b.dataset.theme === state.theme));
    gqBtn.setAttribute("aria-pressed", state.gq);
  }
  // render({ user }): user = true when a person asked for it (writes the address, scrolls to the text)
  function render({ user = false, animate = true, scroll = user } = {}) {
    panel.innerHTML = panelHTML(state, D);
    notes.innerHTML = notesHTML(state, D);
    notes.hidden = !notes.innerHTML;
    syncTiles();
    map.update(state, { animate });
    if (user && useHash) writeRoute(routeOf(state));
    if (scroll) showText();
  }

  // after a choice, make sure the top of the chapter is on screen (page scrolling, no inner scrollbar)
  function showText() {
    const r = textcol.getBoundingClientRect();
    const stacked = innerWidth <= 768;
    const stuck = stacked && root.hasAttribute("data-mobile-sticky");
    if (r.top < 0 || (stacked && r.top > innerHeight * 0.7)) {
      const offset = (stuck ? mapcol.offsetHeight : 0) + 8;
      scrollTo({ top: scrollY + r.top - offset, behavior: REDUCED ? "auto" : "smooth" });
    }
  }
  function toMap() {
    const r = mapcol.getBoundingClientRect();
    scrollTo({ top: scrollY + r.top - 8, behavior: REDUCED ? "auto" : "smooth" });
  }

  // ── events ──────────────────────────────────────────────────────────────
  // one listener for the panel, the tiles, the tabs and the patterns table
  root.addEventListener("click", (e) => {
    const b = e.target.closest("[data-sel],[data-theme],[data-region],[data-link],[data-back],[data-tomap],[data-view],.db-gq");
    if (!b || !root.contains(b)) return;
    if (b.matches(".db-map *")) return; // the map handles its own
    if (b.dataset.view) return setView(b.dataset.view);
    if (b.matches(".db-gq")) {
      state.gq = !state.gq;
      return render();
    }
    if (b.dataset.sel) {
      const [t, id] = b.dataset.sel.split(":");
      if (state.view !== "map") setView("map", { user: false });
      return select(t, id);
    }
    if (b.dataset.tomap !== undefined) return toMap();
    if (b.dataset.back !== undefined) return back();
    if (b.dataset.link !== undefined) return pickLink(+b.dataset.link);
    if (b.dataset.theme) {
      if (b.classList.contains("db-tile") && state.theme === b.dataset.theme) {
        state.theme = null; // a lit theme tile switches the theme off
        return render({ user: true });
      }
      return pickTheme(b.dataset.theme);
    }
    if (b.dataset.region) {
      if (b.classList.contains("db-tile") && activeRegion() === b.dataset.region) return back();
      return pickRegion(b.dataset.region);
    }
  });
  patView.addEventListener("keydown", (e) => {
    const row = e.target.closest("[data-sel]");
    if (row && e.key === "Enter") row.click();
  });
  root.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && state.view === "map" && (state.sel || state.theme || state.region)) back();
  });

  // ── the address ─────────────────────────────────────────────────────────
  function applyRoute(r) {
    clear();
    if (r.type === "patterns") return setView("pat", { user: false });
    if (state.view !== "map") setView("map", { user: false });
    if (r.type === "theme") state.theme = r.id;
    else if (r.type === "region") state.region = r.id;
    else setSel(r.type, r.id);
  }
  const route = useHash ? readRoute(D) : null;
  if (route) applyRoute(route);
  if (state.view === "map") render({ animate: false });
  if (route) setTimeout(() => root.scrollIntoView({ block: "start", behavior: "auto" }), 250); // a shared link lands on the dashboard
  if (useHash) {
    addEventListener("hashchange", () => {
      const r = readRoute(D); // null for any hash that is not ours (endnotes, other anchors)
      if (!r) return;
      applyRoute(r);
      if (state.view === "map") render({ animate: true, scroll: true });
    });
  }
}
