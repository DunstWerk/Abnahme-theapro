// Dev-only, one-off tool — NOT wired into `npm run build` or CI. Rasterizes
// the brand mark (the coral checkmark used as the favicon in index.html)
// into the PNG sizes needed for the PWA manifest / apple-touch-icon via a
// local headless Chromium (no image library like sharp/imagemagick is
// available in this environment). Regenerate only if the brand mark or
// colors change:
//
//   npm i -D playwright && npx playwright install chromium
//   node scripts/generate-icons.mjs
//
// then commit the resulting files under public/icons/.
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const CORAL = "#ED6950";
const CHECK = "M8 16.5l5 5 11-11"; // same path data as the index.html favicon, in a 32x32 viewBox
const OUT = path.resolve("public/icons");

const targets = [
  { file: "pwa-192x192.png", size: 192, style: "tight" },
  { file: "pwa-512x512.png", size: 512, style: "tight" },
  { file: "maskable-icon-512x512.png", size: 512, style: "padded" },
  { file: "apple-touch-icon-180x180.png", size: 180, style: "padded" },
];

function html(style, px) {
  if (style === "tight") {
    // 1:1 scale-up of the existing rounded-square favicon.
    return `<body style="margin:0"><svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 32 32">
      <rect width="32" height="32" rx="6" fill="${CORAL}"/>
      <path d="${CHECK}" stroke="white" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </svg></body>`;
  }
  // Full-bleed, unrounded, opaque square with the glyph confined to a safe
  // zone in the middle: Android applies its own mask shape to maskable
  // icons, and iOS applies its own corner rounding to apple-touch-icon —
  // both need a plain opaque square, not a pre-cropped/rounded source.
  const glyph = Math.round(px * 0.62);
  return `<body style="margin:0;width:${px}px;height:${px}px;background:${CORAL};display:flex;align-items:center;justify-content:center">
    <svg width="${glyph}" height="${glyph}" viewBox="0 0 32 32">
      <path d="${CHECK}" stroke="white" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </body>`;
}

await mkdir(OUT, { recursive: true });
// executablePath points at this sandbox's preinstalled Chromium; on a normal
// machine, drop it (chromium.launch() finds the browser installed via
// `npx playwright install chromium`).
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage();
for (const t of targets) {
  await page.setViewportSize({ width: t.size, height: t.size });
  await page.setContent(html(t.style, t.size));
  await page.screenshot({ path: path.join(OUT, t.file), omitBackground: t.style === "tight" });
  console.log("wrote", t.file);
}
await browser.close();
