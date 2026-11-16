// Kinematic illustration only. Thresholds are display-model settings,
// not calibrated robot tolerances, safety limits or measured outcomes.
export const TASKS = Object.freeze({
  usb: Object.freeze({
    title: "USB-C insertion",
    description:
      "Align the reversible Type-C plug with the small receptacle, then advance along the insertion axis.",
    axis: "Vertical",
    initial: [2.4, -1.6, 4],
    clearance: 0.65,
    angleLimit: 0.8,
    depth: 6,
  }),
  ac: Object.freeze({
    title: "Charger insertion",
    description:
      "Align both blades of the rounded charger with the power-strip slots, then lower the adapter into place.",
    axis: "Fore–aft",
    initial: [-3, 2, 5],
    clearance: 0.8,
    angleLimit: 1,
    depth: 12,
  }),
});
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (t) => {
  t = clamp(t, 0, 1);
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, t) => a + (b - a) * t;
export function createTask(key) {
  const [x, y, angle] = TASKS[key].initial;
  return {
    key,
    x,
    y,
    angle,
    gap: 55,
    stage: "approach",
    seated: false,
    blocked: false,
  };
}
export function aligned(task) {
  const config = TASKS[task.key];
  return (
    [task.x, task.y, task.angle].every(Number.isFinite) &&
    Math.hypot(task.x, task.y) <= config.clearance &&
    Math.abs(task.angle) <= config.angleLimit
  );
}
export function createState() {
  return {
    active: "usb",
    tasks: { usb: createTask("usb"), ac: createTask("ac") },
    running: false,
    mode: null,
    time: 0,
    speed: 1,
    from: null,
    finished: false,
  };
}
export function reset(state) {
  const speed = state.speed;
  Object.assign(state, createState(), { speed });
}
export function setOffset(state, axis, value) {
  if (!["x", "y", "angle"].includes(axis) || !Number.isFinite(value)) return;
  state.running = false;
  state.mode = null;
  state.finished = false;
  const t = state.tasks[state.active];
  if (t.seated) t.gap = 14;
  t[axis] = clamp(value, axis === "angle" ? -8 : -5, axis === "angle" ? 8 : 5);
  t.seated = false;
  t.blocked = false;
  t.stage = aligned(t) ? "aligned" : "align";
}
export function startSequence(state) {
  reset(state);
  state.mode = "sequence";
  state.running = true;
}
export function startAlign(state) {
  const t = state.tasks[state.active];
  state.from = { ...t };
  state.time = 0;
  state.mode = "align";
  state.running = true;
  state.finished = false;
  t.seated = false;
  t.blocked = false;
}
export function tryInsert(state) {
  const t = state.tasks[state.active];
  if (!aligned(t)) {
    t.blocked = true;
    state.running = false;
    state.mode = null;
    return false;
  }
  if (t.seated) return true;
  state.from = { ...t };
  state.time = 0;
  state.mode = "insert";
  state.running = true;
  state.finished = false;
  t.blocked = false;
  return true;
}
function sequencePose(task, time) {
  const config = TASKS[task.key],
    [x, y, a] = config.initial;
  const correction = smooth((time - 2) / 4);
  task.x = x * (1 - correction);
  task.y = y * (1 - correction);
  task.angle = a * (1 - correction);
  task.gap =
    time < 6
      ? lerp(55, 14, smooth(time / 2))
      : lerp(14, -config.depth, smooth((time - 6) / 3));
  task.stage =
    time < 2 ? "approach" : time < 6 ? "align" : time < 9 ? "insert" : "seated";
  task.seated = time >= 9;
  task.blocked = false;
}
export function advance(state, dt) {
  if (!state.running || !Number.isFinite(dt) || dt < 0) return;
  state.time += dt * state.speed;
  if (state.mode === "sequence") {
    const t = state.time;
    sequencePose(state.tasks.usb, Math.min(t, 10));
    if (t >= 10) {
      state.active = "ac";
      sequencePose(state.tasks.ac, Math.min(t - 10, 10));
    } else state.active = "usb";
    if (t >= 20) {
      state.running = false;
      state.mode = null;
      state.finished = true;
    }
    return;
  }
  const task = state.tasks[state.active],
    p = smooth(state.time / 2.4),
    from = state.from;
  if (state.mode === "align") {
    task.x = lerp(from.x, 0, p);
    task.y = lerp(from.y, 0, p);
    task.angle = lerp(from.angle, 0, p);
    task.gap = lerp(Math.max(from.gap, 14), 14, p);
    task.stage = "align";
    if (p === 1) {
      task.stage = "aligned";
      state.running = false;
      state.mode = null;
    }
  } else if (state.mode === "insert") {
    if (!aligned(task)) {
      task.blocked = true;
      state.running = false;
      state.mode = null;
      return;
    }
    task.gap = lerp(from.gap, -TASKS[task.key].depth, p);
    task.stage = "insert";
    if (p === 1) {
      task.stage = "seated";
      task.seated = true;
      state.running = false;
      state.mode = null;
    }
  }
}
