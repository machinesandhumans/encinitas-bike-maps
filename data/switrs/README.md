# SWITRS extracts (pre-2016 official crash records)

The state's CCRS dataset (used in `data/ccrs/`) starts in 2016. Earlier official records are SWITRS, available through UC Berkeley's TIMS (tims.berkeley.edu, free login), which keeps about the last ten years: the earliest year available on Oct 25, 2026 was 2015.

## encinitas-bike-2015/
Raw TIMS export, downloaded by Mark on Oct 25, 2026: SWITRS Query & Map, San Diego County, City of Encinitas, 01/01/2015 to 12/31/2015, Crash filter "Bicycle Crash = Yes". Files: Crashes.csv (20 crashes), Parties.csv, Victims.csv. Unedited.
Codes are explained in the TIMS SWITRS codebook (tims.berkeley.edu/help/crashdata/switrs-codebook.php).

## cardiff_101_bike_crashes_2015.csv
The 2015 crashes on the Cardiff stretch (south of Chesterfield Dr to the Solana Beach line), in the same columns as `data/ccrs/cardiff_101_cycle_track_bike_crashes.csv`. 2 of the 20; one more (Jul 26, 2015, case 7018496) was 1,584 ft north of Chesterfield, outside the stretch.

## Why 2015
It allows equal 63-month before and after windows for Cardiff: Jan 2015 to Mar 2020 vs Apr 2020 to Jun 2025. See `evidence/cardiff-101/equal-windows.md`. 2014 would allow 74-month windows but has to be requested from the CHP.
