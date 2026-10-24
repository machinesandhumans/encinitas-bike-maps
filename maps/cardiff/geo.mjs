// Ties the map's straightened frame (s = metres north along the road, d = metres west of the centreline) to real coordinates.
// The centreline is every Coast Hwy 101 node in the OpenStreetMap extract, ordered along the road and averaged in 15 m bins.
// s is anchored so that the middle of the 101 lagoon outlet bridge sits at BRIDGE_S.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const OSM_FILE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "data", "osm", "cardiff-osm.json");
export const BRIDGE_S = 1926;

export function loadFrame(file = OSM_FILE) {
  const osm = JSON.parse(readFileSync(file, "utf8"));
  const ways = osm.elements.filter((e) => e.type === "way" && e.geometry);
  const lat0 = (osm.bbox[0] + osm.bbox[2]) / 2, lon0 = (osm.bbox[1] + osm.bbox[3]) / 2;
  const KY = 111320, KX = 111320 * Math.cos((lat0 * Math.PI) / 180);
  const toXY = ({ lat, lon }) => [(lon - lon0) * KX, (lat - lat0) * KY];
  const toLL = ([x, y]) => [+(lat0 + y / KY).toFixed(7), +(lon0 + x / KX).toFixed(7)];

  const is101 = (t) => /^(primary|secondary|trunk|tertiary)(_link)?$/.test(t.highway ?? "") && /101|Coast H/i.test(`${t.name ?? ""} ${t.ref ?? ""}`);
  const pts = ways.filter((w) => is101(w.tags ?? {})).flatMap((w) => w.geometry.map(toXY));
  if (!pts.length) throw new Error("no Coast Hwy 101 ways in " + file);
  const mean = pts.reduce((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length], [0, 0]);
  let sxx = 0, sxy = 0, syy = 0;
  for (const [x, y] of pts) { const dx = x - mean[0], dy = y - mean[1]; sxx += dx * dx; sxy += dx * dy; syy += dy * dy; }
  const ang = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  let ax = [Math.cos(ang), Math.sin(ang)];
  if (ax[1] < 0) ax = [-ax[0], -ax[1]]; // point the axis north
  const bins = new Map();
  for (const p of pts) { const k = Math.floor(((p[0] - mean[0]) * ax[0] + (p[1] - mean[1]) * ax[1]) / 15); const b = bins.get(k) ?? [0, 0, 0]; b[0] += p[0]; b[1] += p[1]; b[2]++; bins.set(k, b); }
  const centre = [...bins.entries()].sort((a, b) => a[0] - b[0]).map(([, b]) => [b[0] / b[2], b[1] / b[2]]);
  const cum = [0];
  for (let i = 1; i < centre.length; i++) cum.push(cum[i - 1] + Math.hypot(centre[i][0] - centre[i - 1][0], centre[i][1] - centre[i - 1][1]));

  // nearest centreline position: raw length along it and signed offset (positive west, left of northward travel)
  const project = (p) => {
    let best = [Infinity, 0, 0];
    for (let i = 1; i < centre.length; i++) {
      const [a, b] = [centre[i - 1], centre[i]], vx = b[0] - a[0], vy = b[1] - a[1], L = Math.hypot(vx, vy) || 1;
      const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / (L * L)));
      const q = [a[0] + vx * t, a[1] + vy * t], dist = Math.hypot(p[0] - q[0], p[1] - q[1]);
      if (dist < best[0]) best = [dist, cum[i - 1] + t * L, ((p[0] - q[0]) * -vy + (p[1] - q[1]) * vx) / L];
    }
    return [best[1], best[2]];
  };
  const bridge101 = ways.filter((w) => is101(w.tags ?? {}) && w.tags.bridge && w.tags.bridge !== "no").flatMap((w) => w.geometry.map(toXY));
  const OFFSET = bridge101.length ? project(bridge101.reduce((a, p) => [a[0] + p[0] / bridge101.length, a[1] + p[1] / bridge101.length], [0, 0]))[0] - BRIDGE_S : 0;

  const sd = (g) => { const [c, d] = project(toXY(g)); return [c - OFFSET, d]; }; // {lat, lon} -> [s, d]
  const pointAt = (s, d) => {
    const c = Math.max(0, Math.min(cum[cum.length - 1], s + OFFSET));
    let i = 1; while (i < cum.length - 1 && cum[i] < c) i++;
    const [a, b] = [centre[i - 1], centre[i]], L = cum[i] - cum[i - 1] || 1, t = (c - cum[i - 1]) / L;
    const tx = (b[0] - a[0]) / L, ty = (b[1] - a[1]) / L;
    return [a[0] + (b[0] - a[0]) * t - ty * d, a[1] + (b[1] - a[1]) * t + tx * d];
  };
  const ll = (s, d) => toLL(pointAt(s, d));
  return { osm, ways, is101, toXY, toLL, sd, ll, centre: centre.map(toLL), bridgeFound: bridge101.length > 0 };
}
