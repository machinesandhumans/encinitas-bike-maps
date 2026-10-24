// Derives the map layout (cycle tracks, bridge, city line, buildings, lots, driveways) from the OpenStreetMap extract,
// then applies field edits from data/field/cardiff-edits.json. node maps/cardiff/osm-layout.mjs
// Writes layout.mjs, which data.mjs re-exports. Rerun after refreshing the OSM extract or changing the edits.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadFrame } from "./geo.mjs";

const F = loadFrame();
const byId = Object.fromEntries(F.ways.map((w) => [w.id, w]));
// OSM ways for each track, in riding order. The SB track starts at the Chesterfield signal; the path north of it is left out.
const NB_WAYS = [855189950, 910042103, 1245378794];
const SB_WAYS = [1457651348, 839558530, 1457651350, 889632449, 889632448, 861292389, 1086722588, 839558532];
// OSM joins each track end to the road's centreline node; riders actually enter and leave from the curb lane, so those ends are moved there.
const LANE = 5.4;

// Field corrections from Mark's satellite review (data/field/cardiff-review-notes-2026-10-24.json): OSM's south ends run diagonally to the
// centreline, but the separated lanes actually begin (NB) and end (SB) here, beside the curb lane.
const FIELD_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "data", "field");
const FIELD = JSON.parse(readFileSync(join(FIELD_DIR, "cardiff-review-notes-2026-10-24.json"), "utf8")).notes;
const fieldSD = (n) => { const [lat, lon] = FIELD.find((x) => x.n === n).at; return F.sd({ lat, lon }); };
const NB_START = fieldSD(2), SB_END = fieldSD(3);

const r1 = (v) => Math.round(v * 10) / 10;
function chain(ids, sign) {
  const out = [];
  for (const id of ids) for (const g of byId[id].geometry) {
    const [s, d] = F.sd(g);
    const p = [r1(s), r1(Math.abs(d) < 1 ? sign * LANE : d)];
    if (!out.length || out.at(-1)[0] !== p[0]) out.push(p);
  }
  return out;
}
const NB_TRACK = [NB_START.map(r1), ...chain(NB_WAYS, -1).filter(([s]) => s > NB_START[0] + 5)];
const SB_TRACK = [...chain(SB_WAYS, 1).filter(([s]) => s > SB_END[0] + 5), SB_END.map(r1)];
const span = (ws) => { const ss = ws.flatMap((w) => w.geometry.map((g) => F.sd(g)[0])); return [Math.round(Math.min(...ss)), Math.round(Math.max(...ss))]; };
const BRIDGES = [span(F.ways.filter((w) => F.is101(w.tags ?? {}) && w.tags.bridge && w.tags.bridge !== "no"))];
let cityLine = null;
for (const r of F.osm.elements.filter((e) => e.type === "relation" && /Encinitas/i.test(e.tags?.name ?? ""))) for (const m of r.members ?? []) for (const g of m.geometry ?? []) { const [s, d] = F.sd(g); if (s > -300 && s < 700 && Math.abs(d) < 30 && (!cityLine || Math.abs(d) < cityLine[1])) cityLine = [Math.round(s), Math.abs(d)]; }
const unlit = byId[839558532].tags.lit === "no" ? [[Math.round(F.sd(byId[839558532].geometry.at(-1))[0]), Math.round(F.sd(byId[839558532].geometry[0])[0])]] : [];

// ---------- buildings, lots and driveways ----------
// Field edits: { buildings: { "<osm id>": { move: [dlat, dlon] } | { delete: true } }, driveways: { add: [{ id, a: [lat, lon], b: [lat, lon], name }], delete: [id] } }
const EDITS_FILE = join(FIELD_DIR, "cardiff-edits.json");
const EDITS = existsSync(EDITS_FILE) ? JSON.parse(readFileSync(EDITS_FILE, "utf8")) : {};
const bEdits = EDITS.buildings ?? {}, dEdits = EDITS.driveways ?? {};
const inRange = (s) => s > 140 && s < 2340;
const near = (w, dmax) => w.geometry.some((g) => { const [s, d] = F.sd(g); return inRange(s) && Math.abs(d) < dmax; });
const shape = (w) => {
  const mv = bEdits[w.id]?.move ?? [0, 0];
  const pts = w.geometry.map((g) => F.sd({ lat: g.lat + mv[0], lon: g.lon + mv[1] }).map(r1));
  if (pts.length > 1 && pts[0][0] === pts.at(-1)[0] && pts[0][1] === pts.at(-1)[1]) pts.pop();
  return pts;
};
const area = (pts) => Math.abs(pts.reduce((a, [x, y], i) => { const [x2, y2] = pts[(i + 1) % pts.length]; return a + x * y2 - x2 * y; }, 0) / 2);
const BUILDINGS = F.ways.filter((w) => w.tags?.building && near(w, 70) && !bEdits[w.id]?.delete).map((w) => {
  const pts = shape(w), levels = Number(w.tags["building:levels"]) || 0;
  return { id: w.id, name: w.tags.name ?? "", h: levels ? levels * 3.2 : area(pts) < 40 ? 2.6 : 4.2, pts, moved: !!bEdits[w.id]?.move };
});
const LOTS = F.ways.filter((w) => w.tags?.amenity === "parking" && near(w, 70)).map((w) => ({ id: w.id, name: w.tags.name ?? "", pts: shape(w) }));
// OSM driveways: service ways and side streets that reach the road or a track. Each crossing is 8 m wide unless edited.
const isAccess = (t) => !is101Way(t) && /^(service|residential|unclassified|tertiary|secondary)$/.test(t.highway ?? "");
const is101Way = (t) => F.is101(t);
const raw = [];
for (const w of F.ways.filter((w) => isAccess(w.tags ?? {}))) {
  const sd = w.geometry.map((g) => F.sd(g));
  const at = sd.reduce((a, p) => (Math.abs(p[1]) < Math.abs(a[1]) ? p : a));
  if (!inRange(at[0]) || Math.abs(at[1]) > 14) continue;
  const far = sd.reduce((a, p) => (Math.abs(p[1]) > Math.abs(a[1]) ? p : a));
  raw.push({ s: at[0], side: far[1] < 0 ? "E" : "W", name: w.tags.name ?? (w.tags.service === "parking_aisle" ? "Parking lot" : "Driveway"), id: "osm-" + w.id });
}
raw.sort((a, b) => a.s - b.s);
const DRIVES = [];
for (const r of raw) { // merge crossings less than 10 m apart on the same side into one driveway
  const prev = DRIVES.findLast((d) => d[2] === r.side);
  if (prev && r.s - 4 - prev[1] < 2) { prev[1] = r1(r.s + 4); continue; }
  DRIVES.push([r1(r.s - 4), r1(r.s + 4), r.side, r.name, r.id]);
}
const LOT_NAMES = [["Cardiff State Beach (south lot)", 300, 460, "W"], ["Las Olas", 1320, 1380, "E"], ["Tower 13 / Ki's", 1400, 1530, "E"], ["Chart House / restaurants", 1440, 1640, "W"], ["The Kraken", 1580, 1640, "E"], ["Cardiff State Beach (north lot)", 1650, 1700, "W"], ["Chesterfield Dr", 2250, 2310, "E"]];
for (const d of DRIVES) if (/^(Driveway|Parking lot)$/.test(d[3])) { const n = LOT_NAMES.find(([, a, b, side]) => side === d[2] && d[0] < b && d[1] > a); if (n) d[3] = n[0]; }
const fieldDrives = (dEdits.add ?? []).map((x) => { const [sa, da] = F.sd({ lat: x.a[0], lon: x.a[1] }), [sb, db] = F.sd({ lat: x.b[0], lon: x.b[1] }); return [r1(Math.min(sa, sb)), r1(Math.max(sa, sb)), da + db < 0 ? "E" : "W", x.name || "Driveway (field)", x.id]; });
const dropped = new Set(dEdits.delete ?? []);
const ALL_DRIVES = [...DRIVES.filter((d) => !dropped.has(d[4])), ...fieldDrives].sort((a, b) => a[0] - b[0]);

const js = `// Generated by osm-layout.mjs from data/osm/cardiff-osm.json (OpenStreetMap, ${F.osm.fetched}). Do not edit by hand.
// s = metres north along the road, anchored on the 101 lagoon outlet bridge; d = metres from the centreline, positive WEST.
// NB ways ${NB_WAYS.join(", ")}; SB ways ${SB_WAYS.join(", ")}. South ends (NB start s ${r1(NB_START[0])}, SB end s ${r1(SB_END[0])}) are Mark's field corrections; the NB north end, which OSM joins to the centreline, is moved to the curb lane (d -${LANE}).
export const NB_TRACK = ${JSON.stringify(NB_TRACK)};
export const SB_TRACK = ${JSON.stringify(SB_TRACK)}; // north to south
export const BRIDGES = ${JSON.stringify(BRIDGES)}; // the highway bridge over the lagoon outlet
export const UNLIT = ${JSON.stringify(unlit)}; // OSM tags the southbound exit lit=no
// Buildings and lots are OSM outlines as [s, d] points (h = height in metres); moved = shifted by a field edit.
export const BUILDINGS = ${JSON.stringify(BUILDINGS)};
export const LOTS = ${JSON.stringify(LOTS)};
// Driveways and side streets crossing the curb: [s0, s1, side, name, id]. "osm-" ids come from OSM service ways (8 m wide); "field-" ids from Mark's edits.
export const DRIVES = ${JSON.stringify(ALL_DRIVES)};
export const CITY_LINE = ${cityLine?.[0] ?? "null"}; // where OSM's Encinitas boundary crosses the road
`;
writeFileSync(join(dirname(fileURLToPath(import.meta.url)), "layout.mjs"), js);
console.log("NB", NB_TRACK.length, "pts", NB_TRACK[0], NB_TRACK.at(-1), "SB", SB_TRACK.length, SB_TRACK[0], SB_TRACK.at(-1), "bridge", BRIDGES, "city", cityLine, "unlit", unlit, "buildings", BUILDINGS.length, "lots", LOTS.length, "drives", ALL_DRIVES.length);
