// layers.js: data layers on the main map (the "View data" buttons in the text).
//
//   loadCsv(file)          one csv from data/, fetched once
//   loadLayerRows(def)     loads def.file into def.rows
//   symbolAttrs(status)    svg attributes of the circle that stands for a status
//   keyHTML(def)           the key under the map: title, symbols, source, "Hide data"
//
// A layer is defined in data/map_layers.json (see there). Only "points" exists so far.
// Missing coordinates mean a gap: a row without them is not drawn (never placed at 0,0).

import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { theme } from "./theme.js";
import { CONFIG } from "./config.js";
import { esc } from "./content.js";

const cache = new Map();
export const loadCsv = (file) => {
  if (!cache.has(file)) cache.set(file, d3.csv(`${CONFIG.BASE_URL}/data/${file}`));
  return cache.get(file);
};
export const loadLayerRows = (def) => loadCsv(def.file).then((rows) => (def.rows = rows));

// status -> look. One cold colour; the status is told apart by fill, tint, outline and dash.
const C = theme.teal2;
const STYLE = {
  Active: { fill: C, stroke: "#fff", sw: 1.5 },
  Completed: { fill: C, fo: 0.5, stroke: C, sw: 1.5 },
  "In progress": { fill: "#fff", stroke: C, sw: 2.25 },
  Cancelled: { fill: "#fff", stroke: C, sw: 2, dash: "2.5 2" },
  Inactive: { fill: theme.border, stroke: C, sw: 1.5 },
  Unclear: { fill: "#fff", stroke: C, sw: 2, dash: "0.1 3.2", cap: "round" },
};

export function symbolAttrs(status) {
  const s = STYLE[status] ?? STYLE.Unclear;
  return {
    r: 5.5,
    fill: s.fill,
    "fill-opacity": s.fo ?? 1,
    stroke: s.stroke,
    "stroke-width": s.sw,
    ...(s.dash ? { "stroke-dasharray": s.dash, "stroke-linecap": s.cap ?? "butt" } : {}),
  };
}

const attrs = (o) => Object.entries(o).map(([k, v]) => `${k}="${v}"`).join(" ");

export function keyHTML(def) {
  const seen = new Set(def.rows.map((r) => r[def.status]));
  const order = [...new Set([...(def.statuses ?? []), ...seen])].filter((s) => seen.has(s));
  const items = order
    .map(
      (s) =>
        `<span class="db-key-item"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" ${attrs(symbolAttrs(s))}/></svg>${esc(s)}</span>`,
    )
    .join("");
  return `<div class="db-key-main"><div class="db-key-title">${esc(def.title)}</div><div class="db-key-items">${items}</div>${def.source ? `<div class="db-key-src">Source: ${esc(def.source)}</div>` : ""}</div>
    <button type="button" class="db-keyoff" data-layer-off><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2L10 10M10 2L2 10" stroke="currentColor" stroke-width="2"/></svg>Hide data</button>`;
}
