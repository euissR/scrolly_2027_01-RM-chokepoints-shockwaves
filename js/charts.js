// charts.js: the inline charts of a chapter.
//
//   const live = mountCharts(panelEl, D);   after the panel's html is set
//   live.destroy();                         before the panel is rewritten
//
// panel.js leaves <figure class="db-fig" data-chart="id"> where the text has {{chart:id}}.
// The chart's definition is D.charts[id] (data/charts.json); its data is loaded once and drawn
// into the figure. Each chart type is a factory makeX(el, { rows, spec }) -> { el, update, destroy }.

import { loadCsv } from "./layers.js";
import { makeBars } from "./charts/bars.js";

const FACTORY = { bars: makeBars };

export function mountCharts(root, D) {
  const live = [];
  let gone = false;
  root.querySelectorAll("figure.db-fig[data-chart]").forEach((el) => {
    const spec = D.charts?.[el.dataset.chart];
    if (!spec || !FACTORY[spec.type]) return el.remove();
    loadCsv(spec.file)
      .then((rows) => {
        if (gone || !el.isConnected) return;
        const chart = FACTORY[spec.type](el, { rows, spec });
        chart.update({}, { animate: true });
        live.push(chart);
      })
      .catch((err) => {
        console.error(err);
        el.remove();
      });
  });
  return {
    destroy() {
      gone = true;
      live.forEach((c) => c.destroy?.());
    },
  };
}
