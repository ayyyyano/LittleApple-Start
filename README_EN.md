# LittleApple Start Community Edition

> Your new tab, under your control.

[DEMO](https://start.nekro.top/) | [简体中文](README.md)

**LittleApple Start Community Edition** is a browser start page improved from [LittleApple Start Page 4.8](https://www.littleapple.top/startweb.html). The project follows a local-first approach and focuses on highly flexible visual customization and interface composition, making it suitable as a browser home page or new tab page.

## Preview

![Lighthouse](image.png)

## Core Features

### Appearance

* Personalized wallpapers: supports image and video backgrounds with fill, fit, stretch, tile, and center layout modes.
* Fine-grained controls: customize wallpaper focal point, overlay opacity, blur strength, and effects such as falling Sakura petals.
* Palette extraction and accent colors: includes a preset palette, can extract tones from custom images, and supports manually specified accent colors.
* Material and theme: includes Light and Dark themes with System support, plus Minimal, Standard Glass, and Liquid Glass materials. Liquid Glass is the default.
* Flexible composition: adjust overall and per-module scale, spacing, and the position of interface elements.

### Modules

* Clock and date: supports multiple time zones, 12/24-hour format, seconds, and multiple date formats.
* Search: includes search engine management, a configurable default engine, and search suggestions.
* Quick links and actions: supports customizable Quick Links with icon handling, sorting, and a local initial-letter fallback, plus fixed Top Actions.
* Focus Mode: hides nonessential interface elements for an unobstructed view of the background.
* Quotes and weather: Hitokoto API is enabled by default with a local fallback; Open-Meteo weather is optional.
* Audio: supports independently managed background audio stored in the browser and an APlayer playlist with network audio, cover, and LRC lyrics URLs. APlayer also has an optional experimental Meting integration for song, playlist, album, search, and artist resolution.
* Footer: supports custom copyright text and optional ICP and public-security filing information.

## Tech Stack

* Framework and language: Next.js 16 (App Router) / React 19 / TypeScript
* Styling and UI: Tailwind CSS 4 + CSS Variables / Feather Icons / liquid-glass
* Interaction and storage: dnd-kit / IndexedDB + LocalStorage / APlayer
* Testing and quality: Vitest / ESLint

## Deployment

> No server database is required. Optional runtime deployment environment variables only seed new users and reset defaults; they never overwrite existing user configuration. Configuration and media files remain in each user's browser.

### Deploy with Vercel (Recommended)

1. Import the repository into [Vercel](https://vercel.com/).
2. Select Next.js as the Framework Preset, or use the automatically detected value.
3. Keep the default build configuration (`npm install` as the Install Command and `npm run build` as the Build Command).
4. Open the assigned deployment URL after the deployment completes.

### Deploy Manually with Docker

> The project uses a Next.js standalone production image based on Node 24 Alpine and runs on port 3000.

```bash
docker build -t littleapple-start .
docker run --rm -p 3000:3000 littleapple-start
```

> Open `http://localhost:3000` after the container starts.

### Optional Deployment Defaults

The following public defaults can be set as Docker environment variables or Vercel Project Environment Variables. Unset or empty values keep the built-in defaults. They seed first-run configuration and Reset only; existing user settings and imported `.littleapple` files take precedence.

```yaml
environment:
  LITTLEAPPLE_DEFAULT_SITE_NAME: "My Start"
  LITTLEAPPLE_DEFAULT_BACKGROUND_URL: "https://example.com/background.webp"
  LITTLEAPPLE_DEFAULT_FAVICON_URL: "https://example.com/favicon.png"
  LITTLEAPPLE_DEFAULT_ICP_ENABLED: "false"
  LITTLEAPPLE_DEFAULT_POLICE_ENABLED: "false"
  LITTLEAPPLE_DEFAULT_COPYRIGHT_ENABLED: "true"
  LITTLEAPPLE_DEFAULT_COPYRIGHT_TEXT: "© 2026 My Site"
```

Additional supported parameters are `LITTLEAPPLE_DEFAULT_ICP_TEXT`, `LITTLEAPPLE_DEFAULT_ICP_URL`, `LITTLEAPPLE_DEFAULT_POLICE_TEXT`, and `LITTLEAPPLE_DEFAULT_POLICE_URL`. Boolean values accept `true`/`false` (and `1`/`0`). A user's custom Logo has higher favicon priority than the deployment favicon.

### Local Development and Debugging

> Node.js 24 is recommended.

```bash
npm install
npm run dev
```

### Build and Quality Checks

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run start
```

## Settings

> The Settings panel contains five categories:

* Appearance: wallpapers and background video, background audio, effects, theme modes, materials, palette extraction, custom colors, composition, and spacing.
* Links: default search engine, engine list management, Quick Links, Top Actions, ordering, and icon configuration.
* Content: site name and Logo, clock format, quote source, weather location, Focus Mode, motion, Footer, and APlayer playlist.
* Data: `.littleapple` backup import and export, reset controls, local data management, and legacy configuration migration.
* About: Version 5.0, project links, open-source license, and acknowledgements.

## Data and Privacy

### Data Storage

* The project follows a local-first architecture, and most data remains on the current device.
* Lightweight configuration is stored in `localStorage` under `littleapple.config.v4`.
* Uploaded image and video wallpapers, background audio, and custom Logos are stored in the `assets` store of the `LittleAppleStart` IndexedDB database.
* Exported `.littleapple` files contain the current configuration and local media for manual migration; they are not cloud backups.
* The Vercel or Docker server does not collect or upload user configuration or media. Clearing browser site data removes locally stored data.

### Outbound Network Requests

> Third-party availability and CORS behavior are controlled by those services. Browser autoplay policy may require user interaction before media playback.

By default, the page sends network requests only for:

* Network time calibration from `time.akamai.com`, which can be replaced with device time in Settings.
* Hitokoto quotes from `v1.hitokoto.cn`, with a local fallback when the request fails.

The following requests occur only after the user enables or configures the corresponding feature:

* Open-Meteo weather data.
* User-configured quote or weather APIs.
* APlayer audio, cover, and lyrics resources.
* User-configured Meting API requests for resolved tracks, covers, and lyrics.
* Third-party Quick Link icons.

## Version Notes

> LittleApple Start Community Edition is an open-source edition developed from LittleApple Start Page 4.8 and released with authorization from the original author, LittleApple Studio.

* This project is intended for community open-source use and independent deployment. It inherits the core design and functionality of LittleApple Start Page, while its preset assets and service integrations differ from the original release.
* This project is maintained independently by the community. Please do not submit feedback about this project to LittleApple Studio. We thank LittleApple Studio for supporting its development.

## License

LittleApple Start Community Edition is released under the **MIT License**. See [LICENSE](LICENSE) for details.

Third-party acknowledgements:

* `@samasante/liquid-glass` — MIT
* `@DIYgod/APlayer` — MIT
* `@hitokoto-osc/hitokoto-api` — Apache-2.0
