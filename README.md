# Encinitas Bike Maps

Interactive, spatially accurate maps of four Encinitas road projects, showing where each layout narrows riders' options and where official crashes happened before and after the change.

**Start with [PROJECT_BRIEF.md](PROJECT_BRIEF.md)** for status, data sources, decisions and open items.

## Layout
| Folder | What's in it |
|---|---|
| `maps/cardiff/` | Cardiff Coast Hwy 101 map: `data.mjs` (road geometry from OpenStreetMap), `crashes.mjs` (crash records and placement), `app.js` (interactive view), `build.mjs` (builds the page) |
| `docs/` | Built pages served by GitHub Pages (`docs/index.html`, `docs/cardiff/`) |
| `data/ccrs/` | California crash database (CCRS) extracts by corridor, with methods notes |
| `vendor/anatomy/` | Isometric drawing kit from github.com/wheresryan22/anatomy (MIT), only the files the build uses |
| `archive/` | Superseded prototypes |

## Rebuild a map
Requires Node.js 20+.
```
node maps/cardiff/build.mjs
```
This writes `docs/cardiff/index.html` (the public page) and `maps/cardiff/cardiff-corridor.html` (the version published as a Claude artifact).
