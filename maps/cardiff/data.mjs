// Geometry of Coast Hwy 101, Cardiff, straightened along the road.
// Source: OpenStreetMap (api.openstreetmap.org), pulled 2026-10-23.
// s = metres north along the road centreline from a point ~240 m south of the Encinitas/Solana Beach line.
// d = metres from the centreline, positive WEST (ocean side), negative EAST (lagoon / rail side).

export const RANGE = { south: 150, north: 2330 };

export const LIMITS = { cityLine: 241, chesterfield: 2287 };

// Northbound cycle track centreline (east side). It leaves the roadway at the south end at s 231.
export const NB_TRACK = [[231, 0.5], [264, -8.5], [309, -9.5], [424.5, -8], [684, -9.5], [1072, -7.5], [1444.5, -7.5], [1587, -10.5], [1752.5, -10], [1885, -7.5], [1910, -8], [1941.5, -7.5], [2189, 0]];
// Southbound cycle track centreline (west side), listed north to south. South exit (s 428 -> 231) is mapped unlit.
export const SB_TRACK = [[2287.5, 11.5], [1967, 12.5], [1946.5, 10], [1913.5, 9], [1883, 9], [1677, 11.5], [1637.5, 11], [1586, 11.5], [1521.5, 10.5], [1461.5, 12], [1430, 11.5], [1420, 15], [1289, 12.5], [1083, 12.5], [1074.5, 9.5], [1037, 10], [966, 10], [915, 8], [818.5, 8.5], [434, 13], [428, 13], [267.5, 11.5], [231, 0.5]];
export const BRIDGES = [[1910, 1942]]; // both tracks cross the lagoon outlet on bridges here
export const UNLIT = [[231, 428]]; // OSM tags the southbound exit lit=no

// Driveways and side streets meeting the highway: [s, side, name]
export const DRIVES = [[428, "W", "Cardiff State Beach (south lot)"], [434, "W", "Cardiff State Beach (south lot)"], [1332, "E", "Las Olas lot"], [1364, "E", "Las Olas lot"], [1410, "E", "Tower 13"], [1445, "E", "Tower 13 / Ki's"], [1461, "W", "Chart House lot"], [1501, "E", "Ki's lot"], [1520, "E", "Ki's / Plastino lot"], [1531, "W", "Chart House lot"], [1549, "W", "Restaurant lot"], [1581, "W", "Restaurant lot"], [1585, "W", "Restaurant lot"], [1617, "E", "The Kraken"], [1629, "W", "Pacific Coast Grill"], [1659, "W", "Cardiff State Beach (north lot)"], [2262, "E", "Chesterfield Dr"], [2276, "E", "Chesterfield Dr"]];

// Buildings (b) and parking (p) as boxes: [kind, s0, s1, d0, d1, name]
export const BOXES = [["p", 243, 413, 19, 136, "Cardiff State Beach (south lot)"], ["b", 416, 419, 51, 54, "Fee booth"], ["b", 282, 295, 32, 43, ""], ["p", 1349, 1380, -66, -12, ""], ["b", 1335, 1351, -47, -22, "Las Olas"], ["b", 1382, 1402, -44, -12, "Tower 13"], ["b", 1417, 1447, -44, -24, ""], ["b", 1452, 1477, -46, -26, "Ki's"], ["b", 1519, 1588, -47, -24, ""], ["b", 1591, 1607, -43, -18, "The Kraken"], ["b", 1472, 1509, 21, 46, "Chart House"], ["b", 1507, 1517, -39, -20, ""], ["p", 1540, 1603, 13, 48, ""], ["p", 1453, 1560, -62, -14, ""], ["p", 1508, 1542, 13, 47, ""], ["p", 1453, 1473, 13, 46, ""], ["p", 1244, 1351, -62, -10, ""], ["p", 1414, 1449, -24, -13, ""], ["p", 1401, 1413, -44, -13, ""], ["b", 1611, 1652, 16, 52, "Pacific Coast Grill"], ["b", 1579, 1615, 19, 48, ""], ["b", 1461, 1471, -26, -19, ""], ["p", 1699, 1855, 16, 40, "Cardiff State Beach (north lot)"], ["b", 2077, 2090, 54, 67, ""], ["b", 2229, 2240, 57, 67, ""], ["b", 2083, 2110, 67, 90, "Lifeguards"], ["b", 2073, 2082, 86, 95, ""]];

// Edge of the sand (coastline) and the rail line, sampled every ~25 m: [s, d]
export const COAST = [[150, 240], [250, 217], [300, 178], [350, 153], [400, 135], [425, 127], [450, 113], [525, 88], [600, 70], [625, 63], [675, 62], [700, 64], [725, 64], [825, 49], [875, 52], [900, 53], [925, 52], [1000, 53], [1175, 58], [1200, 53], [1225, 52], [1325, 53], [1350, 52], [1375, 55], [1400, 56], [1550, 77], [1575, 77], [1650, 90], [1725, 91], [1750, 94], [1825, 96], [1900, 132], [1950, 150], [1975, 177], [2250, 174], [2330, 174]];
export const RAIL = [[150, -130], [250, -152], [425, -193], [600, -200], [850, -173], [950, -163], [1250, -150], [1400, -142], [1500, -125], [1600, -103], [1700, -96], [1825, -78], [1925, -69], [2275, -40], [2330, -40]];

export const POIS = [["Chesterfield Dr", 2287, -14], ["Encinitas / Solana Beach line", 241, -12], ["Cardiff State Beach (south lot)", 330, 60], ["Las Olas", 1342, -35], ["Tower 13", 1392, -28], ["Ki's", 1465, -36], ["Chart House", 1490, 33], ["The Kraken", 1599, -31], ["Pacific Coast Grill", 1631, 34], ["Cardiff State Beach (north lot)", 1777, 28], ["Lagoon outlet bridge", 1926, -20], ["Cardiff Kook", 2269, 19]];

// Address anchors for placing crash reports given by street number (address -> s)
export const ADDRESS = [[2526, 1633], [2588, 1494], [2591, 1465], [2655, 1342]];
