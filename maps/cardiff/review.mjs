// Builds the satellite review page for the Cardiff corridor. node maps/cardiff/review.mjs
// Puts the map's drawn layout and the raw OpenStreetMap features over aerial imagery, so errors can be spotted and noted.
// Needs data/osm/cardiff-osm.json (node tools/fetch-osm.mjs cardiff).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as D from "./data.mjs";
import { OSM_FILE, loadFrame } from "./geo.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
if (!existsSync(OSM_FILE)) { console.error("missing", OSM_FILE, "- run: node tools/fetch-osm.mjs cardiff"); process.exit(1); }
const { osm, ways, is101, toXY, sd, ll, centre: centreLL, bridgeFound } = loadFrame();

// ---------- layers ----------
const drawn = {
  nb: D.NB_TRACK.map(([s, d]) => ll(s, d)),
  sb: D.SB_TRACK.map(([s, d]) => ll(s, d)),
  // driveways as stretches of curb: east side just outside the NB track, west side just outside the SB track
  drives: D.DRIVES.map(([a, b, side, name, id]) => ({ id, name, line: [ll(a, side === "E" ? -11 : 13.5), ll(b, side === "E" ? -11 : 13.5)] })),
  buildings: D.BUILDINGS.map((b) => ({ id: String(b.id), name: b.name, ring: b.pts.map(([s, d]) => ll(s, d)) })),
  lots: D.LOTS.map((l) => ({ name: l.name, ring: l.pts.map(([s, d]) => ll(s, d)) })),
  bridges: D.BRIDGES.map(([a, b]) => [ll(a, 14), ll(b, 14), ll(b, -12), ll(a, -12)]),
  marks: [["Solana Beach line (map)", D.LIMITS.cityLine], ["Chesterfield Dr (map)", D.LIMITS.chesterfield], ["NB track south end (map)", D.NB_TRACK[0][0]], ["SB track north end (map)", D.SB_TRACK[0][0]]].map(([name, s]) => ({ name, at: ll(s, 0) })),
};
const ring = (w) => w.geometry.map((g) => [+g.lat.toFixed(7), +g.lon.toFixed(7)]);
const kindOf = (t) => (t.highway === "cycleway" || t.bicycle === "designated" && t.highway === "path" ? "cycle" : is101(t) ? "road" : /footway|path|pedestrian|steps/.test(t.highway ?? "") ? "foot" : t.highway === "service" ? "service" : t.highway ? "street" : t.barrier ? "barrier" : t.amenity === "parking" ? "parking" : t.building ? "building" : t.bridge ? "bridge" : null);
const nearRoad = (g) => { const [s, d] = sd(g); return s > D.RANGE.south - 50 && s < D.RANGE.north + 50 && Math.abs(d) < 120; };
const raw = ways.map((w) => ({ k: kindOf(w.tags ?? {}), id: w.id, tags: w.tags ?? {}, line: ring(w), g: w.geometry }))
  .filter((w) => ["cycle", "road", "foot", "service", "barrier", "bridge"].includes(w.k) && w.g.some(nearRoad)).map(({ g, ...w }) => w);
const barrierNodes = osm.elements.filter((e) => e.type === "node" && e.tags?.barrier && nearRoad(e)).map((e) => ({ at: [e.lat, e.lon], tags: e.tags }));
const EDITS_FILE = join(ROOT, "data", "field", "cardiff-edits.json");
const edits = existsSync(EDITS_FILE) ? JSON.parse(readFileSync(EDITS_FILE, "utf8")) : {};
const DATA = { drawn, raw, barrierNodes, centre: centreLL, fetched: osm.fetched, offsetCheck: { bridgeFound }, edits: { buildings: edits.buildings ?? {}, driveways: { add: edits.driveways?.add ?? [], delete: edits.driveways?.delete ?? [] } } };

const leafletJs = readFileSync(join(ROOT, "vendor", "leaflet", "leaflet.js"), "utf8");
const leafletCss = readFileSync(join(ROOT, "vendor", "leaflet", "leaflet.css"), "utf8").replace(/url\(images\/[^)]*\)/g, "none");

const CSS = `
:root{--page:#f2f2ef;--card:#fff;--text:#2a2a2a;--muted:#6b6b6b;--line:#d6d6d0;--accent:#d93b3f;color-scheme:light}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--page:#0b0b0b;--card:#161616;--text:#e6e6e6;--muted:#9a9a9a;--line:#2e2e2e;--accent:#ff6b6b;color-scheme:dark}}
:root[data-theme="dark"]{--page:#0b0b0b;--card:#161616;--text:#e6e6e6;--muted:#9a9a9a;--line:#2e2e2e;--accent:#ff6b6b;color-scheme:dark}
body{background:var(--page);margin:0;color:var(--text);font:14px/1.5 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
.rv{padding:20px max(16px,env(safe-area-inset-left,0px)) 40px;max-width:1200px;margin:0 auto;display:grid;gap:12px}
.rv h1{margin:0;font:600 20px/1.25 inherit;font-weight:600}
.rv p{margin:0;color:var(--muted);font-size:13px}
.rv-body{display:grid;grid-template-columns:1fr 300px;gap:12px}
@media (max-width:760px){.rv-body{grid-template-columns:1fr}}
.rv-mapwrap{position:relative;min-width:0}
#map{height:min(78vh,760px);min-height:420px;box-shadow:0 0 0 1px var(--line);background:#333}
@media (max-width:760px){#map{height:72vh;min-height:360px}}
.rv-cross{position:absolute;left:50%;top:50%;width:28px;height:28px;margin:-14px 0 0 -14px;pointer-events:none;z-index:500;display:none}
.rv-cross::before,.rv-cross::after{content:"";position:absolute;background:#fff;box-shadow:0 0 0 1px #000a}
.rv-cross::before{left:13px;top:0;width:2px;height:28px}.rv-cross::after{top:13px;left:0;height:2px;width:28px}
.rv-field .rv-cross{display:block}
.rv-fab{position:absolute;z-index:600;right:10px;bottom:24px;display:none;gap:8px;flex-direction:column;align-items:flex-end}
.rv-field .rv-fab{display:flex}
.rv-fab button{font:600 15px/1 inherit;padding:14px 16px;border-radius:24px;border:0;background:var(--card);color:var(--text);box-shadow:0 2px 8px #0006;cursor:pointer}
.rv-fab .rv-primary{background:var(--accent);color:#fff}
.rv-fab select{font:600 15px/1.2 inherit;padding:10px 12px;border-radius:20px;border:0;background:var(--card);color:var(--text);box-shadow:0 2px 8px #0006}
.rv-vh{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.rv-types{display:flex;flex-wrap:wrap;gap:6px}
.rv-types button{font:13px/1 inherit;padding:9px 10px;border:1px solid var(--line);background:var(--card);color:var(--text);border-radius:16px;cursor:pointer}
.rv-types button[aria-pressed="true"]{border-color:var(--accent);background:var(--accent);color:#fff}
#marks{margin:0;padding-left:18px;display:grid;gap:6px}
#marks li button{border:0;background:none;color:var(--muted);cursor:pointer;padding:0 4px}
.rv-side{background:var(--card);box-shadow:0 0 0 1px var(--line);padding:12px;display:grid;gap:10px;align-content:start;font-size:13px}
.rv-side h2{margin:0;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);font-weight:600}
.rv-side label{display:flex;gap:8px;align-items:center;cursor:pointer}
.rv-sw{display:inline-block;width:18px;height:4px;border-radius:2px}
.rv-btn{font:12px/1 inherit;padding:8px 10px;border:1px solid var(--line);background:var(--card);color:var(--text);cursor:pointer}
.rv-btn[aria-pressed="true"]{border-color:var(--accent);color:var(--accent)}
#notes{margin:0;padding-left:18px;display:grid;gap:6px}
#notes li button{border:0;background:none;color:var(--muted);cursor:pointer;padding:0 4px}
.rv-warn{color:var(--accent)}
.leaflet-container{font:12px/1.4 ui-sans-serif,system-ui,sans-serif}
.rv-tag{background:#000a;color:#fff;border:0;box-shadow:none;font-size:11px;padding:1px 5px}
.rv-tag::before{display:none}
`;

const LAYERS = [
  ["drawnNb", "Map: NB track (east)", "#ff3b3b", true], ["drawnSb", "Map: SB track (west)", "#ff9f1a", true],
  ["drawnBuild", "Map: buildings and lots", "#ffe14d", true], ["drawnDrive", "Map: driveways (curb cuts)", "#ff4fd8", true],
  ["drawnOther", "Map: bridge and track ends", "#ffe14d", true],
  ["osmCycle", "OpenStreetMap: bike tracks", "#4dd2ff", true], ["osmRoad", "OpenStreetMap: Hwy 101 lanes", "#ffffff", false],
  ["osmOther", "OpenStreetMap: paths, driveways, barriers", "#b388ff", false], ["centre", "Centreline used to straighten the road", "#7CFC00", false],
];

const page = `<title>Cardiff Satellite Review</title>
<style>${leafletCss}${CSS}</style>
<div class="rv">
<header><h1>Cardiff 101: check the map against satellite imagery</h1>
<p>Colored lines are what the corridor map draws, laid back onto real coordinates. Where a line misses the pavement in the photo, the map is wrong there. Add a note to describe a problem, or fix buildings and driveways directly under Edit the map.</p></header>
<div class="rv-body">
<div class="rv-mapwrap" id="mapwrap"><div id="map" role="region" aria-label="Satellite map of Coast Highway 101 in Cardiff with the map's layout drawn over it"></div><div class="rv-cross" aria-hidden="true"></div>
<div class="rv-fab"><label for="fab-type" class="rv-vh">What to mark</label><select id="fab-type"></select><button id="fab-me" type="button">Center on me</button><button id="fab-mark" class="rv-primary" type="button">Mark here</button></div></div>
<aside class="rv-side">
<h2>Field walk</h2>
<button class="rv-btn" id="field-toggle" aria-pressed="false">Start field walk</button>
<p id="gps">Shows your position and a crosshair. Pick what you're marking, line the crosshair up, then tap Mark here.</p>
<div class="rv-types" id="types" role="group" aria-label="What to mark"></div>
<label for="mark-note" style="display:block">Note for the next mark (optional)</label><input id="mark-note" style="width:100%;box-sizing:border-box;font:inherit;padding:6px">
<ol id="marks"></ol>
<button class="rv-btn" id="send-all">Send everything to the chat</button>
<h2>Base</h2>
<div style="display:flex;gap:6px"><button class="rv-btn" data-base="sat" aria-pressed="true">Satellite</button><button class="rv-btn" data-base="street" aria-pressed="false">Street map</button></div>
<label for="sat-src" style="display:block">Satellite source</label><select id="sat-src" style="font:inherit;padding:6px;max-width:100%"></select>
<p id="imagery">Loading imagery…</p>
<h2>Layers</h2>
${LAYERS.map(([id, label, color, on]) => `<label><input type="checkbox" data-layer="${id}" ${on ? "checked" : ""}><span class="rv-sw" style="background:${color}"></span>${label}</label>`).join("")}
<h2>Edit the map</h2>
<div style="display:flex;gap:6px;flex-wrap:wrap"><button class="rv-btn" id="mode-move" aria-pressed="false">Move buildings</button><button class="rv-btn" id="mode-drive" aria-pressed="false">Mark driveway</button></div>
<form id="drive-form" hidden><label for="drive-name" style="display:block">Driveway name (optional)</label><input id="drive-name" style="width:100%;box-sizing:border-box;font:inherit"><div style="display:flex;gap:6px;margin-top:6px"><button class="rv-btn" type="submit">Save driveway</button><button class="rv-btn" type="button" id="drive-cancel">Cancel</button></div></form>
<div id="selected" hidden><p id="sel-text"></p><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px"><button class="rv-btn" id="sel-delete">Delete</button><button class="rv-btn" id="sel-reset">Undo move</button></div></div>
<p id="edit-summary"></p>

<h2>Notes</h2>
<button class="rv-btn" id="add" aria-pressed="false">Add note</button>
<form id="note-form" hidden><label for="note-text" style="display:block">What's wrong or missing here?</label><textarea id="note-text" rows="3" style="width:100%;box-sizing:border-box;font:inherit"></textarea><div style="display:flex;gap:6px"><button class="rv-btn" type="submit">Save note</button><button class="rv-btn" type="button" id="note-cancel">Cancel</button></div></form>
<ol id="notes"></ol>

<p id="status"></p>
<p id="check"></p>
</aside></div>
<p>Imagery: Esri World Imagery (Maxar, Earthstar Geographics) or USGS The National Map. Street map and features: © OpenStreetMap contributors. Marks, notes and edits stay on this device until you send them.</p>
</div>
<script>${leafletJs}</script>
<script>${(`
const DATA = ${JSON.stringify(DATA)};
const COLORS = ${JSON.stringify(Object.fromEntries(LAYERS.map(([id, , c]) => [id, c])))};
const map = L.map("map", { zoomSnap: 0.5, maxZoom: 21 });
// Satellite sources, tried in order: if a source's tiles fail and none load, the page moves to the next one and says so.
const SAT = [
  ["Esri World Imagery", "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", 19, "Esri, Maxar, Earthstar Geographics"],
  ["Esri World Imagery (mirror)", "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", 19, "Esri, Maxar, Earthstar Geographics"],
  ["USGS National Map imagery", "https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}", 16, "USGS The National Map"],
];
const imgEl = document.querySelector("#imagery");
let satIdx = 0, sat = null, base = null, baseKind = "sat";
function makeSat(i) {
  const [name, url, nz, attribution] = SAT[i];
  const layer = L.tileLayer(url, { maxZoom: 21, maxNativeZoom: nz, attribution });
  let ok = 0, bad = 0;
  layer.on("tileload", () => { ok++; if (ok === 1) imgEl.textContent = "Imagery: " + name + "."; });
  layer.on("tileerror", () => {
    bad++;
    if (ok === 0 && bad >= 6 && layer === sat) {
      if (i + 1 < SAT.length) { imgEl.textContent = name + " didn't load, trying " + SAT[i + 1][0] + "…"; useSat(i + 1); }
      else imgEl.textContent = "No satellite source loaded on this connection. Try Street map, or another network.";
    }
  });
  return layer;
}
function useSat(i) { satIdx = i; if (base) map.removeLayer(base); sat = makeSat(i); base = sat.addTo(map); base.bringToBack(); document.querySelector("#sat-src").value = String(i); }
const street = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 21, maxNativeZoom: 19, attribution: "© OpenStreetMap contributors" });
const srcSel = document.querySelector("#sat-src");
SAT.forEach(([name], i) => srcSel.append(new Option(name, String(i))));
srcSel.addEventListener("change", () => { if (baseKind === "sat") useSat(Number(srcSel.value)); else satIdx = Number(srcSel.value); });
useSat(0);
document.querySelectorAll("[data-base]").forEach((b) => b.addEventListener("click", () => {
  baseKind = b.dataset.base;
  if (baseKind === "sat") useSat(satIdx); else { map.removeLayer(base); base = street.addTo(map); base.bringToBack(); imgEl.textContent = "Street map: OpenStreetMap."; }
  document.querySelectorAll("[data-base]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
}));
const groups = {};
for (const id of Object.keys(COLORS)) groups[id] = L.layerGroup();
const tip = (layer, text) => layer.bindTooltip(text, { sticky: true });
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
tip(L.polyline(DATA.drawn.nb, { color: COLORS.drawnNb, weight: 4 }), "Map: NB track centreline").addTo(groups.drawnNb);
tip(L.polyline(DATA.drawn.sb, { color: COLORS.drawnSb, weight: 4 }), "Map: SB track centreline").addTo(groups.drawnSb);
const Y = COLORS.drawnOther;
for (const r of DATA.drawn.bridges) tip(L.polygon(r, { color: Y, weight: 2, fill: false, dashArray: "6 4" }), "Map: bridge extent").addTo(groups.drawnOther);
for (const l of DATA.drawn.lots) tip(L.polygon(l.ring, { color: COLORS.drawnBuild, weight: 1.5, fillOpacity: 0.06, dashArray: "4 4", interactive: false }), "Map: parking").addTo(groups.drawnBuild);
for (const m of DATA.drawn.marks) tip(L.circleMarker(m.at, { radius: 7, color: "#fff", fillColor: Y, fillOpacity: 1, weight: 2 }), esc(m.name)).addTo(groups.drawnOther);
const tagText = (t) => Object.entries(t).filter(([k]) => !/^(source|note:|tiger)/.test(k)).slice(0, 8).map(([k, v]) => esc(k) + "=" + esc(v)).join("<br>");
for (const w of DATA.raw) {
  const g = w.k === "cycle" ? "osmCycle" : w.k === "road" ? "osmRoad" : ["foot", "service", "barrier", "bridge"].includes(w.k) ? "osmOther" : null;
  if (!g) continue;
  tip(L.polyline(w.line, { color: COLORS[g], weight: w.tags.bridge && w.tags.bridge !== "no" ? 7 : w.k === "road" ? 1.5 : 2.5, dashArray: w.k === "barrier" ? "2 4" : null, opacity: 0.9 }), "OSM way " + w.id + "<br>" + tagText(w.tags)).addTo(groups[g]);
}
for (const n of DATA.barrierNodes) tip(L.circleMarker(n.at, { radius: 3, color: COLORS.osmOther, weight: 1, fillOpacity: 0.8 }), "OSM " + tagText(n.tags)).addTo(groups.osmOther);
L.polyline(DATA.centre, { color: COLORS.centre, weight: 2, dashArray: "8 6" }).addTo(groups.centre);
document.querySelectorAll("[data-layer]").forEach((c) => { const sync = () => (c.checked ? groups[c.dataset.layer].addTo(map) : map.removeLayer(groups[c.dataset.layer])); c.addEventListener("change", sync); sync(); });
map.fitBounds(L.latLngBounds([...DATA.drawn.nb, ...DATA.drawn.sb]).pad(0.05));
const chk = DATA.offsetCheck;
document.querySelector("#check").innerHTML = !chk.bridgeFound ? '<span class="rv-warn">No 101 bridge found in the OpenStreetMap data, so the drawn layers may be shifted along the road.</span>' : "Drawn layers are aligned on the lagoon bridge.";
// ---------- map edits: move or delete buildings, add or delete driveways ----------
const EKEY = "cardiff-review-edits";
const clone = (o) => JSON.parse(JSON.stringify(o));
let ed = clone(DATA.edits);
try { const saved = JSON.parse(localStorage.getItem(EKEY) || "null"); if (saved && saved.buildings && saved.driveways) ed = saved; } catch {}
const saveEd = () => { try { localStorage.setItem(EKEY, JSON.stringify(ed)); } catch {} };
const baseMove = (id) => DATA.edits.buildings[id]?.move ?? [0, 0];
const curMove = (id) => ed.buildings[id]?.move ?? [0, 0];
const shifted = (b) => { const m = curMove(b.id), o = baseMove(b.id); return b.ring.map(([la, lo]) => [la + m[0] - o[0], lo + m[1] - o[1]]); };
const BSTYLE = { color: COLORS.drawnBuild, weight: 2, fillOpacity: 0.15 }, SEL = { color: "#ffffff", weight: 3 };
const DSTYLE = { color: COLORS.drawnDrive, weight: 7, opacity: 0.9, lineCap: "butt" };
const bLayer = groups.drawnBuild, dLayer = groups.drawnDrive;
const bPolys = {};
let mode = null, selected = null, drag = null, pending = [], pendingLayer = null;
const statusEl = () => document.querySelector("#status");
function select(sel) {
  if (selected?.layer) selected.layer.setStyle(selected.kind === "b" ? BSTYLE : DSTYLE);
  selected = sel;
  const box = document.querySelector("#selected");
  box.hidden = !sel;
  if (!sel) return;
  sel.layer.setStyle(SEL);
  document.querySelector("#sel-text").textContent = sel.kind === "b" ? "Building" + (sel.name ? ": " + sel.name : "") : "Driveway" + (sel.name ? ": " + sel.name : "");
  document.querySelector("#sel-delete").textContent = sel.kind === "b" ? "Delete building" : "Delete driveway";
  document.querySelector("#sel-reset").hidden = sel.kind !== "b";
}
function drawEdits() {
  bLayer.clearLayers(); dLayer.clearLayers();
  for (const b of DATA.drawn.buildings) {
    if (ed.buildings[b.id]?.delete) continue;
    const poly = L.polygon(shifted(b), BSTYLE).addTo(bLayer);
    tip(poly, "Map: building" + (b.name ? " · " + esc(b.name) : ""));
    bPolys[b.id] = poly;
    poly.on("mousedown", (e) => {
      if (mode !== "move") return;
      L.DomEvent.stop(e); map.dragging.disable();
      select({ kind: "b", id: b.id, name: b.name, layer: poly });
      drag = { b, poly, start: e.latlng, from: curMove(b.id) };
    });
  }
  const added = ed.driveways.add.filter((x) => !DATA.edits.driveways.add.some((y) => y.id === x.id)).map((x) => ({ id: x.id, name: x.name, line: [x.a, x.b] }));
  for (const d of [...DATA.drawn.drives, ...added]) {
    if (ed.driveways.delete.includes(d.id)) continue;
    const line = L.polyline(d.line, DSTYLE).addTo(dLayer);
    tip(line, "Map: driveway · " + esc(d.name));
    line.on("click", (e) => { if (mode !== "drive" || pending.length) return; L.DomEvent.stop(e); select({ kind: "d", id: d.id, name: d.name, layer: line }); });
  }
  const moved = Object.entries(ed.buildings).filter(([id, v]) => v.move && (v.move[0] !== baseMove(id)[0] || v.move[1] !== baseMove(id)[1])).length;
  const deleted = Object.values(ed.buildings).filter((v) => v.delete).length;
  const changes = JSON.stringify(ed) !== JSON.stringify(DATA.edits);
  document.querySelector("#edit-summary").textContent = changes ? "Unsent changes: " + moved + " buildings moved, " + deleted + " deleted, " + ed.driveways.add.length + " driveways added, " + ed.driveways.delete.length + " removed." : "No changes yet.";
}
map.on("mousemove", (e) => {
  if (!drag) return;
  const m = [drag.from[0] + e.latlng.lat - drag.start.lat, drag.from[1] + e.latlng.lng - drag.start.lng];
  ed.buildings[drag.b.id] = { move: [+m[0].toFixed(7), +m[1].toFixed(7)] };
  drag.poly.setLatLngs(shifted(drag.b));
});
map.on("mouseup", () => { if (!drag) return; drag = null; map.dragging.enable(); saveEd(); drawEdits(); });
function setMode(m) {
  mode = mode === m ? null : m;
  setAdding(false); select(null); clearPending();
  document.querySelector("#mode-move").setAttribute("aria-pressed", String(mode === "move"));
  document.querySelector("#mode-drive").setAttribute("aria-pressed", String(mode === "drive"));
  statusEl().textContent = mode === "move" ? "Drag a building to its real position. Tap one to delete it." : mode === "drive" ? "Tap where the curb cut starts, then where it ends. Tap a pink line to remove a driveway." : "";
  map.getContainer().style.cursor = mode === "drive" ? "crosshair" : "";
}
function clearPending() { pending = []; if (pendingLayer) map.removeLayer(pendingLayer); pendingLayer = null; document.querySelector("#drive-form").hidden = true; }
document.querySelector("#mode-move").addEventListener("click", () => setMode("move"));
document.querySelector("#mode-drive").addEventListener("click", () => setMode("drive"));
map.on("click", (e) => {
  if (mode !== "drive" || pending.length >= 2) return;
  pending.push([+e.latlng.lat.toFixed(6), +e.latlng.lng.toFixed(6)]);
  if (pendingLayer) map.removeLayer(pendingLayer);
  pendingLayer = pending.length === 1 ? L.circleMarker(pending[0], { radius: 6, color: COLORS.drawnDrive, weight: 3 }).addTo(map) : L.polyline(pending, { ...DSTYLE, dashArray: "6 4" }).addTo(map);
  if (pending.length === 2) { document.querySelector("#drive-form").hidden = false; document.querySelector("#drive-name").focus(); }
});
document.querySelector("#drive-form").addEventListener("submit", (e) => {
  e.preventDefault();
  ed.driveways.add.push({ id: "field-" + Date.now().toString(36), a: pending[0], b: pending[1], name: document.querySelector("#drive-name").value.trim() });
  document.querySelector("#drive-name").value = "";
  clearPending(); saveEd(); drawEdits();
});
document.querySelector("#drive-cancel").addEventListener("click", clearPending);
document.querySelector("#sel-delete").addEventListener("click", () => {
  if (!selected) return;
  if (selected.kind === "b") ed.buildings[selected.id] = { delete: true };
  else if (selected.id.startsWith("field-")) ed.driveways.add = ed.driveways.add.filter((x) => x.id !== selected.id);
  else ed.driveways.delete.push(selected.id);
  select(null); saveEd(); drawEdits();
});
document.querySelector("#sel-reset").addEventListener("click", () => {
  if (!selected || selected.kind !== "b") return;
  if (DATA.edits.buildings[selected.id]) ed.buildings[selected.id] = clone(DATA.edits.buildings[selected.id]); else delete ed.buildings[selected.id];
  select(null); saveEd(); drawEdits();
});
drawEdits();

// notes
const KEY = "cardiff-review-notes";
let notes = []; try { notes = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(notes)); } catch {} };
const noteLayer = L.layerGroup().addTo(map);
function drawNotes() {
  noteLayer.clearLayers();
  const list = document.querySelector("#notes"); list.innerHTML = "";
  notes.forEach((n, i) => {
    L.marker(n.at, { title: n.text }).bindTooltip(String(i + 1), { permanent: true, direction: "top", className: "rv-tag" }).bindPopup(esc(n.text)).addTo(noteLayer);
    const li = document.createElement("li"); li.innerHTML = esc(n.text) + ' <button aria-label="Delete note">×</button>';
    li.querySelector("button").addEventListener("click", () => { notes.splice(i, 1); save(); drawNotes(); });
    list.append(li);
  });
}
L.Icon.Default.prototype.options.iconUrl = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41"><path d="M12.5 0C5.6 0 0 5.6 0 12.5 0 22 12.5 41 12.5 41S25 22 25 12.5C25 5.6 19.4 0 12.5 0z" fill="#d93b3f" stroke="#fff" stroke-width="2"/></svg>');
L.Icon.Default.prototype.options.shadowUrl = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
L.Icon.Default.prototype.options.iconRetinaUrl = L.Icon.Default.prototype.options.iconUrl;
drawNotes();
const addBtn = document.querySelector("#add"), status = document.querySelector("#status");
let adding = false;
const setAdding = (v) => { adding = v; addBtn.setAttribute("aria-pressed", String(v)); status.textContent = v ? "Tap the spot on the map." : ""; map.getContainer().style.cursor = v ? "crosshair" : ""; };
addBtn.addEventListener("click", () => { if (mode) setMode(mode); setAdding(!adding); });
const form = document.querySelector("#note-form"), field = document.querySelector("#note-text");
let spot = null, spotMark = null;
const closeForm = () => { form.hidden = true; field.value = ""; spot = null; if (spotMark) map.removeLayer(spotMark); spotMark = null; };
map.on("click", (e) => {
  if (!adding) return;
  setAdding(false);
  spot = [+e.latlng.lat.toFixed(6), +e.latlng.lng.toFixed(6)];
  if (spotMark) map.removeLayer(spotMark);
  spotMark = L.circleMarker(spot, { radius: 8, color: "#d93b3f", weight: 3, fill: false }).addTo(map);
  form.hidden = false; field.focus();
});
form.addEventListener("submit", (e) => { e.preventDefault(); const text = field.value.trim(); if (spot && text) { notes.push({ at: spot, text }); save(); drawNotes(); } closeForm(); });
document.querySelector("#note-cancel").addEventListener("click", closeForm);
// ---------- field walk: GPS position, crosshair and typed marks ----------
const TYPES = ["Driveway start", "Driveway end", "Bollard", "Flexible post", "Wheel stop", "Barrier starts", "Barrier ends", "Sign", "Curb / gap", "Hazard", "Photo taken", "Other"];
const MKEY = "cardiff-field-marks";
let marks = []; try { marks = JSON.parse(localStorage.getItem(MKEY) || "[]"); } catch {}
const saveMarks = () => { try { localStorage.setItem(MKEY, JSON.stringify(marks)); } catch {} };
let type = TYPES[0], me = null, meDot = null, meRing = null, watchId = null;
const typesEl = document.querySelector("#types");
const fabType = document.querySelector("#fab-type");
const setType = (t) => { type = t; fabType.value = t; typesEl.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x.textContent === t))); };
for (const t of TYPES) { const b = document.createElement("button"); b.type = "button"; b.textContent = t; b.addEventListener("click", () => setType(t)); typesEl.append(b); fabType.append(new Option(t, t)); }
fabType.addEventListener("change", () => setType(fabType.value));
setType(type);
const markLayer = L.layerGroup().addTo(map);
function drawMarks() {
  markLayer.clearLayers();
  const list = document.querySelector("#marks"); list.innerHTML = "";
  marks.forEach((m, i) => {
    L.circleMarker(m.at, { radius: 6, color: "#fff", weight: 2, fillColor: "#00b3ff", fillOpacity: 1 }).bindTooltip((i + 1) + ". " + esc(m.type) + (m.note ? " · " + esc(m.note) : ""), { direction: "top" }).addTo(markLayer);
    const li = document.createElement("li"); li.innerHTML = esc(m.type) + (m.note ? ": " + esc(m.note) : "") + (m.acc ? ' <span style="color:var(--muted)">±' + m.acc + " m</span>" : "") + ' <button aria-label="Delete mark">×</button>';
    li.querySelector("button").addEventListener("click", () => { marks.splice(i, 1); saveMarks(); drawMarks(); });
    list.append(li);
  });
}
drawMarks();
const gpsEl = document.querySelector("#gps"), wrap = document.querySelector("#mapwrap");
function startGps() {
  if (!navigator.geolocation) { gpsEl.textContent = "This browser can't share your location. Pan the map to put the crosshair on the spot instead."; return; }
  watchId = navigator.geolocation.watchPosition((p) => {
    me = { at: [p.coords.latitude, p.coords.longitude], acc: Math.round(p.coords.accuracy) };
    if (!meDot) { meRing = L.circle(me.at, { radius: me.acc, color: "#1a73e8", weight: 1, fillOpacity: 0.12, interactive: false }).addTo(map); meDot = L.circleMarker(me.at, { radius: 7, color: "#fff", weight: 2, fillColor: "#1a73e8", fillOpacity: 1, interactive: false }).addTo(map); map.setView(me.at, Math.max(map.getZoom(), 19)); }
    else { meDot.setLatLng(me.at); meRing.setLatLng(me.at).setRadius(me.acc); }
    gpsEl.textContent = "GPS accuracy about " + me.acc + " m. Phone GPS can be off by a few metres, so line the crosshair up with the photo before marking.";
  }, (err) => { gpsEl.textContent = err.code === 1 ? "Location is blocked for this page. You can still pan the map to put the crosshair on the spot." : "Waiting for a GPS fix…"; }, { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 });
}
document.querySelector("#field-toggle").addEventListener("click", (e) => {
  const on = !wrap.classList.contains("rv-field");
  wrap.classList.toggle("rv-field", on); e.currentTarget.setAttribute("aria-pressed", String(on)); e.currentTarget.textContent = on ? "Stop field walk" : "Start field walk";
  if (on) { if (mode) setMode(mode); setAdding(false); startGps(); wrap.scrollIntoView({ behavior: "smooth", block: "start" }); }
  else if (watchId != null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
});
document.querySelector("#fab-me").addEventListener("click", () => { if (me) map.setView(me.at, Math.max(map.getZoom(), 19)); else gpsEl.textContent = "No GPS fix yet."; });
document.querySelector("#fab-mark").addEventListener("click", () => {
  const c = map.getCenter(), noteEl = document.querySelector("#mark-note");
  marks.push({ type, at: [+c.lat.toFixed(6), +c.lng.toFixed(6)], note: noteEl.value.trim(), acc: me ? me.acc : null, t: new Date().toISOString() });
  noteEl.value = ""; saveMarks(); drawMarks();
  status.textContent = "Marked " + type + " (" + marks.length + " so far).";
});
// ---------- send everything: field marks, notes and map edits as one message ----------
document.querySelector("#send-all").addEventListener("click", async () => {
  const lines = [];
  if (marks.length) lines.push("Field marks:", ...marks.map((m, i) => (i + 1) + ". " + m.type + (m.note ? ": " + m.note : "") + " (" + m.at[0] + ", " + m.at[1] + (m.acc ? ", GPS ±" + m.acc + " m" : "") + ")"));
  if (notes.length) lines.push("Notes:", ...notes.map((n, i) => (i + 1) + ". " + n.text + " (" + n.at[0] + ", " + n.at[1] + ")"));
  if (JSON.stringify(ed) !== JSON.stringify(DATA.edits)) lines.push("Cardiff map edits: " + JSON.stringify(ed));
  const txt = lines.join("\\n") || "(nothing marked yet)";
  try { if (navigator.share && matchMedia("(pointer: coarse)").matches) { await navigator.share({ title: "Cardiff map marks", text: txt }); status.textContent = "Shared. Pick the Claude app (or paste it into the chat)."; return; } } catch (e) { if (e.name === "AbortError") return; }
  try { await navigator.clipboard.writeText(txt); status.textContent = "Copied. Paste it into the project chat."; }
  catch { status.textContent = "Couldn't copy automatically. Select and copy this: " + txt; }
});
`).replace(/<\/(script)/gi, "<\\/$1")}</script>`;

writeFileSync(join(HERE, "cardiff-review.html"), page);
mkdirSync(join(ROOT, "docs", "cardiff"), { recursive: true });
writeFileSync(join(ROOT, "docs", "cardiff", "review.html"), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${page}</body></html>`);
console.log("wrote review", (page.length / 1024).toFixed(0) + " KB");
