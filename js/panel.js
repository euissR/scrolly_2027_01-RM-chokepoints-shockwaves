// panel.js: the text next to the map, as HTML strings. No state of its own.
//
//   panelHTML(state, D)   the chapter for the current selection
//   notesHTML(state, D)   its endnotes (shown full width under the map and text)
//
// D is the indexed content from content.js. Buttons carry data-* attributes
// (data-sel="choke:c_malacca", data-region, data-theme, data-link, data-back, data-tomap);
// dashboard.js handles the clicks.

import { esc } from "./content.js";
import { theme } from "./theme.js";

const ICON = {
  ck: `<svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 2H14L8 7.2Z M2 14H14L8 8.8Z" fill="${theme.teal}" stroke="${theme.ink}" stroke-width="1.3" stroke-linejoin="round"/></svg>`,
  sk: `<svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="2.4" fill="${theme.fuchsia2}"/><circle cx="8" cy="8" r="5" fill="none" stroke="${theme.fuchsia2}" stroke-width="1.5"/><circle cx="8" cy="8" r="7.2" fill="none" stroke="${theme.fuchsia2}" stroke-width="1" stroke-dasharray="2 2"/></svg>`,
};

// text with [[3]] endnote markers -> Drupal's endnote pattern, ids prefixed so they never clash with the page's own
const txt = (s) =>
  esc(s).replace(
    /\[\[(\d+)\]\]/g,
    '<span id="db-endnote-$1-backlink"><a href="#db-endnote-$1"><sup><b>($1)</b></sup></a></span>',
  );
const paras = (p) => (Array.isArray(p) ? p : [p]).map((x) => `<p>${txt(x)}</p>`).join("");

export function panelHTML(state, D) {
  const { T, C, S, H } = D;
  const gq = state.gq;

  const sec = (cls, title, q, body) =>
    `<section class="db-sec db-sec--${cls}"><h3 class="db-h3">${esc(title)}</h3>${gq && q ? `<p class="db-q">${esc(q)}</p>` : ""}${body}</section>`;
  const five = (o, cls, extraRisk = "") =>
    D.sections
      .map((s) => sec(cls, s.title, s.q, paras(o.sections[s.k]) + (s.k === "risks" ? extraRisk : "")))
      .join("");
  const free = (o, cls) => o.overview.map((s) => sec(cls, s.h, "", paras(s.p))).join("");
  const cards = (d) =>
    d?.length
      ? `<div class="db-cards">${d
          .map(
            (x) =>
              `<div class="db-card"><span class="db-card-tag">${esc(x.type)}</span><div class="db-card-val">${esc(x.value)}</div><div class="db-card-lb">${esc(x.label)}</div></div>`,
          )
          .join("")}</div>${D.ui.cardsNote ? `<p class="db-note">${esc(D.ui.cardsNote)}</p>` : ""}`
      : "";
  const crumbs = (parts) =>
    `<div class="db-crumbs">${parts.join('<span aria-hidden="true">›</span>')}</div>`;
  const crumbBack = '<button type="button" class="db-crumb" data-back>Overview</button>';
  const crumbRegion = (t) =>
    `<button type="button" class="db-crumb" data-region="${t.group}">${esc(D.groups[t.group].name)}</button>`;
  const crumbTheatre = (t) =>
    `<button type="button" class="db-crumb" data-sel="theatre:${t.id}">${esc(t.name)}</button>`;
  const crumbTheme = (th) =>
    `<button type="button" class="db-crumb" data-theme="${th.id}">${esc(th.name)}</button>`;
  const kicker = (cls, label) => `<span class="db-kicker db-kicker--${cls}">${esc(label)}</span>`;
  const meta = (author) =>
    `<div class="db-meta"><span>${esc(author)}</span>${D.ui.status ? `<span>${esc(D.ui.status)}</span>` : ""}</div>`;
  const backToMap = '<button type="button" class="db-backmap" data-tomap>↑ Back to map</button>';
  const row = (sel, name) =>
    `<button type="button" class="db-row" data-sel="${sel}"><span class="db-nm">${esc(name)}</span></button>`;
  const kinRow = (sel, icon, name, sub) =>
    `<button type="button" class="db-kinrow" data-sel="${sel}">${icon}<span><b>${esc(name)}</b><span>${esc(sub)}</span></span></button>`;
  const prompts = () =>
    "";

  // ── overview ──────────────────────────────────────────────────────────
  function overview() {
    const regions = Object.keys(D.groups)
      .map((g) => {
        const rows = D.theatres
          .filter((t) => t.group === g)
          .map((t) => row(`theatre:${t.id}`, t.name))
          .join("");
        return `<button type="button" class="db-grp db-grp--link" data-region="${g}">${esc(D.groups[g].name)}</button><div class="db-rows">${rows}</div>`;
      })
      .join("");
    const themes = D.themes
      .map((th) => {
        const cks = D.chokepoints.filter((c) => c.theme === th.id);
        const sks = D.shockwaves.filter((s) => s.theme === th.id);
        const rows =
          cks.length || sks.length
            ? [...sks.map((s) => row(`shock:${s.id}`, s.name)), ...cks.map((c) => row(`choke:${c.id}`, c.name))].join("")
            : D.theatres.filter((t) => t.themes[th.id]).map((t) => row(`theatre:${t.id}`, t.name)).join("");
        return `<button type="button" class="db-grp db-grp--link" data-theme="${th.id}">${esc(th.name)}</button><div class="db-rows">${rows}</div>`;
      })
      .join("");
    const ck = D.chokepoints
      .map((c) => `<button type="button" class="db-chip db-chip--ck" data-sel="choke:${c.id}">${esc(c.name)}</button>`)
      .join("");
    const sk = D.shockwaves
      .map((s) => `<button type="button" class="db-chip db-chip--sk" data-sel="shock:${s.id}">${esc(s.name)}</button>`)
      .join("");
    return `${kicker("ov", "Overview")}
      <h2 class="db-title">${esc(D.overview.title)}</h2>
      <p class="db-lede">${esc(D.overview.lede)}</p>
      ${D.overview.sections.map((s) => sec("tt", s.h, "", paras(s.p))).join("")}
      <p class="db-hint">${esc(D.overview.hint)}</p>
      ${regions}${themes}
      <div class="db-grp">All chokepoints</div><div class="db-chips">${ck}</div>
      <div class="db-grp">All shockwaves</div><div class="db-chips">${sk}</div>
      ${D.ui.overviewNote ? `<p class="db-note">${esc(D.ui.overviewNote)}</p>` : ""}`;
  }

  // ── region (strategic overview) ───────────────────────────────────────
  function region(g) {
    const group = D.groups[g];
    const rows = D.theatres.filter((x) => x.group === g).map((x) => row(`theatre:${x.id}`, x.name)).join("");
    const links = group.links
      .map(
        (lk, i) =>
          `<div class="db-lkcard${state.link === i ? " is-on" : ""}"><button type="button" class="db-lkhead" data-link="${i}"><b>${esc(lk.title)}</b><span>${esc(lk.text)}</span></button><div class="db-lkchips">${lk.theatres
            .map((id) => `<button type="button" class="db-chip" data-sel="theatre:${id}">${esc(T[id].name)}</button>`)
            .join("")}</div></div>`,
      )
      .join("");
    return `${backToMap}${crumbs([crumbBack])}
      ${kicker("ov", "Region · strategic overview")}
      <h2 class="db-title">${esc(group.name)}</h2>
      <p class="db-lede">${esc(group.lede)}</p>
      ${cards(group.data)}
      ${prompts()}
      ${sec("tt", "Where the theatres meet", gq ? "Where do the places interact, and how does pressure at one travel to the others? Select a connection to see it on the map." : "", `<div class="db-lks">${links}</div>`)}
      ${free(group, "tt")}
      ${sec("tt", "Theatres in this region", "", `<div class="db-rows">${rows}</div>`)}
      ${meta(group.author)}`;
  }

  // ── theatre (hub) ─────────────────────────────────────────────────────
  function theatre(t) {
    const cks = D.chokepoints.filter((c) => c.theatre === t.id);
    const sks = D.shockwaves.filter((s) => s.theatre === t.id);
    const kin = [
      ...cks.map((c) => kinRow(`choke:${c.id}`, ICON.ck, c.name, c.blurb)),
      ...sks.map((s) => kinRow(`shock:${s.id}`, ICON.sk, s.name, `${s.status} · ${s.blurb}`)),
    ].join("");
    return `${backToMap}${crumbs([crumbBack, crumbRegion(t)])}
      ${kicker("tt", "Theatre")}
      <h2 class="db-title">${esc(t.name)}</h2>
      <p class="db-lede">${esc(t.line)}</p>
      ${kin ? `<div class="db-kin" aria-label="Subsections">${kin}</div>` : ""}
      <p class="db-hubnote">The detailed analysis sits in the subsections above, one per chokepoint or shockwave. How this theatre connects to the others is discussed in the <button type="button" class="db-crumb" data-region="${t.group}">${esc(D.groups[t.group].name)} overview</button>.</p>
      ${meta(t.author)}`;
  }

  // ── chokepoint and shockwave chapters ─────────────────────────────────
  const owner = (e) => (e.theatre ? T[e.theatre] : H[e.theme]);
  const ownerCrumbs = (e) =>
    e.theatre ? [crumbBack, crumbRegion(owner(e)), crumbTheatre(owner(e))] : [crumbBack, crumbTheme(owner(e))];

  function choke(c) {
    const sks = c.theatre ? D.shockwaves.filter((s) => s.theatre === c.theatre) : D.shockwaves.filter((s) => s.theme === c.theme);
    const kin = sks.map((s) => kinRow(`shock:${s.id}`, ICON.sk, s.name, `${s.status} · ${s.blurb}`)).join("");
    return `${backToMap}${crumbs(ownerCrumbs(c))}
      ${kicker("ck", `Chokepoint · ${c.kind}`)}
      <h2 class="db-title">${esc(c.name)}</h2>
      <p class="db-lede">${esc(c.blurb)}</p>
      ${cards(c.data)}
      ${five(c, "ck")}
      ${kin ? sec("ck", c.theatre ? "Shockwaves in this theatre" : "Also part of this theme", "", `<div class="db-kin">${kin}</div>`) : ""}
      ${meta(c.author || owner(c).author)}`;
  }

  function shock(s) {
    const cks = s.theatre ? D.chokepoints.filter((x) => x.theatre === s.theatre) : D.chokepoints.filter((x) => x.theme === s.theme);
    const kin = cks.map((x) => kinRow(`choke:${x.id}`, ICON.ck, x.name, x.blurb)).join("");
    const chain = `<p class="db-spread">How it spreads</p><ul class="db-chain">${s.spread.map((x) => `<li><span class="db-dot"></span>${esc(x)}</li>`).join("")}</ul><p class="db-reach"><b>Reaches:</b> ${s.reach.map((r) => esc(r[2])).join(", ")}. Shown on the map as places lit up around the epicentre.</p>`;
    return `${backToMap}${crumbs(ownerCrumbs(s))}
      ${kicker("sk", `Shockwave · ${s.status}`)}
      <h2 class="db-title">${esc(s.name)}</h2>
      <p class="db-lede">${esc(s.blurb)}</p>
      ${cards(s.data)}
      ${five(s, "sk", chain)}
      ${kin ? sec("sk", s.theatre ? "Chokepoints in this theatre" : "Also part of this theme", "", `<div class="db-kin">${kin}</div>`) : ""}
      ${meta(s.author || owner(s).author)}`;
  }

  // ── theme (strategic overview) ────────────────────────────────────────
  function themeView(th) {
    const cks = D.chokepoints.filter((c) => c.theme === th.id);
    const sks = D.shockwaves.filter((s) => s.theme === th.id);
    const kin = [
      ...sks.map((s) => kinRow(`shock:${s.id}`, ICON.sk, s.name, `${s.status} · ${s.blurb}`)),
      ...cks.map((c) => kinRow(`choke:${c.id}`, ICON.ck, c.name, c.blurb)),
    ].join("");
    const links = D.theatres
      .filter((x) => x.themes[th.id])
      .map((x) => `<button type="button" class="db-linkrow" data-sel="theatre:${x.id}"><b>${esc(x.name)}</b><span>${esc(x.themes[th.id])}</span></button>`)
      .join("");
    return `${backToMap}${crumbs([crumbBack])}
      ${kicker("th", "Theme · strategic overview")}
      <h2 class="db-title">${esc(th.name)}</h2>
      <p class="db-lede">${esc(th.lede)}</p>
      ${cards(th.data)}
      ${prompts()}
      ${kin ? `<div class="db-kin" aria-label="Subsections">${kin}</div>` : ""}
      ${free(th, "th")}
      ${links ? sec("th", "Where it shows up", gq ? "Which theatres does this theme connect? Linked theatres are highlighted on the map." : "", `<div>${links}</div>`) : ""}
      ${meta("Author to be confirmed")}`;
  }

  const s = state.sel;
  const th = state.theme && H[state.theme];
  if (s) return s.t === "theatre" ? theatre(T[s.id]) : s.t === "choke" ? choke(C[s.id]) : shock(S[s.id]);
  if (th) return themeView(th);
  if (state.region) return region(state.region);
  return overview();
}

// endnotes of the open chapter, in Drupal's endnote pattern
export function notesHTML(state, D) {
  const s = state.sel;
  const e = s && (s.t === "choke" ? D.C[s.id] : s.t === "shock" ? D.S[s.id] : null);
  if (!e?.refs?.length) return "";
  return `<h3 class="db-h3">References</h3>${e.refs
    .map((r) => `<p id="db-endnote-${r.n}"><a href="#db-endnote-${r.n}-backlink"><b>${r.n}.</b></a> ${esc(r.text)}</p>`)
    .join("")}`;
}
