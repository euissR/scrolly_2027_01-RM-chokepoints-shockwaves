// bars.js: horizontal bars, one row per country or actor, the row's name just above its bar.
// Labels sit above the bars, left-aligned with them, so the bars can use the whole column width.
//
//   const chart = makeBars(el, { rows, spec });
//   chart.update(state, { animate });
//   chart.destroy();
//
// rows: any tidy csv. A missing value (empty or NA) is a gap: the row keeps its name and says n/a.
//
// spec:
//   title, subtitle, source                 text
//   label:     column with the row names
//   value:     column with the values;  scale: multiplier (1e-6 for million);  decimals: 0 to 3
//   rank:      column with a rank, written before the name and in the tooltip (optional)
//   top:       show only the n largest rows (default all)
//   also:      { column: value }: rows that also stay when they fall outside the top n
//   colors:    [{ where: { column: value }, color }]  first match wins; color = actor code ("EU", "USA"),
//              a theme colour name or a hex value. Rows without a match are light grey.
//   key:       [{ label, color }]  small legend under the chart (optional)
//   valueLabel, unit:  tooltip wording
//   max:       fixed top of the axis (default: leaves room for the value after the longest bar)
//
// state (all optional):
//   highlight: row names at full strength, the rest dimmed
//
// The chart is drawn at the width of its container (1 svg unit = 1 pixel), so text keeps its size
// in a narrow column, and redrawn when that width changes.

import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { theme } from "../theme.js";
import { makeHover } from "./hover.js";
import { esc } from "../content.js";

const LAB = 17; // height of the name line
const BAR = 17; // height of a bar
const GAP = 8; // air between rows
const RH = LAB + BAR + GAP;
const TOP = 2;
const AXIS = 22; // room for the tick labels

export function makeBars(el, { rows, spec }) {
  const fmt = d3.format(`,.${spec.decimals ?? 0}f`);
  const colorOf = (tok) => theme.actorColors?.[tok] ?? theme[tok] ?? tok;
  const matches = (w, r) => Object.entries(w).every(([k, v]) => r[k] === v);
  const num = (v) => (v === "" || v == null || v === "NA" ? NaN : +v);

  // ── data ────────────────────────────────────────────────────────────────
  const all = rows.map((r) => ({
    r,
    name: r[spec.label],
    v: num(r[spec.value]) * (spec.scale ?? 1),
    rank: spec.rank ? r[spec.rank] : null,
  }));
  const sorted = d3.sort(all, (a, b) => d3.descending(Number.isFinite(a.v) ? a.v : -Infinity, Number.isFinite(b.v) ? b.v : -Infinity));
  const keep = new Set(sorted.slice(0, spec.top ?? sorted.length));
  if (spec.also) sorted.forEach((d) => matches(spec.also, d.r) && keep.add(d));
  const list = sorted.filter((d) => keep.has(d));
  list.forEach((d) => {
    const c = spec.colors?.find((k) => matches(k.where, d.r));
    d.color = c ? colorOf(c.color) : theme.border;
  });

  // ── markup ──────────────────────────────────────────────────────────────
  el.innerHTML = `
    <div class="db-fig-head"><div class="db-fig-title"></div><div class="db-fig-sub"></div></div>
    <div class="db-fig-plot"></div>
    <figcaption class="db-fig-foot"><div class="db-fig-key"></div><div class="db-fig-src"></div></figcaption>
    <div class="db-tooltip" aria-hidden="true"></div>`;
  const $ = (s) => el.querySelector(s);
  $(".db-fig-title").textContent = spec.title ?? "";
  $(".db-fig-sub").textContent = spec.subtitle ?? "";
  $(".db-fig-src").textContent = spec.source ? `Source: ${spec.source}` : "";
  $(".db-fig-key").innerHTML = (spec.key ?? [])
    .map((k) => `<span class="db-key-item"><svg width="12" height="12" aria-hidden="true"><rect width="12" height="12" fill="${colorOf(k.color)}"/></svg>${esc(k.label)}</span>`)
    .join("");
  const plot = $(".db-fig-plot");
  const tooltip = d3.select($(".db-tooltip"));
  const hover = makeHover(el, tooltip);
  const svg = d3.select(plot).append("svg").attr("role", "img").attr("aria-label", spec.title ?? "Bar chart");

  // ── draw (again whenever the width changes) ─────────────────────────────
  let width = 0;
  let state = {};
  let bars = null;
  function draw(W, animate) {
    width = W;
    const H = TOP + list.length * RH + AXIS;
    svg.attr("width", W).attr("height", H).attr("viewBox", `0 0 ${W} ${H}`);
    svg.selectAll("*").remove();

    const texts = list.map((d) => (Number.isFinite(d.v) ? fmt(d.v) : "n/a"));
    const reserve = Math.max(...texts.map((t) => t.length)) * 7.6 + 12;
    const maxV = d3.max(list, (d) => d.v) ?? 1;
    const dom = spec.max ?? (maxV * W) / Math.max(W - reserve, W * 0.5);
    const x = d3.scaleLinear([0, dom], [0, W]);
    const ticks = x.ticks(4).filter((t) => t <= dom);

    const grid = svg.append("g").attr("class", "db-bar-grid");
    ticks.forEach((t) => {
      grid.append("line").attr("x1", x(t)).attr("x2", x(t)).attr("y1", TOP).attr("y2", H - AXIS);
      grid
        .append("text")
        .attr("class", "db-bar-tick")
        .attr("x", x(t))
        .attr("y", H - 6)
        .attr("text-anchor", x(t) < 8 ? "start" : x(t) > W - 14 ? "end" : "middle")
        .text(d3.format(",")(t));
    });

    const t = d3.transition().duration(animate ? theme.duration : 0);
    const g = svg
      .append("g")
      .selectAll("g")
      .data(list)
      .join("g")
      .attr("class", "db-bar-row")
      .attr("transform", (d, i) => `translate(0,${TOP + i * RH})`);

    g.append("text")
      .attr("class", "db-bar-lab")
      .attr("x", 0)
      .attr("y", LAB - 4)
      .each(function (d) {
        const s = d3.select(this);
        if (d.rank) s.append("tspan").attr("class", "db-bar-rk").text(`${d.rank}  `);
        s.append("tspan").text(d.name);
      });

    const rects = g
      .filter((d) => Number.isFinite(d.v))
      .append("rect")
      .attr("class", "db-bar")
      .attr("x", 0)
      .attr("y", LAB)
      .attr("height", BAR)
      .attr("width", 0)
      .attr("fill", (d) => d.color);
    rects.transition(t).attr("width", (d) => Math.max(0, x(d.v)));

    g.append("text")
      .attr("class", (d) => (Number.isFinite(d.v) ? "db-bar-val" : "db-bar-val db-bar-na"))
      .attr("y", LAB + BAR - 4)
      .attr("x", (d) => (Number.isFinite(d.v) ? x(d.v) + 6 : 0))
      .text((d, i) => texts[i]);

    g.append("rect")
      .attr("class", "db-bar-hit")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", W)
      .attr("height", LAB + BAR)
      .attr("fill", "transparent")
      .on("pointerenter pointermove", function (e, d) {
        showTip(e, d, d3.select(this.parentNode).select(".db-bar").node() ?? this);
      })
      .on("pointerleave", hover.leave);

    bars = g;
    paint(false);
  }

  // which rows are at full strength
  function paint(animate) {
    const hi = state.highlight?.length ? new Set(state.highlight) : null;
    bars
      .transition()
      .duration(animate ? theme.duration : 0)
      .attr("opacity", (d) => (!hi || hi.has(d.name) ? 1 : theme.dim));
  }

  function showTip(event, d, mark) {
    const val = Number.isFinite(d.v) ? `${fmt(d.v)}${spec.unit ? ` ${esc(spec.unit)}` : ""}` : "no data";
    tooltip
      .html(`<strong>${esc(d.name)}</strong><br>${d.rank ? `Rank ${esc(d.rank)}<br>` : ""}${esc(spec.valueLabel ?? "Value")}: ${val}`)
      .style("opacity", 1);
    hover.enter(event, { mark });
  }

  width = Math.round(plot.getBoundingClientRect().width) || 480;
  let drawn = false;
  const ro = new ResizeObserver(([entry]) => {
    const w = Math.round(entry.contentRect.width);
    if (!w || w === width) return;
    width = w;
    if (drawn) draw(w, false);
  });
  ro.observe(plot);

  return {
    el,
    update(st = {}, { animate = true } = {}) {
      state = st;
      if (!drawn) {
        drawn = true;
        draw(width, animate); // first view: the bars grow
      } else paint(animate);
    },
    destroy() {
      ro.disconnect();
      hover.leave();
    },
  };
}
