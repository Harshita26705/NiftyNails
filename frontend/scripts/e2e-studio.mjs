// Drives the Draw studio like a user: paint a stroke, add + drag a charm, undo/redo, check the quote.
// Usage: node scripts/e2e-studio.mjs [width]   (SHOT_DIR env for screenshots)
import { chromium } from "@playwright/test";

const width = Number(process.argv[2] ?? 390);
const base = process.env.BASE_URL ?? "http://localhost:3100";
const out = process.env.SHOT_DIR ?? "shots";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width, height: width < 800 ? 844 : 900 }, deviceScaleFactor: 2, hasTouch: width < 800 });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(`${base}/create/draw?from=pink-bow-coquette`, { waitUntil: "load" });
await page.evaluate(() => localStorage.removeItem("nifty.studio.v1"));
await page.waitForSelector("canvas", { timeout: 60000 });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/studio-${width}-0-loaded.png` });

// Paint a stroke on the right-hand index nail.
await page.click('button[aria-label="Right index"]');
await page.click('role=tab[name="Paint"]');
const canvas = await page.$("canvas");
const box = await canvas.boundingBox();
await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.3);
await page.mouse.down();
for (let i = 0; i <= 20; i++) {
  await page.mouse.move(box.x + box.width * (0.2 + i * 0.03), box.y + box.height * (0.3 + Math.sin(i / 3) * 0.1));
}
await page.mouse.up();
// A stroke far outside the nail must not paint anything outside the outline.
await page.mouse.move(box.x - 30, box.y + 5);
await page.mouse.down();
await page.mouse.move(box.x - 10, box.y + 40);
await page.mouse.up();
await page.waitForTimeout(300);

// Add a butterfly charm and drag it.
await page.click('role=tab[name=/Charms/]');
await page.click('button:has-text("Butterfly")');
await page.waitForTimeout(300);
const charm = await page.$('button[aria-label^="Charm butterfly"]');
const cb = await charm.boundingBox();
await page.mouse.move(cb.x + cb.width / 2, cb.y + cb.height / 2);
await page.mouse.down();
await page.mouse.move(cb.x + cb.width / 2 + 10, cb.y + cb.height / 2 - 40, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(700);
await page.screenshot({ path: `${out}/studio-${width}-1-edited.png` });

// Undo the drag, redo it.
const undo = page.locator('button[aria-label^="Undo"]:visible').first();
await undo.click();
await page.waitForTimeout(200);
await page.locator('button[aria-label^="Redo"]:visible').first().click();

await page.click('role=tab[name="Review"]');
await page.waitForTimeout(1500);
const text = await page.locator("text=Total").first().locator("..").innerText().catch(() => "no total");
await page.screenshot({ path: `${out}/studio-${width}-2-review.png` });
const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("nifty.studio.v1") ?? "{}"));
const r2 = stored.nails?.R2;
console.log(JSON.stringify({
  total: text.replace(/\s+/g, " "),
  r2_has_paint: !!r2?.paint,
  r2_charms: r2?.charms?.map((c) => `${c.charm}@${c.x.toFixed(2)},${c.y.toFixed(2)}`),
  errors,
}));
await browser.close();
