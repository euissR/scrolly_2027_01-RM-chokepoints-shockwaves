// dashboard.js: one dashboard inside one .db-root element.
//
//   makeDashboard(root, { content, geo, useHash });
//
// State lives here; the tabs, the strip and the text drive it, and the map follows:
//   chap    "intro" | a region id | "concl"       the chapter whose tab is lit
//   sel     { t: "choke" | "shock", id } | null   a sub-chapter of the open region (the map then shows only that place)
//   layers  { ch, sh }                            the chokepoint and shockwave pills
//   gq      guiding questions on or off (always on: no button for now)
//   layer   id of the data layer shown on the map (a "View data" button in the text), or null; never in the address
//
// Optional attributes on .db-root:
//   data-hash="off"        no link state in the page address (the first dashboard on a page has it by default)
//   data-mobile-sticky     phone layout: the map stays in the top third of the screen while the text scrolls under it

import { makeDashMap } from "./charts/dashMap.js";
import { panelHTML, notesHTML, tabsHTML, stripHTML } from "./panel.js";
import { readRoute, routeOf, writeRoute } from "./hash.js";
import { loadLayerRows, keyHTML } from "./layers.js";
import { mountCharts } from "./charts.js";
import { esc } from "./content.js";

const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
let instances = 0;

export function makeDashboard(root, { content: D, geo, useHash = true }) {
  const uid = `db${++instances}`;
  const state = {
    chap: "intro",
    sel: null,
    layers: { ch: true, sh: true },
    layer: null,
    gq: true,
  };

  // ── markup ──────────────────────────────────────────────────────────────
  root.innerHTML = `
    <div class="db-bar"><div class="db-tabs" role="tablist" aria-label="Chapters">${tabsHTML(D)}</div></div>
    <div class="db-strip" role="group" aria-label="Chapters in this region" hidden></div>
    <div class="db-view" id="${uid}-map">
      <div class="db-main">
        <div class="db-mapcol"><div class="db-map"></div><div class="db-datakey" hidden></div></div>
        <div class="db-textcol"><div class="db-panel" aria-live="polite"></div></div>
      </div>
      <div class="db-notes" hidden></div>
    </div>`;

  const q = (s) => root.querySelector(s);
  const panel = q(".db-panel");
  const notes = q(".db-notes");
  const strip = q(".db-strip");
  const mapcol = q(".db-mapcol");
  const textcol = q(".db-textcol");
  const datakey = q(".db-datakey");
  let charts = null; // the inline charts of the open chapter
  let panelKey = null; // what the panel shows; it is rewritten only when that changes

  const map = makeDashMap(q(".db-map"), {
    rows: D,
    geo,
    on: {
      select: (t, id) => go(t, id),
      toggleLayer: (k) => {
        // while a data layer is shown, the pills bring the markers back
        if (state.layer) return setLayer(null);
        state.layers[k] = !state.layers[k];
        render();
      },
    },
  });

  // ── state changes (what a click means) ──────────────────────────────────
  // go("intro" | "concl" | "region" | "choke" | "shock", id)
  function go(kind, id, { user = true } = {}) {
    endTour();
    state.layer = null;
    state.sel = null;
    if (kind === "choke" || kind === "shock") {
      state.sel = { t: kind, id };
      state.chap = (kind === "choke" ? D.C[id] : D.S[id]).region;
    } else {
      state.chap = kind === "region" ? id : kind;
    }
    render({ user });
  }
  // show a data layer on the map (null = hide it); its rows load once, the map follows when they are in
  function setLayer(id) {
    state.layer = id;
    const def = id && D.layers?.[id];
    if (def && !def.rows) {
      loadLayerRows(def)
        .then(() => state.layer === id && render())
        .catch((err) => {
          console.error(err);
          if (state.layer === id) setLayer(null);
        });
    }
    render({ scroll: false });
    if (id && innerWidth <= 768) toMap(); // on a phone the map sits above the text
  }

  // ── drawing ─────────────────────────────────────────────────────────────
  const tabId = () =>
    state.chap === "intro"
      ? "intro:intro"
      : state.chap === "concl"
        ? "concl:concl"
        : `region:${state.chap}`;
  function syncTabs() {
    const on = tabId();
    root
      .querySelectorAll(".db-tab")
      .forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === on));
  }
  // the "View data" buttons in the text and the key under the map follow state.layer
  function syncLayerUI() {
    const def = state.layer && D.layers?.[state.layer];
    panel.querySelectorAll("[data-layer-id]").forEach((b) => {
      const on = b.dataset.layerId === state.layer;
      b.setAttribute("aria-pressed", on);
      b.querySelector(".db-databtn-t").textContent = on
        ? `On the map: ${D.layers[b.dataset.layerId].title} · Hide`
        : b.dataset.label;
    });
    const k = def?.rows ? state.layer : "";
    if (datakey.dataset.k !== k) {
      datakey.dataset.k = k;
      datakey.innerHTML = k ? keyHTML(def) : "";
    }
    datakey.hidden = !k;
  }
  // render({ user }): user = true when a person asked for it (writes the address, scrolls to the text)
  function render({ user = false, animate = true, scroll = user } = {}) {
    // the panel (and its charts) is rebuilt only when the chapter changes, not for a layer or a pill
    const pk = [routeOf(state), state.gq].join("|");
    if (pk !== panelKey) {
      const html = panelHTML(state, D); // built first: if it fails, the next click tries again
      panelKey = pk;
      charts?.destroy();
      panel.innerHTML = html;
      charts = mountCharts(panel, D);
      notes.innerHTML = notesHTML(state, D);
      notes.hidden = !notes.innerHTML;
      strip.innerHTML = stripHTML(state, D);
      strip.hidden = !strip.innerHTML;
    }
    syncLayerUI();
    syncTabs();
    map.update(state, { animate });
    if (user && useHash) writeRoute(routeOf(state));
    if (scroll) showText();
  }

  // after a choice, make sure the top of the chapter is on screen (page scrolling, no inner scrollbar)
  function showText() {
    const stacked = innerWidth <= 768;
    if (!stacked) {
      const r = root.getBoundingClientRect(); // desktop: the tabs and the strip stay in view with the text
      if (r.top < 0)
        scrollTo({
          top: scrollY + r.top - 8,
          behavior: REDUCED ? "auto" : "smooth",
        });
      return;
    }
    const r = textcol.getBoundingClientRect();
    const stuck = root.hasAttribute("data-mobile-sticky");
    if (r.top < 0 || r.top > innerHeight * 0.7) {
      const offset = (stuck ? mapcol.offsetHeight : 0) + 8;
      scrollTo({
        top: scrollY + r.top - offset,
        behavior: REDUCED ? "auto" : "smooth",
      });
    }
  }
  function toMap() {
    const r = mapcol.getBoundingClientRect();
    scrollTo({
      top: scrollY + r.top - 8,
      behavior: REDUCED ? "auto" : "smooth",
    });
  }

  // ── the tour: three steps, each circling a real element on the page ─────
  // Rings and cards live inside the element they point at (the tab bar, the sticky map column),
  // so they stay put while the page scrolls.
  let tour = null; // step index, or null
  let tourEls = [];
  function endTour() {
    if (tour === null) return;
    tour = null;
    tourEls.forEach((n) => n.remove());
    tourEls = [];
  }
  function showTour(i, { scroll = true } = {}) {
    const steps = D.intro.tour;
    tourEls.forEach((n) => n.remove());
    tourEls = [];
    tour = i;
    const st = steps[i];
    const bar = q(".db-bar");
    const mapEl = q(".db-map");
    const host = st.target === "tabs" ? bar : mapcol;
    const hostR = host.getBoundingClientRect();
    const rel = (el, pad) => {
      const r = el.getBoundingClientRect();
      return `left:${r.left - hostR.left - pad}px;top:${r.top - hostR.top - pad}px;width:${r.width + 2 * pad}px;height:${r.height + 2 * pad}px`;
    };
    let target = st.target === "tabs" ? q(".db-tabs") : mapEl;
    const round = st.target === "marker";
    if (round) {
      target =
        q(`.db-mk[data-key="${st.marker}"] .db-hit`) ?? q(".db-ck .db-hit");
    }
    const ring = document.createElement("div");
    ring.className = `db-ring${round ? " db-ring--round" : ""}`;
    ring.setAttribute("style", rel(target, round ? 6 : 5));
    const card = document.createElement("div");
    card.className = `db-tourcard db-tourcard--${st.target === "tabs" ? "below" : "side"}`;
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-label", "Tour");
    card.innerHTML = `<div class="db-tour-n">${i + 1} of ${steps.length}</div><h3 class="db-h3 db-h3--sm">${esc(st.title)}</h3><p>${esc(st.text)}</p>
      <div class="db-tour-btns">${i ? '<button type="button" class="db-tourbtn db-tourbtn--ghost" data-tour="back">Back</button>' : ""}<button type="button" class="db-tourbtn" data-tour="next">${i === steps.length - 1 ? "Done" : "Next"}</button><button type="button" class="db-tourbtn db-tourbtn--ghost" data-tour="end">Skip</button></div>`;
    host.append(ring, card);
    tourEls = [ring, card];
    if (scroll) {
      const r = (st.target === "tabs" ? bar : mapEl).getBoundingClientRect();
      const out = r.top < 0 || r.bottom > innerHeight;
      if (out)
        scrollTo({
          top: scrollY + r.top - 8,
          behavior: REDUCED ? "auto" : "smooth",
        });
    }
    card.querySelector('[data-tour="next"]').focus({ preventScroll: true });
  }
  function tourClick(act) {
    if (act === "start") return showTour(0);
    if (act === "end") return endTour();
    if (act === "back") return showTour(tour - 1);
    if (tour + 1 >= D.intro.tour.length) return endTour();
    showTour(tour + 1);
  }
  new ResizeObserver(
    () => tour !== null && showTour(tour, { scroll: false }),
  ).observe(root);

  // ── events ──────────────────────────────────────────────────────────────
  // one listener for the panel, the tabs, the strip and the tour
  root.addEventListener("click", (e) => {
    const b = e.target.closest(
      "[data-go],[data-tomap],[data-layer-id],[data-layer-off],[data-tour]",
    );
    if (!b || !root.contains(b)) return;
    if (b.matches(".db-map *")) return; // the map handles its own
    if (b.dataset.tour) return tourClick(b.dataset.tour);
    if (b.dataset.layerOff !== undefined) return setLayer(null);
    if (b.dataset.layerId)
      return setLayer(
        state.layer === b.dataset.layerId ? null : b.dataset.layerId,
      );
    if (b.dataset.tomap !== undefined) return toMap();
    if (b.dataset.go) {
      const [kind, id] = b.dataset.go.split(":");
      return go(kind, id);
    }
  });
  root.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (tour !== null) return endTour();
    if (state.layer) return setLayer(null);
    if (state.sel) go("region", state.chap); // back to the region overview
  });

  // ── the address ─────────────────────────────────────────────────────────
  function applyRoute(r) {
    state.layer = null;
    state.sel = null;
    if (r.type === "intro" || r.type === "concl") state.chap = r.type;
    else if (r.type === "region") state.chap = r.id;
    else {
      state.sel = { t: r.type, id: r.id };
      state.chap = (r.type === "choke" ? D.C[r.id] : D.S[r.id]).region;
    }
  }
  const route = useHash ? readRoute(D) : null;
  if (route) applyRoute(route);
  render({ animate: false });
  if (route)
    setTimeout(
      () => root.scrollIntoView({ block: "start", behavior: "auto" }),
      250,
    ); // a shared link lands on the dashboard
  if (useHash) {
    addEventListener("hashchange", () => {
      const r = readRoute(D); // null for any hash that is not ours (endnotes, other anchors)
      if (!r) return;
      endTour();
      applyRoute(r);
      render({ animate: true, scroll: true });
    });
  }
}
