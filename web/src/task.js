// Metres, radians; independent Franka workstations on a common bench.
export const HOME = [0, -0.6, 0, -2.1, 0, 1.5, 0.785398, 0];
export const TASKS = [
  {
    key: "usb",
    name: "USB-C insertion",
    y: -0.42,
    x: 0.48,
    mouth: 0.192,
    depth: 0.006,
    tip: 0.145,
    grip: 27,
    tolerance: 0.00065,
  },
  {
    key: "charger",
    name: "Charger → power strip",
    y: 0.42,
    x: 0.48,
    mouth: 0.145,
    depth: 0.014,
    tip: 0.156,
    grip: 112,
    tolerance: 0.0008,
  },
];
export const DOWN = { x: 1, y: 0, z: 0, w: 0 };
export const smooth = (t) => {
  const s = Math.max(0, Math.min(1, t));
  return s * s * (3 - 2 * s);
};
export function targetFor(task, phase) {
  const z =
    phase === "insert"
      ? task.mouth - task.depth
      : phase === "align"
        ? task.mouth + 0.008
        : task.mouth + 0.1;
  return { x: task.x, y: task.y, z };
}
export function measuredFit(task, tip, axis) {
  const lateral = Math.hypot(tip[0] - task.x, tip[1] - task.y);
  const depth = task.mouth - tip[2];
  const tilt = Math.acos(Math.max(-1, Math.min(1, -axis[2])));
  return {
    lateral,
    depth,
    tilt,
    seated:
      lateral < task.tolerance &&
      Math.abs(depth - task.depth) < 0.0008 &&
      tilt < 0.02,
  };
}
