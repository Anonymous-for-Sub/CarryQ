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
  assert.ok(await page.locator(".recorded-canvas").evaluate((element) => element.getBoundingClientRect().top < innerHeight && element.getBoundingClientRect().height >= 600));

  const demo = page.locator("#demo");
  await demo.getByRole("button", { name: "Start recorded demonstration", exact: true }).click();
  assert.equal(await demo.getByRole("button", { name: "Start recorded demonstration", exact: true }).count(),0);
  await page.waitForFunction(() => +document.querySelector("#scene-time").value > 0.3);
  await demo.getByRole("button", { name: "Pause", exact: true }).click();
  const time = await page.locator("#scene-time").inputValue();
  await page.waitForTimeout(250);
  assert.equal(await page.locator("#scene-time").inputValue(), time);
  await demo.getByRole("button", { name: "Reset", exact: true }).click();
  assert.equal(+(await page.locator("#scene-time").inputValue()), 0);
  assert.equal(await demo.getByRole("button", { name: "Start recorded demonstration", exact: true }).count(),1);
  await page.locator("#playback-task").selectOption("charger");
  assert.ok(+(await page.locator("#scene-time").inputValue()) > 14);
  await page.locator("#playback-view").selectOption("charger");
  await page.locator("#scene-time").fill("25.04");
  await demo.screenshot({ path: folder + "/charger-view.png" });
  await page.locator("#playback-task").selectOption("both");
  await page.locator("#playback-view").selectOption("overview");
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: folder + "/first-screen.png" });

  assert.equal(await page.locator(".sensor-feed-labels button").count(),4);
  await page.locator(".sensor-feed-labels").getByRole("button",{name:"USB-C · wrist",exact:true}).click();
  assert.equal(await page.locator("#playback-view").inputValue(),"wrist-usb");
  const diagram=page.locator(".system-architecture");
  await diagram.getByRole("button",{name:"Joint targets",exact:true}).click();
  await diagram.getByText("Difference joint targets",{exact:true}).waitFor();
  await diagram.getByRole("button",{name:"Scalar",exact:true}).click();
  await diagram.getByRole("button",{name:"Expand",exact:true}).click();
  assert.equal(await page.getByRole("dialog").count(),1);
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").count(),0);
  await diagram.screenshot({path:folder+"/architecture.png"});
  const motivation=page.locator(".motivation-diagram");
  await motivation.getByRole("slider",{name:"Executed actions",exact:true}).fill("4");
  assert.match(await motivation.locator(".motivation-readouts").textContent(),/2.00/);
  await motivation.screenshot({path:folder+"/motivation.png"});
  assert.ok(!await page.locator("a").allTextContents().then(values=>values.some(text=>/[↗↓]/.test(text))));
  assert.equal(await page.locator("h1").evaluate(element=>getComputedStyle(element).textAlign),"center");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: folder + "/mobile-first-screen.png" });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await diagram.screenshot({ path: folder + "/mobile-architecture.png" });
  assert.deepEqual(errors, []);
  await writeFile(folder + "/browser-check.json", JSON.stringify({ errors, initialRequests: requests }, null, 2));
  console.log("PASS: 3D playback, four camera views, task/view selection, native dark diagrams, animation controls, modal, centered title, plain navigation labels and mobile layout.");
} finally {
  await browser.close();
}
