// Runs in the page after the inlined kit (iso, depthOf, extrude, slabOf, cylinder, solidSvg, lineSvg, onTop, fitProjection, boxCorners...).
// DATA is injected by build.mjs.
const { NB_TRACK, SB_TRACK, DRIVES, BUILDINGS, LOTS, COAST, POIS, CRASHES, RIDER, RANGE, LIMITS, BRIDGES, UNLIT, FEAT, ELEV } = DATA;

// ---------- geometry helpers along the road ----------
const lerpLine = (line, s) => {
  if (s <= line[0][0]) return line[0][1];
  for (let i = 1; i < line.length; i++) if (s <= line[i][0]) { const [a, da] = line[i - 1], [b, db] = line[i]; return da + (db - da) * (s - a) / (b - a || 1); }
  return line[line.length - 1][1];
};
const NB = NB_TRACK, SB = [...SB_TRACK].reverse();
const nbOn = (s) => s >= NB[0][0] && s <= NB[NB.length - 1][0];
const sbOn = (s) => s >= SB[0][0] && s <= SB[SB.length - 1][0];
// where each track meets the road: NB riders move over from NB_IN and the barrier begins at NB_SEP; the SB barrier and track end together at SB_OUT
const NB_SEP = NB[0][0], NB_IN = NB_SEP - 30, SB_OUT = SB[0][0], SB_SEP = SB_OUT;
const dNB = (s) => lerpLine(NB, s), dSB = (s) => lerpLine(SB, s), dCoast = (s) => lerpLine(COAST, s);
const BUF = 0.7;
// riding width measured on Esri (curb to posts), blended between stretches; the track is drawn that wide
const widthLine = (rows) => rows.map(([a, b, w]) => [(a + b) / 2, w]);
const W_NB = widthLine(FEAT.trackWidths.NB), W_SB = widthLine(FEAT.trackWidths.SB);
const half = (side, s) => lerpLine(side === "E" ? W_NB : W_SB, s) / 2;
// real outer road edge where it lies beyond the drawn track (Chesterfield NB right-turn lanes)
const edgeOverride = (side, s) => FEAT.roadEdges.find(([a, b, sd]) => sd === side && s >= a && s <= b)?.[3];
const eastEdge = (s) => Math.min(nbOn(s) ? Math.min(dNB(s), -6.5) - half("E", s) : -7.6, edgeOverride("E", s) ?? 0);
const westEdge = (s) => Math.max(sbOn(s) ? Math.max(dSB(s), 6.5) + half("W", s) : 7.6, edgeOverride("W", s) ?? 0);
const nearDrive = (s, side, pad = 5) => DRIVES.some(([a, b, dside]) => dside === side && s > a - pad + 4 && s < b + pad - 4);
const spanOf = (pts) => [Math.min(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[0]))];
const clipTo = (pts, axis, v, keepAbove) => { // Sutherland-Hodgman against one axis-aligned line
  const out = [], inside = (p) => (keepAbove ? p[axis] >= v : p[axis] <= v);
  pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length]; if (inside(p)) out.push(p); if (inside(p) !== inside(q)) { const t = (v - p[axis]) / (q[axis] - p[axis]); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); } });
  return out;
};
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
const state = { s0: 180, era: "after", rider: true, parked: true };
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
// ground extent (s, d) that covers the whole viewBox, plus a margin for buildings standing just outside it
function viewExtent(m = 15) {
  const o = iso([0, 0, 0], P), ax = iso([1, 0, 0], P), ay = iso([0, 1, 0], P);
  const a = [ax[0] - o[0], ax[1] - o[1]], b = [ay[0] - o[0], ay[1] - o[1]], det = a[0] * b[1] - a[1] * b[0];
  const ks = [[0, 0], [VW, 0], [0, VH], [VW, VH]].map(([X, Y]) => { const x = X - o[0], y = Y - o[1]; return [(x * b[1] - y * b[0]) / det, (a[0] * y - a[1] * x) / det]; });
  const ss = ks.map((k) => k[0] + state.s0), ds = ks.map((k) => -k[1]);
  return { s0: Math.min(...ss) - m, s1: Math.max(...ss) + m, east: Math.min(...ds) - m, west: Math.max(...ds) + m };
}
function render() {
  // draw past the camera window to every corner of the frame, so the ground fills the whole rectangle
  const SP = viewExtent(), s0 = SP.s0, s1 = SP.s1;
  const lo = s0, hi = s1;
  const ground = [], marks = [], items = [];
  const after = state.era === "after";
  // land, sea, sand
  ground.push(`<path class="g-land" d="${poly([[s0, SP.east], [s1, SP.east], [s1, SP.west], [s0, SP.west]])}"/>`);
  ground.push(`<path class="g-sand" d="${poly(band(s0, s1, (s) => Math.min(westEdge(s) + (sbOn(s) ? 1.4 : 0), SP.west), (s) => Math.min(dCoast(s), SP.west)))}"/>`);
  ground.push(`<path class="g-sea" d="${poly(band(s0, s1, (s) => Math.min(dCoast(s), SP.west), () => SP.west))}"/>`);
  // lots
  for (const l of LOTS) { const [a, b] = spanOf(l.pts); if (b > s0 && a < s1) ground.push(`<path class="g-lot" d="${poly(l.pts)}"/>`); }
  // lagoon outlet: water runs under the bridges from the lagoon (east) to the sea
  for (const [a, b] of BRIDGES) if (b > s0 && a < s1) ground.push(`<path class="g-sea" d="${poly([[Math.max(a + 2, s0), SP.east], [Math.min(b - 2, s1), SP.east], [Math.min(b - 2, s1), SP.west], [Math.max(a + 2, s0), SP.west]])}"/>`);
  // road surface (travel lanes + both tracks)
  ground.push(`<path class="g-road" d="${poly(band(lo, hi, eastEdge, westEdge, 3))}"/>`);
  // bridge deck, edged so it reads as a structure over the water
  for (const [a, b] of BRIDGES) if (b > s0 && a < s1) { const ba = Math.max(a, s0), bb = Math.min(b, s1); ground.push(`<path class="g-bridge" d="${poly(band(ba, bb, (s) => eastEdge(s) - 0.4, (s) => westEdge(s) + 0.4, 2))}"/>`); }
  // walkway west of the SB track
  const wl = Math.max(lo, SB[0][0] + 30), wh = Math.min(hi, SB[SB.length - 1][0]);
  if (wh > wl) ground.push(`<path class="g-walk" d="${poly(band(wl, wh, (s) => westEdge(s), (s) => westEdge(s) + 1.4))}"/>`);
  // entrances traced on Esri, joined back to the drawn road edge so they read as one surface with the road
  for (const o of FEAT.outlines) {
    const [a, b] = spanOf(o.pts); if (b < s0 || a > s1) continue;
    const edge = o.side === "E" ? (s) => eastEdge(s) + 0.2 : (s) => westEdge(s) - 0.2;
    const first = o.pts[0][0], last = o.pts[o.pts.length - 1][0], back = [];
    for (let s = last; Math.sign(first - last) * (first - s) > 0; s += Math.sign(first - last) * 2) back.push([s, edge(s)]);
    ground.push(`<path class="g-drive" d="${poly([[first, edge(first)], ...o.pts, ...back])}"/>`);
  }
  // driveways
  for (const [a, b, side] of DRIVES) if (b > s0 - 4 && a < s1 + 4) {
    const ds = (a + b) / 2, dd = side === "E" ? [eastEdge(ds) + 0.2, Math.max(eastEdge(ds) - 14, SP.east)] : [westEdge(ds) - 0.2, Math.min(westEdge(ds) + 16, SP.west)];
    ground.push(`<path class="g-drive" d="${poly([[a, dd[0]], [b, dd[0]], [b, dd[1]], [a, dd[1]]])}"/>`);
  }
  // crosswalks: zebra bars across the road (or across a driveway mouth)
  for (const c of FEAT.crosswalks) {
    const [a, b] = c.s, m = (a + b) / 2;
    if (b < s0 || a > s1) continue;
    // a crosswalk over the highway stops at the road edges; one across a driveway mouth is drawn as traced
    const across = Math.min(...c.d) < 0 && Math.max(...c.d) > 0;
    const dA = across ? Math.max(Math.min(...c.d), eastEdge(m)) : Math.min(...c.d), dB = across ? Math.min(Math.max(...c.d), westEdge(m)) : Math.max(...c.d);
    for (let d = dA + 0.3; d < dB; d += 1.2) marks.push(`<path class="g-zebra" d="${poly([[a, d], [b, d], [b, Math.min(d + 0.6, dB)], [a, Math.min(d + 0.6, dB)]], 0.01)}"/>`);
  }
  // lane markings
  const dash = (d, len = 3, gap = 9) => { let p = ""; for (let s = Math.ceil(lo / (len + gap)) * (len + gap); s < hi; s += len + gap) p += line([[s, d], [Math.min(s + len, hi), d]], 0.01); return p; };
  marks.push(lineSvg(line([[lo, 0.12], [hi, 0.12]], 0.01) + line([[lo, -0.12], [hi, -0.12]], 0.01), { tone: "hi", className: "m-yellow" }));
  marks.push(lineSvg(dash(3.6) + dash(-3.6), { tone: "hi" }));
  // track edges and buffers
  const runs = (on, from, to, step = 3) => { const out = []; let cur = null; for (let s = from; s <= to; s += step) { if (on(s)) { (cur ||= []).push(s); } else if (cur) { out.push(cur); cur = null; } } if (cur) out.push(cur); return out; };
  for (const [on, dfn, sign, side] of [[nbOn, dNB, 1, "E"], [sbOn, dSB, -1, "W"]]) {
    for (const r of runs(on, lo, hi)) {
      const inner = r.map((s) => [s, dfn(s) + sign * half(side, s)]);
      const bufIn = r.map((s) => [s, dfn(s) + sign * (half(side, s) + BUF)]);
      const outer = r.map((s) => [s, dfn(s) - sign * half(side, s)]);
      marks.push(lineSvg(line(inner, 0.01) + line(outer, 0.01), { tone: "hi" }));
      if (after) {
        marks.push(lineSvg(line(bufIn, 0.01), { tone: "hi" }));
        let hatch = ""; for (const s of r) if (Math.round(s) % 3 === 0 && !nearDrive(s, side, 4) && !(side === "E" && s > FEAT.nbLaneFrom)) hatch += line([[s, dfn(s) + sign * half(side, s)], [s + 1.2, dfn(s) + sign * (half(side, s) + BUF)]], 0.01);
        marks.push(lineSvg(hatch, { tone: "faint" }));
        // risk patches where drivers cross the track
        for (const [a, b, dside] of DRIVES) { const ds = (a + b) / 2; if (dside === side && b > s0 - 1 && a < s1 + 1 && on(ds)) marks.push(`<path class="risk" d="${poly([[a, dfn(ds) - 1.2], [b, dfn(ds) - 1.2], [b, dfn(ds) + 1.2], [a, dfn(ds) + 1.2]], 0.02)}"/>`); }
      }
    }
  }
  if (after) {
    // where drivers cross the bike lane (Esri): Seaside right-turn merge, Cardiff Reef lot approach, Chesterfield right-turn lane
    for (const c of FEAT.crossovers) { const [a, b] = c.merge ?? c.s; if (b > s0 && a < s1) { const dfn = c.side === "E" ? dNB : dSB; marks.push(`<path class="risk" d="${poly(band(Math.max(a, s0), Math.min(b, s1), (s) => dfn(s) - 1.4, (s) => dfn(s) + 1.4, 2), 0.02)}"/>`); } }
    for (const r of FEAT.redCurb) if (r.s[1] > s0 && r.s[0] < s1) marks.push(`<path class="m-red" d="${line([[r.s[0], r.d], [r.s[1], r.d]], 0.02)}"/>`);
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
        if (!on(s) || s < start || nearDrive(s, side) || onBridge(s) || (side === "E" && s > FEAT.nbLaneFrom)) continue;
        const d = dfn(s) + sign * (half(side, s) + BUF / 2);
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
  // parked cars between the SB path and traffic (Esri, after view): a row of low boxes just inside the path's buffer
  if (after && state.parked) for (const p of FEAT.parking) {
    const [a, b] = p.s;
    if (b < s0 - 6 || a > s1 + 6) continue;
    for (let s = Math.max(a + 0.5, Math.ceil((s0 - 6) / 6.4) * 6.4); s + 4.6 < Math.min(b, s1 + 6); s += 6.4) {
      if (s < a) continue;
      const d = dSB(s) - half("W", s) - BUF - 1.1, k = toK(s, d);
      items.push({ key: depthAt(s + 2.3, d), svg: close ? solidSvg(slabOf({ x: k[0], y: k[1] - 0.9, w: 4.5, d: 1.8, r: 0.4 }, 0, 1.4, P, 3), { tone: "mid" }) : `<path class="g-park" d="${poly([[s, d - 0.9], [s + 4.5, d - 0.9], [s + 4.5, d + 0.9], [s, d + 0.9]], 0.01)}"/>` });
    }
  }
  // buildings
  for (const bl of BUILDINGS) {
    let pts = bl.pts;
    for (const [axis, v, above] of [[0, s0 - 2, true], [0, s1 + 2, false], [1, SP.east, true], [1, SP.west, false]]) if (pts.length) pts = clipTo(pts, axis, v, above);
    if (pts.length < 3) continue;
    const [ka, kb] = spanOf(pts), dm = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    items.push({ key: depthAt((ka + kb) / 2, dm) - 3, svg: solidSvg(extrude(pts.map(([s, d]) => [s - state.s0, -d]), 0, bl.h, P, { convex: false }), { tone: "mid" }) });
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
  // rider reports (advocate list): after view only, nudged 1.5 m off the official pin line, no pin where an official record covers the same crash
  // reports placed at the same landmark are fanned out 5 m apart along the road so each pin can be seen and clicked
  if (after && state.rider) for (const c of RIDER) {
    if (c.s == null || c.matchesOfficial || c.s < s0 - 2 || c.s > s1 + 2) continue;
    const same = RIDER.filter((r) => r.s === c.s && r.dir === c.dir && !r.matchesOfficial);
    const s = c.s + (same.indexOf(c) - (same.length - 1) / 2) * 5;
    const d = (c.dir === "NB" ? (nbOn(s) ? dNB(s) : -5) : (sbOn(s) ? dSB(s) : 5)) + (c.dir === "NB" ? -1.5 : 1.5);
    const k = toK(s, d), hgt = close ? 4.2 : 11, r = close ? 0.9 : 2.1;
    items.push({ key: depthAt(s, d) + 0.5, svg: `<g class="pin pin-rider" data-id="r${c.n}" tabindex="0" role="button" aria-label="Rider report ${c.date}: ${esc(c.where)}">${solidSvg(cylinder(k[0], k[1], close ? 0.1 : 0.3, 0, hgt, P, 8), { tone: "mid", crease: "none" })}${solidSvg(cylinder(k[0], k[1], r, hgt, close ? 0.4 : 1, P, 24), { tone: "hi" })}<path class="pin-hit" d="${solidSvgHit(k, hgt, r)}"/></g>` });
  }
  items.sort((a, b) => a.key - b.key);
  // labels
  const labels = [];
  for (const [name, s, d] of POIS) if (s > s0 + 4 && s < s1 - 4 && d > SP.east + 4 && d < SP.west - 4) { const b = BUILDINGS.find((q) => q.name && q.name.includes(name)); labels.push(b ? flatText(b.pts.reduce((a, p) => a + p[0], 0) / b.pts.length, b.pts.reduce((a, p) => a + p[1], 0) / b.pts.length, name, close ? 2.4 : 5, "", b.h) : flatText(s, d, name, close ? 2.4 : 5)); }
  if (s0 < NB_SEP && s1 > NB_IN && after) labels.push(flatText((NB_IN + NB_SEP) / 2, -15.5, "NB track begins · first wheel stop", close ? 1.6 : 3.6, "warn"));
  for (const [a, b] of BRIDGES) if (b > s0 && a < s1) { const m = (a + b) / 2; if (m > s0 + 4 && m < s1 - 4) { labels.push(flatText(m, SP.east + (close ? 12 : 22), "from San Elijo Lagoon", close ? 2.2 : 4.6, "water")); labels.push(flatText(m, SP.west - (close ? 10 : 20), "to the ocean", close ? 2.2 : 4.6, "water")); } }
  if (s0 < NB_IN - 45 && s1 > NB_IN - 115) labels.push(flatText(NB_IN - 80, -30, "NB: down the hill from Solana Beach, 45 mph posted", close ? 1.6 : 3.6));
  const clip = `<clipPath id="win"><path d="${poly([[s0, SP.east], [s1, SP.east], [s1, SP.west], [s0, SP.west]])}"/></clipPath>`;
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
  // state beaches: a sand band over each beach's parking lot, named along the bottom
  for (const [a, b, name] of [[251, 423, "Seaside"], [1710, 1866, "Cardiff State Beach"]]) out.push(`<rect class="mm-beach" x="${mx(a).toFixed(1)}" y="16" width="${(mx(b) - mx(a)).toFixed(1)}" height="64"/><text class="mm-lbl mm-beach-lbl" x="${mx((a + b) / 2).toFixed(1)}" y="90" text-anchor="middle">${name}</text>`);
  out.push(trk(SB, ROW.SB), trk(NB, ROW.NB));
  out.push(`<text class="mm-row" x="${MW - 4}" y="${ROW.SB - 6}" text-anchor="end">SB track · west</text><text class="mm-row" x="${MW - 4}" y="${ROW.NB + 14}" text-anchor="end">NB track · east</text>`);
  const tick = (s, label, y, anchor = "middle") => `<line class="mm-tick" x1="${mx(s)}" y1="${ROW.SB - 4}" x2="${mx(s)}" y2="${ROW.NB + 4}"/><text class="mm-lbl" x="${mx(s)}" y="${y}" text-anchor="${anchor}">${label}</text>`;
  out.push(tick(LIMITS.cityLine, "Solana Beach line", 12, "start"), tick(300, "", 12), tick(1342, "Las Olas", 12), tick(1430, "Tower 13 · Ki's", 90), tick(1631, "Restaurants", 12), tick(1926, "Bridge", 12), tick(LIMITS.chesterfield, "Chesterfield", 12, "end"));
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
  for (const c of RIDER) {
    if (c.s == null || c.matchesOfficial) continue;
    const x = mx(c.s), row = c.dir === "NB" ? "NB" : "SB";
    const key = row + Math.round(x / 8);
    const n = (stack[key] = (stack[key] ?? 0) + 1) - 1;
    out.push(`<circle class="mm-rdot" data-rid="r${c.n}" cx="${x.toFixed(1)}" cy="${ROW[row] + (row === "SB" ? -1 : 1) * (n * 7)}" r="3"/>`);
  }
  out.push(`<rect class="mm-win" data-win x="0" y="2" width="10" height="${MH - 4}"/>`);
  mini.innerHTML = out.join("");
}
const EH = 56, ezMax = 15, ey = (z) => EH - 14 - (z / ezMax) * (EH - 20);
function buildElev() {
  const pts = ELEV.filter(([s]) => s >= RANGE.south && s <= RANGE.north);
  const d = pts.map(([s, z], i) => `${i ? "L" : "M"}${mx(s).toFixed(1)} ${ey(z).toFixed(1)}`).join("");
  const top = Math.max(...pts.map((p) => p[1])), low = Math.min(...pts.map((p) => p[1]));
  elev.innerHTML = `<path class="el-fill" d="${d}L${mx(pts.at(-1)[0]).toFixed(1)} ${EH - 14}L${mx(pts[0][0]).toFixed(1)} ${EH - 14}Z"/><path class="el-line" d="${d}"/>` +
    `<text class="el-lbl" x="4" y="${EH - 2}">Elevation · ${Math.round(low)}–${Math.round(top)} m above sea level (USGS lidar)</text>` +
    `<rect class="el-win" data-ewin x="0" y="0" width="10" height="${EH - 14}"/>`;
}
function drawWindow() {
  { const r = elev.querySelector("[data-ewin]"); if (r) { r.setAttribute("x", mx(state.s0).toFixed(1)); r.setAttribute("width", Math.max(6, mx(state.s0 + W()) - mx(state.s0)).toFixed(1)); } }
  const r = mini.querySelector("[data-win]");
  r.setAttribute("x", mx(state.s0).toFixed(1));
  r.setAttribute("width", Math.max(6, mx(state.s0 + W()) - mx(state.s0)).toFixed(1));
  mini.querySelectorAll(".mm-rdot").forEach((d) => d.toggleAttribute("data-dim", state.era !== "after" || !state.rider));
  mini.querySelectorAll(".mm-dot").forEach((d) => d.toggleAttribute("data-dim", !(state.era === "after" ? ["after", "edge"] : ["before", "edge"]).includes(d.dataset.era)));
  { const m = Math.round(state.s0 + W() / 2 - LIMITS.cityLine); readout.textContent = m <= 0 ? "At the Solana Beach line" : `${(m * 3.281).toLocaleString("en-US", { maximumFractionDigits: 0 })} ft north of the Solana Beach line`; }
}

// ---------- interaction ----------
const scene = document.querySelector("#scene");
const mini = document.querySelector("#mini");
const elev = document.querySelector("#elev");
const pop = document.querySelector("#pop");
const readout = document.querySelector("#where");
const clampS = (s) => Math.max(RANGE.south - 20, Math.min(RANGE.north - W() + 20, s));
let pending = 0;
const schedule = () => { if (!pending) pending = requestAnimationFrame(() => { pending = 0; render(); }); };
const goTo = (s) => { state.s0 = clampS(s); schedule(); };
const scaleX = () => { const a = iso([0, 0, 0], P), b = iso([1, 0, 0], P); return Math.hypot(b[0] - a[0], b[1] - a[1]); };
let drag = null;
const stage = document.querySelector("#stage");
stage.addEventListener("pointerdown", (e) => { if (e.target.closest(".pin")) return; drag = { x: e.clientX, s: state.s0 }; stage.setPointerCapture(e.pointerId); hidePop(); });
stage.addEventListener("pointermove", (e) => { if (!drag) return; const px = scene.getBoundingClientRect().width / VW; goTo(drag.s - (e.clientX - drag.x) / px / scaleX()); });
stage.addEventListener("pointerup", () => (drag = null));
stage.addEventListener("wheel", (e) => { const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY; if (!e.shiftKey && Math.abs(e.deltaX) <= Math.abs(e.deltaY) && !e.ctrlKey) return; e.preventDefault(); goTo(state.s0 + dx * W() / 900); }, { passive: false });
stage.addEventListener("keydown", (e) => { if (e.key === "ArrowRight") { goTo(state.s0 + W() * 0.2); e.preventDefault(); } if (e.key === "ArrowLeft") { goTo(state.s0 - W() * 0.2); e.preventDefault(); } });
let mdrag = false;
const fromMini = (e) => { const r = mini.getBoundingClientRect(); goTo(sOfMx(((e.clientX - r.left) / r.width) * MW) - W() / 2); };
mini.addEventListener("pointerdown", (e) => { mdrag = true; mini.setPointerCapture(e.pointerId); hidePop(); fromMini(e); });
mini.addEventListener("pointermove", (e) => mdrag && fromMini(e));
mini.addEventListener("pointerup", () => (mdrag = false));

// crash popover
const fmt = (c) => `<b>${c.date} · ${c.injury}</b><span>${c.dirText ? c.dirText : c.dirUnknown ? "Direction not recorded (2025 detail not yet published)," : c.side === "NB" ? "Northbound" : "Southbound"} rider · hit ${c.hit.toLowerCase()}</span><span>Official factor: ${c.factor}</span><span>${c.where}${c.approx ? " (position estimated)" : ""}</span>`;
const esc = (t) => String(t).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
// an official record that is also on the rider list says so; where the list places it elsewhere, say where
const alsoOnList = (c) => RIDER.filter((r) => String(r.official) === String(c.id)).map((r) => `<span class="pop-tag">Also on the rider list (#${r.n})${r.matchesOfficial ? "" : ": " + esc(r.locNote || "placed at " + r.where)}</span>`).join("");
const fmtRider = (r) => `<b>${r.date} · Rider report</b><span class="pop-tag">Not an official record</span><span>${r.dir === "NB" ? "Northbound" : r.dir === "SB" ? "Southbound" : "Direction not stated,"} rider · ${esc(r.what)}</span><span>Injury: ${esc(r.injury)}</span><span>${esc(r.where)} (position approximate)</span>${r.locNote ? `<span>${esc(r.locNote)}</span>` : ""}${r.dateNote ? `<span>Date: ${esc(r.dateNote)}</span>` : ""}<span>Source: ${esc(r.src)}, via the Cardiff 101 Crash List (#${r.n})</span>`;
function showPop(id, x, y) {
  const rid = String(id).startsWith("r") ? RIDER.find((k) => "r" + k.n === String(id)) : null;
  const c = rid ? null : CRASHES.find((k) => String(k.id) === String(id)); if (!c && !rid) return;
  pop.innerHTML = (rid ? fmtRider(rid) : fmt(c) + alsoOnList(c)) + '<button type="button" class="pop-x" aria-label="Close">×</button>'; pop.hidden = false;
  const box = stage.getBoundingClientRect();
  pop.style.left = Math.min(box.width - 260, Math.max(8, x - box.left - 120)) + "px";
  pop.style.maxHeight = box.height - 16 + "px"; // long rider reports scroll inside the stage instead of running off it
  pop.style.top = Math.max(8, Math.min(box.height - pop.offsetHeight - 8, y - box.top - pop.offsetHeight - 14)) + "px";
}
function hidePop() { pop.hidden = true; }
pop.addEventListener("pointerdown", (e) => e.stopPropagation());
pop.addEventListener("click", (e) => { if (e.target.closest(".pop-x")) hidePop(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") hidePop(); });
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

// parked cars on or off
document.querySelector("[data-parked]").addEventListener("click", (e) => { state.parked = !state.parked; e.currentTarget.setAttribute("aria-pressed", String(state.parked)); schedule(); });

// rider reports on or off
document.querySelector("[data-rider]").addEventListener("click", (e) => { state.rider = !state.rider; e.currentTarget.setAttribute("aria-pressed", String(state.rider)); hidePop(); schedule(); });

buildMini();
buildElev();
setEra("after");
