## Great Circle Map — Flight Atlas

An interactive flight planner with a full-screen satellite globe, a floating dark
planner, thin solid WGS84 geodesics, and flat airport labels that stay readable while
you rotate the Earth. The planner becomes a collapsible bottom panel on phones.

- Search by city, airport name, IATA or ICAO code and append airports to a route.
- Draw routes such as `SEA-ANC-BRW`, multiple routes separated by commas, or slash
  expansions such as `SFO-HND/SIN`.
- View each leg, route totals, nonstop comparisons and the total across all routes.
- Switch between satellite and street maps in both 3D and 2D.
- Expand **Show all data** to inspect route details and totals; these stay collapsed by default.
- Choose kilometers, miles or nautical miles, label format and route color.
- Share the current URL; route and display settings survive reload and navigation.

Distances and drawn paths use GeographicLib's WGS84 ellipsoid. These are shortest
airport-to-airport paths, not recorded flight tracks or airline schedules. Satellite
imagery comes from Esri; attribution remains available on the map. Cesium 1.108 is
loaded from its CDN, so internet access and a WebGL-capable browser are required.
No Google Maps or Cesium ion API key is needed. Legacy `/globe`, `/satellite`,
`/roadmap`, `/roadmap-3d`, `/leaflet` and `/google-*` URLs remain supported; Google URLs now use
the corresponding Esri map view.

## Development and verification

```sh
npm ci --legacy-peer-deps
npm run build:prod
npm test -- --runInBand
npm run lint
node server.js
```

Open `http://localhost:3000`. `npm run build` watches source changes. The generated
`public/bundle.js` remains untracked; deployment must run the production build.
The Jest/Babel and React test renderer versions are aligned with the application.

## Publish to the Pages repository

The source build supports both a domain root and `/tools/great-circle-map/` without
patching the generated JavaScript. The HTML entry point identifies the asset base.

```sh
npm run build:prod
node scripts/export-pages.cjs /path/to/pages/tools/great-circle-map
```

The exporter copies the bundle and airport dataset and writes all static route
entry points. Commit the source here and the generated files in the Pages repo.
Before publishing, check route entry, airport search, invalid codes, settings,
sharing, direct subpath reloads, and desktop/phone layouts in a browser.

The project builds on Great Circle Map by Markus Englund (MIT).

## Airport data

Airport data comes from [OpenTravelData (OPTD)](https://github.com/opentraveldata/opentraveldata), an actively maintained, industry-standard reference dataset. To refresh `public/airports.csv`, download the latest [`optd_por_public.csv`](https://raw.githubusercontent.com/opentraveldata/opentraveldata/master/opentraveldata/optd_por_public.csv) and regenerate: keep active airport entries (`location_type` containing `A`, no `date_until`) plus metropolitan grouping codes (city codes serving two or more airports), de-duplicating on ICAO by highest page rank and ordering by page rank so the most significant airports come first.
