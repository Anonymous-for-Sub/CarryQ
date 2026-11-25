import { chromium } from 'playwright';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const output = process.argv[3];
if (!output) throw new Error('Usage: node scripts/capture-sequences.mjs URL OUTPUT_DIRECTORY [saved-states.json]');
await mkdir(path.join(output, 'frames'), { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--disable-gpu', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 640, height: 480 } });
const errors = [];
page.on('pageerror', e => { errors.push(e.message); console.error(e.message); });
page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
const url = new URL(process.argv[2]); url.searchParams.set('capture', '1');
try {
  await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.getByRole('button', { name: "Live physics", exact: true }).click();
  await page.locator('.demo-stage').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => window.__taskCapture && document.querySelector('[role=status]')?.textContent.startsWith('Ready'), null, { timeout: 120000 });
  console.log('Scene ready.');
  if (process.argv[4]) {
    const saved = JSON.parse(await readFile(process.argv[4], 'utf8'));
    await page.evaluate(states => { window.__captureStates = states; }, saved);
  } else {
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    const progress = setInterval(async () => {
      try { console.log(await page.evaluate(() => ({ time: window.__insertion?.time, phase: window.__insertion?.phase, frames: window.__captureStates?.length }))); } catch {}
    }, 30000);
    try {
      await page.waitForFunction(() => document.querySelector('[role=status]')?.textContent.includes('Seated'), null, { timeout: 600000 });
    } finally { clearInterval(progress); }
  }
  await page.evaluate(() => window.__taskCapture.pause());
  const states = await page.evaluate(() => window.__captureStates.map(s => ({ ...s, snapshot: Object.fromEntries(Object.entries(s.snapshot).map(([k, v]) => [k, typeof v === 'number' ? v : Array.from(v)])) })));
  await writeFile(path.join(output, 'states.json'), JSON.stringify(states, null, 2));
  assert.equal(states.length, 14, 'seven physics states per task');
  for (const task of ['usb', 'charger']) assert.ok(states.find(s => s.task === task && s.index === 6).measured.seated, `${task} seated`);
  const metadata = { source: 'Scripted MuJoCo illustration, not an experimental policy rollout', stateMode: process.argv[4] ? 'Re-rendered recorded physics states' : 'Newly recorded physics states', url: url.href, cameras: await page.evaluate(() => window.__taskCapture.specs), frames: [] };
  for (let i = 0; i < states.length; i++) {
    const state = states[i];
    await page.evaluate(i => window.__taskCapture.restore(window.__captureStates[i].snapshot), i);
    await page.waitForTimeout(350);
    for (const view of ['global', 'wrist']) {
      const result = await page.evaluate(({ key }) => window.__taskCapture.render(key, 1600, 1200), { key: `${view}-${state.task}` });
      const file = `frames/${state.task}-${state.index + 1}-${view}.png`;
      await writeFile(path.join(output, file), Buffer.from(result.png.split(',')[1], 'base64'));
      delete result.png;
      assert.equal(result.time, state.snapshot.time, 'global and wrist use the exact saved state');
      metadata.frames.push({ file, label: state.label, ...result });
    }
    console.log(`${state.task} ${state.index + 1}/7: ${state.label}, t=${state.snapshot.time.toFixed(3)}`);
    if (state.index === 5) {
      const result = await page.evaluate(key => window.__taskCapture.render(key, 3200, 2400), `global-${state.task}`);
      await writeFile(path.join(output, `${state.task}-detail.png`), Buffer.from(result.png.split(',')[1], 'base64'));
    }
  }
  for (const task of ['usb', 'charger']) {
    const fixed = metadata.frames.filter(f => f.file.startsWith(`frames/${task}-`) && f.file.endsWith('-global.png'));
    for (const frame of fixed) {
      assert.deepEqual(frame.position, fixed[0].position, 'global position is fixed');
      assert.deepEqual(frame.quaternion, fixed[0].quaternion, 'global orientation is fixed');
      assert.equal(frame.fov, fixed[0].fov, 'global field of view is fixed');
    }
  }
  for (const view of ['global-usb', 'global-charger', 'wrist-usb', 'wrist-charger', 'overview']) {
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.getByLabel('View', { exact: true }).selectOption(view);
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(output, `${view}-page.png`) });
  }
  assert.deepEqual(errors, []);
  await writeFile(path.join(output, 'capture.json'), JSON.stringify(metadata, null, 2));
  console.log('PASS: both insertions, 14 measured states, 28 synchronized sensor frames, four camera views, no browser errors.');
} finally { await browser.close(); }
