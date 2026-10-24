# Encinitas Bike Infrastructure Maps — Project Brief

Last updated: October 24, 2026

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
Cardiff corridor: https://claude.ai/artifact/JL5C7n5MbsNgWLnG86go3N (shared: anyone with the link; republished Oct 24, 2026 from the current repo build)
GitHub Pages: https://machinesandhumans.github.io/encinitas-bike-maps/cardiff/ (live; updates on every push)

What it does: whole 1.27-mile stretch in isometric view; before/after toggle; ride north / ride south; minimap with every crash; tap a pin for the official record.

## Key facts and decisions so far
- **Geometry** comes from OpenStreetMap (pulled Oct 23, 2026), straightened along the road. Tracks, driveways, bridge, lots and buildings are real; wheel-stop/post spacing and the pre-2020 layout are estimates.
- **Crash data** is California's CCRS (CHP + SD Sheriff), 2016 to about May 2026. 2025 rider-direction details are not yet published.
- **Cardiff official counts:** before 4 crashes in 4.25 yrs (0.9/yr); after 11 in 6.16 yrs (1.8/yr). After: 6 hit a fixed object (4 SB, 2 NB); 3 NB involved a car or pedestrian.
- **Direction split, after:** 5 NB, 4 SB, 1 crossing, 1 unknown.
- **March 2024 fatality:** official record says 2700 block, no coordinates, primary factor bicycling under the influence (VC 21200.5). By street number that places it near the beach lot south of Las Olas. User believes it was at the south entrance of the NB track. **Unresolved — needs a source before publishing.**
- Advocates count 36–42 crashes since 2020 (Facebook group "Encinitas: Please Restore Safe Cycling", facebook.com/groups/556935515245051). Not yet obtained.
- Santa Fe: state SB 114 (signed Sep 18, 2026) blocks removing the protected lanes for 5 years after completion.

## Accuracy work (Oct 24, 2026)
- Lagoon outlet bridge now drawn: water channel under the road, edged deck, solid parapets, labels.
- Satellite review page: `node maps/cardiff/review.mjs` writes `docs/cardiff/review.html`. It puts the map's drawn layout back on real coordinates (aligned on the 101 lagoon bridge) over Esri imagery, with raw OSM layers and a notes tool. Imagery is blocked inside Claude artifacts, so open it from GitHub Pages or as a local file. OSM data with coordinates: `data/osm/cardiff-osm.json` (fetched Oct 24, 2026 via `tools/fetch-osm.mjs` on Mark's computer; the cloud environment blocks openstreetmap.org). First check: the map's city line sits 22 m north of OSM's boundary.
- Mark has a local project folder: D:\Projects\Encinitas Bike Maps.
- Mark judged OpenStreetMap's bike paths more accurate than the earlier hand-simplified tracks, so both tracks, the lagoon bridge (now 60 m, 1896–1956) and the Solana Beach city line (s 219, was 241) are now generated from OSM: `node maps/cardiff/osm-tracks.mjs` writes `maps/cardiff/tracks.mjs`. `maps/cardiff/geo.mjs` holds the shared OSM/straightened-road frame. OSM joins the track ends to the road centreline; those ends are moved to the curb lane. Driveways, lots, buildings and crash positions are still the earlier estimates (within ~10 m).
- Mark's satellite review notes (data/field/cardiff-review-notes-2026-10-24.json) set the south ends: NB separation starts at s 287 (33.001891, -117.276737), SB separation ends at s 245 (33.001484, -117.276654). OSM's diagonal connectors to the centreline there are not real paths. His other notes confirmed OSM's track lines over the old drawing.
- Buildings, parking lots and driveways now also come from OSM (`node maps/cardiff/osm-layout.mjs` writes `maps/cardiff/layout.mjs`; it replaced osm-tracks.mjs/tracks.mjs). Buildings are real outlines; driveways are curb-cut stretches [s0, s1, side, name, id], 8 m wide by default. OSM lacks some driveways the old map had (e.g. around Ki's/Plastino and the west-side restaurant lots).
- Field edits: the satellite review page has Move buildings / Mark driveway tools; Mark copies the edits and pastes them in chat. Save them to `data/field/cardiff-edits.json`, then rerun osm-layout.mjs, build.mjs and review.mjs.
- Field walk mode (review page): GPS dot, crosshair and typed marks (driveway start/end, bollard, post, wheel stop, barrier start/end, sign, curb gap, hazard, photo). Meant for GitHub Pages on a phone (geolocation and imagery need https and are blocked in Claude artifacts). "Send everything" shares marks, notes and edits as text for the chat.
- OSM shows the SB path continuing north of Chesterfield on the west side (to about s 2600); the map still starts the SB track at the Chesterfield signal.
- Mark says the south and north track entrances/exits don't match how the path works. Waiting on his ride-through description before redrawing them.

## Open items
1. Confirm location of the March 2024 fatal crash.
2. Get the advocate crash list (date, location, what was hit) for a separate, labeled layer.
3. Site photos: each end of the barrier lines, Ki's / Tower 13 driveways, south NB entrance; rough widths of track and walkway.
4. Pre-2020 layout (2019 Street View) to make the "before" view accurate.
5. Build corridors 2–4 on the same template.
6. Mark's field walk (GitHub Pages review page): driveways, bollards, posts, barrier ends; and where the SB track starts at the north end (Chesterfield signal or further north). South entrance/exit already set from his satellite notes.

## Where things live
- Repository: github.com/machinesandhumans/encinitas-bike-maps (see README for folder layout)
- Rebuild the Cardiff map: `node maps/cardiff/build.mjs` (writes `docs/cardiff/index.html` for GitHub Pages and `maps/cardiff/cardiff-corridor.html` for the Claude artifact)
- Crash data: `data/ccrs/`
