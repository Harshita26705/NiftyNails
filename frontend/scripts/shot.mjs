// Screenshot pages at several viewport widths for visual QA.
// Usage: node scripts/shot.mjs <path> [--w=360,390,414,768,1280] [--full] [--out=dir] [--name=prefix]
//        [--login=email:password] [--wait=ms] [--click=selector] [--scroll=px]
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const args = Object.fromEntries(
  process.argv.slice(3).map((a) => {
    const body = a.replace(/^--/, "");
    const i = body.indexOf("=");
    return i < 0 ? [body, true] : [body.slice(0, i), body.slice(i + 1)];
  }),
);
// Accept "shop" or "/shop" (Git Bash rewrites leading-slash args into Windows paths).
const rawPath = process.argv[2] ?? "/";
const path = rawPath === "home" ? "/" : rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
const widths = String(args.w ?? "390,1280").split(",").map(Number);
const out = args.out ?? process.env.SHOT_DIR ?? "shots";
const base = process.env.BASE_URL ?? "http://localhost:3100";
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
for (const width of widths) {
  const ctx = await browser.newContext({
    viewport: { width, height: width < 800 ? 844 : 900 },
    deviceScaleFactor: width < 800 ? 2 : 1,
    hasTouch: width < 800,
    isMobile: width < 800,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  if (args.login) {
    const [email, password] = String(args.login).split(":");
    const r = await page.request.post(`${base}/api/v1/auth/login`, { data: { email, password } });
    if (!r.ok()) console.error("login failed", r.status());
  }
  await page.goto(base + path, { waitUntil: "load", timeout: 90000 });
  await page.waitForLoadState("domcontentloaded");
  if (args.click) {
    for (const sel of String(args.click).split("|")) {
      await page.click(sel);
      await page.waitForTimeout(400);
    }
  }
  if (args.scroll) await page.evaluate((y) => window.scrollTo(0, Number(y)), args.scroll);
  await page.waitForTimeout(Number(args.wait ?? 600));
  const file = join(out, `${args.name ?? (path.replace(/[^a-z0-9]+/gi, "_") || "home")}-${width}.png`);
  if (args.segments) {
    // Scroll through the page (triggers reveal animations) and capture viewport-sized frames.
    const vh = page.viewportSize().height;
    const total = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0, i = 0; y < total && i < Number(args.segments); y += vh, i++) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await page.waitForTimeout(700);
      const seg = file.replace(/\.png$/, `-s${i}.png`);
      await page.screenshot({ path: seg });
      console.log(seg);
    }
  } else {
    await page.screenshot({ path: file, fullPage: Boolean(args.full) });
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  console.log(`${file}${overflow > 0 ? `  ⚠ horizontal overflow ${overflow}px` : ""}${errors.length ? `  ⚠ errors: ${errors.slice(0, 3).join(" | ")}` : ""}`);
  await ctx.close();
}
await browser.close();
