# Encinitas Bike Infrastructure Maps — Project Brief

Last updated: October 26, 2026

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
- Rider-report layer (2026-10-26): Serge Issakov's crowdsourced Cardiff 101 Crash List (data/advocate/cardiff-101-crash-list.json, 40 entries Apr 2020–Apr 2026) drawn as purple pins, separate from official CCRS pins, after view only, toggleable. 23 placed approximately, 14 no location (not shown), 3 match an official record (official pin shows 'also on the rider list'). Ride north/south animation removed at Mark's request. Rider reports placed at the same landmark (e.g. three at the south end) are fanned 5 m apart in the scene so each pin shows; the minimap stacks them. The 3D scene draws ground, road and features out to every corner of its frame (Mark: no blank areas). Minimap shows sand bands and labels for Seaside (lot s 251–423) and Cardiff State Beach (north lot s 1710–1866).
- Field walk mode (review page): GPS dot, crosshair and typed marks (driveway start/end, bollard, post, wheel stop, barrier start/end, sign, curb gap, hazard, photo). Meant for GitHub Pages on a phone (geolocation and imagery need https and are blocked in Claude artifacts). "Send everything" shares marks, notes and edits as text for the chat. The crosshair follows GPS until the map is dragged; each mark stores the crosshair, the GPS fix and the time.
- Esri pass (2026-10-26, approved by Mark): crosswalks, the Seaside / Cardiff State Beach north lot / Chesterfield entrances, the parked-car rows beside the SB path (s 1098-1356, 1371-1433, campground 1983-2197; a "Parked cars" button turns them off), the places drivers cross the bike lane (Seaside right-turn merge s 515-552, Cardiff Reef approach s 1684-1745, Chesterfield right-turn lane s 2165-2200) and the red curb by the Kraken were traced on Esri World Imagery (Vantor, captured 2026-01-10, 0.34 m) and are now on the map: `data/field/cardiff-features-esri.json`. The three big entrances are drawn joined to the road edge. Esri, OSM crossings and the USGS 3DEP lidar bridge abutments agree within ~1 m. Track fixes applied in osm-layout.mjs: the NB track no longer merges into the road at s 2200 (it becomes a bike lane between the through and right-turn lanes to the stop bar at s 2268; no posts after s 2165), and the SB path at s 1100-1435 moved ~2 m west. Elevation strip under the overview from USGS 3DEP (`data/elevation/cardiff-101-profile.json`; bridge span interpolated). Not confirmed on Esri: Seaside bollards, faint dashed green at restaurant row and the campground bus stop. Google screenshots were used only for checking and are kept out of the repo.
- Track widths (2026-10-26): riding width from curb/parapet to the post line, read on Esri every 25-50 m (about +/-0.5 m), is in `cardiff-features-esri.json` (track_widths) and the map draws each track at that width. Tightest: SB at Cardiff Reef s 1748-1795 (~2.1 m), NB from Cardiff Reef across the bridge s 1640-1960 (~2.4 m), both south ends (~2.3 m); widest along the lagoon (~3-3.5 m). Mark: no pinch-point labels; keep the map straightened (crash position along the strip matters most). Chesterfield NB approach now drawn at its real width (right-turn lanes) and the Tower 13 jog smoothed.
- Network for cloud sessions: Esri World Imagery (server/services.arcgisonline.com) and USGS 3DEP (elevation.nationalmap.gov) work. Esri Wayback (wayback.maptiles.arcgis.com, metadata.maptiles.arcgis.com) is still blocked; needed to date when the green lanes went in.
- OSM shows the SB path continuing north of Chesterfield on the west side (to about s 2600); the map still starts the SB track at the Chesterfield signal.
- Mark says the south and north track entrances/exits don't match how the path works. Waiting on his ride-through description before redrawing them.

## Open items
1. Confirm location of the March 2024 fatal crash.
2. Get the advocate crash list (date, location, what was hit) for a separate, labeled layer.
3. Site photos: each end of the barrier lines, Ki's / Tower 13 driveways, south NB entrance; rough widths of track and walkway.
4. Pre-2020 layout (2019 Street View) to make the "before" view accurate. Esri Wayback dates would also date the green-lane install once the two Wayback hosts are allowed.
5. Build corridors 2–4 on the same template.
6. Mark's field walk (GitHub Pages review page): first walk 2026-10-24 saved in data/field/cardiff-field-marks-2026-10-24.json (59 marks, order reliable but positions not: the crosshair didn't follow GPS then, so marks bunch on a few points; not applied to the map; photos not to be mapped yet). Needs a second walk with the fixed page for driveways, bollards, posts, barrier ends; and where the SB track starts at the north end (Chesterfield signal or further north). South entrance/exit already set from his satellite notes.

## Where things live
- Repository: github.com/machinesandhumans/encinitas-bike-maps (see README for folder layout)
- Rebuild the Cardiff map: `node maps/cardiff/build.mjs` (writes `docs/cardiff/index.html` for GitHub Pages and `maps/cardiff/cardiff-corridor.html` for the Claude artifact)
- Crash data: `data/ccrs/`
