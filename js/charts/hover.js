// hover.js: shared hover behaviour for every chart.
//   1. marks the hovered data point with a dark ring just outside it
//      (works on dark and light fills alike; look is set in RING below)
//   2. snaps the tooltip to the centre of that point instead of following the mouse
//
//   const hover = makeHover(el, tooltip);        // once per chart
//   ...                                          // in the handler, after tooltip.html(...)
//   tooltip.html(...).style("opacity", 1);
//   hover.enter(event);                          // marks event.currentTarget, places the tooltip
//   .on("pointerleave", hover.leave);            // clears the ring, hides the tooltip
//
// Options for hover.enter(event, { ... }):
//   mark    element(s) to ring               default: event.currentTarget
//   anchor  element(s) the tooltip snaps to  default: same as mark
//   follow  true = tooltip follows the mouse instead (long shapes such as sankey ribbons)
//   soft    true = darken instead of ringing (ribbons)
//
// The ring is drawn in a temporary layer on top of the chart's svg, so it never
// touches the chart's own elements or their data joins.

const RING = {
  width: 1.6, // ring thickness, in chart units
  gap: 1, // air between the point and the ring
  color: "var(--db-ink, #1d1d1b)",
};
const NS = "http://www.w3.org/2000/svg";
const SHAPES = new Set(["circle", "rect", "path", "polygon", "ellipse"]);

export function makeHover(el, tooltip) {
  let marked = [];
  let layer = null;

  const list = (x) => (x == null ? [] : x instanceof Element ? [x] : Array.from(x));

  // a ring around one shape, positioned in the svg root's coordinates
  function ringFor(n) {
    const tag = n.tagName.toLowerCase();
    const svg = n.ownerSVGElement;
    if (!svg || !SHAPES.has(tag)) return null;
    const a = svg.getScreenCTM();
    const b = n.getScreenCTM();
    if (!a || !b) return null;
    const m = a.inverse().multiply(b);
    const grow = RING.gap + RING.width / 2;

    const ring = document.createElementNS(NS, tag === "ellipse" ? "path" : tag);
    ring.setAttribute("transform", `matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.e} ${m.f})`);
    ring.style.fill = "none";
    ring.style.stroke = RING.color;
    ring.style.strokeWidth = RING.width;
    ring.style.pointerEvents = "none";

    if (tag === "circle") {
      ring.setAttribute("cx", n.cx.baseVal.value);
      ring.setAttribute("cy", n.cy.baseVal.value);
      ring.setAttribute("r", n.r.baseVal.value + grow);
    } else if (tag === "rect") {
      const rx = n.rx.baseVal.value;
      ring.setAttribute("x", n.x.baseVal.value - grow);
      ring.setAttribute("y", n.y.baseVal.value - grow);
      ring.setAttribute("width", n.width.baseVal.value + 2 * grow);
      ring.setAttribute("height", n.height.baseVal.value + 2 * grow);
      if (rx) ring.setAttribute("rx", rx + grow);
    } else if (tag === "path") {
      // free-form shapes: the ring sits on the edge instead of outside it
      ring.setAttribute("d", n.getAttribute("d"));
      ring.style.strokeWidth = RING.width * 2;
    } else if (tag === "polygon") {
      ring.setAttribute("points", n.getAttribute("points"));
      ring.style.strokeWidth = RING.width * 2;
    } else {
      return null; // ellipse: not used in these charts
    }
    return ring;
  }

  function layerOf(svg) {
    const g = document.createElementNS(NS, "g");
    g.setAttribute("class", "db-hover-layer");
    g.setAttribute("pointer-events", "none");
    svg.appendChild(g);
    return g;
  }

  function clear() {
    marked.forEach((n) => n.classList.remove("db-hover", "db-hover-soft"));
    marked = [];
    if (layer) layer.remove();
    layer = null;
  }

  function place(event, anchors, follow) {
    const box = el.getBoundingClientRect();
    const tip = tooltip.node();
    tooltip.style("left", "0px"); // measure at full width, not squeezed by the right edge
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;

    let cx = event.clientX;
    let cy = event.clientY;
    let dx = 12;
    let dy = 12;
    if (!follow && anchors.length) {
      const r = anchors.map((n) => n.getBoundingClientRect());
      const x0 = Math.min(...r.map((b) => b.left));
      const x1 = Math.max(...r.map((b) => b.right));
      const y0 = Math.min(...r.map((b) => b.top));
      const y1 = Math.max(...r.map((b) => b.bottom));
      cx = (x0 + x1) / 2;
      cy = (y0 + y1) / 2;
      // clear the point itself: half its size (max 14px) plus a little air
      dx = Math.min((x1 - x0) / 2, 14) + 6;
      dy = Math.min((y1 - y0) / 2, 14) + 6;
    }

    let left = cx - box.left + dx;
    let top = cy - box.top + dy;
    if (left + tw > box.width) left = cx - box.left - dx - tw; // flip to the left
    if (top + th > box.height) top = cy - box.top - dy - th; // flip above
    tooltip.style("left", `${Math.max(0, left)}px`).style("top", `${Math.max(0, top)}px`);
  }

  function enter(event, { mark = event.currentTarget, anchor = mark, follow = false, soft = false } = {}) {
    const m = list(mark);
    if (m.length !== marked.length || m.some((n, i) => n !== marked[i])) {
      clear();
      m.forEach((n) => {
        const ring = soft ? null : ringFor(n);
        if (ring) {
          layer ??= layerOf(n.ownerSVGElement);
          layer.appendChild(ring);
        } else {
          n.classList.add(soft ? "db-hover-soft" : "db-hover"); // fallback: plain outline via css
        }
      });
      marked = m;
    }
    place(event, list(anchor), follow);
  }

  function leave() {
    clear();
    tooltip.style("opacity", 0);
  }

  return { enter, leave };
}
