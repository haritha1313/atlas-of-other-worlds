# Atlas of Other Worlds

An interactive map of every planet humanity has confirmed beyond our Sun. Each point is one real, named world, drawn from live data in the NASA Exoplanet Archive. You can plot the worlds on any pair of axes, color them by temperature, filter them, open any one for a full portrait, and play a timeline that shows each discovery in the year it was made.

**Live demo:** https://haritha1313.github.io/atlas-of-other-worlds/

## What you can do

- Sort the whole sky. Pick any field for the X and Y axes, e.g., orbital period, size, mass, distance, temperature, or discovery year. The worlds animate to their new positions when you change an axis.
- Color the worlds by planet temperature, host star temperature, discovery method, or distance.
- Filter and search. Turn the eleven discovery methods on and off, show only the worlds that could be habitable, add our own Solar System for scale, or search a planet or star by name.
- Play the timeline. Watch the count grow from 1992 to today. The wave of discoveries from NASA's Kepler telescope around 2014 to 2016 is clear to see.
- Open any world for a small portrait, a plain description, its full numbers, and a line telling you what year the light now reaching us first left it.
- Switch between a dark theme and a light theme. Your choice is saved for next time.

## The data

All of the planet data comes from the [NASA Exoplanet Archive](https://exoplanetarchive.ipac.caltech.edu/), which is operated by the California Institute of Technology under contract with NASA. The build script reads the `pscomppars` table, which holds one row of combined parameters for each confirmed planet.

Temperature is the equilibrium temperature of the planet in Kelvin. Distance is converted from parsecs to light years. Some planets are missing a size or a temperature, so they cannot be placed on every axis. When that happens they are hidden rather than guessed, and the counter in the corner always tells you how many worlds are shown and how many are hidden.

## How it is built

The whole thing is one self-contained HTML file with no build step required to view it and no third party libraries. The visualization is plain JavaScript drawing on a single canvas.

The data is baked into `index.html` so the page works on its own. To keep that data refreshable, `scripts/build.mjs` fetches the latest table from the archive, compresses it into a compact array, and splices it into `scripts/template.html` to produce a new `index.html`.

## Run it locally

You can open `index.html` directly in a browser. The fonts load from Google Fonts, so an internet connection gives you the intended look, and the page still works offline with system fonts.

To rebuild `index.html` with the newest data from the archive:

```bash
npm run build
```

To run the headless smoke test, which checks that the page initializes and that the controls and theme toggle work:

```bash
npm test
```

Both commands need Node 18 or newer. There are no packages to install.

## Keeping the data fresh

A GitHub Action in `.github/workflows/update-data.yml` runs once a week. It runs the build script to fetch the latest data from the archive, runs the test, and commits the new `index.html` only if the data changed. The live site then updates on its own. You can also start the job by hand from the Actions tab on GitHub.

## License

MIT. See [LICENSE](LICENSE).
