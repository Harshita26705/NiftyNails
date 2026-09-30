// Drives the redesigned Design Studio like a user: draw a stroke, add a shape, add text, build a gradient,
// add + tweak a French tip, reorder layers, copy to another nail, mirror, undo/redo, check the price
// breakdown, then add the custom design to the bag.
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

const tab = (name) => page.click(`role=tab[name="${name}"]`);
const drag = async (loc, from, to, steps = 10) => {
  const box = await loc.boundingBox();
  await page.mouse.move(box.x + box.width * from.x, box.y + box.height * from.y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * to.x, box.y + box.height * to.y, { steps });
  await page.mouse.up();
};

await page.goto(`${base}/create/draw`, { waitUntil: "load" });
await page.evaluate(() => localStorage.removeItem("nifty.studio.v1"));
await page.reload({ waitUntil: "load" });
await page.waitForSelector('button[aria-label="Left ring"]');
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/studio-${width}-0-loaded.png` });

// 1. Draw a freehand stroke on the active nail.
await tab("Brush");
const stage = page.locator("svg[aria-label='Drawing canvas']");
await stage.waitFor({ state: "visible" });
await drag(stage, { x: 0.25, y: 0.3 }, { x: 0.7, y: 0.6 }, 12);
await page.waitForTimeout(200);
// A stroke starting outside the nail must not paint anything outside the outline (clipping).
const stageBox = await stage.boundingBox();
await page.mouse.move(stageBox.x - 30, stageBox.y + 5);
await page.mouse.down();
await page.mouse.move(stageBox.x - 10, stageBox.y + 40);
await page.mouse.up();

// 2. Add a shape, then drag it.
await tab("Shapes");
await page.click('button:has-text("Circle")');
await page.waitForTimeout(200);
const shapeStage = page.locator("svg[aria-label='Design objects']");
await drag(shapeStage, { x: 0.5, y: 0.42 }, { x: 0.35, y: 0.55 });

// 3. Add text.
await tab("Text");
await page.click('button:has-text("Add text")');
await page.fill('input[placeholder="Your text…"]', "XO");

// 4. Build a gradient (custom ombre).
await tab("Ombre");
await page.click('button:has-text("Add ombre")');
await page.waitForTimeout(150);
const angleSlider = page.locator('input[aria-label="Gradient angle"]');
await angleSlider.fill("90");

// 5. Add a French tip, then tweak its depth.
await tab("French tip");
await page.click('button:has-text("Deep")');
await page.waitForTimeout(150);
const depthSlider = page.locator('input[aria-label="Depth"]');
await depthSlider.fill("0.4");

// 6. Layers: confirm objects are listed and reorder the top one down.
await tab("Layers");
const rows = page.locator('input[aria-label="Layer name"]');
const layerCount = await rows.count();
if (layerCount > 1) await page.locator('button[aria-label="Move down"]').first().click();

// 7. Copy to all nails, then mirror to the other hand (two copies of the toolbar exist — desktop + mobile).
await page.locator('button:has-text("Copy to all nails"):visible').first().click();
await page.waitForTimeout(200);
await page.locator('button:has-text("Mirror to other hand"):visible').first().click();
await page.waitForTimeout(200);
await page.screenshot({ path: `${out}/studio-${width}-1-edited.png` });

// 8. Undo / redo.
const undo = page.locator('button[aria-label^="Undo"]:visible').first();
await undo.click();
await page.waitForTimeout(150);
await page.locator('button[aria-label^="Redo"]:visible').first().click();

// 9. Review: price breakdown should appear and be expandable.
await tab("Review");
await page.waitForSelector("text=View price breakdown", { timeout: 15000 });
const priceText = await page.locator("text=/Your design/").first().locator("..").innerText().catch(() => "no price block");
await page.click("text=View price breakdown");
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/studio-${width}-2-review.png` });

// 10. Add the custom design to the bag.
await page.locator("button", { hasText: "Add to bag" }).click();
await page.waitForSelector("text=Add to bag", { timeout: 5000 }).catch(() => {});
await page.waitForTimeout(300);
const sizeM = page.locator('button', { hasText: /^M$/ }).first();
if (await sizeM.count()) await sizeM.click();
await page.locator('[role="dialog"] button, aside button', { hasText: "Add to bag" }).last().click({ timeout: 5000 }).catch(() => {});
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/studio-${width}-3-added.png` });

const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("nifty.studio.v1") ?? "{}"));
const objectCounts = {};
for (const nail of Object.values(stored.nails ?? {})) {
  for (const o of nail.objects ?? []) objectCounts[o.type] = (objectCounts[o.type] ?? 0) + 1;
}
console.log(JSON.stringify({ price: priceText.replace(/\s+/g, " "), objectCounts, layerRowsSeen: layerCount, errors }));
await browser.close();
