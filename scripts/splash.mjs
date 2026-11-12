// Génère les écrans de démarrage iOS (fond noir + haltère rose) : plus de flash blanc à l'ouverture de l'app.
// À relancer seulement si le logo change :  node scripts/splash.mjs
import { chromium } from 'playwright';

// [largeur, hauteur, densité] en points CSS, iPhone en portrait
export const DEVICES = [
  [440, 956, 3], [402, 874, 3], [430, 932, 3], [393, 852, 3], [428, 926, 3],
  [390, 844, 3], [414, 896, 3], [375, 812, 3], [414, 896, 2], [375, 667, 2], [320, 568, 2],
];
const logo = `<svg viewBox="96 150 320 212" width="28%"><g fill="#ff3b80">
<rect x="132" y="240" width="248" height="32" rx="10"/><rect x="148" y="150" width="44" height="212" rx="14"/>
<rect x="320" y="150" width="44" height="212" rx="14"/><rect x="96" y="186" width="40" height="140" rx="12"/>
<rect x="376" y="186" width="40" height="140" rx="12"/></g></svg>`;

const browser = await chromium.launch();
for (const [w, h, dpr] of DEVICES) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
  await page.setContent(`<body style="margin:0;height:100vh;background:#000;display:grid;place-items:center">${logo}</body>`);
  await page.screenshot({ path: `public/splash/${w * dpr}x${h * dpr}.png` });
  await page.close();
}
await browser.close();
console.log(DEVICES.map(([w, h, d]) => `<link rel="apple-touch-startup-image" media="(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${d}) and (orientation: portrait)" href="./splash/${w * d}x${h * d}.png" />`).join('\n'));
