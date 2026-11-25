import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const folder = process.env.CARRYQ_SCREENSHOTS || "/tmp/carryq-redesign-check";
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--disable-gpu", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  const errors = [], requests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400) errors.push(response.status() + " " + response.url());
  });
  page.on("request", (request) => requests.push(request.url()));
  await page.goto(process.argv[2] || "http://127.0.0.1:38125/CarryQ/", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.querySelector("#playback-view")?.disabled === false);
  assert.ok(!requests.some((url) => url.includes("/franka/") || url.includes("/InsertionDemo-")));
  assert.ok(await page.locator(".recorded-canvas").evaluate((element) => element.getBoundingClientRect().bottom < innerHeight));

  const demo = page.locator("#demo");
  await demo.getByRole("button", { name: "Play", exact: true }).click();
  await page.waitForFunction(() => +document.querySelector("#scene-time").value > 0.3);
  await demo.getByRole("button", { name: "Pause", exact: true }).click();
  const time = await page.locator("#scene-time").inputValue();
  await page.waitForTimeout(250);
  assert.equal(await page.locator("#scene-time").inputValue(), time);
  await demo.getByRole("button", { name: "Reset", exact: true }).click();
  assert.equal(+(await page.locator("#scene-time").inputValue()), 0);
  await page.locator("#playback-task").selectOption("charger");
  assert.ok(+(await page.locator("#scene-time").inputValue()) > 14);
  await page.locator("#playback-view").selectOption("charger");
  await page.locator("#scene-time").fill("25.04");
  await demo.screenshot({ path: folder + "/charger-view.png" });
  await page.locator("#playback-task").selectOption("both");
  await page.locator("#playback-view").selectOption("overview");
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: folder + "/first-screen.png" });

  const diagram = page.locator(".paper-architecture");
  await diagram.getByRole("button", { name: "Carry and reset", exact: true }).click();
  assert.equal(await diagram.locator(".diagram-highlight").count(), 4);
  await diagram.getByRole("button", { name: "Full diagram", exact: true }).click();
  await diagram.getByRole("button", { name: "t = 2", exact: true }).click();
  assert.match(await diagram.locator("dl").textContent(), /−0.32/);
  await diagram.getByRole("button", { name: /Expand figure/ }).click();
  assert.equal(await page.getByRole("dialog").count(), 1);
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").count(), 0);
  await diagram.screenshot({ path: folder + "/paper-architecture.png" });

  // Compare the original vector at its 968 × 640 paper dimensions.
  const proof = await browser.newPage({viewport: {width: 968, height: 640}});
  const vectorUrl = new URL("figures/paper-architecture.svg", page.url());
  await proof.goto(vectorUrl.href);
  await proof.screenshot({path: folder + "/architecture-vector-raster.png"});
  await proof.close();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: folder + "/mobile-first-screen.png" });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await diagram.screenshot({ path: folder + "/mobile-architecture.png" });
  assert.deepEqual(errors, []);
  await writeFile(folder + "/browser-check.json", JSON.stringify({ errors, initialRequests: requests }, null, 2));
  console.log("PASS: visible first-screen 3D, no physics on initial load, playback, pause, reset, task/view selection, paper vector, highlights, detail values, modal, mobile layout.");
} finally {
  await browser.close();
}
