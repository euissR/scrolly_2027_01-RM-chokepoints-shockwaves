// panel.js: the text next to the map, as HTML strings. No state of its own.
//
//   panelHTML(state, D)   the chapter for the current state: introduction, region overview, conclusions,
//                         or one chokepoint or shockwave
//   notesHTML(state, D)   its endnotes (shown full width under the map and text)
//   stripHTML(state, D)   the row under the tabs that lists the chapters of the open region
//   tabsHTML(state, D)    the chapter tabs
//
// D is the indexed content from content.js. Every button that opens a chapter carries
// data-go="kind:id" (intro:intro, region:indo, choke:c_malacca, shock:s_scs, concl:concl);
// dashboard.js handles the clicks.

import { esc } from "./content.js";
import { theme } from "./theme.js";
import { colorOf } from "./layers.js";

export const ICON = {
  ck: `<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 2H14L8 7.2Z M2 14H14L8 8.8Z" fill="${theme.neutral}" stroke="${theme.ink}" stroke-width="1.3" stroke-linejoin="round"/></svg>`,
  sk: `<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="2.4" fill="${theme.fuchsia2}"/><circle cx="8" cy="8" r="5" fill="none" stroke="${theme.fuchsia2}" stroke-width="1.5"/><circle cx="8" cy="8" r="7.2" fill="none" stroke="${theme.fuchsia2}" stroke-width="1" stroke-dasharray="2 2"/></svg>`,
};

// text with [[3]] endnote markers -> Drupal's endnote pattern, ids prefixed so they never clash with the page's own
const txt = (s) =>
  esc(s).replace(
    /\[\[(\d+)\]\]/g,
    '<span id="db-endnote-$1-backlink"><a href="#db-endnote-$1"><sup><b>($1)</b></sup></a></span>',
  );
// A paragraph that is only {{data:layer_id|Button text}} becomes the "View data" button for that map layer;
// one that is only {{chart:chart_id}} becomes an empty figure that charts.js fills. Unknown ids leave nothing.
let known = { layers: {}, charts: {} };
const dataIcon = (c) =>
  `<svg class="db-sw" viewBox="0 0 18 16" aria-hidden="true"><circle cx="5" cy="11" r="3.5" fill="${c}"/><circle cx="13" cy="5" r="3" fill="none" stroke="${c}" stroke-width="2"/></svg>`;
const para = (x) => {
  let m = x.match(/^\{\{data:([\w-]+)\|(.+)\}\}$/);
  if (m) {
    return known.layers[m[1]]
      ? `<div class="db-dataline"><button type="button" class="db-databtn" data-layer-id="${m[1]}" data-label="${esc(m[2])}" aria-pressed="false">${dataIcon(colorOf(known.layers[m[1]].color))}<span class="db-databtn-t">${esc(m[2])}</span></button></div>`
      : "";
  }
  m = x.match(/^\{\{chart:([\w-]+)\}\}$/);
  if (m)
    return known.charts[m[1]]
      ? `<figure class="db-fig" data-chart="${m[1]}"></figure>`
      : "";
  return `<p>${txt(x)}</p>`;
};
const paras = (p) => (Array.isArray(p) ? p : [p]).map(para).join("");

// the sub-chapter (chokepoint or shockwave) behind an id
export const pointOf = (D, id) => D.C[id] ?? D.S[id];
const kindOf = (D, id) => (D.C[id] ? "choke" : "shock");

// the number sits in its own span, so it can be set in regular weight next to a bold name
const numbered = (r) => `<span class="db-num">${r.num}</span> ${esc(r.tab)}`;

// ── the chapter tabs and the strip under them ───────────────────────────
export function tabsHTML(D) {
  const tab = (go, inner, label) =>
    `<button type="button" class="db-tab" role="tab" data-go="${go}" data-tab="${go}" aria-selected="false" aria-label="${esc(label)}">${inner}</button>`;
  return [
    tab("intro:intro", "Sea lanes", "Sea lanes (introduction)"),
    ...D.regions.map((r) =>
      tab(`region:${r.id}`, numbered(r), `${r.num} ${r.tab}`),
    ),
    tab("concl:concl", "Conclusions", "Conclusions"),
  ].join("");
}

export function stripHTML(state, D) {
  const r = D.R[state.chap];
  if (!r) return "";
  const chip = (go, inner, on) =>
    `<button type="button" class="db-chip db-chip--nav" data-go="${go}" aria-pressed="${on}">${inner}</button>`;
  return [
    chip(`region:${r.id}`, "Overview", !state.sel),
    ...r.items.map((id) => {
      const p = pointOf(D, id);
      const k = kindOf(D, id);
      return chip(
        `${k}:${id}`,
        `${k === "choke" ? ICON.ck : ICON.sk}<span>${esc(p.short || p.name)}</span>`,
        state.sel?.id === id,
      );
    }),
  ].join("");
}

export function panelHTML(state, D) {
  known = { layers: D.layers ?? {}, charts: D.charts ?? {} };
  const gq = state.gq;

  const sec = (cls, title, q, body) =>
    `<section class="db-sec db-sec--${cls}"><h3 class="db-h3">${esc(title)}</h3>${gq && q ? `<p class="db-q">${esc(q)}</p>` : ""}${body}</section>`;
  const five = (o, cls, extraRisk = "") =>
    D.sections
      .map((s) =>
        sec(
          cls,
          s.title,
          s.q,
          paras(o.sections[s.k]) + (s.k === "risks" ? extraRisk : ""),
        ),
      )
      .join("");
  const free = (o, cls) =>
    o.sections.map((s) => sec(cls, s.h, "", paras(s.p))).join("");
  const cards = (d) =>
    d?.length
      ? `<div class="db-cards">${d
          .map(
            (x) =>
              `<div class="db-card"><span class="db-card-tag">${esc(x.type)}</span><div class="db-card-val">${esc(x.value)}</div><div class="db-card-lb">${esc(x.label)}</div></div>`,
          )
          .join(
            "",
          )}</div>${D.ui.cardsNote ? `<p class="db-note">${esc(D.ui.cardsNote)}</p>` : ""}`
      : "";
  const kicker = (cls, label) =>
    `<span class="db-kicker db-kicker--${cls}">${esc(label)}</span>`;
  const meta = (author) =>
    `<div class="db-meta"><span>${esc(author)}</span>${D.ui.status ? `<span>${esc(D.ui.status)}</span>` : ""}</div>`;
  const backToMap =
    '<button type="button" class="db-backmap" data-tomap>↑ Back to map</button>';

  // previous and next chapter, in reading order
  function nav(k, id) {
    const i = D.seq.findIndex((x) => x.k === k && x.id === id);
    const btn = (x, dir) =>
      x
        ? `<button type="button" class="db-navbtn db-navbtn--${dir}" data-go="${x.k}:${x.id}"><span class="db-navlab">${dir === "prev" ? "←" : ""} ${dir === "prev" ? "Previous" : "Next"} ${dir === "next" ? "→" : ""}</span><b>${esc(x.label)}</b></button>`
        : "<span></span>";
    return `<nav class="db-nav" aria-label="Previous and next chapter">${btn(D.seq[i - 1], "prev")}${btn(D.seq[i + 1], "next")}</nav>`;
  }

  // ── introduction ──────────────────────────────────────────────────────
  function intro() {
    const I = D.intro;
    return `${kicker("ov", "Introduction")}
      <h2 class="db-title">${esc(I.title)}</h2>
      <p class="db-lede">${esc(I.lede)}</p>
      ${free(I, "tt")}
      <section class="db-sec db-sec--tt db-tourblock"><h3 class="db-h3">${esc(I.tourTitle)}</h3><p>${esc(I.tourText)}</p><button type="button" class="db-tourbtn" data-tour="start">Start the tour</button></section>
      ${D.ui.overviewNote ? `<p class="db-note">${esc(D.ui.overviewNote)}</p>` : ""}
      ${nav("intro", "intro")}`;
  }

  // ── region overview ───────────────────────────────────────────────────
  function region(r) {
    return `${backToMap}
      ${kicker("ov", "Region overview")}
      <h2 class="db-title">${numbered({ num: r.num, tab: r.name })}</h2>
      <p class="db-lede">${esc(r.lede)}</p>
      ${cards(r.data)}
      ${free({ sections: r.overview }, "tt")}
      ${meta(r.author)}
      ${nav("region", r.id)}`;
  }

  // ── conclusions ───────────────────────────────────────────────────────
  function concl() {
    const I = D.concl;
    return `${kicker("ov", "Conclusions")}
      <h2 class="db-title">${esc(I.title)}</h2>
      <p class="db-lede">${esc(I.lede)}</p>
      ${free(I, "tt")}
      ${nav("concl", "concl")}`;
  }

  // ── chokepoint and shockwave chapters ─────────────────────────────────
  const crumb = (e) =>
    `<div class="db-crumbs"><button type="button" class="db-crumb" data-go="region:${e.region}">${numbered(D.R[e.region])}</button></div>`;

  function choke(c) {
    return `${backToMap}${crumb(c)}
      ${kicker("ck", `Chokepoint · ${c.kind}`)}
      <h2 class="db-title">${esc(c.name)}</h2>
      <p class="db-lede">${esc(c.blurb)}</p>
      ${cards(c.data)}
      ${five(c, "ck")}
      ${meta(c.author || D.R[c.region].author)}
      ${nav("choke", c.id)}`;
  }

  function shock(s) {
    const chain = `<p class="db-spread">How it spreads</p><ul class="db-chain">${s.spread.map((x) => `<li><span class="db-dot"></span>${esc(x)}</li>`).join("")}</ul><p class="db-reach"><b>Reaches:</b> ${s.reach.map((r) => esc(r[2])).join(", ")}. Shown on the map as places lit up around the epicentre.</p>`;
    return `${backToMap}${crumb(s)}
      ${kicker("sk", `Shockwave · ${s.status}`)}
      <h2 class="db-title">${esc(s.name)}</h2>
      <p class="db-lede">${esc(s.blurb)}</p>
      ${cards(s.data)}
      ${five(s, "sk", chain)}
      ${meta(s.author || D.R[s.region].author)}
      ${nav("shock", s.id)}`;
  }

  const s = state.sel;
  if (s) return s.t === "choke" ? choke(D.C[s.id]) : shock(D.S[s.id]);
  if (state.chap === "intro") return intro();
  if (state.chap === "concl") return concl();
  return region(D.R[state.chap]);
}

// endnotes of the open chapter, in Drupal's endnote pattern
export function notesHTML(state, D) {
  const s = state.sel;
  const e = s && (s.t === "choke" ? D.C[s.id] : D.S[s.id]);
  if (!e?.refs?.length) return "";
  return `<h3 class="db-h3">References</h3>${e.refs
    .map(
      (r) =>
        `<p id="db-endnote-${r.n}"><a href="#db-endnote-${r.n}-backlink"><b>${r.n}.</b></a> ${esc(r.text)}</p>`,
    )
    .join("")}`;
}
