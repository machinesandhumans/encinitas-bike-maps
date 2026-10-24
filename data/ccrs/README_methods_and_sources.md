# Encinitas bike crash records: methods and sources

Pulled October 23, 2026.

## Source
California Crash Reporting System (CCRS), published by the California Highway Patrol on data.ca.gov (dataset "ccrs").
Includes San Diego Sheriff reports (agency code 3700), which cover Encinitas surface streets, plus CHP reports (9650).

## Method
- Bike crashes 2016–2024 and 2026: crash records in Encinitas joined to a party record of type "Bicyclist".
- 2025: the 2025 party table is not yet published in queryable form, so 2025 crashes were identified as
  "motor vehicle involved with: BICYCLE" or any injured person of type "Bicyclist". This can miss uninjured solo crashes.
- 2026 is partial (state data runs to about May 2026).
- Corridor assignment was done by street name and cross street, because most Sheriff records have no coordinates.
  Rows marked "verify" need a location check.

## Corridor windows used
- Cardiff 101 cycle track: south of Chesterfield Dr to the Solana Beach line. Installed April 2020.
  Before = Jan 2016 – Mar 2020 (4.25 yrs). After = Apr 2020 – May 2026 (6.16 yrs).
  Crashes at the Chesterfield intersection itself are listed separately.
- Santa Fe west phase: I-5 to Evergreen. Construction Jan 2024 – Apr 2025.
- Leucadia 101: A St to La Costa Ave. Phase 1 (Marcheta–Basil) 2021–22; B-C restripe Jul–Dec 2022;
  Segment C (roundabouts at Grandview and Jupiter) under construction Mar 2024 – 2026.

## Known gaps (state these in any graphic)
1. The June 2023 death of Brodee Champlain-Kingman does not appear in CCRS.
2. Solo crashes are underreported to the state database; advocates count far more on the Cardiff stretch
   (Medak: 42 since Apr 2020; Issakov: 36) than the 11 official records found here.
3. No bike ridership counts exist for these corridors, so crash RATES per rider cannot be computed.
4. E-bike type only appears in records starting 2024.
5. The two serious Santa Fe injuries cited at council (April and June 2025) were not found in CCRS.

## Other documents gathered
- San Diego County Bicycle Coalition comment letter on the Cardiff cycle track (April 2025):
  https://static1.squarespace.com/static/673b90cbaf336204b2122a4a/t/67fdf76045ee4029c184fe3f/1744697184736/04_11_25+Encinitas+Public+Comment+Item6A_+Highway+101+Class+IV.pdf
- Santa Fe west phase project page and timeline:
  https://www.encinitasca.gov/government/city-projects-initiatives/santa-fe-drive-corridor-improvements-west-segment
- Coast News on Medak's analysis:
  https://thecoastnews.com/encinitas-cyclists-officials-reignite-debate-over-protected-bike-lanes/
