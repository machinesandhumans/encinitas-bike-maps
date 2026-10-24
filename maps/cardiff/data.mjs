// Geometry of Coast Hwy 101, Cardiff, straightened along the road.
// Source: OpenStreetMap (api.openstreetmap.org), pulled 2026-10-23.
// s = metres north along the road centreline from a point ~240 m south of the Encinitas/Solana Beach line.
// d = metres from the centreline, positive WEST (ocean side), negative EAST (lagoon / rail side).

export const RANGE = { south: 150, north: 2330 };

import { CITY_LINE } from "./layout.mjs";
export const LIMITS = { cityLine: CITY_LINE, chesterfield: 2287 };

// Tracks, bridge, city line, buildings, lots and driveways come from OpenStreetMap plus field edits (see osm-layout.mjs).
export { NB_TRACK, SB_TRACK, BRIDGES, UNLIT, BUILDINGS, LOTS, DRIVES } from "./layout.mjs";



// Edge of the sand (coastline) and the rail line, sampled every ~25 m: [s, d]
export const COAST = [[150, 240], [250, 217], [300, 178], [350, 153], [400, 135], [425, 127], [450, 113], [525, 88], [600, 70], [625, 63], [675, 62], [700, 64], [725, 64], [825, 49], [875, 52], [900, 53], [925, 52], [1000, 53], [1175, 58], [1200, 53], [1225, 52], [1325, 53], [1350, 52], [1375, 55], [1400, 56], [1550, 77], [1575, 77], [1650, 90], [1725, 91], [1750, 94], [1825, 96], [1900, 132], [1950, 150], [1975, 177], [2250, 174], [2330, 174]];
export const RAIL = [[150, -130], [250, -152], [425, -193], [600, -200], [850, -173], [950, -163], [1250, -150], [1400, -142], [1500, -125], [1600, -103], [1700, -96], [1825, -78], [1925, -69], [2275, -40], [2330, -40]];

export const POIS = [["Chesterfield Dr", 2287, -14], ["Encinitas / Solana Beach line", CITY_LINE, -12], ["Cardiff State Beach (south lot)", 330, 60], ["Las Olas", 1342, -35], ["Tower 13", 1392, -28], ["Ki's", 1465, -36], ["Chart House", 1490, 33], ["The Kraken", 1599, -31], ["Pacific Coast Grill", 1631, 34], ["Cardiff State Beach (north lot)", 1777, 28], ["Lagoon outlet bridge", 1926, -20], ["Cardiff Kook", 2269, 19]];

// Address anchors for placing crash reports given by street number (address -> s)
export const ADDRESS = [[2526, 1633], [2588, 1494], [2591, 1465], [2655, 1342]];
