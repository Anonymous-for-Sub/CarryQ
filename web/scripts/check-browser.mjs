import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir } from 'node:fs/promises';

// Software rendering keeps this check independent of a hardware GPU.
const browser = await chromium.launch({
  headless: true,
  args: [
    "--disable-gpu",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const page = await browser.newPage({ viewport: { width: Number(process.env.CARRYQ_CHECK_WIDTH || 1000), height: 740 } });
const errors = [];
const controls = page.locator('.demo-stage .panel');
const screenshots=process.env.CARRYQ_SCREENSHOTS;
if(screenshots)await mkdir(screenshots,{recursive:true});
const capture=async(name)=>{if(screenshots)await page.screenshot({path:`${screenshots}/${name}.png`});};
page.on("pageerror", (e) => errors.push(e.message));
page.on("response", (r) => {
  if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
});
try {
  await page.goto(process.argv[2] || "http://127.0.0.1:36832/CarryQ/", {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.getByRole('button', {name: "Live physics", exact: true}).click();
  await page.locator('.demo-stage').scrollIntoViewIfNeeded();
  await page.waitForFunction(
    () =>
      document.querySelector("[role=status]")?.textContent.startsWith("Ready"),
    {},
    { timeout: 120000 },
  );
  assert.equal(await page.evaluate(() => window.__insertion.actuators), 16);
  assert.ok((await page.evaluate(() => window.__insertion.meshes)) > 100);

  assert.match(
    await page.getByRole("heading", { level: 1 }).textContent(),
    /Beyond Pointwise Accuracy/,
  );
  await capture('overview');
  for(const view of ['usb','charger']){
    await page.getByLabel('View',{exact:true}).selectOption(view);
    await page.waitForTimeout(400);await capture(`${view}-before`);
  }
  await page.getByLabel('View',{exact:true}).selectOption('overview');
  await page.evaluate(() => {
    window.__phaseHistory = [];
    window.__phaseTimer = setInterval(() => {
      const p = window.__insertion?.phase;
      if (p && window.__phaseHistory.at(-1) !== p)
        window.__phaseHistory.push(p);
    }, 40);
  });
  await controls.getByRole("button", { name: "Play", exact: true }).click();
  await page.waitForFunction(
    () =>
      document.querySelector("[role=status]")?.textContent.includes("Seated") ||
      window.__insertion?.phase === "blocked",
    {},
    { timeout: 300000 },
  );
  assert.ok(
    await page.evaluate(() =>
      window.__insertion.measurements.every((m) => m.seated),
    ),
  );
  const phases = await page.evaluate(() => {
    clearInterval(window.__phaseTimer);
    return window.__phaseHistory;
  });
  for (const phase of ["register", "correct", "align", "insert"])
    assert.ok(phases.includes(phase), phase);
  for (const view of ["usb", "charger", "overview"]){
    await page.getByLabel("View", { exact: true }).selectOption(view);
    await page.waitForTimeout(400);await capture(`${view}-seated`);
  }
  await controls.getByRole("button", { name: "Reset", exact: true }).click();
  await page.waitForFunction(
    () =>
      document.querySelector("[role=status]")?.textContent.startsWith("Ready"),
    {},
    { timeout: 120000 },
  );
  await page.waitForFunction(() =>
    window.__insertion?.measurements.every((m) => !m.seated),
  );
  await controls.getByRole("button", { name: "Play", exact: true }).click();
  await page.waitForTimeout(600);
  await controls.getByRole("button", { name: "Pause", exact: true }).click();
  await page.waitForTimeout(300);
  const time = await page.evaluate(() => window.__insertion.time);
  await page.waitForTimeout(400);
  assert.equal(await page.evaluate(() => window.__insertion.time), time);
  await controls.getByRole("button", { name: "Resume", exact: true }).click();
  await page.waitForFunction((t) => window.__insertion.time > t, time);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  const rects = await page.evaluate(() => {
    const canvas = document.querySelector('.demo-stage canvas').getBoundingClientRect();
    const controls = document.querySelector('.demo-stage .panel').getBoundingClientRect();
    return {canvasBottom:canvas.bottom,controlsTop:controls.top};
  });
  assert.ok(rects.canvasBottom <= rects.controlsTop, 'mobile controls overlap canvas');
  await capture('mobile');
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  assert.deepEqual(errors, []);
  console.log(
    "Passed: two Franka arms, both insertions, measured seating, reset, pause/resume, views and mobile layout.",
  );
} catch (error) {
  console.error("Last simulation state:", await page.evaluate(() => ({status:document.querySelector('[role=status]')?.textContent,simulation:window.__insertion})).catch(() => null));
  await capture('failure').catch(() => {});
  throw error;
} finally {
  await browser.close();
}
