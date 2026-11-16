import test from "node:test";
import assert from "node:assert/strict";
import {
  createState,
  aligned,
  reset,
  setOffset,
  startSequence,
  startAlign,
  tryInsert,
  advance,
} from "../docs/assets/model.mjs";

test("both tasks begin unseated and misaligned", () => {
  const s = createState();
  assert.equal(s.active, "usb");
  for (const t of Object.values(s.tasks)) {
    assert.equal(t.seated, false);
    assert.equal(aligned(t), false);
  }
});
test("misaligned insertion is blocked without moving", () => {
  const s = createState(),
    before = s.tasks.usb.gap;
  assert.equal(tryInsert(s), false);
  advance(s, 4);
  assert.equal(s.tasks.usb.gap, before);
  assert.equal(s.tasks.usb.blocked, true);
});
test("alignment followed by insertion seats each task", () => {
  for (const key of ["usb", "ac"]) {
    const s = createState();
    s.active = key;
    startAlign(s);
    advance(s, 2.5);
    assert.equal(aligned(s.tasks[key]), true);
    assert.equal(s.running, false);
    assert.equal(tryInsert(s), true);
    advance(s, 2.5);
    assert.equal(s.tasks[key].seated, true);
    assert.ok(s.tasks[key].gap < 0);
  }
});
test("manual offsets gate radial displacement and rotation", () => {
  const s = createState();
  setOffset(s, "x", 0);
  setOffset(s, "y", 0);
  setOffset(s, "angle", 2);
  assert.equal(tryInsert(s), false);
  setOffset(s, "angle", 0);
  assert.equal(tryInsert(s), true);
});
test("pause does not advance the task", () => {
  const s = createState();
  startSequence(s);
  advance(s, 3);
  s.running = false;
  const before = JSON.stringify(s);
  advance(s, 5);
  assert.equal(JSON.stringify(s), before);
});
test("sequence completes both tasks in order", () => {
  const s = createState();
  startSequence(s);
  advance(s, 9.5);
  assert.equal(s.tasks.usb.seated, true);
  assert.equal(s.tasks.ac.seated, false);
  advance(s, 1);
  assert.equal(s.active, "ac");
  advance(s, 10);
  assert.equal(s.tasks.ac.seated, true);
  assert.equal(s.finished, true);
  assert.equal(s.running, false);
});
test("reset discards playback and clears both outcomes", () => {
  const s = createState();
  s.speed = 2;
  startSequence(s);
  advance(s, 11);
  reset(s);
  assert.equal(s.speed, 2);
  assert.equal(s.active, "usb");
  assert.equal(s.mode, null);
  assert.equal(s.time, 0);
  assert.equal(s.tasks.usb.seated, false);
  assert.equal(s.tasks.ac.seated, false);
});
test("invalid and out-of-range input cannot bypass gate", () => {
  const s = createState();
  setOffset(s, "x", 100);
  assert.equal(s.tasks.usb.x, 5);
  setOffset(s, "x", NaN);
  assert.equal(s.tasks.usb.x, 5);
  s.tasks.usb.x = Infinity;
  assert.equal(aligned(s.tasks.usb), false);
  assert.equal(tryInsert(s), false);
});
test("editing a seated part retracts it before a new attempt", () => {
  const s = createState();
  startAlign(s);
  advance(s, 3);
  tryInsert(s);
  advance(s, 3);
  setOffset(s, "x", 3);
  assert.equal(s.tasks.usb.seated, false);
  assert.ok(s.tasks.usb.gap > 0);
  assert.equal(tryInsert(s), false);
});
