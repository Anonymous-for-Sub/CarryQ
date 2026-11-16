import { chromium } from "playwright";
import assert from "node:assert/strict";

// Software rendering keeps this check independent of a hardware GPU.
const browser = await chromium.launch({
  headless: true,
  args: [
    "--disable-gpu",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const page = await browser.newPage({ viewport: { width: 1000, height: 740 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("response", (r) => {
  if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
});
try {
  await page.goto(process.argv[2] || "http://127.0.0.1:36832/CarryQ/");
  await page.waitForFunction(
    () =>
      document.querySelector("[role=status]")?.textContent.startsWith("Ready"),
    {},
    { timeout: 120000 },
  );
  assert.equal(await page.evaluate(() => window.__insertion.actuators), 16);
  assert.ok((await page.evaluate(() => window.__insertion.meshes)) > 100);
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.waitForFunction(
    () =>
      document.querySelector("[role=status]")?.textContent.includes("Seated"),
    {},
    { timeout: 300000 },
  );
  assert.ok(
    await page.evaluate(() =>
      window.__insertion.measurements.every((m) => m.seated),
    ),
  );
  for (const view of ["usb", "charger", "overview"])
    await page.getByLabel("View", { exact: true }).selectOption(view);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page.waitForFunction(
    () =>
      document.querySelector("[role=status]")?.textContent.startsWith("Ready"),
    {},
    { timeout: 120000 },
  );
  await page.waitForFunction(() =>
    window.__insertion?.measurements.every((m) => !m.seated),
  );
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.waitForTimeout(300);
  const time = await page.evaluate(() => window.__insertion.time);
  await page.waitForTimeout(400);
  assert.equal(await page.evaluate(() => window.__insertion.time), time);
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.waitForFunction((t) => window.__insertion.time > t, time);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  assert.deepEqual(errors, []);
  console.log(
    "Passed: two Franka arms, both insertions, measured seating, reset, pause/resume, views and mobile layout.",
  );
} finally {
  await browser.close();
}
