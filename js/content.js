// content.js: loads content.json and the three world layers once, for every dashboard on the page.
//
//   const { content, geo } = await loadData();
//
// content: the authored text (data/content.json) plus lookups by id: T (theatres), C (chokepoints),
//          S (shockwaves), H (themes). A shockwave with `at` sits on that chokepoint and takes its position.
//          layers (data/map_layers.json) and charts (data/charts.json), each by id: optional files.
// geo:     { countries, borders, coast } from "0 d3 world.R"

import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { CONFIG } from "./config.js";

let cached = null;

export function loadData() {
  cached ??= Promise.all([
    d3.json(`${CONFIG.BASE_URL}/data/content.json`),
    d3.json(`${CONFIG.BASE_URL}/data/world_countries.geojson`),
    d3.json(`${CONFIG.BASE_URL}/data/world_borders.geojson`),
    d3.json(`${CONFIG.BASE_URL}/data/world_coast.geojson`),
    d3.json(`${CONFIG.BASE_URL}/data/map_layers.json`).catch(() => ({})),
    d3.json(`${CONFIG.BASE_URL}/data/charts.json`).catch(() => ({})),
  ]).then(([content, countries, borders, coast, layers, charts]) => ({
    content: { ...index(content), layers: withIds(layers), charts: withIds(charts) },
    geo: { countries, borders, coast },
  }));
  return cached;
}

const withIds = (o) => Object.fromEntries(Object.entries(o ?? {}).map(([id, v]) => [id, { id, ...v }]));

function index(c) {
  const by = (list) => Object.fromEntries(list.map((x) => [x.id, x]));
  const T = by(c.theatres);
  const C = by(c.chokepoints);
  const S = by(c.shockwaves);
  const H = by(c.themes);
  c.shockwaves.forEach((s) => {
    if (s.at) {
      s.lat = C[s.at].lat;
      s.lon = C[s.at].lon;
      s.coincident = true;
    }
  });
  return { ...c, T, C, S, H };
}

// text from content.json goes into the page as text, never as markup
export const esc = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
