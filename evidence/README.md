# Evidence library

One place for every source on whether the four Encinitas corridor changes are dangerous for people on bikes. Started October 25, 2026.

**Rule of the library:** every item has a source, a date and a link, and is filed by *what kind* of source it is. Official crash data, government documents, news reports, advocate reports and research never share a table. Material that cuts against the case is logged too, in its own clearly labeled section, so the case can answer it.

## Where to look

| File | What's in it |
|---|---|
| [cardiff-101/](cardiff-101/README.md) | Coast Hwy 101 Cardiff cycle track (Class IV, Apr 2020) |
| [santa-fe/](santa-fe/README.md) | Santa Fe Dr west phase (raised/planter-protected lanes, back-in parking, 2024 to Apr 2025) |
| [leucadia-101/](leucadia-101/README.md) | Leucadia Streetscape (road diet, roundabouts) |
| [quail-gardens/](quail-gardens/README.md) | Quail Gardens Dr (mini-roundabout at Ecke Ranch Rd, Sep 2025) |
| [research/](research/README.md) | Studies and design guidance on protected lanes, two-way tracks, fixed objects, driveways |
| [advocate-reports/](advocate-reports/README.md) | Crash lists and accounts collected by riders and advocates (unofficial, kept apart) |

The official state crash extracts stay in [`data/ccrs/`](../data/ccrs/README_methods_and_sources.md); the corridor files summarize and link to them rather than copy them.

## Source types (used in every table)

| Tag | Meaning | How much weight |
|---|---|---|
| **OFFICIAL** | State crash database (CCRS/SWITRS), sheriff or medical examiner statements | Strongest for "a crash happened here"; known to undercount solo crashes |
| **GOV** | City, Caltrans, Coastal Commission, legislature: staff reports, design guides, project pages, letters | Shows what officials knew and decided |
| **NEWS** | Newspapers, TV, local newsletters | Good for dates, quotes and incidents; check numbers against the original source |
| **ADVOCATE** | Advocate blogs, social media, commissioner presentations of unofficial counts | Useful for crashes the state misses; unverified until matched to a record |
| **RESEARCH** | Peer-reviewed or institutional studies | Strongest for "this kind of design raises or lowers risk" |

Each corridor file has the same sections: *Official data*, *Government documents*, *News*, *Advocate reports*, *What cuts the other way*, and *Gaps*.

## Strongest items so far (Oct 25, 2026)

1. **Cardiff official counts, equal 63-month windows:** 6 bike crashes from Jan 2015 to Mar 2020, 9 from Apr 2020 to Jun 2025 (1.1 vs 1.7/yr). Riders hit a fixed object in **0 before and 6 after**. Crashes involving cars fell (5 to 2). Sources: SWITRS 2015 (`data/switrs/`) and CCRS (`data/ccrs/`); see [cardiff-101/equal-windows.md](cardiff-101/equal-windows.md). No ridership counts exist, so this is crashes per year, not per rider.
2. **March 2024 fatality location:** the Sheriff's sergeant told The Coast News it was in the **northbound bike lane, closer to the 2800 block, just north of the "Cardiff by the Sea" welcome sign**, near the Solana Beach line, which is where the NB track begins. The state record says 2700 block with no coordinates. See [cardiff-101](cardiff-101/README.md#march-2024-fatality).
3. **IIHS 2019 study** (DC, NYC, Portland): street-level two-way protected lanes carried much higher crash-or-fall risk than major roads; collisions in protected lanes clustered at intersections and driveways. Caveat logged: its strongest result rests on one outlier segment.
4. **Thomas & De Robertis 2013 review:** one-way cycle tracks are generally safer at intersections than two-way ones.
5. **Schepers & Klein Wolt 2012:** about half of single-bicycle crashes are infrastructure-related (hitting an obstacle or riding off the path).
6. **Santa Fe:** the city council itself voted 4-1 (Nov 2025) to remove the south-side separated lane and back-in parking, citing conflict points (14 north side, 19 south side) and right-hook risk; the council authorized a lawsuit against SB 114 on Oct 21, 2026.

## How to add an item

1. Pick the corridor file (or `research/`) and the section that matches the source type.
2. Add a row: date, source, link, what it shows, and whether the claim was checked against the original.
3. If you save a copy (PDF, screenshot, photo), put it in that corridor's `sources/` folder named `YYYY-MM-DD-short-name.ext` and link it from the row. The cloud environment can't download most sites, so copies are best saved from Mark's computer.
4. If an item cuts against the case, file it under *What cuts the other way*, not delete it.
