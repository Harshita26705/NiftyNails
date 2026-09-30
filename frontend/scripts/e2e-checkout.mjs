// Full purchase journey: register → product → bag → checkout → confirmation → account orders.
// Usage: node scripts/e2e-checkout.mjs [width]
import { chromium } from "@playwright/test";

const width = Number(process.argv[2] ?? 390);
const base = process.env.BASE_URL ?? "http://localhost:3100";
const out = process.env.SHOT_DIR ?? "shots";
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width, height: width < 800 ? 844 : 900 }, deviceScaleFactor: 2, hasTouch: width < 800 });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const step = async (name) => page.screenshot({ path: `${out}/checkout-${width}-${name}.png` });
const email = `e2e${Date.now()}@example.com`;

await page.goto(`${base}/account`, { waitUntil: "load" });
await page.click("text=Create account");
await page.fill('input[autocomplete="name"]', "Test Shopper");
await page.fill('input[type="email"]', email);
await page.fill('input[type="password"]', "Nails4ever!");
await page.click('button[type="submit"]');
await page.waitForSelector("text=/Hi, /");

await page.goto(`${base}/shop/strawberry-milk`, { waitUntil: "load" });
await page.waitForSelector('role=radio[checked=true]');
await page.locator("button:visible", { hasText: "Add to bag" }).last().click();
await page.waitForTimeout(500);
await page.goto(`${base}/bag`, { waitUntil: "load" });
await page.waitForSelector("text=Summary");
await page.waitForTimeout(800);
await step("1-bag");
await page.click("text=Checkout");
await page.waitForURL("**/checkout");
await page.fill('input[autocomplete="tel"]', "9876543210");
await page.fill('input[autocomplete="address-line1"]', "12 Rose Lane");
await page.fill('input[autocomplete="address-level2"]', "Bengaluru");
await page.fill('input[autocomplete="postal-code"]', "560001");
await page.selectOption('select[autocomplete="address-level1"]', "Karnataka");
await page.waitForTimeout(600);
await step("2-checkout");
await page.click("text=/Place order/");
await page.waitForURL("**/order/**", { timeout: 60000 });
await page.waitForSelector("text=/Thank you/");
await page.waitForTimeout(800);
await step("3-confirmation");
const number = page.url().split("/order/")[1].split("?")[0];
await page.goto(`${base}/account/orders`, { waitUntil: "load" });
await page.waitForSelector(`text=${number}`);
console.log(JSON.stringify({ ok: true, number, errors }));
await b.close();
