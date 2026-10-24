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
  drives: D.DRIVES.map(([s, side, name]) => ({ at: ll(s, side === "E" ? -10 : 13), name })),
  bridges: D.BRIDGES.map(([a, b]) => [ll(a, 14), ll(b, 14), ll(b, -12), ll(a, -12)]),
  boxes: D.BOXES.map(([k, s0, s1, d0, d1, name]) => ({ k, name, ring: [ll(s0, d0), ll(s1, d0), ll(s1, d1), ll(s0, d1)] })),
  marks: [["Solana Beach line (map)", D.LIMITS.cityLine], ["Chesterfield Dr (map)", D.LIMITS.chesterfield], ["NB track south end (map)", D.NB_TRACK[0][0]], ["SB track north end (map)", D.SB_TRACK[0][0]]].map(([name, s]) => ({ name, at: ll(s, 0) })),
};
const ring = (w) => w.geometry.map((g) => [+g.lat.toFixed(7), +g.lon.toFixed(7)]);
const kindOf = (t) => (t.highway === "cycleway" || t.bicycle === "designated" && t.highway === "path" ? "cycle" : is101(t) ? "road" : /footway|path|pedestrian|steps/.test(t.highway ?? "") ? "foot" : t.highway === "service" ? "service" : t.highway ? "street" : t.barrier ? "barrier" : t.amenity === "parking" ? "parking" : t.building ? "building" : t.bridge ? "bridge" : null);
const nearRoad = (g) => { const [s, d] = sd(g); return s > D.RANGE.south - 50 && s < D.RANGE.north + 50 && Math.abs(d) < 120; };
const raw = ways.map((w) => ({ k: kindOf(w.tags ?? {}), id: w.id, tags: w.tags ?? {}, line: ring(w), g: w.geometry }))
  .filter((w) => ["cycle", "road", "foot", "service", "barrier", "bridge"].includes(w.k) && w.g.some(nearRoad)).map(({ g, ...w }) => w);
const barrierNodes = osm.elements.filter((e) => e.type === "node" && e.tags?.barrier && nearRoad(e)).map((e) => ({ at: [e.lat, e.lon], tags: e.tags }));
const DATA = { drawn, raw, barrierNodes, centre: centreLL, fetched: osm.fetched, offsetCheck: { bridgeFound } };

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
#map{height:min(78vh,760px);min-height:420px;box-shadow:0 0 0 1px var(--line);background:#333}
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
  ["drawnOther", "Map: bridge, driveways, lots, ends", "#ffe14d", true],
  ["osmCycle", "OpenStreetMap: bike tracks", "#4dd2ff", true], ["osmRoad", "OpenStreetMap: Hwy 101 lanes", "#ffffff", false],
  ["osmOther", "OpenStreetMap: paths, driveways, barriers", "#b388ff", false], ["centre", "Centreline used to straighten the road", "#7CFC00", false],
];

const page = `<title>Cardiff Satellite Review</title>
<style>${leafletCss}${CSS}</style>
<div class="rv">
<header><h1>Cardiff 101: check the map against satellite imagery</h1>
<p>Colored lines are what the corridor map draws, laid back onto real coordinates. Where a line misses the pavement in the photo, the map is wrong there. Tap “Add note” then tap the spot to record a correction.</p></header>
<div class="rv-body">
<div id="map" role="region" aria-label="Satellite map of Coast Highway 101 in Cardiff with the map's layout drawn over it"></div>
<aside class="rv-side">
<h2>Base</h2>
<div style="display:flex;gap:6px"><button class="rv-btn" data-base="sat" aria-pressed="true">Satellite</button><button class="rv-btn" data-base="street" aria-pressed="false">Street map</button></div>
<h2>Layers</h2>
${LAYERS.map(([id, label, color, on]) => `<label><input type="checkbox" data-layer="${id}" ${on ? "checked" : ""}><span class="rv-sw" style="background:${color}"></span>${label}</label>`).join("")}
<h2>Notes</h2>
<button class="rv-btn" id="add" aria-pressed="false">Add note</button>
<form id="note-form" hidden><label for="note-text" style="display:block">What's wrong or missing here?</label><textarea id="note-text" rows="3" style="width:100%;box-sizing:border-box;font:inherit"></textarea><div style="display:flex;gap:6px"><button class="rv-btn" type="submit">Save note</button><button class="rv-btn" type="button" id="note-cancel">Cancel</button></div></form>
<ol id="notes"></ol>
<button class="rv-btn" id="copy">Copy notes to send</button>
<p id="status"></p>
<p id="check"></p>
</aside></div>
<p>Imagery: Esri World Imagery (Maxar, Earthstar Geographics). Street map and features: © OpenStreetMap contributors. Notes stay in this browser until you copy and send them.</p>
</div>
<script>${leafletJs}</script>
<script>${(`
const DATA = ${JSON.stringify(DATA)};
const COLORS = ${JSON.stringify(Object.fromEntries(LAYERS.map(([id, , c]) => [id, c])))};
const map = L.map("map", { zoomSnap: 0.5, maxZoom: 21 });
const bases = {
  sat: L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 21, maxNativeZoom: 19, attribution: "Esri, Maxar, Earthstar Geographics" }),
  street: L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 21, maxNativeZoom: 19, attribution: "© OpenStreetMap contributors" }),
};
let base = bases.sat.addTo(map);
document.querySelectorAll("[data-base]").forEach((b) => b.addEventListener("click", () => {
  map.removeLayer(base); base = bases[b.dataset.base].addTo(map); base.bringToBack();
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
for (const b of DATA.drawn.boxes) tip(L.polygon(b.ring, { color: Y, weight: 1.5, fillOpacity: 0.08, dashArray: b.k === "p" ? "4 4" : null }), "Map: " + (b.k === "p" ? "parking" : "building") + (b.name ? " · " + esc(b.name) : "")).addTo(groups.drawnOther);
for (const d of DATA.drawn.drives) tip(L.circleMarker(d.at, { radius: 5, color: Y, weight: 2, fillOpacity: 0.3 }), "Map: driveway · " + esc(d.name)).addTo(groups.drawnOther);
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
addBtn.addEventListener("click", () => setAdding(!adding));
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
document.querySelector("#copy").addEventListener("click", async () => {
  const txt = notes.map((n, i) => (i + 1) + ". " + n.text + " (" + n.at[0] + ", " + n.at[1] + ") https://www.google.com/maps?q=" + n.at[0] + "," + n.at[1]).join("\\n");
  try { await navigator.clipboard.writeText(txt || "(no notes)"); status.textContent = "Copied " + notes.length + " notes. Paste them into the project chat."; }
  catch { status.textContent = "Couldn't copy automatically; select the list and copy it."; }
});
`).replace(/<\/(script)/gi, "<\\/$1")}</script>`;

writeFileSync(join(HERE, "cardiff-review.html"), page);
mkdirSync(join(ROOT, "docs", "cardiff"), { recursive: true });
writeFileSync(join(ROOT, "docs", "cardiff", "review.html"), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${page}</body></html>`);
console.log("wrote review", (page.length / 1024).toFixed(0) + " KB");
