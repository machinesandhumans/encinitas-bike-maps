// Downloads OpenStreetMap features around a corridor, with real coordinates, for the satellite review page.
// node tools/fetch-osm.mjs cardiff   ->  data/osm/cardiff-osm.json
// Needs Node 18+ and access to overpass-api.de (falls back to overpass.kumi.systems).
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BOXES = { cardiff: [32.990, -117.295, 33.026, -117.262] }; // south, west, north, east
const name = process.argv[2] ?? "cardiff";
const [s, w, n, e] = BOXES[name];
const bb = `${s},${w},${n},${e}`;
const query = `[out:json][timeout:90];
(
  way["highway"](${bb});
  way["bridge"](${bb});
  way["barrier"](${bb});
  node["barrier"](${bb});
  way["amenity"="parking"](${bb});
  way["building"](${bb});
  way["natural"~"water|coastline|beach"](${bb});
  way["waterway"](${bb});
  relation["boundary"="administrative"]["admin_level"="8"](${bb});
);
out geom;`;

const HOSTS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
let json;
for (const url of HOSTS) {
  try {
    const r = await fetch(url, { method: "POST", body: new URLSearchParams({ data: query }) });
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    json = await r.json();
    console.log("fetched from", url);
    break;
  } catch (err) { console.warn(url, "failed:", err.message); }
}
if (!json) process.exit(1);
json.fetched = new Date().toISOString();
json.bbox = [s, w, n, e];
const out = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "osm", `${name}-osm.json`);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(json));
console.log("wrote", out, json.elements.length, "elements");
