import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { test } from "node:test";
import { ObjectLoader, Box3, Vector3 } from "../web/node_modules/three/build/three.module.js";

const file = new URL("../web/public/media/workcell.json.gz", import.meta.url);
const recording = JSON.parse(gunzipSync(readFileSync(file)));
for (const geometry of recording.object.geometries) {
  for (const attribute of Object.values(geometry.data?.attributes || {})) {
    if (!attribute.base64) continue;
    const bytes = Uint8Array.from(Buffer.from(attribute.base64, "base64"));
    attribute.array = new Float32Array(bytes.buffer);
    delete attribute.base64;
  }
}
test("recorded geometry keeps metre-scale robot parts after serialization", () => {
  const scene = new ObjectLoader().parse(recording.object);
  scene.updateMatrixWorld(true);
  for (const mesh of scene.children) {
    const size = new Box3().setFromObject(mesh).getSize(new Vector3());
    const extent = Math.max(size.x, size.y, size.z);
    assert.ok(Number.isFinite(extent));
    if (!["mesh_0", "mesh_1"].includes(mesh.name)) {
      assert.ok(extent < 1, mesh.name + " has an oversized primitive");
    }
  }
});
test("recorded playback retains ordered states and finite transforms", () => {
  assert.equal(recording.times.length, recording.labels.length);
  for (let i = 1; i < recording.times.length; i++) {
    assert.ok(recording.times[i] > recording.times[i - 1]);
  }
  for (const mesh of recording.meshes) {
    assert.ok(mesh.frames.length === 1 || mesh.frames.length === recording.times.length);
    assert.ok(mesh.frames.every(frame => frame.length === 7 && frame.every(Number.isFinite)));
  }
});
