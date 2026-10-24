// Builds the Cardiff corridor page. node build.mjs
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../vendor/anatomy/kit/iso-kit.mjs";
import { kitScript } from "../../vendor/anatomy/scripts/inline-kit.mjs";
import * as D from "./data.mjs";
import { CRASHES } from "./crashes.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

// street number -> metres along the road, least-squares line through the address anchors
const n = D.ADDRESS.length, mxA = D.ADDRESS.reduce((a, [x]) => a + x, 0) / n, myA = D.ADDRESS.reduce((a, [, y]) => a + y, 0) / n;
const slope = D.ADDRESS.reduce((a, [x, y]) => a + (x - mxA) * (y - myA), 0) / D.ADDRESS.reduce((a, [x]) => a + (x - mxA) ** 2, 0);
const sOfAddr = (addr) => Math.round(myA + slope * (addr - mxA));
const crashes = CRASHES.map((c) => ({ ...c, s: c.addr != null ? sOfAddr(c.addr) : c.s }));

const DATA = { NB_TRACK: D.NB_TRACK, SB_TRACK: D.SB_TRACK, DRIVES: D.DRIVES, BOXES: D.BOXES, COAST: D.COAST, POIS: D.POIS, RANGE: D.RANGE, LIMITS: D.LIMITS, BRIDGES: D.BRIDGES, CRASHES: crashes };

const segCount = (era) => crashes.filter((c) => !c.edge && (era === "after") === c.date >= "2020-04").length;

const CSS = `
:root{--cx-page:#f2f2ef;color-scheme:light}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--cx-page:#0b0b0b;color-scheme:dark}}
:root[data-theme="dark"]{--cx-page:#0b0b0b;color-scheme:dark}
body{background:var(--cx-page);margin:0}
.cx{--sea:#c9d8e0;--sand:#ece6d6;--land:#e4e6dc;--lot:#dadad5;--road:#b9b9bd;--walk:#ddd5bf;--drive:#c8c8cb;--yellow:#c99a1b;--risk:#e5484d;
  padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));padding-block:28px 48px;
  background:var(--anatomy-page);color:var(--anatomy-text);font:14px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;min-height:100vh}
.cx[data-theme="dark"]{--sea:#13202a;--sand:#24221c;--land:#181a16;--lot:#1f1f1f;--road:#2c2c30;--walk:#2a2721;--drive:#353539;--yellow:#c9a13a;--risk:#ff6b6b}
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
#scene .pin[data-sev="serious"] .iso-solid:last-of-type .iso-top,#scene .pin[data-sev="fatal"] .iso-solid:last-of-type .iso-top{fill:var(--risk)}
#scene .pin[data-sev="serious"] .iso-solid:last-of-type .iso-shade,#scene .pin[data-sev="fatal"] .iso-solid:last-of-type .iso-shade{fill:var(--risk);opacity:.75}
#scene .pin[data-sev="fatal"] .iso-solid:last-of-type .iso-edge{stroke:var(--anatomy-strong);stroke-width:1.4}
#scene .pin:focus-visible{outline:none}#scene .pin:focus-visible .iso-edge{stroke:var(--anatomy-lit)}
#pop{position:absolute;width:250px;padding:10px 12px;background:var(--anatomy-card);box-shadow:0 0 0 1px var(--anatomy-hi),0 6px 18px #0003;font-size:12.5px;line-height:1.45;display:grid;gap:3px;pointer-events:none}
#pop b{color:var(--anatomy-strong);font-weight:600}
.cx-hint{position:absolute;left:12px;bottom:10px;font:10.5px var(--anatomy-mono);letter-spacing:.06em;text-transform:uppercase;color:var(--anatomy-muted);pointer-events:none}
#where{position:absolute;right:12px;bottom:10px;font:10.5px var(--anatomy-mono);color:var(--anatomy-text);font-variant-numeric:tabular-nums;pointer-events:none}
#mini{display:block;width:100%;height:auto;cursor:pointer;touch-action:none}
#mini .mm-bg{fill:var(--anatomy-card)}
#mini .mm-track{stroke:var(--anatomy-mid);stroke-width:2.2}
#mini .mm-tick{stroke:var(--anatomy-lo);stroke-dasharray:2 3}
#mini .mm-lbl,#mini .mm-row{fill:var(--anatomy-muted);font:10px var(--anatomy-mono)}
#mini .mm-dot{fill:var(--anatomy-mid);stroke:var(--anatomy-card);stroke-width:1}
#mini .mm-dot[data-sev="serious"],#mini .mm-dot[data-sev="fatal"]{fill:var(--risk)}
#mini .mm-dot[data-sev="fatal"]{stroke:var(--anatomy-strong);stroke-width:1.4}
#mini .mm-dot[data-dim]{opacity:.15}
#mini .mm-win{fill:var(--anatomy-hi);fill-opacity:.08;stroke:var(--anatomy-hi);stroke-width:1.2}
.cx-foot{font-size:12px;color:var(--anatomy-muted)}
.cx-foot summary{cursor:pointer;color:var(--anatomy-text)}
.cx-foot ul{margin:6px 0 0;padding-left:18px}
.cx-legend{display:flex;flex-wrap:wrap;gap:4px 16px;font-size:12px;color:var(--anatomy-muted)}
.cx-legend i{display:inline-block;width:10px;height:10px;margin-right:6px;vertical-align:-1px;border-radius:50%;background:var(--anatomy-mid)}
.cx-legend i.r{background:var(--risk)}.cx-legend i.z{border-radius:0;background:var(--risk);opacity:.55}
@media (max-width:600px){.cx-hint{display:none}}
`;

const page = `<title>Cardiff Cycle Track</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>${k.ISO_CSS}${CSS}</style>
<div class="cx iso" data-theme="light"><div class="cx-in">
<header><h1>Coast Hwy 101 cycle track, Cardiff</h1><p class="cx-sub">Chesterfield Dr to the Solana Beach line, 1.27 miles. Layout from OpenStreetMap, straightened along the road.</p></header>
<div class="cx-bar">
  <div class="cx-group" role="group" aria-label="Period"><button class="cx-btn" data-era-btn="before" aria-pressed="false">Before · ${segCount("before")} crashes</button><button class="cx-btn" data-era-btn="after" aria-pressed="true">After · ${segCount("after")} crashes</button></div>
  <div class="cx-group" role="group" aria-label="Ride along"><button class="cx-btn" data-ride="1" aria-pressed="false">Ride north</button><button class="cx-btn" data-ride="-1" aria-pressed="false">Ride south</button></div>
  <div class="cx-group" role="group" aria-label="Zoom"><button class="cx-btn" data-zoom="0" aria-pressed="true">Close</button><button class="cx-btn" data-zoom="1" aria-pressed="false">Block</button><button class="cx-btn" data-zoom="2" aria-pressed="false">Wide</button></div>
  <span id="era-note"></span>
</div>
<div id="stage" tabindex="0" aria-label="Isometric view of the corridor. Drag sideways or use the arrow keys to travel along it."><svg id="scene" class="iso-svg" viewBox="0 0 1000 560" role="img" aria-label="Isometric view of Coast Highway 101 with both cycle tracks, barriers, driveways and crash locations"></svg><div id="pop" hidden></div><span class="cx-hint">Drag to travel · tap a pin</span><span id="where"></span></div>
<svg id="mini" viewBox="0 0 1000 96" role="img" aria-label="Whole corridor with crash locations; tap to jump there"></svg>
<div class="cx-legend"><span><i></i>Crash, minor injury</span><span><i class="r"></i>Severe, serious or fatal</span><span><i class="z"></i>Where drivers cross the track, or riders must enter it</span></div>
<details class="cx-foot"><summary>About the data</summary><ul>
<li>Crashes are official records from California's crash database (CCRS, CHP and San Diego Sheriff), placed by street number or by distance from a landmark. Pins marked "position estimated" only name a landmark. One 2022 serious crash has no usable location and is not shown.</li>
<li>Solo crashes are often not reported. Local riders count 36–42 crashes since 2020; ${segCount("after")} official records were found.</li>
<li>The March 2024 fatal crash is recorded in the 2700 block with no coordinates, which by street number falls near the beach parking south of Las Olas. Its official primary factor is bicycling under the influence (VC 21200.5).</li>
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
writeFileSync(join(OUT, "index.html"), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body style="margin:0">${page}</body></html>`);
console.log("wrote", (page.length / 1024).toFixed(0) + " KB", "addr slope", slope.toFixed(2), crashes.filter((c) => c.addr).map((c) => `${c.addr}->${c.s}`).join(" "));
