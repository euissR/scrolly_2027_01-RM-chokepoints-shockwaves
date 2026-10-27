// patterns.js: the Patterns tab, as an HTML string. One row per theatre, so authors can see
// what the modules have in common. Rows carry data-sel="theatre:id"; dashboard.js handles the click.

import { esc } from "./content.js";

export function patternsHTML(D) {
  const statuses = ["Recent", "Recurring", "Potential", "Structural"];
  const byStatus = statuses
    .map((st) => ({ st, list: D.shockwaves.filter((s) => s.status === st) }))
    .filter((x) => x.list.length);
  const both = D.theatres.filter((t) => t.themes.gas && t.themes.subcon).map((t) => t.name);
  const ul = (a) => `<ul>${a.map((x) => `<li>${x}</li>`).join("")}</ul>`;
  const names = (list) => list.map((s) => esc(s.name)).join("; ");

  const callouts = `
    <div class="db-callout"><h3 class="db-h3 db-h3--sm">Shockwaves by reach</h3>${["global", "regional"]
      .map((sc) => `<p><b>${sc[0].toUpperCase() + sc.slice(1)}</b>: ${names(D.shockwaves.filter((s) => s.scope === sc))}</p>`)
      .join("")}</div>
    <div class="db-callout"><h3 class="db-h3 db-h3--sm">Shockwaves by status</h3>${byStatus
      .map((x) => `<p><b>${x.st}</b>: ${names(x.list)}</p>`)
      .join("")}</div>
    <div class="db-callout"><h3 class="db-h3 db-h3--sm">Gas and cable overlap</h3><p>Theatres linked to both themes.</p>${ul(both.map(esc))}</div>`;

  const rows = D.theatres
    .map((t) => {
      const cs = D.chokepoints.filter((c) => c.theatre === t.id);
      const ss = D.shockwaves.filter((s) => s.theatre === t.id);
      const none = '<span class="db-sub">None mapped</span>';
      return `<tr class="db-tr" tabindex="0" data-sel="theatre:${t.id}">
        <td><div class="db-nm">${esc(t.name)}</div><div class="db-sub">${esc(D.groups[t.group].name)}</div></td>
        <td>${cs.length ? ul(cs.map((c) => esc(c.name))) : none}</td>
        <td>${ss.length ? ul(ss.map((s) => `${esc(s.name)} <span class="db-sub">(${esc(s.status.toLowerCase())})</span>`)) : none}</td>
        <td>${esc(t.line)}</td></tr>`;
    })
    .join("");

  return `<h2 class="db-title">Patterns across theatres</h2>
    <p class="db-lede">One row per theatre, so that authors can see what the modules have in common. Read down a column to compare; select a row to open the theatre on the map.</p>
    <div class="db-callouts">${callouts}</div>
    <div class="db-tblwrap"><table class="db-tbl"><thead><tr><th>Theatre</th><th>Chokepoints</th><th>Shockwaves</th><th>Europe's exposure in a line</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="db-synth"><h3 class="db-h3 db-h3--sm">What repeats across theatres</h3><p>Space for the synthesis text: shared triggers, recurring dependencies, and where the same European response would work in several places.</p></div>`;
}
