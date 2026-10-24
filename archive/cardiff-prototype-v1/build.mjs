// Builds cardiff.html: three isometric slices of the Coast Hwy 101 cycle track plus a corridor crash strip.
// node build.mjs [--light]
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../vendor/anatomy/kit/iso-kit.mjs";
import * as G from "../../vendor/anatomy/kit/lathe.mjs";
import { kitScript } from "../../vendor/anatomy/scripts/inline-kit.mjs";
import { SECTION as S, LENGTH, BUFFER, SLICES, CORRIDOR, CRASHES } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";
const WIDTH = 760;
const HEIGHT = 470;
const FAR = -9; // east edge drawn
const NEAR = 82; // west edge drawn (restaurant building)

const P = k.fitProjection(k.boxCorners({ x: 0, y: FAR, w: LENGTH, d: NEAR - FAR }, -1, 12), WIDTH, HEIGHT, { pad: 10, azimuth: -60, elevation: 38 });
const at = (p) => k.iso(p, P);
const Sv = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dt = (pts, style) => k.dotsSvg(pts, style);
const mid = (r) => (r[0] + r[1]) / 2;
const depth = (x, y, z = 0) => k.depthOf([x, y, z], P);
const sortDraw = (items) => items.sort((a, b) => a.key - b.key).map((i) => i.svg).join("");

// ---------- shared geometry ----------
function ground(slice) {
  const out = [];
  // east embankment beside the rail corridor
  out.push(Sv(k.slabOf({ x: 0, y: FAR, w: LENGTH, d: -FAR, r: 0 }, -1.2, 0.8, P, 2), { tone: "lo", crease: "none" }));
  // asphalt from NB track to SB track
  out.push(Sv(k.slabOf({ x: 0, y: S.nbTrack[0], w: LENGTH, d: S.sbTrack[1] - S.nbTrack[0], r: 0 }, -1, 1, P, 2), { tone: "mid" }));
  // walkway, a touch lower and sandy
  out.push(Sv(k.slabOf({ x: 0, y: S.walkway[0], w: LENGTH, d: S.walkway[1] - S.walkway[0], r: 0 }, -1, 0.85, P, 2), { tone: "lo", crease: "none" }));
  if (slice === "restaurant") {
    out.push(Sv(k.slabOf({ x: 0, y: S.walkway[1], w: LENGTH, d: 16, r: 0 }, -1, 0.95, P, 2), { tone: "mid", crease: "none" }));
    out.push(Sv(k.slabOf({ x: 0, y: S.walkway[1] + 16, w: LENGTH, d: NEAR - S.walkway[1] - 16, r: 0 }, -1.6, 1.3, P, 2), { tone: "lo", crease: "none" }));
  } else {
    out.push(Sv(k.slabOf({ x: 0, y: S.beach[0], w: LENGTH, d: NEAR - S.beach[0], r: 0 }, -1.6, 1.3, P, 2), { tone: "lo", crease: "none" }));
  }
  return out.join("");
}

// sand stipple on a band of the floor
function sand(y0, y1, z, seed = 1, density = 0.12) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const pts = [];
  const n = Math.round(LENGTH * (y1 - y0) * density);
  for (let i = 0; i < n; i++) pts.push(at([0.5 + rnd() * (LENGTH - 1), y0 + 0.3 + rnd() * (y1 - y0 - 0.6), z]));
  return Dt(pts, { size: 0.45, tone: "lo" });
}

function markings(slice) {
  const out = [];
  const z = 0;
  const along = (y, x0 = 0, x1 = LENGTH) => k.lineOnTop([x0, y], [x1, y], z, P);
  // edge lines of each buffer and the track/walkway edge
  out.push(Ln([S.nbBuffer[0], S.nbBuffer[1], S.sbBuffer[0], S.sbBuffer[1]].map((y) => along(y)).join(""), { tone: "hi" }));
  // double yellow
  out.push(Ln(along(S.centre[0] + 0.3) + along(S.centre[1] - 0.3), { tone: "hi" }));
  // dashed lane line between SB lanes: 10 ft dash, 30 ft gap
  let dash = "";
  for (let x = 4; x < LENGTH; x += 40) dash += along(S.sbLane1[1], x, Math.min(LENGTH, x + 10));
  out.push(Ln(dash, { tone: "hi" }));
  // buffer hatching between wheel stops
  let hatch = "";
  for (const [y0, y1] of [S.nbBuffer, S.sbBuffer]) for (let x = 2; x < LENGTH - 2; x += 5) hatch += k.lineOnTop([x, y0], [x + 2, y1], z, P);
  out.push(Ln(hatch, { tone: "faint" }));
  // sharrows: chevrons and a bike in the right lane each way
  const sharrow = (x, y, dir) => {
    let d = "";
    for (const off of [0, 2.4]) d += k.onTop([[x + dir * (off - 1.2), y - 1.6], [x + dir * off, y], [x + dir * (off - 1.2), y + 1.6]], z, P);
    d += k.ring(x - dir * 4, y - 0.9, 0.9, z, P, 16) + k.ring(x - dir * 4, y + 0.9, 0.9, z, P, 16);
    return d;
  };
  out.push(Ln(sharrow(34, mid(S.nbLane), 1) + sharrow(96, mid(S.nbLane), 1) + sharrow(26, mid(S.sbLane2), -1) + sharrow(86, mid(S.sbLane2), -1), { tone: "mid" }));
  // bike-lane symbols in each track
  const bike = (x, y) => k.ring(x - 1.1, y, 0.75, z, P, 14) + k.ring(x + 1.1, y, 0.75, z, P, 14) + k.lineOnTop([x - 1.1, y], [x + 1.1, y], z, P);
  out.push(Ln(bike(20, mid(S.nbTrack)) + bike(84, mid(S.sbTrack)) + bike(14, mid(S.sbTrack)), { tone: "mid" }));
  // engraved labels on the ground
  // text laid flat on the road, reading left to right for a viewer on the east side
  const flat = ([x, y], zz) => {
    const o = at([x, y, zz]), ex = at([x + 1, y, zz]), ey = at([x, y + 1, zz]);
    const a = [o[0] - ex[0], o[1] - ex[1]], c = [o[0] - ey[0], o[1] - ey[1]];
    return `matrix(${a[0].toFixed(4)} ${a[1].toFixed(4)} ${c[0].toFixed(4)} ${c[1].toFixed(4)} ${o[0].toFixed(2)} ${o[1].toFixed(2)})`;
  };
  const label = (text, x, y) => k.faceTextSvg(flat([x, y], z), text, { size: 1.5, tone: "mid", anchor: "middle" });
  out.push(label("NB CYCLE TRACK", 78, mid(S.nbTrack) - 0.6), label("SB CYCLE TRACK", 40, mid(S.sbTrack) - 0.6), label("WALKWAY ~3 FT", 70, mid(S.walkway) - 0.6));
  if (slice === "restaurant") out.push(label("RESTAURANT PARKING", 60, S.walkway[1] + 4));
  return out.join("");
}

// the rail-corridor fence along the far side
function fence() {
  const out = [];
  const y = FAR + 2;
  for (let x = 2; x < LENGTH; x += 15) out.push(Sv(k.cylinder(x, y, 0.16, -0.4, 3.4, P, 10), { tone: "mid", crease: "none" }));
  out.push(Ln(k.segment([2, y, 3.0], [LENGTH - 13, y, 3.0], P) + k.segment([2, y, 1.8], [LENGTH - 13, y, 1.8], P), { tone: "lo" }));
  return out.join("");
}

// one wheel stop and one flexible post per period, skipping openings
function bufferItems(y0, y1, { gaps = [], from = 0 } = {}) {
  const items = [];
  const yc = (y0 + y1) / 2;
  const open = (x0, x1) => x1 <= from || gaps.some(([a, b]) => x1 > a && x0 < b);
  for (let x = 1; x < LENGTH; x += BUFFER.period) {
    const stop = { x, y: yc - BUFFER.stopWidth / 2, w: BUFFER.stopLength, d: BUFFER.stopWidth, r: 0.15 };
    if (!open(x, x + BUFFER.stopLength) && x >= from) {
      const lit = from && x === firstAfter(from);
      const svg = Sv(k.slabOf(stop, 0, BUFFER.stopHeight, P, 2, 0.15), { tone: "hi", lit }) +
        Ln(k.lineOnTop([x + 1, yc], [x + BUFFER.stopLength - 1, yc], BUFFER.stopHeight, P), { tone: lit ? "lit" : "mid" });
      items.push({ key: depth(x + 3, yc), svg, x });
    }
    const px = x + BUFFER.postAt;
    if (px < LENGTH - 1 && !open(px - 0.5, px + 0.5) && px >= from) {
      const svg = Sv(k.cylinder(px, yc, BUFFER.postR + 0.12, 0, 0.25, P, 12), { tone: "mid" }) +
        Sv(k.cylinder(px, yc, BUFFER.postR, 0.25, BUFFER.postH - 0.25, P, 14), { tone: "hi", crease: "none" }) +
        Ln(k.sideArc(px, yc, BUFFER.postR, BUFFER.postH - 0.5, P, 10) + k.sideArc(px, yc, BUFFER.postR, BUFFER.postH - 0.9, P, 10), { tone: "lit" });
      items.push({ key: depth(px, yc), svg, x: px });
    }
  }
  return items;
}
const firstAfter = (from) => {
  for (let x = 1; x < LENGTH; x += BUFFER.period) if (x >= from) return x;
  return -1;
};

// ---------- movers (static shapes built at the origin, moved with translateAlong) ----------
function cyclistSvg(dir) {
  // dir +1 = northbound (+x), -1 = southbound
  const out = [];
  const wb = 1.75;
  const R = 1.1;
  const F = (x) => G.frameAlong([x, 0, R], [0, 1, 0]);
  out.push(`<path class="iso-halo" d="${k.haloOf({ x: -2.6, y: -0.7, w: 5.2, d: 1.4, r: 0.6 }, 0, 0.1, P)}" style="filter:blur(2px)"/>`);
  for (const x of [-wb, wb]) {
    out.push(Sv(G.disc(-0.09, 0.09, R, F(x), P), { tone: "hi", lit: true }));
    out.push(Sv(G.disc(-0.12, 0.12, 0.18, F(x), P), { tone: "mid" }));
  }
  const hubB = [-dir * wb, 0, R], hubF = [dir * wb, 0, R];
  const crank = [0, 0, R * 0.95], seat = [-dir * 0.5, 0, 3.3], bar = [dir * 1.35, 0, 3.4];
  out.push(Ln(k.segment(hubB, crank, P) + k.segment(crank, seat, P) + k.segment(seat, hubB, P) + k.segment(crank, bar, P) + k.segment(bar, hubF, P) + k.segment(seat, [dir * 1.1, 0, 3.2], P), { tone: "lit" }));
  // rider: legs, torso, arms, head
  out.push(Ln(k.segment(seat, [dir * 0.25, 0.25, 1.6], P) + k.segment([dir * 0.25, 0.25, 1.6], crank, P) + k.segment(seat, [dir * 0.1, -0.25, 2.1], P), { tone: "hi" }));
  out.push(Sv(k.extrude([[-dir * 0.7, -0.45], [dir * 0.3, -0.45], [dir * 0.3, 0.45], [-dir * 0.7, 0.45]], 3.3, 1.9, P), { tone: "hi", lit: true }));
  out.push(Ln(k.segment([dir * 0.1, 0, 5.0], bar, P), { tone: "lit" }));
  out.push(Sv(G.sphereOf([dir * 0.35, 0, 5.75], 0.48, P), { tone: "hi", lit: true }));
  return `<g data-part="cyclist">${out.join("")}</g>`;
}

function walkerSvg() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf({ x: -0.8, y: -0.8, w: 1.6, d: 1.6, r: 0.8 }, 0, 0.1, P)}" style="filter:blur(2px)"/>`);
  out.push(Sv(k.cylinder(0, -0.25, 0.22, 0, 2.7, P, 10), { tone: "mid" }));
  out.push(Sv(k.cylinder(0, 0.25, 0.22, 0, 2.7, P, 10), { tone: "mid" }));
  out.push(Sv(k.slabOf({ x: -0.4, y: -0.55, w: 0.8, d: 1.1, r: 0.3 }, 2.7, 2.2, P, 3), { tone: "mid" }));
  out.push(Sv(G.sphereOf([0, 0, 5.4], 0.45, P), { tone: "mid" }));
  // a dog on a lead
  out.push(Sv(k.slabOf({ x: 1.6, y: 0.4, w: 2.2, d: 0.7, r: 0.3 }, 0.9, 0.8, P, 3), { tone: "mid" }));
  out.push(Ln(k.segment([0.2, 0.3, 3.6], [3.6, 0.75, 1.8], P), { tone: "lo" }));
  return `<g data-part="walker">${out.join("")}</g>`;
}

// A car drawn from rotated rings so the page can rebuild it every frame while it turns.
// K carries the kit functions (k in Node, the inlined globals in the page).
function carSvg(K, P, cx, cy, heading, tone) {
  const c = Math.cos(heading), s = Math.sin(heading);
  const box = (ax, ay, bx, by) => [[ax, ay], [bx, ay], [bx, by], [ax, by]].map(([u, v]) => [cx + u * c - v * s, cy + u * s + v * c]);
  const out = [];
  out.push(`<path class="iso-halo" d="${K.extrude(box(-8, -3.4, 8, 3.4), 0, 0.1, P).fill}" style="filter:blur(4px)"/>`);
  for (const u of [-4.8, 4.8]) for (const v of [-2.9, 2.9]) out.push(K.solidSvg(K.extrude(box(u - 1.2, v - 0.45, u + 1.2, v + 0.45), 0, 2.1, P), { tone: "lo" }));
  out.push(K.solidSvg(K.extrude(box(-7.6, -3.1, 7.6, 3.1), 1.0, 2.4, P, { bevel: 0.3 }), { tone }));
  out.push(K.solidSvg(K.extrude(box(-4.2, -2.75, 2.6, 2.75), 3.4, 1.8, P, { bevel: 0.25 }), { tone }));
  out.push(K.lineSvg(K.onTop(box(-3.9, -2.45, 2.3, 2.45), 5.2, P, true), { tone: "faint" }));
  out.push(K.lineSvg(K.onTop(box(4.2, -2.6, 7.2, 2.6), 3.4, P, true), { tone: "faint" }));
  return out.join("");
}

// ---------- slices ----------
function nearStatic(slice) {
  const items = [];
  if (slice === "restaurant") {
    // parked cars in the lot, nose-in to the building
    for (const x of [8, 22, 36, 78, 116]) items.push({ key: depth(x, 63), svg: carSvg(k, P, x, 63, Math.PI / 2, "mid") });
    // restaurant building beyond the lot
    const b = { x: 4, y: 72, w: LENGTH - 8, d: 10, r: 0.5 };
    const bsvg = [Sv(k.slabOf(b, -0.3, 10, P, 2, 0.5), { tone: "mid" }), Sv(k.slabOf(k.insetPlan(b, -0.8), 9.7, 1.0, P, 2, 0.4), { tone: "mid" })];
    let win = "";
    for (let x = 10; x < LENGTH - 10; x += 11) win += k.segment([x, b.y, 2.5], [x, b.y, 7], P) + k.segment([x + 6, b.y, 2.5], [x + 6, b.y, 7], P) + k.segment([x, b.y, 7], [x + 6, b.y, 7], P) + k.segment([x, b.y, 2.5], [x + 6, b.y, 2.5], P);
    bsvg.push(Ln(win, { tone: "lo" }));
    items.push({ key: depth(LENGTH / 2, 77) - 50, svg: bsvg.join("") });
    // wheel-stops in the lot
    for (const x of [8, 22, 36, 78, 116]) items.push({ key: depth(x, 71) - 0.1, svg: Sv(k.slabOf({ x: x - 3, y: 70.6, w: 6, d: 0.7, r: 0.1 }, 0, 0.4, P, 2), { tone: "lo" }) });
  } else {
    // beach-access posts and rope along the walkway's ocean side
    const y = S.beach[0] + 1;
    for (let x = 4; x < LENGTH; x += 12) items.push({ key: depth(x, y), svg: Sv(k.cylinder(x, y, 0.25, -0.3, 2.6, P, 10), { tone: "mid", crease: "none" }) });
    items.push({ key: depth(LENGTH / 2, y) - 0.2, svg: Ln(k.segment([4, y, 2.0], [LENGTH - 8, y, 2.0], P), { tone: "lo" }) });
  }
  return items;
}

function sliceSvg(slice) {
  const cfg = SLICES[slice];
  const gaps = cfg.gaps ?? [];
  const body = [];
  body.push(ground(slice));
  body.push(sand(FAR, 0, -0.4, 3, 0.05));
  body.push(sand(S.walkway[0], S.walkway[1], -0.15, 7, 0.35));
  if (slice !== "restaurant") body.push(sand(S.beach[0], NEAR, -0.3, 11, 0.05));
  if (slice === "restaurant") {
    // driveway aprons across walkway
    for (const [a, b] of gaps) body.push(Sv(k.slabOf({ x: a, y: S.walkway[0], w: b - a, d: S.walkway[1] - S.walkway[0], r: 0 }, -1, 1.0, P, 2), { tone: "mid", crease: "none" }));
  }
  body.push(markings(slice));
  // risk overlays on the ground
  if (slice === "open") {
    // the two edges a rider cannot cross: wheel-stop line and walkway edge
    body.push(`<g data-part="trap"><path class="cx-risk" style="opacity:.12" d="${k.onTop([[0, S.sbTrack[0]], [LENGTH, S.sbTrack[0]], [LENGTH, S.sbTrack[1]], [0, S.sbTrack[1]]], 0.01, P, true)}"/>${Ln(k.lineOnTop([0, S.sbTrack[0] + 0.15], [LENGTH, S.sbTrack[0] + 0.15], 0.02, P) + k.lineOnTop([0, S.sbTrack[1] - 0.15], [LENGTH, S.sbTrack[1] - 0.15], 0.02, P), { tone: "red" })}</g>`);
  }
  if (slice === "restaurant") {
    let d = "";
    for (const [a, b] of gaps) d += k.onTop([[a, S.sbTrack[0]], [b, S.sbTrack[0]], [b, S.sbTrack[1]], [a, S.sbTrack[1]]], 0.03, P, true);
    body.push(`<g data-part="conflict"><path class="cx-risk" d="${d}"/>${Ln(d, { tone: "red" })}</g>`);
  }
  if (slice === "entry") {
    const x0 = cfg.startAt;
    // the line a northbound rider must follow into the track
    const path = [[0, mid(S.nbLane) - 3.5], [x0 - 26, mid(S.nbLane) - 3.5], [x0 - 6, mid(S.nbTrack)], [LENGTH, mid(S.nbTrack)]];
    body.push(Ln(k.onTop(path, 0.03, P), { tone: "mid", dashed: true }));
    const nose = k.onTop([[x0 - 3, S.nbTrack[0] + 0.2], [x0 + 7, S.nbTrack[0] + 0.2], [x0 + 7, S.nbBuffer[1] + 0.4], [x0 - 3, S.nbBuffer[1] + 0.4]], 0.03, P, true);
    body.push(`<g data-part="nose"><path class="cx-risk" d="${nose}"/>${Ln(nose, { tone: "red" })}</g>`);
  }
  // viewer stands on the east side: paint from the ocean side toward the viewer
  body.push(sortDraw(nearStatic(slice)));
  body.push(`<g data-slot="far"></g>`);
  body.push(sortDraw(bufferItems(S.sbBuffer[0], S.sbBuffer[1], { gaps })));
  body.push(`<g data-slot="lane"></g>`);
  body.push(sortDraw(bufferItems(S.nbBuffer[0], S.nbBuffer[1], slice === "entry" ? { from: cfg.startAt } : {})));
  body.push(`<g data-slot="nb"></g>`);
  body.push(fence());
  return body.join("");
}

const figures = Object.keys(SLICES).map((slice) =>
  `<div class="cx-slice" data-slice="${slice}"${slice === "open" ? "" : " hidden"}>${k.figureSvg({
    width: WIDTH,
    height: HEIGHT,
    label: `${SLICES[slice].name}: an isometric slice of Coast Highway 101 in Cardiff showing the travel lanes, the cycle tracks on both sides with wheel stops and flexible posts, and the walkway. ${SLICES[slice].note}`,
    body: sliceSvg(slice),
  })}</div>`,
).join("");

// ---------- corridor strip (plan view) ----------
const CW = 760, CH = 190, PADX = 24;
const xOf = (pos) => PADX + ((pos - CORRIDOR.from) / (CORRIDOR.to - CORRIDOR.from)) * (CW - PADX * 2);
const ROW = { N: 72, S: 118 };
const sev = (c) => (/Fatal/.test(c.injury) ? "fatal" : /Severe|Serious/.test(c.injury) ? "serious" : "minor");
function corridorSvg() {
  const out = [];
  // landmark bands
  for (const l of CORRIDOR.landmarks) {
    const x0 = xOf(l.at);
    if (l.to) out.push(`<rect class="cx-band"${l.slice ? ` data-goto="${l.slice}" tabindex="0" role="button" aria-label="Show ${SLICES[l.slice].name}"` : ""} x="${x0}" y="44" width="${xOf(l.to) - x0}" height="98" rx="2"/>`);
    else out.push(`<line class="cx-tick" x1="${x0}" y1="44" x2="${x0}" y2="142"/>`);
    if (l.slice && !l.to) out.push(`<rect class="cx-band" data-goto="${l.slice}" tabindex="0" role="button" aria-label="Show ${SLICES[l.slice].name}" x="${x0 - 22}" y="44" width="44" height="98" rx="2"/>`);
    const tx = l.to ? (x0 + xOf(l.to)) / 2 : x0;
    const anchor = l.at === CORRIDOR.from ? "start" : l.at === CORRIDOR.to ? "end" : "middle";
    out.push(`<text class="cx-label" x="${l.at === CORRIDOR.from ? x0 - 2 : l.at === CORRIDOR.to ? x0 + 2 : tx}" y="${l.row === "top" ? 32 : 158}" text-anchor="${anchor}">${l.label}</text>`);
  }
  // road lines
  for (const y of [ROW.N, ROW.S]) out.push(`<line class="cx-road" x1="${xOf(CORRIDOR.from)}" y1="${y}" x2="${xOf(CORRIDOR.to)}" y2="${y}"/>`);
  out.push(`<text class="cx-row" x="${xOf(CORRIDOR.to) + 4}" y="${ROW.N + 3}">NB</text><text class="cx-row" x="${xOf(CORRIDOR.to) + 4}" y="${ROW.S + 3}">SB</text>`);
  out.push(`<text class="cx-label" x="${PADX}" y="178" text-anchor="start">N ← Chesterfield</text><text class="cx-label" x="${CW - PADX}" y="178" text-anchor="end">Solana Beach → S</text>`);
  // crashes (stacked when close)
  const used = {};
  CRASHES.forEach((c) => {
    const row = c.side === "S" || c.side === "W" ? "S" : "N";
    const x = xOf(c.pos);
    const bucket = `${row}${Math.round(x / 9)}`;
    const n = (used[bucket] = (used[bucket] ?? 0) + 1) - 1;
    const y = ROW[row] + (row === "N" ? -1 : 1) * (n * 11 + 9);
    const after = c.date >= "2020-04";
    out.push(`<g class="cx-crash" data-sev="${sev(c)}" data-era="${after ? "after" : "before"}"${c.edge ? " data-edge" : ""} data-id="${c.id}" tabindex="0" role="button" aria-label="${c.date} ${c.injury} crash, ${c.loc}"><line x1="${x}" y1="${ROW[row]}" x2="${x}" y2="${y}"/><circle cx="${x}" cy="${y}" r="${sev(c) === "fatal" ? 5.5 : 4.2}"/></g>`);
  });
  return `<svg class="cx-strip" viewBox="0 0 ${CW} ${CH}" role="group" aria-label="Corridor from Chesterfield Drive to the Solana Beach line with official crash records plotted by block">${out.join("")}</svg>`;
}

// counts for the summary, segment only (edge = at Chesterfield intersection)
const yrs = { before: (Date.parse("2020-04-01") - Date.parse("2016-01-01")) / 3.15576e10, after: (Date.parse("2026-05-31") - Date.parse("2020-04-01")) / 3.15576e10 };
const seg = CRASHES.filter((c) => !c.edge);
const count = (era) => {
  const list = seg.filter((c) => (era === "after") === c.date >= "2020-04");
  return { n: list.length, sev: list.filter((c) => sev(c) !== "minor").length, obj: list.filter((c) => c.hit === "Fixed object").length, per: list.length / yrs[era] };
};
const B = count("before"), A = count("after");

const CSS = `
.cx-risk{fill:var(--anatomy-red);opacity:.28;stroke:none}
.cx-tabs{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 14px}
.cx-tab{font:11px/1 var(--anatomy-mono);letter-spacing:.06em;text-transform:uppercase;padding:8px 10px;border-radius:0;border:1px solid var(--anatomy-lo);background:transparent;color:var(--anatomy-muted);cursor:pointer}
.cx-tab[aria-pressed="true"]{color:var(--anatomy-strong);border-color:var(--anatomy-hi)}
.cx-note{margin:12px 0 0;color:var(--anatomy-text);font-size:13.5px;line-height:1.55;min-height:3.1em}
.cx-where{color:var(--anatomy-muted);font-family:var(--anatomy-mono);font-size:11px;letter-spacing:.04em}
.cx-strip{display:block;width:100%;height:auto;overflow:visible}
.cx-road{stroke:var(--anatomy-mid);stroke-width:1.2}
.cx-tick{stroke:var(--anatomy-lo);stroke-width:1;stroke-dasharray:2 3}
.cx-band{fill:var(--anatomy-shade-3);stroke:none}
.cx-wrap[data-theme="light"] .cx-band{fill:var(--anatomy-shade-1)}
.cx-band[data-goto]{cursor:pointer}
.cx-band[data-goto]:hover,.cx-band[data-goto]:focus-visible{fill:var(--anatomy-shade-0);outline:none}
.cx-band[data-on]{fill:var(--anatomy-shade-0)}
.cx-band[data-goto]{stroke:var(--anatomy-lo);stroke-width:1;stroke-dasharray:2 3}
.cx-label,.cx-row{fill:var(--anatomy-muted);font:10px var(--anatomy-mono);letter-spacing:.03em}
.cx-crash{cursor:pointer;transition:opacity .25s var(--anatomy-ease)}
.cx-crash line{stroke:var(--anatomy-lo);stroke-width:1}
.cx-crash circle{fill:var(--anatomy-card);stroke:var(--anatomy-mid);stroke-width:1.5}
.cx-crash[data-era="after"] circle{fill:var(--anatomy-mid)}
.cx-crash[data-sev="serious"] circle{stroke:var(--anatomy-red)}
.cx-crash[data-sev="serious"][data-era="after"] circle{fill:var(--anatomy-red)}
.cx-crash[data-sev="fatal"] circle{stroke:var(--anatomy-red);stroke-width:3}
.cx-crash[data-sev="fatal"][data-era="after"] circle{fill:var(--anatomy-red)}
.cx-crash[data-edge] circle{stroke-dasharray:2 2}
.cx-crash[data-dim]{opacity:.12}
.cx-crash[data-on] circle{stroke:var(--anatomy-lit);stroke-width:2.5}
.cx-crash:focus-visible{outline:none}.cx-crash:focus-visible circle{stroke:var(--anatomy-lit)}
.cx-era{display:flex;gap:6px;margin:0 0 10px}
.cx-detail{margin-top:10px;font-size:13px;color:var(--anatomy-text);min-height:4.6em;font-variant-numeric:tabular-nums}
.cx-detail b{color:var(--anatomy-strong);font-weight:600}
.cx-stats{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin:16px 0 0}
.cx-stat{border-top:1px solid var(--anatomy-lo);padding-top:8px;font-size:12.5px}
.cx-stat strong{display:block;color:var(--anatomy-strong);font:600 22px/1.2 ui-sans-serif,system-ui;font-variant-numeric:tabular-nums}
.cx-intro h1{color:var(--anatomy-strong);font-size:22px;font-weight:600;margin:0 0 6px;letter-spacing:-.01em}
.cx-intro p{margin:0 0 8px}
.cx-caveats{font-size:12.5px;color:var(--anatomy-muted)}
.cx-caveats li{margin:0 0 4px}
.cx-flag{display:inline-block;font:10px var(--anatomy-mono);letter-spacing:.06em;text-transform:uppercase;color:var(--anatomy-red);border:1px solid var(--anatomy-red);padding:2px 5px;margin-left:6px;vertical-align:1px}
@media (max-width:560px){.cx-stats{grid-template-columns:1fr}}
`;

const tabs = `<div class="cx-tabs" role="group" aria-label="Choose a slice">${Object.entries(SLICES).map(([id, s]) => `<button class="cx-tab" data-tab="${id}" aria-pressed="${id === "open"}">${s.name}</button>`).join("")}</div>`;
const sliceNote = `<p class="cx-note"><span class="cx-where" data-where>${SLICES.open.where}</span><br><span data-note>${SLICES.open.note}</span></p>`;

const plate1 = k.plateHtml({
  fig: "Fig 1",
  title: "Coast Hwy 101 · Cardiff",
  hint: "Pick a slice",
  readout: "",
  keys: [
    { mark: "lit", label: "Rider" },
    { mark: "raised", label: "Wheel stops and flexible posts" },
    { mark: "red", label: "Where the layout traps or crosses the rider" },
  ],
  caption: "Layout drawn to estimated dimensions (track 5 ft, buffer 2 ft, walkway about 3 ft, lanes 12 ft). Every width and position is a placeholder until checked against site photos.",
  body: `${tabs}<div class="iso-stage" tabindex="0" aria-label="Isometric slice of the road; the animation shows how a rider moves through it">${figures}</div>${sliceNote}`,
});

const plate2 = k.plateHtml({
  fig: "Fig 2",
  title: "Official crash records",
  hint: "Tap a dot · tap a shaded zone",
  readout: "",
  keys: [
    { mark: "dim", label: "Hollow: before the track (2016–Mar 2020)" },
    { mark: "raised", label: "Filled: after (Apr 2020 – May 2026)" },
    { mark: "red", label: "Severe, serious or fatal" },
    { mark: "dashed", label: "At the Chesterfield intersection" },
  ],
  caption: "Bicycle crashes in California's crash database (CCRS), placed by block number or by distance from a landmark. Positions are approximate; dots marked as estimated have only a landmark reference.",
  body: `<div class="cx-era" role="group" aria-label="Filter by period"><button class="cx-tab" data-era="all" aria-pressed="true">All</button><button class="cx-tab" data-era="before" aria-pressed="false">Before track</button><button class="cx-tab" data-era="after" aria-pressed="false">After track</button></div>${corridorSvg()}<div class="cx-detail" data-detail aria-live="polite">Tap a dot for the official record.</div>
  <div class="cx-stats"><div class="cx-stat"><strong>${B.n} crashes · ${B.per.toFixed(1)}/yr</strong>Before (Jan 2016 – Mar 2020, ${yrs.before.toFixed(2)} yrs). ${B.sev} severe. ${B.obj} hit a fixed object.</div><div class="cx-stat"><strong>${A.n} crashes · ${A.per.toFixed(1)}/yr</strong>After (Apr 2020 – May 2026, ${yrs.after.toFixed(2)} yrs). ${A.sev} severe, serious or fatal. ${A.obj} hit a fixed object.</div></div>`,
});

const intro = `<header class="cx-intro"><h1>The Cardiff cycle track, Coast Hwy 101</h1><p>Between Chesterfield Drive and Solana Beach, both sides of the highway carry a 5 ft cycle track separated from traffic by wheel stops and flexible posts, installed April 2020. Fig 1 shows the layout a rider moves through; Fig 2 plots every official crash record on the stretch since 2016.</p><span class="cx-flag">Prototype · estimated layout</span></header>`;

const caveats = `<section class="cx-caveats"><p><b>Read with care</b></p><ul>
<li>Solo bicycle crashes are often not reported to the state. Local advocates count 36–42 crashes since 2020 on this stretch; ${A.n} official records were found.</li>
<li>There are no bicycle counts for this stretch before or after 2020, so these are crash counts, not risk per rider.</li>
<li>The March 2024 fatal crash's official primary factor is bicycling under the influence (VC 21200.5); the investigation found no vehicle involved.</li>
<li>2025 records are identified from the crash and injury tables because the 2025 party table is not yet published; 2026 data runs to about May.</li>
</ul></section>`;

const CRASH_JSON = JSON.stringify(Object.fromEntries(CRASHES.map((c) => [c.id, c])));
const NOTES = JSON.stringify(Object.fromEntries(Object.entries(SLICES).map(([id, s]) => [id, { where: s.where, note: s.note, name: s.name }])));

const live = `
const P = ${JSON.stringify(P)};
const S = ${JSON.stringify(S)};
const LENGTH = ${LENGTH};
const GAPS = ${JSON.stringify(SLICES.restaurant.gaps)};
const ENTRY = ${SLICES.entry.startAt};
const CRASHES = ${CRASH_JSON};
const NOTES = ${NOTES};
const K = { extrude, solidSvg, lineSvg, onTop };
const carSvg = ${carSvg.toString()};
const CYCLIST = { "1": ${JSON.stringify(cyclistSvg(1))}, "-1": ${JSON.stringify(cyclistSvg(-1))} };
const WALKER = ${JSON.stringify(walkerSvg())};
const still = matchMedia("(prefers-reduced-motion: reduce)");
const readout = document.querySelectorAll("[data-readout]")[0];
const stage = document.querySelector(".iso-stage");
const mid = (r) => (r[0] + r[1]) / 2;
const ease = (t) => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
let slice = "open", clock = 0, last = 0, frame = 0, visible = true;

function setup(id) {
  slice = id; clock = 0;
  document.querySelectorAll(".cx-slice").forEach((el) => (el.hidden = el.dataset.slice !== id));
  document.querySelectorAll(".cx-tab[data-tab]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tab === id)));
  document.querySelectorAll(".cx-band[data-goto]").forEach((b) => b.toggleAttribute("data-on", b.dataset.goto === id));
  document.querySelector("[data-where]").textContent = NOTES[id].where;
  document.querySelector("[data-note]").textContent = NOTES[id].note;
  const root = document.querySelector('.cx-slice[data-slice="' + id + '"]');
  for (const slot of root.querySelectorAll("[data-slot]")) slot.innerHTML = "";
  const near = root.querySelector('[data-slot="far"]');
  const nb = root.querySelector('[data-slot="nb"]');
  const lane = root.querySelector('[data-slot="lane"]');
  if (id === "open") { near.innerHTML = '<g data-m="walker">' + WALKER + '</g><g data-m="bike">' + CYCLIST["-1"] + '</g>'; }
  if (id === "restaurant") { lane.innerHTML = '<g data-m="car"></g>'; near.innerHTML = '<g data-m="bike">' + CYCLIST["-1"] + '</g>'; }
  if (id === "entry") { nb.innerHTML = '<g data-m="bike">' + CYCLIST["1"] + '</g>'; }
  run();
}
const q = (name) => document.querySelector('.cx-slice[data-slice="' + slice + '"] [data-m="' + name + '"]');
const place = (el, x, y, z = 0) => el && el.setAttribute("transform", translateAlong(P, [x, y, z]));
const say = (t) => { if (readout && readout.textContent !== t) readout.textContent = t; };

function frameOpen(t) {
  // walker drifts south slowly in the track; the rider closes and is stuck behind with no exit
  const T = 11, u = (t % T) / T;
  const wx = 50 - u * 6;
  const free = 125 - u * 120;
  const bx = Math.max(wx + 9, free);
  place(q("walker"), wx, mid(S.sbTrack) + 0.6);
  place(q("bike"), bx, mid(S.sbTrack) - 0.3);
  const gap = bx - wx;
  say(gap < 10 ? "Rider boxed in behind a walker · no exit for " + LENGTH + " ft" : "Rider " + Math.round(gap) + " ft behind a walker in the track");
}
function frameRestaurant(t) {
  // car overtakes the rider in the right lane, then turns right across the track into the lot
  const T = 9, u = t % T;
  const [g0, g1] = GAPS[1]; const gx = (g0 + g1) / 2;
  const lane = mid(S.sbLane2), R = 8, t0 = 4.2, t1 = 5.6, t2 = 7.0;
  let cx, cy, h;
  if (u < t0) { cx = 160 - (160 - (gx + 6)) * ease(u / t0); cy = lane; h = Math.PI; }
  else if (u < t1) { const th = ease((u - t0) / (t1 - t0)) * Math.PI / 2; cx = gx + 6 - R * Math.sin(th); cy = lane + R - R * Math.cos(th); h = Math.PI - th; }
  else { const v = ease((u - t1) / (t2 - t1)); cx = gx + 6 - R; cy = lane + R + v * 18; h = Math.PI / 2; }
  const car = q("car"); const root = document.querySelector('.cx-slice[data-slice="restaurant"]');
  const into = cy > S.sbBuffer[0] - 3 ? root.querySelector('[data-slot="far"]') : root.querySelector('[data-slot="lane"]');
  if (car.parentNode !== into) into.prepend(car);
  car.innerHTML = carSvg(K, P, cx, cy, h, "mid");
  car.style.opacity = Math.min(1, u / 0.4, (T - u) / 0.6);
  const hold = g1 + 3;
  const rider = u < 6.6 ? Math.max(140 - u * 5, hold) : hold - (u - 6.6) * 8;
  place(q("bike"), rider, mid(S.sbTrack));
  const conflict = u > t0 && u < t2 - 0.4;
  root.querySelector('[data-part="conflict"]').style.opacity = conflict ? (0.55 + 0.45 * Math.sin(t * 9)) : 0.35;
  say(u < t0 ? "Driver overtakes the rider in the right lane" : conflict ? "Rider brakes: driver turns right across the track" : "Rider continues once the driveway clears");
}
function frameEntry(t) {
  const T = 8, u = (t % T) / T;
  const x0 = ENTRY;
  const x = -6 + u * 136;
  let y;
  if (x < x0 - 26) y = mid(S.nbLane) - 3.5;
  else if (x < x0 - 6) { const v = ease((x - (x0 - 26)) / 20); y = mid(S.nbLane) - 3.5 + (mid(S.nbTrack) - mid(S.nbLane) + 3.5) * v; }
  else y = mid(S.nbTrack);
  place(q("bike"), x, y);
  const near = Math.abs(x - x0) < 18;
  const nose = document.querySelector('.cx-slice[data-slice="entry"] [data-part="nose"]');
  nose.style.opacity = near ? (0.55 + 0.45 * Math.sin(t * 9)) : 0.4;
  say(x < x0 - 26 ? "Northbound rider in the lane" : x < x0 + 4 ? "Rider must merge into the track before the first wheel stop" : "Rider inside the track, buffer on the left");
}
function draw(t) { if (slice === "open") frameOpen(t); else if (slice === "restaurant") frameRestaurant(t); else frameEntry(t); }
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60; last = now;
  clock += dt; draw(clock);
  frame = visible && !still.matches ? requestAnimationFrame(tick) : 0;
}
function run() { if (still.matches) { draw(slice === "restaurant" ? 5.2 : slice === "open" ? 9 : 3); return; } if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } }
new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (visible) run(); }).observe(stage);
document.querySelectorAll(".cx-tab[data-tab]").forEach((b) => b.addEventListener("click", () => setup(b.dataset.tab)));
document.querySelectorAll(".cx-band[data-goto]").forEach((b) => { const go = () => { setup(b.dataset.goto); stage.scrollIntoView({ behavior: still.matches ? "auto" : "smooth", block: "center" }); }; b.addEventListener("click", go); b.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } }); });

// corridor strip
const detail = document.querySelector("[data-detail]");
const show = (id) => {
  const c = CRASHES[id];
  document.querySelectorAll(".cx-crash").forEach((g) => g.toggleAttribute("data-on", g.dataset.id == id));
  detail.innerHTML = "<b>" + c.date + " · " + c.injury + "</b> · " + c.type + "<br>Struck: " + c.hit + " · Official factor: " + c.cause + "<br>" + c.loc + (c.approx ? " (position estimated)" : "") + " · CCRS #" + c.id;
};
document.querySelectorAll(".cx-crash").forEach((g) => { g.addEventListener("click", () => show(g.dataset.id)); g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); show(g.dataset.id); } }); });
document.querySelectorAll(".cx-tab[data-era]").forEach((b) => b.addEventListener("click", () => {
  document.querySelectorAll(".cx-tab[data-era]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  document.querySelectorAll(".cx-crash").forEach((g) => g.toggleAttribute("data-dim", b.dataset.era !== "all" && g.dataset.era !== b.dataset.era));
}));
setup("open");
`;

const html = k.pageHtml({ title: "Cardiff cycle track", theme, width: 860, body: intro + plate1 + plate2 + caveats, script: kitScript() + live }).replace("</style>", CSS + "</style>");
const file = theme === "light" ? "cardiff-light.html" : "cardiff.html";
writeFileSync(join(HERE, file), html);
console.log("wrote", file, (html.length / 1024).toFixed(0) + " KB", "before", B, "after", A);

// ---------- artifact page (no document skeleton; follows the viewer's theme) ----------
{
  const THEME_CSS = `
:root{--cx-page:#f2f2ef;color-scheme:light}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--cx-page:#0b0b0b;color-scheme:dark}}
:root[data-theme="dark"]{--cx-page:#0b0b0b;color-scheme:dark}
body{background:var(--cx-page);margin:0}
.cx-wrap{padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));padding-block:40px 72px;background:var(--anatomy-page);color:var(--anatomy-text);font:14px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased;min-height:100vh}
.cx-wrap .iso-page{max-width:860px;margin:0 auto}
`;
  const themeScript = `
const wrap = document.querySelector(".cx-wrap");
const pick = () => { const t = document.documentElement.getAttribute("data-theme"); wrap.setAttribute("data-theme", t === "light" || t === "dark" ? t : (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")); };
pick();
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", pick);
new MutationObserver(pick).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
`;
  const page = `<title>Cardiff Cycle Track</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>${k.ISO_CSS}${THEME_CSS}${CSS}</style>
<div class="cx-wrap iso" data-theme="light"><main class="iso-page">${intro + plate1 + plate2 + caveats}</main></div>
<script type="module">${(themeScript + kitScript() + live).replace(/<\/(script)/gi, "<\\/$1")}</script>`;
  writeFileSync(join(HERE, "cardiff-artifact.html"), page);
  console.log("wrote cardiff-artifact.html");
}
