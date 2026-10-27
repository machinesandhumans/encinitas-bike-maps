// Builds the Cardiff corridor page. node build.mjs
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../vendor/anatomy/kit/iso-kit.mjs";
import { kitScript } from "../../vendor/anatomy/scripts/inline-kit.mjs";
import * as D from "./data.mjs";
import { CRASHES } from "./crashes.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
// Serge Issakov's crowdsourced Cardiff 101 Crash List: advocate reports, kept apart from the official records
const RIDER = JSON.parse(readFileSync(join(HERE, "../../data/advocate/cardiff-101-crash-list.json"), "utf8")).reports;
// Features traced on Esri World Imagery (Jan 2026) and the USGS 3DEP road profile
const FEAT = JSON.parse(readFileSync(join(HERE, "../../data/field/cardiff-features-esri.json"), "utf8"));
const ELEV = JSON.parse(readFileSync(join(HERE, "../../data/elevation/cardiff-101-profile.json"), "utf8")).profile;
const riderPlaced = RIDER.filter((r) => r.s != null && !r.matchesOfficial).length;
const riderNoLoc = RIDER.filter((r) => r.s == null && !r.matchesOfficial).length;
const riderSame = RIDER.filter((r) => r.matchesOfficial).length;

// street number -> metres along the road, least-squares line through the address anchors
const n = D.ADDRESS.length, mxA = D.ADDRESS.reduce((a, [x]) => a + x, 0) / n, myA = D.ADDRESS.reduce((a, [, y]) => a + y, 0) / n;
const slope = D.ADDRESS.reduce((a, [x, y]) => a + (x - mxA) * (y - myA), 0) / D.ADDRESS.reduce((a, [x]) => a + (x - mxA) ** 2, 0);
const sOfAddr = (addr) => Math.round(myA + slope * (addr - mxA));
const crashes = CRASHES.map((c) => ({ ...c, s: c.addr != null ? sOfAddr(c.addr) : c.s }));

const DATA = { NB_TRACK: D.NB_TRACK, SB_TRACK: D.SB_TRACK, DRIVES: D.DRIVES, BUILDINGS: D.BUILDINGS, LOTS: D.LOTS, COAST: D.COAST, POIS: D.POIS, RANGE: D.RANGE, LIMITS: D.LIMITS, BRIDGES: D.BRIDGES, UNLIT: D.UNLIT, CRASHES: crashes, RIDER,
  FEAT: { outlines: FEAT.outlines, crosswalks: FEAT.crosswalks, parking: FEAT.parking_buffer, crossovers: FEAT.crossovers, redCurb: FEAT.red_curb, nbLaneFrom: FEAT.track_fixes.nb_lane_from, trackWidths: FEAT.track_widths, roadEdges: FEAT.road_edges.list }, ELEV };

const segCount = (era) => crashes.filter((c) => !c.edge && (era === "after") === c.date >= "2020-04").length;

const CSS = `
:root{--cx-page:#f2f2ef;color-scheme:light}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--cx-page:#0b0b0b;color-scheme:dark}}
:root[data-theme="dark"]{--cx-page:#0b0b0b;color-scheme:dark}
body{background:var(--cx-page);margin:0}
.cx{--sea:#c9d8e0;--sand:#ece6d6;--land:#e4e6dc;--lot:#dadad5;--road:#b9b9bd;--walk:#ddd5bf;--drive:#c8c8cb;--yellow:#c99a1b;--risk:#e5484d;--rider:#7c5cd6;
  padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));padding-block:28px 48px;
  background:var(--anatomy-page);color:var(--anatomy-text);font:14px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;min-height:100vh}
.cx[data-theme="dark"]{--sea:#13202a;--sand:#24221c;--land:#181a16;--lot:#1f1f1f;--road:#2c2c30;--walk:#2a2721;--drive:#353539;--yellow:#c9a13a;--risk:#ff6b6b;--rider:#a48bff}
.cx-in{max-width:1100px;margin:0 auto;display:grid;gap:14px}
.cx h1{margin:0;color:var(--anatomy-strong);font:600 21px/1.25 ui-sans-serif,system-ui;letter-spacing:-.01em;text-wrap:balance}
.cx-sub{margin:2px 0 0;color:var(--anatomy-muted);font-size:13px}
.cx-bar{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center}
.cx-group{display:flex;gap:4px}
.cx-btn{font:11px/1 var(--anatomy-mono);letter-spacing:.06em;text-transform:uppercase;padding:9px 11px;border:1px solid var(--anatomy-lo);background:var(--anatomy-card);color:var(--anatomy-muted);cursor:pointer;border-radius:0}
.cx-btn[aria-pressed="true"]{color:var(--anatomy-strong);border-color:var(--anatomy-hi)}
.cx-btn[data-era-btn="after"][aria-pressed="true"]{border-color:var(--risk);color:var(--risk)}
.cx-btn:focus-visible{outline:2px solid var(--anatomy-hi);outline-offset:1px}
#era-note{font-size:12.5px;color:var(--anatomy-text);flex:1 1 260px;min-width:0}
#stage{position:relative;background:var(--anatomy-card);box-shadow:0 0 0 1px var(--anatomy-lo);touch-action:pan-y;cursor:grab;overflow:hidden}
#stage:active{cursor:grabbing}
#stage:focus-visible{outline:2px solid var(--anatomy-hi)}
#scene{display:block;width:100%;height:auto}
#scene .g-land{fill:var(--land)}#scene .g-sea{fill:var(--sea)}#scene .g-sand{fill:var(--sand)}#scene .g-lot{fill:var(--lot)}
#scene .g-road{fill:var(--road)}#scene .g-walk{fill:var(--walk)}#scene .g-drive{fill:var(--drive)}#scene .g-bridge{fill:var(--road);stroke:var(--ink,#555);stroke-width:1.2;stroke-opacity:.55}#scene .water{fill:#2f6f8f;font-style:italic}.cx[data-theme="dark"] #scene .water{fill:#7fb3cc}
#scene .m-yellow{stroke:var(--yellow)}
#scene .risk{fill:var(--risk);opacity:.45}#scene .risk.dim{opacity:.18}
#scene .cx-ground{fill:var(--anatomy-text);font-family:var(--anatomy-mono);letter-spacing:.02em}
#scene .cx-ground.warn{fill:var(--risk)}
#scene .first .iso-top,#scene .first .iso-shade{fill:var(--risk)}
#scene .pin{cursor:pointer}
#scene .rider-ring{fill:none;stroke:var(--risk);stroke-width:1.6}
#scene .pin-hit{fill:transparent;stroke:none}
.ic{overflow:visible;color:var(--anatomy-mid)}.ic[data-sev="serious"]{color:var(--risk)}.ic[data-sev="fatal"]{color:var(--anatomy-strong)}
.ic .ic-head{fill:currentColor}.ic .ic-cut{fill:var(--anatomy-card);stroke:var(--anatomy-card);stroke-width:.9;stroke-linecap:round}.ic .ic-bones circle{stroke:none}
#scene .pin-badge,#mini .mm-badge{fill:var(--anatomy-card);stroke:var(--anatomy-mid);stroke-width:1.2}
#scene .pin[data-sev="serious"] .pin-badge,#mini .mm-dot[data-sev="serious"] .mm-badge{stroke:var(--risk)}
#scene .pin[data-sev="fatal"] .pin-badge,#mini .mm-dot[data-sev="fatal"] .mm-badge{stroke:var(--risk);stroke-width:2.2}
#scene .pin:focus{outline:none}#scene .pin:focus-visible .pin-badge{stroke:var(--anatomy-lit);stroke-width:2.4}
#pop{position:absolute;width:250px;padding:10px 12px;background:var(--anatomy-card);box-shadow:0 0 0 1px var(--anatomy-hi),0 6px 18px #0003;font-size:12.5px;line-height:1.45;display:grid;gap:3px;overflow:auto;box-sizing:border-box;z-index:2}
#pop b{padding-right:28px}
.pop-x{position:absolute;top:2px;right:2px;width:32px;height:32px;border:0;background:none;color:inherit;font-size:20px;line-height:1;cursor:pointer}
#pop[hidden]{display:none}
#pop b{color:var(--anatomy-strong);font-weight:600}
#pop .pop-h{display:flex;align-items:center;gap:8px}#pop .pop-ic{flex:none;width:26px;height:26px}
.cx-hint{position:absolute;left:12px;bottom:10px;font:10.5px var(--anatomy-mono);letter-spacing:.06em;text-transform:uppercase;color:var(--anatomy-muted);pointer-events:none}
#where{position:absolute;right:12px;bottom:10px;font:10.5px var(--anatomy-mono);color:var(--anatomy-text);font-variant-numeric:tabular-nums;pointer-events:none}
#mini{display:block;width:100%;height:auto;cursor:pointer;touch-action:none}
#mini .mm-bg{fill:var(--anatomy-card)}
#mini .mm-track{stroke:var(--anatomy-mid);stroke-width:2.2}
#mini .mm-tick{stroke:var(--anatomy-lo);stroke-dasharray:2 3}
#mini .mm-lbl,#mini .mm-row{fill:var(--anatomy-muted);font:10px var(--anatomy-mono)}
#mini .mm-beach{fill:var(--sand)}#mini .mm-beach-lbl{fill:var(--yellow)}
#mini .mm-dot[data-dim]{opacity:.15}
#scene .pin-rider .pin-badge,#mini .mm-rdot .mm-badge{stroke:var(--rider);stroke-width:2}.ic[data-sev="unknown"]{color:var(--rider)}
#mini .mm-rdot[data-dim]{opacity:0}
.cx-legend i.v{display:inline-block;width:14px;height:14px;border-radius:50%;background:var(--anatomy-card);box-shadow:inset 0 0 0 2px var(--rider)}
#pop .pop-tag{color:var(--rider);font-weight:600}
.cx-btn[data-rider][aria-pressed="true"]{border-color:var(--rider);color:var(--rider)}
#scene .g-zebra{fill:#f7f7f2}.cx[data-theme="dark"] #scene .g-zebra{fill:#77777c}
#scene .g-park{fill:var(--drive)}
#scene .car .iso-fill{stroke:var(--anatomy-face);stroke-width:.9;stroke-linejoin:round}
#scene .m-red{stroke:var(--risk);stroke-width:2.4;fill:none}
#elev{display:block;width:100%;height:auto;margin-top:-10px}
#elev .el-line{fill:none;stroke:var(--anatomy-mid);stroke-width:1.6}
#elev .el-fill{fill:var(--anatomy-lo);opacity:.25}
#elev .el-lbl{fill:var(--anatomy-muted);font:10px var(--anatomy-mono)}
#elev .el-win{fill:var(--anatomy-hi);fill-opacity:.08;stroke:none}
#mini .mm-win{fill:var(--anatomy-hi);fill-opacity:.08;stroke:var(--anatomy-hi);stroke-width:1.2}
.cx-foot{font-size:12px;color:var(--anatomy-muted)}
.cx-foot summary{cursor:pointer;color:var(--anatomy-text)}
.cx-foot ul{margin:6px 0 0;padding-left:18px}
.cx-legend{display:flex;flex-wrap:wrap;gap:4px 16px;font-size:12px;color:var(--anatomy-muted)}
.cx-legend i{display:inline-block;width:10px;height:10px;margin-right:6px;vertical-align:-1px;border-radius:50%;background:var(--anatomy-mid)}
.cx-legend i.z{border-radius:0;background:var(--risk);opacity:.55}
.cx-legend>span{display:inline-flex;align-items:center;gap:6px}.cx-legend>span>i{margin-right:0}.cx-legend [data-legend-icon]{display:inline-flex}
@media (max-width:600px){.cx-hint{display:none}}
`;

const page = `<title>Cardiff Cycle Track</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>${k.ISO_CSS}${CSS}</style>
<div class="cx iso" data-theme="light"><div class="cx-in">
<header><h1>Coast Hwy 101 cycle track, Cardiff</h1><p class="cx-sub">Chesterfield Dr to the Solana Beach line, 1.27 miles. Layout from OpenStreetMap, straightened along the road.</p></header>
<div class="cx-bar">
  <div class="cx-group" role="group" aria-label="Period"><button class="cx-btn" data-era-btn="before" aria-pressed="false">Jan ’16–Mar ’20 · ${segCount("before")} crashes</button><button class="cx-btn" data-era-btn="after" aria-pressed="true">Apr ’20–Present · ${segCount("after")} crashes</button></div>
  <div class="cx-group" role="group" aria-label="Rider reports"><button class="cx-btn" data-rider aria-pressed="true">Rider reports · ${riderPlaced} placed</button></div>
  <div class="cx-group" role="group" aria-label="Parked cars"><button class="cx-btn" data-parked aria-pressed="true">Parked cars</button></div>
  <div class="cx-group" role="group" aria-label="Zoom"><button class="cx-btn" data-zoom="0" aria-pressed="true">Close</button><button class="cx-btn" data-zoom="1" aria-pressed="false">Block</button><button class="cx-btn" data-zoom="2" aria-pressed="false">Wide</button></div>
  <span id="era-note"></span>
</div>
<div id="stage" tabindex="0" aria-label="Isometric view of the corridor. Drag sideways or use the arrow keys to travel along it."><svg id="scene" class="iso-svg" viewBox="0 0 1000 560" role="img" aria-label="Isometric view of Coast Highway 101 with both cycle tracks, barriers, driveways and crash locations"></svg><div id="pop" hidden></div><span class="cx-hint">Drag to travel · tap a pin</span><span id="where"></span></div>
<svg id="mini" viewBox="0 0 1000 96" role="img" aria-label="Whole corridor with crash locations; tap to jump there"></svg>
<svg id="elev" viewBox="0 0 1000 56" role="img" aria-label="Road elevation along the corridor: about 5 m above sea level through the middle, climbing to about 12 m at the Solana Beach line and 13 m at Chesterfield"></svg>
<div class="cx-legend"><span><span data-legend-icon="Fatal"></span>Death</span><span><span data-legend-icon="Severe"></span>Severe or serious injury</span><span><span data-legend-icon="Minor"></span>Other injury</span><span><i class="z"></i>Where drivers cross the track, or riders must enter it</span><span><i class="v"></i>Purple ring: rider report, not an official record (position approximate; ? = no injury described)</span></div>
<details class="cx-foot"><summary>About the data</summary><ul>
<li>Crashes are official records from California's crash database (CCRS, CHP and San Diego Sheriff), placed by street number or by distance from a landmark. Pins marked "position estimated" only name a landmark. One 2022 serious crash has no usable location and is not shown.</li>
<li>Solo crashes are often not reported. Local riders count 36–42 crashes since 2020; ${segCount("after")} official records were found.</li>
<li>The March 2024 fatal crash is recorded in the 2700 block with no coordinates, which by street number falls near the beach parking south of Las Olas. Its official primary factor is bicycling under the influence (VC 21200.5).</li>
<li>Purple-ringed pins are rider reports from Serge Issakov's crowdsourced Cardiff 101 Crash List (${RIDER.length} entries, April 2020 to April 2026; tinyurl.com/cardiff101crashlist). They come from riders, friends and witnesses, mostly via social media, and are not verified here. ${riderPlaced} are placed approximately from the landmark they name, ${riderNoLoc} have no usable location and are not shown, and ${riderSame} match an official record at the same place, so only the official pin is shown. They appear in the Apr ’20–Present view only. Their icons are read from the injury the list describes: crutches for broken bones, being knocked unconscious or a hospital stay; a bandage for any other injury, or where an ambulance or paramedics were called; a question mark where no injury is described.</li>
<li>Crosswalks, the Seaside, Cardiff State Beach and Chesterfield entrances, the parking rows beside the SB path, and the places where drivers cross the bike lane were traced on Esri World Imagery (Vantor, January 10, 2026); positions are within about 1 m. The elevation strip under the overview is USGS 3DEP lidar (bare earth); the bridge span is interpolated.</li>
<li>Track widths are the riding width from the curb (or parapet) to the line of wheel stops and posts, read on the same imagery every 25–50 m (about ±0.5 m). The tightest stretches are southbound at Cardiff Reef (about 2.1 m) and northbound from Cardiff Reef across the bridge (about 2.4 m). The lagoon stretch is widest, at about 3–3.5 m.</li>
<li>Wheel-stop and post spacing, lane widths and the pre-2020 layout are estimates.</li>
</ul></details>
</div></div>
<script type="module">${(`
const wrap = document.querySelector(".cx");
const pick = () => { const t = document.documentElement.getAttribute("data-theme"); wrap.setAttribute("data-theme", t === "light" || t === "dark" ? t : (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")); };
pick(); matchMedia("(prefers-color-scheme: dark)").addEventListener("change", pick);
new MutationObserver(pick).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
` + kitScript() + `\nconst DATA = ${JSON.stringify(DATA)};\n` + readFileSync(join(HERE, "app.js"), "utf8")).replace(/<\/(script)/gi, "<\\/$1")}</script>`;

// Claude artifact fragment (no document skeleton) and a standalone page for GitHub Pages
writeFileSync(join(HERE, "cardiff-corridor.html"), page);
const OUT = join(HERE, "..", "..", "docs", "cardiff");
mkdirSync(OUT, { recursive: true });
// GitHub Pages lets browsers reuse a page for 10 minutes, so a fresh merge looked like it never landed. The page asks for
// version.json (never cached) on open, whenever it comes back into view, and every 30 s while open. If the build is newer
// than the copy it is running, it reloads under a new URL (a few tries per version, since the CDN can lag the deploy).
const VERSION = createHash("sha1").update(page).digest("hex").slice(0, 10);
writeFileSync(join(OUT, "version.json"), JSON.stringify({ v: VERSION }) + "\n");
const fresh = `<script>(function(){var V="${VERSION}";function check(){fetch("version.json?t="+Date.now(),{cache:"no-store"}).then(function(r){return r.json()}).then(function(j){if(!j.v||j.v===V)return;var k="cx-reload-"+j.v,n=0;try{n=+sessionStorage.getItem(k)||0;if(n>=3)return;sessionStorage.setItem(k,n+1)}catch(e){}setTimeout(function(){location.replace(location.pathname+"?v="+j.v+"-"+Date.now().toString(36)+location.hash)},n*4000)}).catch(function(){})}check();setInterval(function(){if(!document.hidden)check()},30000);document.addEventListener("visibilitychange",function(){if(!document.hidden)check()});addEventListener("pageshow",function(e){if(e.persisted)check()})})()</script>`;
writeFileSync(join(OUT, "index.html"), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">${fresh}</head><body style="margin:0">${page}</body></html>`);
console.log("wrote", (page.length / 1024).toFixed(0) + " KB", "addr slope", slope.toFixed(2), crashes.filter((c) => c.addr).map((c) => `${c.addr}->${c.s}`).join(" "));
