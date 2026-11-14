/**
 * Writes `public/debug.html` (served at /debug): the transmitter dry run from `prototype/dry-run.html`
 * as a complete page for the website. The prototype is also published as a page elsewhere and leaves out
 * the document head; here it gets one, without the Google Fonts link (the site serves no third-party fonts,
 * see the CSP in vercel.json and the privacy page) and marked "noindex". Runs before `dev` and `build`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const src = readFileSync(join(root, "prototype/dry-run.html"), "utf8");
const title = /<title>([^<]*)<\/title>/.exec(src)?.[1] ?? "Transmitter Dry Run";
const body = src
  .replace(/<title>[^<]*<\/title>\s*/, "")
  .replace(/<meta name="claude:[^>]*>\s*/g, "")
  .replace(/<link rel="(preconnect|stylesheet)" href="https:\/\/fonts\.[^>]*>\s*/g, "");
if (/fonts\.googleapis|fonts\.gstatic/.test(body)) throw new Error("dry-run.html still loads Google Fonts");

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex">
<meta name="description" content="A timed ground test that maps the sticks, trims, switches and knobs of an RC transmitter to its telemetry log.">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<title>${title} · TLMscope</title>
<style>:root { padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); } body { margin: 0; }</style>
</head>
<body>
${body.trim()}
</body>
</html>
`;
writeFileSync(join(root, "public/debug.html"), page);
