import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const [url, input, output] = process.argv.slice(2);
if (!url || !input || !output) throw new Error("Usage: node scripts/export-workcell.mjs URL states.json recording.json");
const stateBytes = await readFile(input);
const states = JSON.parse(stateBytes);
const browser = await chromium.launch({
  headless: true,
  args: ['--disable-gpu', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
try {
  const page = await browser.newPage({
    viewport: {
      width: 1100,
      height: 800
    },
    reducedMotion: 'reduce'
  });
  page.on('pageerror', e => console.log('ERROR', e.message));
  const target = new URL(url);
  target.searchParams.set('capture', '1');
  await page.goto(target.href, {
    waitUntil: 'domcontentloaded',
    timeout: 120000
  });
  await page.getByRole('button', {
    name: 'Live physics',
    exact: true
  }).click();
  await page.locator('.demo-stage').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => window.__taskCapture && window.__insertion?.meshes > 100, null, {
    timeout: 120000
  });
  console.log('Ready');
  await page.evaluate(async states => {
    const capture = window.__taskCapture;
    capture.pause();
    const scene = capture.scene;
    const meshes = [];
    const handFrames=[];
    const plainGeometry = source => {
      const geometry = source.clone();
      let prototype = Object.getPrototypeOf(geometry);
      while (prototype && !Object.hasOwn(prototype, "getAttribute")) prototype = Object.getPrototypeOf(prototype);
      Object.setPrototypeOf(geometry, prototype);
      delete geometry.parameters;
      geometry.type = "BufferGeometry";
      return geometry;
    };
    scene.updateMatrixWorld(true);
    scene.traverse(o => {
      if (!o.isMesh || !o.geometry.attributes.position || !o.visible) return;
      for(let parent=o;parent;parent=parent.parent)if(parent.userData.sensorOverlay||!parent.visible)return;
      const clone = o.clone(false);
      clone.name = 'mesh_' + meshes.length;
      clone.geometry = plainGeometry(o.geometry);
      o.matrixWorld.decompose(clone.position, clone.quaternion, clone.scale);
      meshes.push({
        original: o,
        clone,
        cableKind:o.userData.cableKind,
        geomName:capture.geomName(o),
        frames: [],
        geometries: []
      });
    });
    const frame = () => {
      scene.updateMatrixWorld(true);
      handFrames.push(capture.handPoses());
      for (const m of meshes) {
        const object = m.original;
        object.matrixWorld.decompose(m.clone.position, m.clone.quaternion, m.clone.scale);
        m.frames.push([...m.clone.position.toArray(), ...m.clone.quaternion.toArray()]);
        if (!m.cableKind && object.geometry !== m.geometryRef) {
          m.geometryRef = object.geometry;
          const geometry = plainGeometry(object.geometry);
          m.geometries.push({
            index: m.frames.length - 1,
            geometry: geometry.toJSON()
          });
        }
      }
    };
    frame();
    for (const state of states) {
      capture.restore(state.snapshot);
      await new Promise(resolve => setTimeout(resolve, 90));
      frame();
    }
    // Three.js JSON preserves the original meshes and materials.
    const clone = scene.clone(false);
    clone.clear();
    clone.background = null;
    clone.environment = null;
    for (const m of meshes) {
      m.clone.position.fromArray(m.frames[0], 0);
      m.clone.quaternion.fromArray(m.frames[0], 3);
      m.clone.matrixAutoUpdate = true;
      m.clone.updateMatrix();
      clone.add(m.clone);
    }
    window.__exportedScene = {
      object: clone.toJSON(),
      cables:{
        usb:meshes.find(mesh=>mesh.cableKind==="usb").clone.name,
        power:meshes.find(mesh=>mesh.cableKind==="power").clone.name,
        usbAnchor:meshes.find(mesh=>mesh.geomName==="usb_strain_relief").clone.name,
      },
      handFrames,
      times: [0, ...states.map(s => s.snapshot.time)],
      labels: [{
        task: 'both',
        label: 'Ready'
      }, ...states.map(s => ({
        task: s.task,
        label: s.label
      }))],
      meshes: meshes.map(m => ({
        name: m.clone.name,
        frames: m.frames,
        geometryFrames: m.geometries.length > 1 ? m.geometries : []
      })),
      source: 'Recorded MuJoCo poses, with interpolation between saved states'
    };
  }, states);
  const result = await page.evaluate(() => JSON.stringify(window.__exportedScene));
  const recording = JSON.parse(result);
  recording.provenance = {
    states_sha256: createHash("sha256").update(stateBytes).digest("hex"),
    saved_poses: states.length,
    interpolation: "world-position linear and quaternion spherical interpolation",
    source: "Scripted MuJoCo task illustration"
  };
  await writeFile(output, JSON.stringify(recording));
  console.log("Saved", states.length, "poses to", output);
} finally {
  await browser.close();
}
