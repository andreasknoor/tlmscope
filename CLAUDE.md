# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

TLMscope is a browser-only viewer for RC telemetry logs (Spektrum `.TLM` today, EdgeTX planned). Next.js 16 static export (`output: "export"`), no server code: files are parsed and analysed in the browser. Read `AGENTS.md` above — this Next.js version differs from training data; check `node_modules/next/dist/docs/` before using Next APIs.

## Commands

```sh
npm run dev                 # dev server on :3000 (predev copies the MapLibre worker into public/maplibre/)
npm run build               # static export to out/ (prebuild does the same copy)
npm test                    # vitest run; tests needing private samples/*.TLM are skipped without them
npx vitest run src/core/analysis/analysis.test.ts       # one file
npx vitest run -t "frozen battery"                       # tests by name
npm run lint                # eslint
npm run typecheck           # tsc --noEmit
npm run inspect -- samples/Easy_Glider_4.TLM --fields --samples   # parser debug output in the terminal
npm run docs                # regenerate the channel table in README.md from catalogue.ts
npm run demo                # regenerate public/demo/demo-flight.TLM from src/core/demo/demo-flight.ts
```

Node 24+. Scripts run TypeScript directly with `node file.ts`, so `src/core` imports use explicit `.ts` extensions; UI code uses the `@/` alias.

## Deployment and versioning

- Every push to `main` deploys to production on Vercel (https://tlmscope.andreasknoor.com). `vercel.json` sets the build to `npm test && npm run build`, so a failing test blocks the deploy. GitHub Actions (`.github/workflows/ci.yml`) runs lint, typecheck, tests and build.
- `vercel.json` also holds the security headers. The CSP allows only `'self'` plus `https://tiles.openfreemap.org` (map style, tiles, glyphs, sprites) and Umami page-view counting (`cloud.umami.is` script, `gateway.umami.is` endpoint, script tag in `src/app/layout.tsx`); a new external host must be added there or it will be blocked in production, and described on the privacy page (`src/app/legal/page.tsx`).
- Bump the minor version in `package.json` with every deployed update (shown as `major.minor` in the header via `NEXT_PUBLIC_APP_VERSION`); the major version changes only on the owner's explicit decision. Commits are titled `Version X.Y: …`.
- All code, comments, docs, commit messages and UI text are in English (German UI text lives only in `src/i18n/de.json` and `streams.de.json`). UI wording is plain language: simple levels first, exact values behind the "Show details" toggle.

## Architecture

The pipeline is **adapter → normalised model → analysis → UI**, and the layers must stay format-neutral.

- **`src/core/model/`** — the format-neutral model (`types.ts`): `LogFile` → `Session[]` → `Channel`s with canonical ids from `catalogue.ts`, SI units, `Float64Array` time/value arrays and per-sample quality flags (`Q.NO_DATA`, `FROZEN`, `DERIVED`, …). `normalise.ts` runs after every adapter (derives `consumed_mah`, flags frozen sensor values). `ChannelSet`/`ChannelBuilder` collect samples. Missing channels are simply absent, never zero-filled.
- **`src/core/adapters/`** — one folder per input format, registered only in `registry.ts`. The Spektrum adapter: `blocks.ts` splits the file into header runs (= sessions, one per power-up) and 20-byte records, and defends against damaged files (resyncs on false `FF FF FF FF` headers, drops records with implausible timestamps); `sensors.ts` decodes each 16-byte X-Bus packet type into fields mapped to catalogue ids; `index.ts` builds sessions, battery identity, raw-stream inventory and warnings. Everything undecoded still goes into `raw` streams or `raw:` channels. `encode.ts` writes `.TLM` files (used by the synthetic demo and tests).
- **`src/core/analysis/`** — every analysis works on `Grid` (`grid.ts`): channels resampled to 1-second bins, capped at 24 h. Analyses are wrapped in `withNeeds()` (`requirements.ts`), returning either a value or the list of missing channels, which the UI shows. `analyseLogs()` in `index.ts` runs all analyses per session and then cross-flight comparisons (efficiency and sink baselines). All rating limits live in `thresholds.ts`; ratings are four levels.
- **`src/worker/parse.worker.ts`** parses off the main thread; `src/ui/loader.ts` manages it (fails pending requests if the worker crashes). Analysis itself runs on the main thread in `App.tsx` (`useMemo`).
- **`src/ui/`** — one client component tree under `App.tsx`, which owns all state and exposes it via `StoreContext` (`store.tsx`, `useStore()`); there is no router — view and session are mirrored in the URL hash (`#s-<fileIndex>-<sessionIndex>`, `#batteries`, `#inventory`). Session keys contain the file position, so closing a file resets the selection. `views/` are the top-level pages, `tabs/` the per-session tabs, `charts/` uPlot charts plus the MapLibre + deck.gl map (loaded lazily, browser only). Charts of one session share a `syncKey` (`charts/sync.ts`) so cursors, the replay and the map marker move together. `ErrorBoundary.tsx` wraps the main view and the whole page.
- **i18n** — `next-intl` with `src/i18n/en.json` / `de.json`; `i18n.test.ts` enforces identical keys and placeholders in both, and German labels for every sensor in `SENSORS`. Rich text uses `useRich()` (`<b>`, `<code>` only).

## Tests

- Reference tests in `spektrum.test.ts` / `analysis.test.ts` assert exact values from the private logs in `samples/` (gitignored; see `samples/README.md`), so they only run locally. CI and Vercel run the rest.
- The synthetic demo flight (`src/core/demo/demo-flight.ts`, with GPS and a thermal) is the end-to-end fixture that runs everywhere; `robustness.test.ts` corrupts it to test damaged-file handling. If you change the demo generator, run `npm run demo` so `public/demo/demo-flight.TLM` matches.
- `spektrum.test.ts` has a snapshot (`__snapshots__/`); update it deliberately with `npx vitest run -u` only when a decoding change is intended.

## Other folders

`prototype/` (HTML prototype, not deployed), `reference/tlm.py` (Python reference parser), `docs/` (implementation plan, feature concepts, screenshots). Lint ignores `prototype/`, `reference/` and the copied `public/maplibre/`.
