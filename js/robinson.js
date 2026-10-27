// robinson.js: Robinson projection for d3 (same table as d3-geo-projection),
// kept local so the maps need one dependency (d3) instead of two.
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const K = [
  [0.9986, -0.062], [1.0, 0.0], [0.9986, 0.062], [0.9954, 0.124], [0.99, 0.186],
  [0.9822, 0.248], [0.973, 0.31], [0.96, 0.372], [0.9427, 0.434], [0.9216, 0.4958],
  [0.8962, 0.5571], [0.8679, 0.6176], [0.835, 0.6769], [0.7986, 0.7346], [0.7597, 0.7903],
  [0.7186, 0.8435], [0.6732, 0.8936], [0.6213, 0.9394], [0.5722, 0.9761], [0.5322, 1.0],
].map(([x, y]) => [x, y * 1.0144]);

function robinsonRaw(lambda, phi) {
  const i = Math.min(18, (Math.abs(phi) * 36) / Math.PI);
  let i0 = Math.floor(i);
  const di = i - i0;
  const [ax, ay] = K[i0];
  const [bx, by] = K[++i0];
  const [cx, cy] = K[Math.min(19, ++i0)];
  return [
    lambda * (bx + (di * (cx - ax)) / 2 + (di * di * (cx - 2 * bx + ax)) / 2),
    (phi > 0 ? Math.PI / 2 : -Math.PI / 2) *
      (by + (di * (cy - ay)) / 2 + (di * di * (cy - 2 * by + ay)) / 2),
  ];
}

export const geoRobinson = () => d3.geoProjection(robinsonRaw).scale(152.63);
