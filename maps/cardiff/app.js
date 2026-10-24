// Runs in the page after the inlined kit (iso, depthOf, extrude, slabOf, cylinder, solidSvg, lineSvg, onTop, fitProjection, boxCorners...).
// DATA is injected by build.mjs.
const { NB_TRACK, SB_TRACK, DRIVES, BOXES, COAST, POIS, CRASHES, RANGE, LIMITS, BRIDGES, UNLIT } = DATA;

// ---------- geometry helpers along the road ----------
const lerpLine = (line, s) => {
  if (s <= line[0][0]) return line[0][1];
  for (let i = 1; i < line.length; i++) if (s <= line[i][0]) { const [a, da] = line[i - 1], [b, db] = line[i]; return da + (db - da) * (s - a) / (b - a || 1); }
  return line[line.length - 1][1];
};
const NB = NB_TRACK, SB = [...SB_TRACK].reverse();
const nbOn = (s) => s >= NB[0][0] && s <= NB[NB.length - 1][0];
const sbOn = (s) => s >= SB[0][0] && s <= SB[SB.length - 1][0];
// where each track meets the road: NB riders enter at NB_IN and are separated by NB_SEP; SB riders lose the barrier at SB_SEP and rejoin the road at SB_OUT
const NB_IN = NB[0][0], NB_SEP = NB[1][0], SB_OUT = SB[0][0], SB_SEP = SB[1][0];
const dNB = (s) => lerpLine(NB, s), dSB = (s) => lerpLine(SB, s), dCoast = (s) => lerpLine(COAST, s);
const TRACK_W = 1.6, BUF = 0.7;
const eastEdge = (s) => (nbOn(s) ? Math.min(dNB(s), -6.5) - TRACK_W / 2 : -7.6);
const westEdge = (s) => (sbOn(s) ? Math.max(dSB(s), 6.5) + TRACK_W / 2 : 7.6);
const nearDrive = (s, side, pad = 5) => DRIVES.some(([ds, dside]) => dside === side && Math.abs(ds - s) < pad);
const onBridge = (s) => BRIDGES.some(([a, b]) => s > a && s < b);
const SEV = (c) => (/Fatal/.test(c.injury) ? "fatal" : /Severe|Serious/.test(c.injury) ? "serious" : "minor");
const ERA = (c) => (c.edge ? "edge" : c.date >= "2020-04" ? "after" : "before");

// ---------- camera ----------
const VW = 1000, VH = 560;
const ZOOMS = [{ win: 100, label: "Close", east: -42, west: 50 }, { win: 240, label: "Block", east: -60, west: 75 }, { win: 560, label: "Wide", east: -90, west: 120 }];
let zoom = 0, P = null;
const SPAN = { east: -42, west: 50 };
function camera() {
  const z = ZOOMS[zoom];
  SPAN.east = z.east; SPAN.west = z.west;
  P = fitProjection(boxCorners({ x: 0, y: -SPAN.west, w: z.win, d: SPAN.west - SPAN.east }, -0.5, 4), VW, VH, { pad: 4, azimuth: 99, elevation: 40 });
}
camera();

// state
const state = { s0: 180, era: "after", ride: null, riderS: 0, riderD: 0, riderDir: 1 };
const W = () => ZOOMS[zoom].win;
const toK = (s, d, z = 0) => [s - state.s0, -d, z];
const at = (s, d, z = 0) => iso(toK(s, d, z), P);
const poly = (pts, z = 0) => onTop(pts.map(([s, d]) => [s - state.s0, -d]), z, P, true);
const line = (pts, z = 0) => onTop(pts.map(([s, d]) => [s - state.s0, -d]), z, P, false);
const depthAt = (s, d, z = 0) => depthOf(toK(s, d, z), P);
const flatText = (s, d, text, size, cls = "", z = 0) => {
  const o = at(s, d, z), ex = at(s + 1, d, z);
  const dir = ex[0] >= o[0] ? 1 : -1;
  const x1 = at(s + dir, d, z), y1 = at(s, d - dir, z);
  const a = [x1[0] - o[0], x1[1] - o[1]], c = [y1[0] - o[0], y1[1] - o[1]];
  return `<text class="cx-ground ${cls}" transform="matrix(${a[0].toFixed(3)} ${a[1].toFixed(3)} ${c[0].toFixed(3)} ${c[1].toFixed(3)} ${o[0].toFixed(1)} ${o[1].toFixed(1)})" font-size="${size}" text-anchor="middle">${text}</text>`;
};

// ---------- scene ----------
function band(s0, s1, fnA, fnB, step = 4) {
  const a = [], b = [];
  for (let s = s0; s <= s1 + 1e-6; s += step) { a.push([s, fnA(s)]); b.push([s, fnB(s)]); }
  return [...a, ...b.reverse()];
}
function render() {
  const s0 = state.s0, s1 = s0 + W();
  const lo = Math.max(s0, RANGE.south), hi = Math.min(s1, RANGE.north);
  const ground = [], marks = [], items = [];
  const after = state.era === "after";
  // land, sea, sand
  ground.push(`<path class="g-land" d="${poly([[s0, SPAN.east], [s1, SPAN.east], [s1, SPAN.west], [s0, SPAN.west]])}"/>`);
  ground.push(`<path class="g-sand" d="${poly(band(s0, s1, (s) => Math.min(westEdge(s) + (sbOn(s) ? 1.4 : 0), SPAN.west), (s) => Math.min(dCoast(s), SPAN.west)))}"/>`);
  ground.push(`<path class="g-sea" d="${poly(band(s0, s1, (s) => Math.min(dCoast(s), SPAN.west), () => SPAN.west))}"/>`);
  // lots
  for (const [k, a, b, d0, d1] of BOXES) if (k === "p" && b > s0 && a < s1) ground.push(`<path class="g-lot" d="${poly([[Math.max(a, s0), Math.max(d0, SPAN.east)], [Math.min(b, s1), Math.max(d0, SPAN.east)], [Math.min(b, s1), Math.min(d1, SPAN.west)], [Math.max(a, s0), Math.min(d1, SPAN.west)]])}"/>`);
  // lagoon outlet: water runs under the bridges from the lagoon (east) to the sea
  for (const [a, b] of BRIDGES) if (b > s0 && a < s1) ground.push(`<path class="g-sea" d="${poly([[Math.max(a + 2, s0), SPAN.east], [Math.min(b - 2, s1), SPAN.east], [Math.min(b - 2, s1), SPAN.west], [Math.max(a + 2, s0), SPAN.west]])}"/>`);
  // road surface (travel lanes + both tracks)
  ground.push(`<path class="g-road" d="${poly(band(lo, hi, eastEdge, westEdge, 3))}"/>`);
  // bridge deck, edged so it reads as a structure over the water
  for (const [a, b] of BRIDGES) if (b > s0 && a < s1) { const ba = Math.max(a, s0), bb = Math.min(b, s1); ground.push(`<path class="g-bridge" d="${poly(band(ba, bb, (s) => eastEdge(s) - 0.4, (s) => westEdge(s) + 0.4, 2))}"/>`); }
  // walkway west of the SB track
  const wl = Math.max(lo, SB[0][0] + 30), wh = Math.min(hi, SB[SB.length - 1][0]);
  if (wh > wl) ground.push(`<path class="g-walk" d="${poly(band(wl, wh, (s) => westEdge(s), (s) => westEdge(s) + 1.4))}"/>`);
  // driveways
  for (const [ds, side] of DRIVES) if (ds > s0 - 8 && ds < s1 + 8) {
    const dd = side === "E" ? [eastEdge(ds) + 0.2, Math.max(eastEdge(ds) - 14, SPAN.east)] : [westEdge(ds) - 0.2, Math.min(westEdge(ds) + 16, SPAN.west)];
    ground.push(`<path class="g-drive" d="${poly([[ds - 4, dd[0]], [ds + 4, dd[0]], [ds + 4, dd[1]], [ds - 4, dd[1]]])}"/>`);
  }
  // lane markings
  const dash = (d, len = 3, gap = 9) => { let p = ""; for (let s = Math.ceil(lo / (len + gap)) * (len + gap); s < hi; s += len + gap) p += line([[s, d], [Math.min(s + len, hi), d]], 0.01); return p; };
  marks.push(lineSvg(line([[lo, 0.12], [hi, 0.12]], 0.01) + line([[lo, -0.12], [hi, -0.12]], 0.01), { tone: "hi", className: "m-yellow" }));
  marks.push(lineSvg(dash(3.6) + dash(-3.6), { tone: "hi" }));
  // track edges and buffers
  const runs = (on, from, to, step = 3) => { const out = []; let cur = null; for (let s = from; s <= to; s += step) { if (on(s)) { (cur ||= []).push(s); } else if (cur) { out.push(cur); cur = null; } } if (cur) out.push(cur); return out; };
  for (const [on, dfn, sign, side] of [[nbOn, dNB, 1, "E"], [sbOn, dSB, -1, "W"]]) {
    for (const r of runs(on, lo, hi)) {
      const inner = r.map((s) => [s, dfn(s) + sign * (TRACK_W / 2)]);
      const bufIn = r.map((s) => [s, dfn(s) + sign * (TRACK_W / 2 + BUF)]);
      const outer = r.map((s) => [s, dfn(s) - sign * (TRACK_W / 2)]);
      marks.push(lineSvg(line(inner, 0.01) + line(outer, 0.01), { tone: "hi" }));
      if (after) {
        marks.push(lineSvg(line(bufIn, 0.01), { tone: "hi" }));
        let hatch = ""; for (const s of r) if (Math.round(s) % 3 === 0 && !nearDrive(s, side, 4)) hatch += line([[s, dfn(s) + sign * (TRACK_W / 2)], [s + 1.2, dfn(s) + sign * (TRACK_W / 2 + BUF)]], 0.01);
        marks.push(lineSvg(hatch, { tone: "faint" }));
        // risk patches where drivers cross the track
        for (const [ds, dside] of DRIVES) if (dside === side && ds > s0 - 5 && ds < s1 + 5 && on(ds)) marks.push(`<path class="risk" d="${poly([[ds - 4, dfn(ds) - 1.2], [ds + 4, dfn(ds) - 1.2], [ds + 4, dfn(ds) + 1.2], [ds - 4, dfn(ds) + 1.2]], 0.02)}"/>`);
      }
    }
  }
  if (after) {
    // south entry of the NB track: the rider leaves the lane where the barrier line begins
    if (s0 < NB_SEP && s1 > NB_IN) marks.push(`<path class="risk" d="${poly(band(Math.max(NB_IN, s0), Math.min(NB_SEP, s1), (s) => dNB(s) - 1.4, (s) => dNB(s) + 2.2, 2), 0.02)}"/>`);
    for (const [ua, ub] of UNLIT) if (s0 < ub && s1 > ua) marks.push(`<path class="risk dim" d="${poly(band(Math.max(ua, s0), Math.min(ub, s1), (s) => dSB(s) - 1, (s) => dSB(s) + 1, 4), 0.02)}"/>`);
  }
  // bike symbols on tracks every 60 m
  let sym = "";
  for (let s = Math.ceil(lo / 60) * 60; s < hi; s += 60) for (const [on, dfn] of [[nbOn, dNB], [sbOn, dSB]]) if (on(s) && on(s + 3)) { const d = dfn(s); sym += onTop([[s - state.s0 - 0.6, -d], [s - state.s0 + 0.6, -d]], 0.01, P) + ring(s - state.s0 - 0.6, -d, 0.35, 0.01, P, 10) + ring(s - state.s0 + 0.6, -d, 0.35, 0.01, P, 10); }
  marks.push(lineSvg(sym, { tone: "mid" }));
  // ---------- solids ----------
  const close = W() <= 260;
  if (after) {
    for (const [on, dfn, sign, side] of [[nbOn, dNB, 1, "E"], [sbOn, dSB, -1, "W"]]) {
      const start = side === "E" ? NB_SEP : SB_SEP;
      for (let s = Math.ceil(lo / 6.1) * 6.1; s < hi; s += 6.1) {
        if (!on(s) || s < start || nearDrive(s, side) || onBridge(s)) continue;
        const d = dfn(s) + sign * (TRACK_W / 2 + BUF / 2);
        const first = side === "E" && s < start + 6.1;
        if (close) {
          const k = toK(s, d);
          items.push({ key: depthAt(s + 0.9, d), svg: `<g class="${first ? "first" : ""}">${solidSvg(slabOf({ x: k[0], y: k[1] - 0.14, w: 1.8, d: 0.28, r: 0.05 }, 0, 0.15, P, 2), { tone: "hi", lit: first })}</g>` });
          const kp = toK(s + 3.9, d);
          if (on(s + 3.9) && !nearDrive(s + 3.9, side)) items.push({ key: depthAt(s + 3.9, d), svg: solidSvg(cylinder(kp[0], kp[1], 0.08, 0, 0.95, P, 10), { tone: "hi", crease: "none" }) + lineSvg(sideArc(kp[0], kp[1], 0.08, 0.8, P, 8), { tone: "lit" }) });
        } else {
          items.push({ key: depthAt(s, d), svg: lineSvg(segment(toK(s, d, 0), toK(s, d, 0.9), P), { tone: "hi" }) });
        }
      }
    }
  }
  // bridge railings: solid parapets along both outer edges
  for (const [a, b] of BRIDGES) if (b > s0 && a < s1) for (const [d, out] of [[eastEdge((a + b) / 2) - 0.4, -0.35], [westEdge((a + b) / 2) + 0.4, 0]]) {
    const ka = Math.max(a, s0 - 5), kb = Math.min(b, s1 + 5), k = toK(ka, d + out);
    items.push({ key: depthAt((ka + kb) / 2, d), svg: solidSvg(slabOf({ x: k[0], y: k[1], w: kb - ka, d: 0.35, r: 0.05 }, 0, 1.1, P, 2), { tone: "mid" }) });
  }
  // buildings
  for (const [k, a, b, d0, d1, name] of BOXES) if (k === "b" && b > s0 - 5 && a < s1 + 5) {
    const ka = Math.max(a, s0 - 5), kb = Math.min(b, s1 + 5);
    const dd0 = Math.max(d0, SPAN.east), dd1 = Math.min(d1, SPAN.west);
    if (dd1 <= dd0) continue;
    const plan = { x: ka - state.s0, y: -dd1, w: kb - ka, d: dd1 - dd0, r: 0.4 };
    const h = name === "Fee booth" ? 2.6 : 4.2;
    items.push({ key: depthAt((ka + kb) / 2, (dd0 + dd1) / 2) - 3, svg: solidSvg(slabOf(plan, 0, h, P, 2, 0.3), { tone: "mid" }) });
  }
  // crash pins
  const showEra = after ? ["after", "edge"] : ["before", "edge"];
  for (const c of CRASHES) {
    if (c.s == null || c.s < s0 - 2 || c.s > s1 + 2 || !showEra.includes(ERA(c))) continue;
    const d = c.side === "NB" ? (nbOn(c.s) ? dNB(c.s) : -5) : (sbOn(c.s) ? dSB(c.s) : 5);
    const k = toK(c.s, d);
    const sev = SEV(c);
    const hgt = close ? 5.5 : 14;
    const r = close ? 1.1 : 2.6;
    items.push({ key: depthAt(c.s, d) + 0.5, svg: `<g class="pin" data-sev="${sev}" data-era="${ERA(c)}" data-id="${c.id}" tabindex="0" role="button" aria-label="${c.date} ${c.injury}: ${c.where}">${solidSvg(cylinder(k[0], k[1], close ? 0.1 : 0.3, 0, hgt, P, 8), { tone: "mid", crease: "none" })}${solidSvg(cylinder(k[0], k[1], r, hgt, close ? 0.45 : 1.2, P, 24), { tone: "hi" })}<path class="pin-hit" d="${solidSvgHit(k, hgt, r)}"/></g>` });
  }
  // rider
  if (state.ride) {
    const k = toK(state.riderS, state.riderD);
    const dir = state.riderDir;
    const box = (u0, u1, v0, v1) => [[k[0] + u0 * dir, k[1] + v0], [k[0] + u1 * dir, k[1] + v0], [k[0] + u1 * dir, k[1] + v1], [k[0] + u0 * dir, k[1] + v1]];
    const rs = [solidSvg(extrude(box(-0.85, 0.85, -0.08, 0.08), 0, 0.9, P), { tone: "hi", lit: true }), solidSvg(extrude(box(-0.35, 0.15, -0.22, 0.22), 0.9, 0.75, P), { tone: "hi", lit: true }), solidSvg(cylinder(k[0] + 0.05 * dir, k[1], 0.16, 1.65, 0.28, P, 12), { tone: "hi", lit: true })];
    items.push({ key: depthAt(state.riderS, state.riderD) + 0.2, svg: `<g class="rider"><path class="rider-ring" d="${ring(k[0], k[1], 2.4, 0.02, P, 28)}"/><path class="iso-halo" d="${extrude(box(-1, 1, -0.4, 0.4), 0, 0.05, P).fill}" style="filter:blur(2px)"/>${rs.join("")}</g>` });
  }
  items.sort((a, b) => a.key - b.key);
  // labels
  const labels = [];
  for (const [name, s, d] of POIS) if (s > s0 + 4 && s < s1 - 4 && d > SPAN.east + 4 && d < SPAN.west - 4) { const b = BOXES.find((q) => q[0] === "b" && q[5] && q[5] === name); labels.push(b ? flatText((b[1] + b[2]) / 2, (b[3] + b[4]) / 2, name, close ? 2.4 : 5, "", 4.2) : flatText(s, d, name, close ? 2.4 : 5)); }
  if (s0 < NB_SEP && s1 > NB_IN && after) labels.push(flatText((NB_IN + NB_SEP) / 2, -15.5, "NB track begins · first wheel stop", close ? 1.6 : 3.6, "warn"));
  for (const [a, b] of BRIDGES) if (b > s0 && a < s1) { const m = (a + b) / 2; if (m > s0 + 4 && m < s1 - 4) { labels.push(flatText(m, SPAN.east + (close ? 12 : 22), "from San Elijo Lagoon", close ? 2.2 : 4.6, "water")); labels.push(flatText(m, SPAN.west - (close ? 10 : 20), "to the ocean", close ? 2.2 : 4.6, "water")); } }
  if (s0 < NB_IN - 45 && s1 > NB_IN - 115) labels.push(flatText(NB_IN - 80, -30, "NB: down the hill from Solana Beach, 45 mph posted", close ? 1.6 : 3.6));
  const clip = `<clipPath id="win"><path d="${poly([[s0, SPAN.east], [s1, SPAN.east], [s1, SPAN.west], [s0, SPAN.west]])}"/></clipPath>`;
  scene.innerHTML = clip + `<g clip-path="url(#win)">${ground.join("") + marks.join("")}</g>` + items.map((i) => i.svg).join("") + labels.join("");
  drawWindow();
}
function solidSvgHit(k, h, r) {
  const a = iso([k[0], k[1], 0], P), b = iso([k[0], k[1], h + 0.6], P);
  const rr = Math.max(9, Math.abs(iso([k[0] + r, k[1], 0], P)[0] - a[0]) + 6);
  return `M${(b[0] - rr).toFixed(1)} ${(b[1] - rr).toFixed(1)}h${2 * rr}v${(a[1] - b[1] + 2 * rr).toFixed(1)}h${-2 * rr}Z`;
}

// ---------- minimap ----------
const MW = 1000, MH = 96, MPAD = 14;
const mx = (s) => MPAD + ((s - RANGE.south) / (RANGE.north - RANGE.south)) * (MW - 2 * MPAD);
const sOfMx = (x) => RANGE.south + ((x - MPAD) / (MW - 2 * MPAD)) * (RANGE.north - RANGE.south);
const ROW = { SB: 34, NB: 62 };
function buildMini() {
  const out = [];
  out.push(`<rect class="mm-bg" x="0" y="0" width="${MW}" height="${MH}"/>`);
  const trk = (lineArr, y) => `<path class="mm-track" d="M${mx(lineArr[0][0]).toFixed(1)} ${y}H${mx(lineArr[lineArr.length - 1][0]).toFixed(1)}"/>`;
  out.push(trk(SB, ROW.SB), trk(NB, ROW.NB));
  out.push(`<text class="mm-row" x="${MW - 4}" y="${ROW.SB - 6}" text-anchor="end">SB track · west</text><text class="mm-row" x="${MW - 4}" y="${ROW.NB + 14}" text-anchor="end">NB track · east</text>`);
  const tick = (s, label, y, anchor = "middle") => `<line class="mm-tick" x1="${mx(s)}" y1="${ROW.SB - 4}" x2="${mx(s)}" y2="${ROW.NB + 4}"/><text class="mm-lbl" x="${mx(s)}" y="${y}" text-anchor="${anchor}">${label}</text>`;
  out.push(tick(LIMITS.cityLine, "Solana Beach line", 12, "start"), tick(300, "", 12), tick(1342, "Las Olas", 12), tick(1430, "Tower 13 · Ki's", 90), tick(1631, "Restaurants", 12), tick(1926, "Bridge", 90), tick(LIMITS.chesterfield, "Chesterfield", 12, "end"));
  out.push(`<text class="mm-lbl" x="4" y="90">S</text><text class="mm-lbl" x="${MW - 4}" y="90" text-anchor="end">N</text>`);
  const stack = {};
  for (const c of CRASHES) {
    if (c.s == null) continue;
    const x = mx(c.s), row = c.side === "NB" ? "NB" : "SB";
    const key = row + Math.round(x / 8);
    const n = (stack[key] = (stack[key] ?? 0) + 1) - 1;
    const y = ROW[row] + (row === "SB" ? -1 : 1) * (n * 7);
    out.push(`<circle class="mm-dot" data-sev="${SEV(c)}" data-era="${ERA(c)}" data-id="${c.id}" cx="${x.toFixed(1)}" cy="${y}" r="${SEV(c) === "fatal" ? 4.6 : 3.4}"/>`);
  }
  out.push(`<rect class="mm-win" data-win x="0" y="2" width="10" height="${MH - 4}"/>`);
  mini.innerHTML = out.join("");
}
function drawWindow() {
  const r = mini.querySelector("[data-win]");
  r.setAttribute("x", mx(state.s0).toFixed(1));
  r.setAttribute("width", Math.max(6, mx(state.s0 + W()) - mx(state.s0)).toFixed(1));
  mini.querySelectorAll(".mm-dot").forEach((d) => d.toggleAttribute("data-dim", !(state.era === "after" ? ["after", "edge"] : ["before", "edge"]).includes(d.dataset.era)));
  { const m = Math.round(state.s0 + W() / 2 - LIMITS.cityLine); readout.textContent = m <= 0 ? "At the Solana Beach line" : `${(m * 3.281).toLocaleString("en-US", { maximumFractionDigits: 0 })} ft north of the Solana Beach line`; }
}

// ---------- interaction ----------
const scene = document.querySelector("#scene");
const mini = document.querySelector("#mini");
const pop = document.querySelector("#pop");
const readout = document.querySelector("#where");
const clampS = (s) => Math.max(RANGE.south - 20, Math.min(RANGE.north - W() + 20, s));
let pending = 0;
const schedule = () => { if (!pending) pending = requestAnimationFrame(() => { pending = 0; render(); }); };
const goTo = (s) => { state.s0 = clampS(s); schedule(); };
const scaleX = () => { const a = iso([0, 0, 0], P), b = iso([1, 0, 0], P); return Math.hypot(b[0] - a[0], b[1] - a[1]); };
let drag = null;
const stage = document.querySelector("#stage");
stage.addEventListener("pointerdown", (e) => { if (e.target.closest(".pin")) return; drag = { x: e.clientX, s: state.s0 }; stage.setPointerCapture(e.pointerId); stopRide(); hidePop(); });
stage.addEventListener("pointermove", (e) => { if (!drag) return; const px = scene.getBoundingClientRect().width / VW; goTo(drag.s - (e.clientX - drag.x) / px / scaleX()); });
stage.addEventListener("pointerup", () => (drag = null));
stage.addEventListener("wheel", (e) => { const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY; if (!e.shiftKey && Math.abs(e.deltaX) <= Math.abs(e.deltaY) && !e.ctrlKey) return; e.preventDefault(); goTo(state.s0 + dx * W() / 900); }, { passive: false });
stage.addEventListener("keydown", (e) => { if (e.key === "ArrowRight") { goTo(state.s0 + W() * 0.2); e.preventDefault(); } if (e.key === "ArrowLeft") { goTo(state.s0 - W() * 0.2); e.preventDefault(); } });
let mdrag = false;
const fromMini = (e) => { const r = mini.getBoundingClientRect(); goTo(sOfMx(((e.clientX - r.left) / r.width) * MW) - W() / 2); };
mini.addEventListener("pointerdown", (e) => { mdrag = true; mini.setPointerCapture(e.pointerId); stopRide(); hidePop(); fromMini(e); });
mini.addEventListener("pointermove", (e) => mdrag && fromMini(e));
mini.addEventListener("pointerup", () => (mdrag = false));

// crash popover
const fmt = (c) => `<b>${c.date} · ${c.injury}</b><span>${c.dirText ? c.dirText : c.dirUnknown ? "Direction not recorded (2025 detail not yet published)," : c.side === "NB" ? "Northbound" : "Southbound"} rider · hit ${c.hit.toLowerCase()}</span><span>Official factor: ${c.factor}</span><span>${c.where}${c.approx ? " (position estimated)" : ""}</span>`;
function showPop(id, x, y) {
  const c = CRASHES.find((k) => String(k.id) === String(id)); if (!c) return;
  pop.innerHTML = fmt(c); pop.hidden = false;
  const box = stage.getBoundingClientRect();
  pop.style.left = Math.min(box.width - 260, Math.max(8, x - box.left - 120)) + "px";
  pop.style.top = Math.max(8, y - box.top - pop.offsetHeight - 14) + "px";
}
function hidePop() { pop.hidden = true; }
scene.addEventListener("click", (e) => { const p = e.target.closest(".pin"); if (p) { showPop(p.dataset.id, e.clientX, e.clientY); e.stopPropagation(); } });
scene.addEventListener("keydown", (e) => { const p = e.target.closest?.(".pin"); if (p && (e.key === "Enter" || e.key === " ")) { const r = p.getBoundingClientRect(); showPop(p.dataset.id, r.left + r.width / 2, r.top); e.preventDefault(); } });
mini.addEventListener("click", (e) => { const d = e.target.closest(".mm-dot"); if (!d) return; const c = CRASHES.find((k) => String(k.id) === d.dataset.id); if (c && ERA(c) !== "edge" && ERA(c) !== state.era) setEra(ERA(c)); });

// era toggle
function setEra(era) {
  state.era = era;
  document.querySelectorAll("[data-era-btn]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.eraBtn === era)));
  document.querySelector("#era-note").textContent = era === "after" ? "Since April 2020: wheel stops and flexible posts separate both tracks from traffic." : "January 2016 to March 2020: painted bike lanes with no barriers (lane positions assumed the same).";
  hidePop(); schedule();
}
document.querySelectorAll("[data-era-btn]").forEach((b) => b.addEventListener("click", () => setEra(b.dataset.eraBtn)));
document.querySelectorAll("[data-zoom]").forEach((b) => b.addEventListener("click", () => {
  const mid = state.s0 + W() / 2; zoom = Number(b.dataset.zoom); camera();
  document.querySelectorAll("[data-zoom]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  state.s0 = clampS(mid - W() / 2); schedule();
}));

// ride along a track
const still = matchMedia("(prefers-reduced-motion: reduce)");
let rideFrame = 0, last = 0;
function riderPath(dir, s) {
  if (dir > 0) { // northbound: comes down the hill in the right lane, joins the track at its south end
    if (s < NB_IN) return -5.2;
    if (s < NB_SEP) return -5.2 + (dNB(NB_SEP) + 5.2) * ((s - NB_IN) / (NB_SEP - NB_IN)) ** 1.4;
    return nbOn(s) ? dNB(s) : -5.2;
  }
  if (s < SB_OUT) return 5.2;
  return sbOn(s) ? dSB(s) : 5.2;
}
function startRide(dir) {
  stopRide();
  state.ride = dir; state.riderDir = dir;
  state.riderS = dir > 0 ? RANGE.south + 10 : LIMITS.chesterfield - 5;
  document.querySelectorAll("[data-ride]").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.ride) === dir)));
  hidePop();
  if (still.matches) { state.riderD = riderPath(dir, state.riderS); state.s0 = clampS(state.riderS - W() * 0.4); schedule(); return; }
  last = 0; rideFrame = requestAnimationFrame(tickRide);
}
function stopRide() { if (rideFrame) cancelAnimationFrame(rideFrame); rideFrame = 0; if (state.ride) { state.ride = null; document.querySelectorAll("[data-ride]").forEach((b) => b.setAttribute("aria-pressed", "false")); schedule(); } }
function tickRide(now) {
  const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60; last = now;
  const nearHazard = (s) => (state.ride > 0 ? Math.abs(s - (NB_IN + NB_SEP) / 2) < 30 || DRIVES.some(([d, side]) => side === "E" && Math.abs(d - s) < 10) : DRIVES.some(([d, side]) => side === "W" && Math.abs(d - s) < 10));
  const speed = nearHazard(state.riderS) ? 7 : 22;
  state.riderS += state.ride * speed * dt;
  state.riderD = riderPath(state.ride, state.riderS);
  state.s0 = clampS(state.riderS - W() * (state.ride > 0 ? 0.35 : 0.65));
  render();
  const done = state.ride > 0 ? state.riderS > NB[NB.length - 1][0] + 20 : state.riderS < 200;
  if (done) { stopRide(); return; }
  rideFrame = requestAnimationFrame(tickRide);
}
document.querySelectorAll("[data-ride]").forEach((b) => b.addEventListener("click", () => (state.ride === Number(b.dataset.ride) ? stopRide() : startRide(Number(b.dataset.ride)))));

buildMini();
setEra("after");
