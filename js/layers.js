// layers.js: data layers on the main map (the "View data" buttons in the text).
//
//   loadCsv(file)          one csv from data/, fetched once
//   loadLayerRows(def)     loads def.file into def.rows
//   symbolAttrs(status)    svg attributes of the circle that stands for a status (type "points")
//   bubbleR, bubbleAttrs   radius and svg attributes of a bubble (type "bubbles")
//   tipLines(def, row)     the detail lines of a bubble's tooltip
//   keyHTML(def)           the key under the map: title, symbols, source, "Hide data"
//
// A layer is defined in data/map_layers.json (see there): "points" (one symbol per status) or
// "bubbles" (one dot per country, optionally in size steps).
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

// bubbles: one cold colour, constant radius in px; "size": { col, r: { value: px } } gives size steps
export const bubbleR = (def, row) => (def.size && def.size.r[row[def.size.col]]) || def.r || 4;
export const bubbleAttrs = (def, row) => ({
  r: bubbleR(def, row),
  fill: C,
  "fill-opacity": 0.85,
  stroke: "#fff",
  "stroke-width": 1,
});
export function tipLines(def, row) {
  const v = def.tip ? String(row[def.tip] ?? "").trim() : "";
  if (!v) return [];
  return (def.tipSplit ? v.split(def.tipSplit) : [v]).map((x) => x.trim()).filter(Boolean);
}
const dot = (r) =>
  `<svg width="${2 * r + 2}" height="${2 * r + 2}" aria-hidden="true"><circle cx="${r + 1}" cy="${r + 1}" r="${r}" fill="${C}" fill-opacity="0.85"/></svg>`;
function bubbleItems(def) {
  const s = def.size;
  if (!s) return `<span class="db-key-item">${dot(def.r ?? 4)}${esc(def.keyLabel ?? def.title)}</span>`;
  const seen = new Set(def.rows.map((r) => r[s.col]));
  return Object.keys(s.r)
    .filter((k) => seen.has(k))
    .sort((a, b) => s.r[a] - s.r[b])
    .map((k) => `<span class="db-key-item">${dot(s.r[k])}${esc(s.labels?.[k] ?? k)}</span>`)
    .join("");
}

const attrs = (o) => Object.entries(o).map(([k, v]) => `${k}="${v}"`).join(" ");

export function keyHTML(def) {
  const seen = new Set(def.rows.map((r) => r[def.status]));
  const order = [...new Set([...(def.statuses ?? []), ...seen])].filter((s) => seen.has(s));
  const items =
    def.type === "bubbles"
      ? bubbleItems(def)
      : order
          .map(
            (s) =>
              `<span class="db-key-item"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" ${attrs(symbolAttrs(s))}/></svg>${esc(s)}</span>`,
          )
          .join("");
  return `<div class="db-key-main"><div class="db-key-title">${esc(def.title)}</div><div class="db-key-items">${items}</div>${def.source ? `<div class="db-key-src">Source: ${esc(def.source)}</div>` : ""}${def.note ? `<div class="db-key-src">${esc(def.note)}</div>` : ""}</div>
    <button type="button" class="db-keyoff" data-layer-off><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2L10 10M10 2L2 10" stroke="currentColor" stroke-width="2"/></svg>Hide data</button>`;
}
