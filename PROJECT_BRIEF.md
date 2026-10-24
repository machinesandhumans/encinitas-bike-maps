# Encinitas Bike Infrastructure Maps — Project Brief

Last updated: October 23, 2026

## Goal
Interactive, spatially accurate maps of four Encinitas road projects, showing where the layout narrows riders' options (barriers, blind spots, driveway crossings, entries and exits) and where official crashes happened, before and after each change. The maps must stay objective: official data kept separate from advocate reports, and gaps stated openly.

## The four corridors
| # | Corridor | Change | Status of map |
|---|---|---|---|
| 1 | Coast Hwy 101, Cardiff (Chesterfield Dr to Solana Beach line) | Class IV cycle track with wheel stops and flexible posts, April 2020 | **Live prototype** |
| 2 | Santa Fe Dr, west phase (I-5 to Evergreen / Bonita) | Raised and planter-protected lanes, back-in parking, 2024–Apr 2025 | Not started |
| 3 | Coast Hwy 101, Leucadia Streetscape | Road diet, roundabouts at Grandview and Jupiter, bike lanes; Segment C under construction since Mar 2024 | Not started |
| 4 | Quail Gardens Dr | Mini-roundabout at Ecke Ranch Rd, restriping, completed Sep 2025 | Not started |

## Live map
Cardiff corridor: https://claude.ai/artifact/JL5C7n5MbsNgWLnG86go3N (shared: anyone with the link)

What it does: whole 1.27-mile stretch in isometric view; before/after toggle; ride north / ride south; minimap with every crash; tap a pin for the official record.

## Key facts and decisions so far
- **Geometry** comes from OpenStreetMap (pulled Oct 23, 2026), straightened along the road. Tracks, driveways, bridge, lots and buildings are real; wheel-stop/post spacing and the pre-2020 layout are estimates.
- **Crash data** is California's CCRS (CHP + SD Sheriff), 2016 to about May 2026. 2025 rider-direction details are not yet published.
- **Cardiff official counts:** before 4 crashes in 4.25 yrs (0.9/yr); after 11 in 6.16 yrs (1.8/yr). After: 6 hit a fixed object (4 SB, 2 NB); 3 NB involved a car or pedestrian.
- **Direction split, after:** 5 NB, 4 SB, 1 crossing, 1 unknown.
- **March 2024 fatality:** official record says 2700 block, no coordinates, primary factor bicycling under the influence (VC 21200.5). By street number that places it near the beach lot south of Las Olas. User believes it was at the south entrance of the NB track. **Unresolved — needs a source before publishing.**
- Advocates count 36–42 crashes since 2020 (Facebook group "Encinitas: Please Restore Safe Cycling", facebook.com/groups/556935515245051). Not yet obtained.
- Santa Fe: state SB 114 (signed Sep 18, 2026) blocks removing the protected lanes for 5 years after completion.

## Open items
1. Confirm location of the March 2024 fatal crash.
2. Get the advocate crash list (date, location, what was hit) for a separate, labeled layer.
3. Site photos: each end of the barrier lines, Ki's / Tower 13 driveways, south NB entrance; rough widths of track and walkway.
4. Pre-2020 layout (2019 Street View) to make the "before" view accurate.
5. Build corridors 2–4 on the same template.
6. Decide permanent hosting (current: Claude artifact; option: GitHub Pages).

## Files in the bundle
- `cardiff2/` — current map: `data.mjs` (road geometry), `crashes.mjs` (crash records and placement), `app.js` (interactive view), `build.mjs` (builds the page). Rebuild with `node build.mjs`; requires the anatomy kit (github.com/wheresryan22/anatomy) in `../../vendor/anatomy`.
- `cardiff/` — first prototype (three slices), superseded.
- `encinitas_crash_data/` — CCRS extracts by corridor plus citywide yearly counts, with methods notes.
