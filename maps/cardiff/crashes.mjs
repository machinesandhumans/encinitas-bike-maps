// Official bicycle crash records (CCRS) on Coast Hwy 101 between Chesterfield Dr and the Solana Beach line.
// Placement: addr = street number (converted with the ADDRESS anchors), s = metres directly, ref + ft = offset from a landmark.
// side: NB / SB = direction the rider was travelling. approx: the record only names a landmark, position is estimated.
export const CRASHES = [
  // Before the cycle track (2016 - Mar 2020)
  { id: 3442993, date: "2018-08-06", side: "SB", s: 2263, hit: "Car door", injury: "Minor", factor: "Dooring (VC 22517)", where: "80 ft south of Chesterfield Dr" },
  { id: 3500100, date: "2018-11-02", side: "SB", s: 431, hit: "Car door", injury: "Minor", factor: "Dooring (VC 22517)", where: "Seaside / south lot entrance", approx: true },
  { id: 3100902, date: "2019-02-11", side: "NB", addr: 2526, hit: "Car (rear end)", injury: "Minor", factor: "Passing on the right (VC 21755)", where: "2526 S Coast Hwy" },
  { id: 3178754, date: "2019-07-07", side: "NB", addr: 2550, hit: "Parked car", injury: "Severe", factor: "Unsafe speed (VC 22350)", where: "2500 block" },
  // After (Apr 2020 onward)
  { id: 2947134, date: "2020-04-22", side: "SB", s: 1094, hit: "Fixed object", injury: "Minor", factor: "Not recorded", where: "815 ft south of Las Olas" },
  { id: 2944450, date: "2020-04-29", side: "SB", addr: 2655, hit: "Fixed object", injury: "Minor", factor: "Unsafe speed (VC 22350)", where: "2655 S Coast Hwy" },
  { id: 2873756, date: "2021-10-05", side: "NB", addr: 2650, hit: "Car (sideswipe)", injury: "Complaint of pain", factor: "Unsafe speed (VC 22350)", where: "2600 block" },
  { id: 2873754, date: "2021-10-09", side: "SB", s: 1733, hit: "Fixed object", injury: "Minor", factor: "Unsafe turn / lane change (VC 22107)", where: "244 ft north of Cardiff State Beach", approx: true },
  { id: 2627295, date: "2022-01-14", side: "SB", s: 431, hit: "Fixed object (overturned)", injury: "Minor", factor: "Not recorded", where: "Seaside State Beach", approx: true },
  { id: 2686951, date: "2022-08-27", side: "NB", addr: 2850, hit: "Pedestrian", injury: "Severe", factor: "Unsafe speed (VC 22350)", where: "2800 block" },
  { id: 4622805, date: "2024-03-17", side: "NB", addr: 2750, hit: "Fixed object (solo)", injury: "Fatal", factor: "Bicycling under the influence (VC 21200.5)", where: "2700 block, dark, no street lights" },
  { id: 4620213, date: "2024-06-06", side: "NB", addr: 2591, hit: "Fixed object", injury: "Possible", factor: "Unsafe turn / lane change (VC 22107)", where: "2591 S Coast Hwy (Ki's)" },
  { id: 5149019, date: "2024-11-30", side: "NB", s: 1637, hit: "Car", injury: "Minor", factor: "Unsafe speed (VC 22350)", where: "2131 ft south of Chesterfield Dr" },
  { id: 5059513, date: "2025-09-29", side: "SB", s: 1525, hit: "Car (broadside)", injury: "Serious", factor: "Unsafe turn / lane change (VC 22107)", where: "440 ft south of Cardiff State Beach", approx: true, dirUnknown: true },
  { id: 2621885, date: "2022-02-10", side: "SB", dirText: "Eastbound (crossing)", s: null, hit: "Car (broadside)", injury: "Severe", factor: "Unsafe turn / lane change (VC 22107)", where: "Reference 'San Elijo, 2460 ft N' (location unclear)" },
  // At the Chesterfield Dr intersection (north end)
  { id: 3928776, date: "2016-08-05", side: "NB", s: 2287, hit: "Parked car", injury: "Severe", factor: "Lane straddling (VC 21658)", where: "At Chesterfield Dr", edge: true },
  { id: 3309937, date: "2018-02-14", side: "SB", dirText: "Westbound (crossing)", s: 2287, hit: "Car (broadside)", injury: "Minor", factor: "Stop sign (VC 22450)", where: "At Chesterfield Dr", edge: true },
  { id: 3111681, date: "2019-03-13", side: "NB", s: 2287, hit: "Car (broadside)", injury: "Complaint of pain", factor: "Unsafe turn / lane change (VC 22107)", where: "At Chesterfield Dr", edge: true },
  { id: 5256340, date: "2025-05-25", side: "NB", s: 2287, hit: "Car (rear end)", injury: "Serious", factor: "Following too closely (VC 21703)", where: "At Chesterfield Dr (filed twice)", edge: true, dirUnknown: true },
];
