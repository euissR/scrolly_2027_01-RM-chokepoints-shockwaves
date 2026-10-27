// main.js: entry point. Finds every .db-root on the page, loads the data once, builds a dashboard in each.
// Only the first dashboard on a page keeps its state in the page address (data-hash="off" switches that off).

import { loadData } from "./content.js";
import { makeDashboard } from "./dashboard.js";

const roots = [...document.querySelectorAll(".db-root")];

if (roots.length) {
  loadData()
    .then(({ content, geo }) => {
      roots.forEach((root, i) => makeDashboard(root, { content, geo, useHash: i === 0 && root.dataset.hash !== "off" }));
    })
    .catch((err) => {
      console.error(err);
      roots.forEach((root) => {
        root.innerHTML = '<div class="db-error">The dashboard could not be loaded. Please try again later.</div>';
      });
    });
}
