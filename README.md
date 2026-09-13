# hey-listen.link

A small interactive web experience to wait for the return of *The Legend of Zelda: Ocarina of Time*.

A glowing creature, a quiet night, and a single countdown.

## About

`hey-listen.link` is an unofficial fan project. It is not affiliated with,
endorsed by, or sponsored by Nintendo, The Legend of Zelda, or any of their
subsidiaries. All trademarks and registered trademarks remain the property of
their respective owners.

The site is deployed at <https://hey-listen.link/> and is composed of three
visual ingredients:

- A night landscape with a glowing fairy.
- A countdown to **November 5, 2026 (Chile continental time)**.
- An ambient soundtrack that can be muted at any time.

## Repository layout

```text
src/
  components/     UI: Countdown, Navi, Environment, ShareButton
  hooks/          useCountdown, useGamePhase
  config/         release date, share copy, support and source URLs
  lib/            Web Audio engine and background music
  styles/         global.css
  App.tsx         Composition root
  main.tsx        React root
public/           index.html, favicon.svg, og.png, og.jpg, og.svg
images/           Fan artwork (NOT covered by the MIT License)
music/            Background tracks (NOT covered by the MIT License)
scripts/build.mjs Tiny esbuild runner (no Vite, no plugins)
.github/workflows GitHub Actions pipeline (deploys to S3 + CloudFront)
```

## Running

### With Docker

```bash
docker build -t heylisten-link .
docker run --rm -p 8080:80 heylisten-link
```

Open <http://localhost:8080>.

For local development with hot reload:

```bash
docker build -f Dockerfile.dev -t heylisten-link-dev .
docker run --rm -p 5173:5173 -v "$PWD":/app heylisten-link-dev
```

### Without Docker

```bash
npm install
npm run dev      # local server on http://localhost:5173
npm run build    # produces ./dist
```

## Configuration

All dynamic values live in `src/config/release.ts`:

| Key | Purpose |
| --- | --- |
| `RELEASE_DATE_ISO` | ISO release date in `America/Santiago` |
| `RELEASE_TIMEZONE_LABEL` | Human-readable timezone label |
| `SITE_URL` | Canonical site URL |
| `SUPPORT_URL` | Buy Me a Coffee destination |
| `SOURCE_URL` | GitHub repository URL |
| `SHARE_BASE` | Default share message |
| `SITE_HANDLE` | Site display name |

## Architecture

### How time works

`useCountdown()` reads the wall clock every second and computes the remaining
days, hours, minutes and seconds until `RELEASE_DATE_ISO`.

### How phases work

`useGamePhase()` maps the remaining time to:

- `normal` (default, calm night)
- `thirtyDays` (very subtle temple silhouette)
- `sevenDays` (sword silhouette appears)
- `seventyTwoHours` (countdown becomes HH:MM:SS, light pulses)
- `twentyFourHours` ("ONE MORE DAY", more stars)
- `lastHour` ("IT'S ALMOST TIME", MM:SS, maximum atmosphere)
- `released` (the door opens)

### Audio

The ambient soundtrack uses native HTML audio elements so it works on mobile.
It tries to autoplay when allowed by the browser; otherwise it starts on the
first user interaction. The `♪` button mutes and unmutes the music.

### Easter eggs (undocumented)

- Move the cursor near Navi → she escapes with a small burst of light.
- Click Navi → she reacts and a sound effect plays randomly.
- Click the countdown quickly → it glitches for two seconds.
- 23:00–00:00 local time → brief star and particle boost.
- Starfall randomly, every 22–60 seconds, only at night.

## Tech notes

- Single dependency at build time: `react`, `react-dom`.
- No CSS framework, no animation library, no Three.js.
- All imagery is fan artwork or SVG.
- No backend, no database, no auth, completely static.
- Lighthouse target: Performance > 95.

## Deployment

The site is hosted on Amazon S3 behind Amazon CloudFront, both managed through
Terraform-equivalent AWS CLI commands and refreshed automatically by GitHub
Actions. The pipeline:

1. Builds the project with `npm run build`.
2. Syncs `dist/` to the private S3 bucket.
3. Invalidates CloudFront.

See `.github/workflows/deploy.yml` for the full definition.

## Analytics

Audience traffic is measured with Google Analytics 4 (`G-PRN8PB9YN4`).

- Loaded directly via `gtag.js` in `public/index.html`, with `async` to avoid blocking render.
- IP addresses are anonymized (`anonymize_ip: true`); no cookie consent banner is required for this lightweight measurement.
- The `KEEP THE LIGHT ALIVE` link fires a `cta_support_click` event.
- The GitHub icon fires a `github_source_click` event.

## Open Graph and Twitter Cards

The site ships with a dedicated share image at `public/og.png` (`1200×628`)
plus a JPEG fallback at `public/og.jpg`, and the full set of Open Graph and
Twitter Card meta tags in `public/index.html`:

- `og:type`, `og:site_name`, `og:title`, `og:description`, `og:url`, `og:locale`
- `og:image`, `og:image:secure_url`, `og:image:width`, `og:image:height`, `og:image:alt`
- `twitter:card` set to `summary_large_image`
- Matching `twitter:title`, `twitter:description`, `twitter:image`, `twitter:image:alt`
- `<link rel="canonical" href="https://hey-listen.link/" />`

`public/og.svg` is kept only as a historical fallback and is no longer
referenced from the HTML.

## License

The source code in this repository is released under the MIT License. See
[`LICENSE`](./LICENSE) for the full text and the notice excluding third-party
assets in `images/` and `music/`.
