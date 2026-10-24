// Cardiff Coast Hwy 101 cycle track: every dimension and position the figure uses.
// Units are feet. EVERY value marked est is an estimate to be corrected from site photos/measurements.

// Cross-section, measured across the road from the east (lagoon / rail) edge, y = 0, toward the ocean.
export const SECTION = {
  eastShoulder: [-9, 0], // est: scrub / embankment beside the rail corridor
  nbTrack: [0, 5], // est: northbound cycle track width
  nbBuffer: [5, 7], // est: wheel stops + flexible bollards
  nbLane: [7, 19], // est: northbound travel lane (sharrow)
  centre: [19, 20], // double yellow
  sbLane1: [20, 32], // est: southbound lane 1
  sbLane2: [32, 44], // est: southbound lane 2 (sharrow), reinstated 2020
  sbBuffer: [44, 46], // est: wheel stops + flexible bollards
  sbTrack: [46, 51], // est: southbound cycle track width
  walkway: [51, 54], // reported about 3 ft wide, sandy
  beach: [54, 66], // sand / beach edge
};

export const LENGTH = 120; // length of each slice drawn, ft

// Buffer pattern (est): a wheel stop, then a flexible post, repeating.
export const BUFFER = { period: 20, stopLength: 6, stopWidth: 0.8, stopHeight: 0.5, postAt: 13, postR: 0.22, postH: 3.2 };

// The three slices. Positions along the slice, ft.
export const SLICES = {
  open: {
    name: "Open stretch",
    where: "Typical stretch between beach lots",
    gaps: [], // no openings in the buffer within the slice
    note: "A rider in the 5 ft track has the wheel-stop line on one side and the sandy walkway edge on the other. Nothing in the 120 ft shown lets a rider leave the track if a walker, dog or surfboard is in it.",
  },
  restaurant: {
    name: "Restaurant Row",
    where: "2500–2600 block, west side",
    gaps: [[48, 70], [94, 114]], // est: driveway openings
    note: "Southbound drivers turning right into the lots cross the cycle track at each driveway. The wheel stops and posts stop at the driveway, and parked or queued cars can hide a rider coming along the track.",
  },
  entry: {
    name: "Track entry, 2700 block NB",
    where: "Northbound, where the curb line begins",
    startAt: 62, // est: where the northbound wheel-stop line begins
    note: "Northbound riders join the track where the wheel-stop line begins. At night the first wheel stop is low and unlit. The March 2024 fatal crash was a northbound solo crash in the 2700 block.",
  },
};

// Corridor, Chesterfield Dr (north) to the Solana Beach line (south). Positions as street-address blocks.
// ft per address unit is an estimate from the corridor length (~1.3 mi over ~1200 address units).
export const CORRIDOR = {
  from: 2000, // est: Chesterfield Dr
  to: 3200, // est: Solana Beach city line
  ftPerUnit: 5.7,
  installed: "2020-04",
  landmarks: [
    { at: 2000, label: "Chesterfield Dr", row: "bottom" },
    { at: 2100, to: 2450, label: "San Elijo State Beach (est)", row: "top" },
    { at: 2500, to: 2660, label: "Restaurant Row (est)", slice: "restaurant", row: "top" },
    { at: 2700, label: "Cardiff State Beach (est)", slice: "entry", row: "bottom" },
    { at: 2900, to: 3050, label: "Seaside (est)", slice: "open", row: "top" },
    { at: 3200, label: "Solana Beach line (est)", row: "bottom" },
  ],
};

// Official crash records (CCRS, CHP / SD Sheriff). pos = address position along the corridor.
// side: SB / NB from the bike's direction of travel (S = southbound, N = northbound).
export const CRASHES = [
  { id: 3442993, date: "2018-08-06", pos: 2014, side: "S", type: "Sideswipe by motor vehicle", hit: "Motor vehicle", injury: "Minor", cause: "Dooring (VC 22517)", loc: "80 ft S of Chesterfield Dr" },
  { id: 3500100, date: "2018-11-02", pos: 2950, side: "S", type: "Sideswipe by motor vehicle", hit: "Motor vehicle", injury: "Minor", cause: "Dooring (VC 22517)", loc: "Seaside State Beach entrance", approx: true },
  { id: 3100902, date: "2019-02-11", pos: 2526, side: "N", type: "Rear end", hit: "Motor vehicle", injury: "Minor", cause: "Passing on the right (VC 21755)", loc: "2526 S Coast Hwy" },
  { id: 3178754, date: "2019-07-07", pos: 2550, side: "N", type: "Hit parked car", hit: "Parked vehicle", injury: "Severe", cause: "Unsafe speed (VC 22350)", loc: "2500 block" },
  { id: 2947134, date: "2020-04-22", pos: 2798, side: "S", type: "Hit object", hit: "Fixed object", injury: "Minor", cause: "Not recorded", loc: "815 ft S of Las Olas", approx: true },
  { id: 2944450, date: "2020-04-29", pos: 2655, side: "S", type: "Hit object", hit: "Fixed object", injury: "Minor", cause: "Unsafe speed (VC 22350)", loc: "2655 S Coast Hwy" },
  { id: 2873756, date: "2021-10-05", pos: 2600, side: "N", type: "Sideswipe", hit: "Motor vehicle", injury: "Complaint of pain", cause: "Unsafe speed (VC 22350)", loc: "2600 block" },
  { id: 2873754, date: "2021-10-09", pos: 2657, side: "S", type: "Hit object", hit: "Fixed object", injury: "Minor", cause: "Unsafe turn/lane change (VC 22107)", loc: "244 ft N of Cardiff State Beach", approx: true },
  { id: 2627295, date: "2022-01-14", pos: 2950, side: "S", type: "Overturned", hit: "Fixed object", injury: "Minor", cause: "Not recorded", loc: "Seaside State Beach", approx: true },
  { id: 2621885, date: "2022-02-10", pos: 2330, side: "E", type: "Broadside by motor vehicle", hit: "Motor vehicle", injury: "Severe", cause: "Unsafe turn/lane change (VC 22107)", loc: "Ref. San Elijo, 2460 ft N (location unclear)", approx: true },
  { id: 2686951, date: "2022-08-27", pos: 2850, side: "N", type: "Rear end", hit: "Pedestrian", injury: "Severe", cause: "Unsafe speed (VC 22350)", loc: "2800 block" },
  { id: 4622805, date: "2024-03-17", pos: 2750, side: "N", type: "Hit object (solo)", hit: "Fixed object", injury: "Fatal", cause: "Bicycling under the influence (VC 21200.5)", loc: "2700 block, dark, no street lights" },
  { id: 4620213, date: "2024-06-06", pos: 2593, side: "N", type: "Hit object", hit: "Fixed object", injury: "Possible", cause: "Unsafe turn/lane change (VC 22107)", loc: "2591 S Coast Hwy" },
  { id: 5149019, date: "2024-11-30", pos: 2374, side: "N", type: "Other", hit: "Motor vehicle", injury: "Minor", cause: "Unsafe speed (VC 22350)", loc: "2131 ft S of Chesterfield Dr" },
  { id: 5059513, date: "2025-09-29", pos: 2777, side: "S", type: "Broadside by motor vehicle", hit: "Motor vehicle", injury: "Serious", cause: "Unsafe turn/lane change (VC 22107)", loc: "440 ft S of Cardiff State Beach", approx: true },
  // At the Chesterfield Dr intersection itself (the north end of the segment): shown, but kept out of the segment counts.
  { id: 3928776, date: "2016-08-05", pos: 2000, side: "N", type: "Hit parked car", hit: "Parked vehicle", injury: "Severe", cause: "Lane straddling (VC 21658)", loc: "At Chesterfield Dr", edge: true },
  { id: 3309937, date: "2018-02-14", pos: 2000, side: "W", type: "Broadside by motor vehicle", hit: "Motor vehicle", injury: "Minor", cause: "Stop sign (VC 22450)", loc: "At Chesterfield Dr", edge: true },
  { id: 3111681, date: "2019-03-13", pos: 2000, side: "N", type: "Broadside by motor vehicle", hit: "Motor vehicle", injury: "Complaint of pain", cause: "Unsafe turn/lane change (VC 22107)", loc: "At Chesterfield Dr", edge: true },
  { id: 5256340, date: "2025-05-25", pos: 2000, side: "?", type: "Rear end by motor vehicle", hit: "Motor vehicle", injury: "Serious", cause: "Following too closely (VC 21703)", loc: "At Chesterfield Dr (filed twice; counted once)", edge: true },
];
