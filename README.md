# hey-listen.link

A small interactive web experience to wait for the return of *The Legend of Zelda: Ocarina of Time*.

A glowing creature, a quiet night, and a single countdown.

## Running

### With Docker (recommended)

```bash
docker build -t heylisten-link .
docker run --rm -p 8080:80 heylisten-link
```

Open <http://localhost:8080>.

For local development:

```bash
docker build -f Dockerfile.dev -t heylisten-link-dev .
docker run --rm -p 5173:5173 -v "$PWD":/app heylisten-link-dev
```

### Without Docker

```bash
npm install
npm run dev    # local server on http://localhost:5173
npm run build  # produces ./dist
```

## Configuration

All dynamic values live in `src/config/`:

| File | Purpose |
| --- | --- |
| `release.ts` | ISO release date, share copy |
| `messages.ts` | Random messages and phase lines |
| `secrets.ts` | The Song of Waiting sequence |

`releases.ts` ships with a clearly-marked placeholder date. Replace it with the real one when the date is announced.

## Architecture

The site is intentionally tiny. Source layout:

```text
src/
  components/     UI: Countdown, Navi, Environment, Ocarina, Message, ShareButton
  hooks/          useCountdown, useGamePhase (re-exported)
  config/         release, messages, secrets
  lib/            Web Audio engine
  styles/         global.css
  App.tsx         Composition root
  main.tsx        React root
public/           index.html, favicon.svg, og.svg
scripts/build.mjs Tiny esbuild runner (no Vite, no plugins)
```

### How time works

`useCountdown()` reads the wall clock every second and computes the remaining days / hours / minutes / seconds from `RELEASE_DATE_ISO`. The Song of Waiting doesn't alter that calculation — it only adds a visible offset to the displayed countdown for three seconds before snapping back. Real time keeps moving.

### How phases work

`useGamePhase()` maps the remaining time to:

- `normal` (default, calm night)
- `thirtyDays` (very subtle temple silhouette)
- `sevenDays` (sword silhouette appears)
- `seventyTwoHours` (countdown becomes HH:MM:SS, light pulses)
- `twentyFourHours` ("ONE MORE DAY", more stars)
- `lastHour` ("IT'S ALMOST TIME", MM:SS, maximum atmosphere)
- `released` (the door opens)

### The music

All audio is generated in real time with the Web Audio API — no asset files. Wind noise and three drone oscillators, gated behind the user's explicit consent (the `♪` button). Disabled by default to respect browser autoplay rules.

### Easter eggs (undocumented)

- Click Navi → "HEY! LISTEN!" plus a random line.
- Chase Navi → she escapes, eventually shouts "HEY!".
- Click the countdown quickly → it glitches for two seconds.
- 23:00–00:00 local time → brief star and particle boost.
- Starfall randomly, every 22–60 seconds, only at night.

## Tech notes

- Single dependency at build time: `react`, `react-dom`.
- No CSS framework, no animation library, no Three.js.
- All imagery is SVG. All effects are CSS or `<canvas>`.
- No backend, no database, no auth, completely static.
- Lighthouse target: Performance > 95.
