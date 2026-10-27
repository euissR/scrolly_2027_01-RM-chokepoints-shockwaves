// dashMap.js: world map of theatres, chokepoints and shockwaves.
//
//   const map = makeDashMap(el, { rows, geo, spec, on });
//   map.update(state, { animate });
//
// rows: the indexed content (content.js): theatres, chokepoints, shockwaves, groups, T/C/S lookups
// geo:  { countries, borders, coast } from "0 d3 world.R"
//       three layers, drawn bottom to top: country fills (no outline), borders (disputed ones dashed), coastline
// spec: { width }   drawing width in map units (default 1000)
// on:   { select(type, id), toggleLayer(key) }   what the map reports back
//
// state it reads: { sel: {t, id}, theme, region, link, layers: {th, ch, sh} }
// The camera follows the focus (selection, theme, region, link): it moves only when that changes,
// so toggling a layer or the guiding questions never throws the reader's own pan and zoom away.
// With nothing selected it frames all the places on the map; zooming out reaches the whole world.
//
// Same map style as the other EUISS maps: Robinson projection, white land, light-grey outlines,
// no ocean fill. Dimmed items keep their own colour at theme.dim opacity (set in db.css).

import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { theme } from "../theme.js";
import { geoRobinson } from "../robinson.js";
import { makeHover } from "./hover.js";
import { esc } from "../content.js";

const NS = "http://www.w3.org/2000/svg";
const HALO = { local: 16, regional: 28, global: 46 }; // size of the soft wash behind a shockwave
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
let count = 0;

const make = (name, attrs = {}, parent) => {
  const n = document.createElementNS(NS, name);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
};

export function makeDashMap(el, { rows: D, geo, spec = {}, on }) {
  const W = spec.width ?? 1000;
  const M = 4; // margin inside the drawing
  const uid = `dbm${++count}`;

  // ── projection: the whole world from 84°N down to Tierra del Fuego (56°S), fitted to the width ──
  const extent = {
    type: "MultiPoint",
    coordinates: [
      [-180, 0],
      [180, 0],
      [0, 84],
      [0, -56],
    ],
  };
  const projection = geoRobinson().fitWidth(W - 2 * M, extent);
  const [tx, ty] = projection.translate();
  projection.translate([tx + M, ty + M]);
  const path = d3.geoPath(projection);
  const H = Math.ceil(path.bounds(extent)[1][1] + M);
  const V0 = [0, 0, W, H]; // the default view: the whole world
  const proj = (lat, lon) => projection([lon, lat]);

  // positions in map units, by id
  const XY = { t: {}, c: {}, s: {} };
  D.theatres.forEach((t) => (XY.t[t.id] = proj(t.at[0], t.at[1])));
  D.chokepoints.forEach((c) => (XY.c[c.id] = proj(c.lat, c.lon)));
  D.shockwaves.forEach((s) => (XY.s[s.id] = proj(s.lat, s.lon)));

  // ── markup ──────────────────────────────────────────────────────────────
  el.innerHTML = `
    <svg class="db-svg" role="group" aria-label="${esc(spec.alt ?? "World map of maritime theatres, chokepoints and shockwaves. Every place on it can also be chosen from the text next to the map.")}">
      <defs>
        <radialGradient id="${uid}-wash">
          <stop offset="0" stop-color="${theme.fuchsia2}" stop-opacity=".34"/>
          <stop offset=".55" stop-color="${theme.fuchsia2}" stop-opacity=".12"/>
          <stop offset="1" stop-color="${theme.fuchsia2}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <g class="db-vp">
        <path class="db-land"/>
        <path class="db-bord"/>
        <path class="db-bord db-bord--disp"/>
        <path class="db-coast"/>
        <g class="db-links"></g>
        <g class="db-washes"></g>
        <g class="db-selwave"></g>
      </g>
      <g class="db-markers"></g>
    </svg>
    <div class="db-ctl db-layers" role="group" aria-label="Map layers">
      <button type="button" class="db-pill" data-layer="th" aria-pressed="true"><svg class="db-sw" viewBox="0 0 16 16" aria-hidden="true"><rect x="1.5" y="1.5" width="13" height="13" rx="2" fill="none" stroke="${theme.navy}" stroke-width="1.5"/><text x="8" y="12" text-anchor="middle" class="db-sw-t">T</text></svg>Theatres</button>
      <button type="button" class="db-pill" data-layer="ch" aria-pressed="true"><svg class="db-sw" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 2H14L8 7.2Z M2 14H14L8 8.8Z" fill="${theme.teal}" stroke="${theme.ink}" stroke-width="1.3" stroke-linejoin="round"/></svg>Chokepoints</button>
      <button type="button" class="db-pill" data-layer="sh" aria-pressed="true"><svg class="db-sw" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="2.4" fill="${theme.fuchsia2}"/><circle cx="8" cy="8" r="5.6" fill="none" stroke="${theme.fuchsia2}" stroke-width="1.5"/></svg>Shockwaves</button>
    </div>
    <div class="db-ctl db-zoom">
      <button type="button" class="db-zb" data-zoom="in" aria-label="Zoom in">+</button>
      <button type="button" class="db-zb" data-zoom="out" aria-label="Zoom out">−</button>
    </div>
    <div class="db-tooltip" aria-hidden="true"></div>`;

  const svg = el.querySelector(".db-svg");
  const q = (s) => svg.querySelector(s);
  const markers = q(".db-markers");
  const washLayer = q(".db-washes");
  const selWave = q(".db-selwave");
  const linkLayer = q(".db-links");
  const tooltip = d3.select(el.querySelector(".db-tooltip"));
  const hover = makeHover(el, tooltip);

  // ── the three world layers ──────────────────────────────────────────────
  const fc = (features) => ({ type: "FeatureCollection", features });
  const disputed = (f) => f.properties.pol_stat !== 0;
  q(".db-land").setAttribute("d", path(geo.countries));
  q(".db-bord:not(.db-bord--disp)").setAttribute(
    "d",
    path(fc(geo.borders.features.filter((f) => !disputed(f)))),
  );
  q(".db-bord--disp").setAttribute(
    "d",
    path(fc(geo.borders.features.filter(disputed))),
  );
  // q(".db-coast").setAttribute("d", path(geo.coast));

  // ── camera: a viewBox that follows { cx, cy, k } ────────────────────────
  let cam = { cx: V0[0] + V0[2] / 2, cy: V0[1] + V0[3] / 2, k: 1 };
  let scale = 1;
  const pxItems = []; // { g, x, y }: groups drawn at constant screen size

  const place = (g, xy) => {
    pxItems.push({ g, x: xy[0], y: xy[1] });
    return g;
  };
  function placeAll() {
    const s = Math.max(0.85, Math.min(1, scale / 1.1)) / scale; // never smaller than 85%: labels stay readable
    pxItems.forEach((i) =>
      i.g.setAttribute("transform", `translate(${i.x} ${i.y}) scale(${s})`),
    );
  }
  function applyCam() {
    const w = V0[2] / cam.k;
    const h = V0[3] / cam.k;
    svg.setAttribute(
      "viewBox",
      `${cam.cx - w / 2} ${cam.cy - h / 2} ${w} ${h}`,
    );
    const r = svg.getBoundingClientRect();
    scale = Math.min(r.width / w, r.height / h) || 1;
    svg.classList.toggle("is-showlabels", scale >= 2.4);
    markers.classList.toggle("is-hidelabels", scale < 0.7); // the whole world in a narrow frame: markers only
    placeAll();
  }
  const clamp = (c) => {
    const k = Math.max(1, Math.min(9, c.k));
    const w = V0[2] / k;
    const h = V0[3] / k;
    return {
      k,
      cx: Math.max(
        V0[0] - 60 + w / 2,
        Math.min(V0[0] + V0[2] + 60 - w / 2, c.cx),
      ),
      cy: Math.max(
        V0[1] - 40 + h / 2,
        Math.min(V0[1] + V0[3] + 40 - h / 2, c.cy),
      ),
    };
  };
  // the camera that frames a set of map points, with padding
  function fitTarget(pts, opts = {}) {
    const padFrac = opts.padFrac ?? 0.4;
    const minSpan = opts.minSpan ?? 50;
    const maxK = opts.maxK ?? 9;
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const [x0, x1, y0, y1] = [
      Math.min(...xs),
      Math.max(...xs),
      Math.min(...ys),
      Math.max(...ys),
    ];
    let w = Math.max(x1 - x0, minSpan);
    let h = Math.max(y1 - y0, minSpan);
    w += w * padFrac * 2;
    h += h * padFrac * 2;
    return clamp({
      cx: (x0 + x1) / 2,
      cy: (y0 + y1) / 2,
      k: Math.min(maxK, Math.min(V0[2] / w, V0[3] / h)),
    });
  }
  function moveCam(target, animate) {
    const sel = d3.select(svg);
    sel.interrupt("cam");
    const dur = animate ? theme.duration : 0;
    if (!dur) {
      cam = target;
      applyCam();
      return;
    }
    const from = { ...cam };
    const lk0 = Math.log(from.k);
    const lk1 = Math.log(target.k);
    sel
      .transition("cam")
      .duration(dur)
      .ease(d3.easeCubicInOut)
      .tween("cam", () => (t) => {
        cam = clamp({
          cx: from.cx + (target.cx - from.cx) * t,
          cy: from.cy + (target.cy - from.cy) * t,
          k: Math.exp(lk0 + (lk1 - lk0) * t),
        });
        applyCam();
      });
  }

  // points that belong to a theatre, region or theme
  const pointsForTheatre = (t) => [
    XY.t[t.id],
    ...D.chokepoints.filter((c) => c.theatre === t.id).map((c) => XY.c[c.id]),
    ...D.shockwaves.filter((s) => s.theatre === t.id).map((s) => XY.s[s.id]),
  ];
  const pointsForRegion = (g) =>
    D.theatres.filter((t) => t.group === g).flatMap(pointsForTheatre);
  const pointsForTheme = (th) => [
    ...D.chokepoints.filter((c) => c.theme === th).map((c) => XY.c[c.id]),
    ...D.shockwaves.filter((s) => s.theme === th).map((s) => XY.s[s.id]),
    ...D.theatres.filter((t) => t.themes[th]).map((t) => XY.t[t.id]),
  ];
  const selPoint = (s) =>
    s.t === "theatre" ? XY.t[s.id] : s.t === "choke" ? XY.c[s.id] : XY.s[s.id];

  function targetFor(st) {
    const s = st.sel;
    if (s) {
      return s.t === "theatre"
        ? fitTarget(pointsForTheatre(D.T[s.id]), {
            padFrac: 0.6,
            minSpan: 40,
            maxK: 9,
          })
        : fitTarget([selPoint(s)], { padFrac: 0.8, minSpan: 10, maxK: 9 });
    }
    if (st.theme)
      return fitTarget(pointsForTheme(st.theme), {
        padFrac: 0.35,
        minSpan: 60,
        maxK: 6,
      });
    if (st.region) {
      if (st.link != null) {
        const pts = D.groups[st.region].links[st.link].theatres.flatMap((id) =>
          pointsForTheatre(D.T[id]),
        );
        return fitTarget(pts, { padFrac: 0.35, minSpan: 55, maxK: 9 });
      }
      return fitTarget(pointsForRegion(st.region), {
        padFrac: 0.4,
        minSpan: 55,
        maxK: 9,
      });
    }
    // overview: frame every place on the map (the world beyond them is one zoom-out away)
    const all = [
      ...Object.values(XY.t),
      ...Object.values(XY.c),
      ...Object.values(XY.s),
    ];
    return fitTarget(all, { padFrac: 0.12, minSpan: 60, maxK: 2.5 });
  }

  // ── markers ─────────────────────────────────────────────────────────────
  const els = { th: {}, ck: {}, sk: {} };
  const washes = {};
  const labels = []; // theatre labels, measured once visible and fonts are in
  let moved = false; // a drag just happened: the click that ends it is not a selection

  // click and keyboard on a marker
  function activate(g, fn) {
    g.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!moved) fn();
    });
    g.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        fn();
      }
    });
  }
  // tooltip on hover for a mouse; a touch screen goes straight to selecting
  function bindTip(g, hit, name, sub) {
    g.addEventListener("pointerenter", (e) => {
      if (e.pointerType !== "mouse" || drag) return;
      tooltip
        .html(`<strong>${esc(name)}</strong><br>${esc(sub)}`)
        .style("opacity", 1);
      hover.enter(e, { mark: hit });
    });
    g.addEventListener("pointerleave", hover.leave);
  }

  // impact washes: a soft fuchsia glow whose size reflects the shockwave's reach
  D.shockwaves.forEach((s) => {
    washes[s.id] = make(
      "circle",
      {
        cx: XY.s[s.id][0],
        cy: XY.s[s.id][1],
        r: HALO[s.scope],
        fill: `url(#${uid}-wash)`,
        class: "db-wash",
      },
      washLayer,
    );
  });

  // theatre labels
  D.theatres.forEach((t) => {
    const g = make(
      "g",
      {
        class: "db-mk db-tl",
        tabindex: 0,
        role: "button",
        "aria-label": `${t.name} (theatre)`,
      },
      markers,
    );
    const rect = make("rect", {}, g);
    const text = make(
      "text",
      { x: t.lab.dx, y: t.lab.dy, "text-anchor": t.lab.a },
      g,
    );
    text.textContent = t.short || t.name;
    labels.push({ rect, text });
    activate(g, () => on.select("theatre", t.id));
    els.th[t.id] = place(g, XY.t[t.id]);
  });

  // shockwave epicentres
  D.shockwaves.forEach((s) => {
    const g = make(
      "g",
      {
        class: "db-mk db-sk",
        tabindex: 0,
        role: "button",
        "aria-label": `${s.name} (shockwave)`,
      },
      markers,
    );
    const hit = make(
      "circle",
      { class: `db-hit${s.coincident ? " db-hit--ring" : ""}`, r: 14 },
      g,
    );
    if (!s.coincident) make("circle", { class: "db-core", r: 4 }, g);
    make("circle", { class: "db-r1", r: s.coincident ? 15 : 10 }, g);
    make("circle", { class: "db-r2", r: s.coincident ? 21 : 16 }, g);
    const lb = make(
      "text",
      {
        class: "db-lb",
        x: 0,
        y: s.coincident ? 36 : 28,
        "text-anchor": "middle",
      },
      g,
    );
    lb.textContent = s.name;
    activate(g, () => on.select("shock", s.id));
    bindTip(g, hit, s.name, `Shockwave · ${s.status}`);
    els.sk[s.id] = place(g, XY.s[s.id]);
  });

  // chokepoints: a gate that pinches the shipping lane
  D.chokepoints.forEach((c) => {
    const g = make(
      "g",
      {
        class: "db-mk db-ck",
        tabindex: 0,
        role: "button",
        "aria-label": `${c.name} (chokepoint)`,
      },
      markers,
    );
    const hit = make("circle", { class: "db-hit", r: 11 }, g);
    const rot = make("g", { transform: `rotate(${c.angle}) scale(1.2)` }, g);
    make("path", { class: "db-wedge db-wedge--a", d: "M-8-10H8L0-1.4Z" }, rot);
    make("path", { class: "db-wedge db-wedge--b", d: "M-8 10H8L0 1.4Z" }, rot);
    [0, 0.8, 1.6].forEach((delay) => {
      const ship = make(
        "circle",
        {
          class: "db-ship",
          cy: 0,
          r: 2.2,
          cx: REDUCED ? delay * 15 - 12 : -26,
        },
        rot,
      );
      if (!REDUCED) {
        make(
          "animate",
          {
            attributeName: "cx",
            from: -26,
            to: 26,
            dur: "2.4s",
            begin: `${delay}s`,
            repeatCount: "indefinite",
          },
          ship,
        );
      }
    });
    const lb = make(
      "text",
      { class: "db-lb", x: 0, y: -20, "text-anchor": "middle" },
      g,
    );
    lb.textContent = c.name;
    activate(g, () => on.select("choke", c.id));
    bindTip(g, hit, c.name, `Chokepoint · ${c.kind}`);
    els.ck[c.id] = place(g, XY.c[c.id]);
  });

  const reachLayer = make("g", {}, markers);

  // size the label boxes to their text; needs the map to be visible and the font loaded
  let measured = false;
  function measure() {
    if (!el.offsetParent) return;
    labels.forEach(({ rect, text }) => {
      const bb = text.getBBox();
      rect.setAttribute("x", bb.x - 6);
      rect.setAttribute("y", bb.y - 2);
      rect.setAttribute("width", bb.width + 12);
      rect.setAttribute("height", bb.height + 4);
      rect.setAttribute("rx", 2);
    });
    measured = true;
  }
  document.fonts?.ready.then(() => {
    measured = false;
    measure();
  });

  // a few slow breaths of the wash (CSS runs them three times, then it rests)
  function breathe(ids) {
    if (REDUCED) return;
    ids.forEach((id) => {
      const w = washes[id];
      w.classList.remove("is-breathing");
      void w.getBoundingClientRect(); // restart the animation
      w.classList.add("is-breathing");
    });
  }

  // ── selection: rings around the epicentre and the places it reaches ──────
  function drawSelection(st) {
    selWave.replaceChildren();
    reachLayer.replaceChildren();
    for (let i = pxItems.length - 1; i >= 0; i--)
      if (pxItems[i].reach) pxItems.splice(i, 1);
    const sel = st.sel;
    if (!sel || sel.t !== "shock") return;
    const s = D.S[sel.id];
    const [x, y] = XY.s[s.id];
    let R = 0;
    s.reach.forEach((r) => {
      const [rx, ry] = proj(r[0], r[1]);
      R = Math.max(R, Math.hypot(rx - x, ry - y));
    });
    R = Math.min(Math.max(R * 1.05, 60), 340);
    [1 / 3, 2 / 3, 1].forEach((f, i) =>
      make(
        "circle",
        { cx: x, cy: y, r: R * f, class: `db-sw-ring db-sw-ring--${i + 1}` },
        selWave,
      ),
    );
    s.reach.forEach((r, i) => {
      const outer = make("g", {}, reachLayer);
      const g = make(
        "g",
        { class: "db-rn", style: `animation-delay:${0.25 + i * 0.18}s` },
        outer,
      );
      make("circle", { class: "db-rn-halo", r: 9 }, g);
      make("circle", { class: "db-rn-dot", r: 4.5 }, g);
      const late = r[1] > 110; // labels near the right edge read leftwards
      const t = make(
        "text",
        {
          x: late ? -13 : 13,
          y: r[3] ?? 4,
          "text-anchor": late ? "end" : "start",
        },
        g,
      );
      t.textContent = r[2];
      place(outer, proj(r[0], r[1]));
      pxItems[pxItems.length - 1].reach = true;
    });
    placeAll();
  }

  // links between theatres, when a region is open
  function drawLinks(st) {
    linkLayer.replaceChildren();
    if (!st.region || st.sel || st.theme) return;
    D.groups[st.region].links.forEach((lk, i) => {
      const pts = lk.theatres.map((id) => XY.t[id]);
      for (let n = 0; n < pts.length - 1; n++) {
        const [x1, y1] = pts[n];
        const [x2, y2] = pts[n + 1];
        const dx = x2 - x1;
        const dy = y2 - y1;
        const d = Math.hypot(dx, dy) || 1;
        const c = d * 0.16;
        const mx = (x1 + x2) / 2 - (dy / d) * c;
        const my = (y1 + y2) / 2 + (dx / d) * c;
        make(
          "path",
          {
            d: `M${x1},${y1} Q${mx},${my} ${x2},${y2}`,
            class: `db-lk${st.link === i ? " is-on" : ""}`,
          },
          linkLayer,
        );
      }
    });
  }

  // ── what is lit, dimmed or selected ─────────────────────────────────────
  const focusTheatre = (s) => {
    if (!s) return null;
    if (s.t === "theatre") return s.id;
    return (s.t === "choke" ? D.C[s.id] : D.S[s.id]).theatre || null;
  };
  function refresh(st) {
    const ft = focusTheatre(st.sel);
    const th = st.theme;
    const rg = st.region;
    const L = st.layers;
    const lk =
      rg && !st.sel && st.link != null ? D.groups[rg].links[st.link] : null;
    const dimFor = (tid) =>
      ft
        ? ft !== tid
        : th
          ? !D.T[tid].themes[th]
          : rg
            ? lk
              ? !lk.theatres.includes(tid)
              : D.T[tid].group !== rg
            : false;
    const itemDim = (e) => {
      if (e.theatre) return dimFor(e.theatre);
      if (ft) return true;
      if (th) return th !== e.theme;
      if (rg) return true;
      return false;
    };
    const isSel = (t, id) => !!st.sel && st.sel.t === t && st.sel.id === id;

    D.theatres.forEach((t) => {
      const g = els.th[t.id];
      g.style.display = L.th ? "" : "none";
      g.classList.toggle("is-sel", isSel("theatre", t.id));
      g.classList.toggle(
        "is-linked",
        !!(th && t.themes[th]) ||
          (!!rg && (lk ? lk.theatres.includes(t.id) : t.group === rg)),
      );
      g.classList.toggle("is-dim", dimFor(t.id));
    });
    D.chokepoints.forEach((c) => {
      const g = els.ck[c.id];
      g.style.display = L.ch ? "" : "none";
      g.classList.toggle("is-sel", isSel("choke", c.id));
      g.classList.toggle("is-dim", itemDim(c));
    });
    D.shockwaves.forEach((s) => {
      const g = els.sk[s.id];
      g.style.display = L.sh ? "" : "none";
      g.classList.toggle("is-sel", isSel("shock", s.id));
      g.classList.toggle("is-dim", itemDim(s));
      washes[s.id].style.display = L.sh ? "" : "none";
      washes[s.id].classList.toggle("is-dim", itemDim(s));
    });
    el.querySelectorAll("[data-layer]").forEach((b) =>
      b.setAttribute("aria-pressed", L[b.dataset.layer]),
    );
    drawSelection(st);
    drawLinks(st);
  }

  // ── pan and zoom ────────────────────────────────────────────────────────
  function zoomAt(f, sx, sy) {
    const r = svg.getBoundingClientRect();
    const w = V0[2] / cam.k;
    const h = V0[3] / cam.k;
    const s = Math.min(r.width / w, r.height / h);
    const mx = cam.cx + (sx - (r.left + r.width / 2)) / s;
    const my = cam.cy + (sy - (r.top + r.height / 2)) / s;
    const nk = Math.max(1, Math.min(9, cam.k * f));
    const ratio = cam.k / nk;
    cam = clamp({
      k: nk,
      cx: mx + (cam.cx - mx) * ratio,
      cy: my + (cam.cy - my) * ratio,
    });
    applyCam();
  }
  // the page keeps its scrolling: the wheel only zooms with Ctrl (or Cmd) held
  svg.addEventListener(
    "wheel",
    (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      d3.select(svg).interrupt("cam");
      zoomAt(e.deltaY < 0 ? 1.2 : 1 / 1.2, e.clientX, e.clientY);
    },
    { passive: false },
  );
  let drag = null;
  svg.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    d3.select(svg).interrupt("cam");
    hover.leave();
    drag = { x: e.clientX, y: e.clientY, cx: cam.cx, cy: cam.cy };
    moved = false;
  });
  window.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) {
      moved = true;
      svg.classList.add("is-drag");
    }
    if (moved) {
      cam = clamp({
        k: cam.k,
        cx: drag.cx - dx / scale,
        cy: drag.cy - dy / scale,
      });
      applyCam();
    }
  });
  const endDrag = () => {
    drag = null;
    svg.classList.remove("is-drag");
    setTimeout(() => (moved = false)); // after the click that ends a drag
  };
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag); // a vertical swipe on a phone scrolls the page instead

  // the + and - buttons zoom around the selection, if there is one
  let state = null;
  function zoomBtn(f) {
    const r = svg.getBoundingClientRect();
    let x = r.left + r.width / 2;
    let y = r.top + r.height / 2;
    if (state?.sel) {
      const p = selPoint(state.sel);
      const w = V0[2] / cam.k;
      const h = V0[3] / cam.k;
      const s = Math.min(r.width / w, r.height / h);
      x = r.left + r.width / 2 + (p[0] - cam.cx) * s;
      y = r.top + r.height / 2 + (p[1] - cam.cy) * s;
    }
    d3.select(svg).interrupt("cam");
    zoomAt(f, x, y);
  }
  el.querySelector('[data-zoom="in"]').onclick = () => zoomBtn(1.5);
  el.querySelector('[data-zoom="out"]').onclick = () => zoomBtn(1 / 1.5);
  el.querySelectorAll("[data-layer]").forEach(
    (b) => (b.onclick = () => on.toggleLayer(b.dataset.layer)),
  );
  new ResizeObserver(applyCam).observe(el);

  // ── update: the chart contract ──────────────────────────────────────────
  let lastKey = null;
  let lastSel = null;
  function update(st, { animate = true } = {}) {
    state = st;
    if (!measured) measure();
    refresh(st);
    applyCam();
    const key = [st.sel?.t, st.sel?.id, st.theme, st.region, st.link].join("|");
    if (key !== lastKey) {
      const first = lastKey === null;
      lastKey = key;
      moveCam(targetFor(st), animate && !first);
    }
    const selId = st.sel?.t === "shock" ? st.sel.id : null;
    if (selId && selId !== lastSel) breathe([selId]);
    lastSel = selId;
  }

  requestAnimationFrame(() => breathe(Object.keys(washes))); // a first few breaths when the map appears

  return { el, update };
}
