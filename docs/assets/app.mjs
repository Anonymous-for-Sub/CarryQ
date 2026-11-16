import {
  TASKS,
  createState,
  reset,
  setOffset,
  startSequence,
  startAlign,
  tryInsert,
  advance,
  aligned,
} from "./model.mjs";
import { createScene } from "./scene.mjs";

const $ = (id) => document.getElementById(id);
const state = createState();
const signed = (v, unit) =>
  `${v < 0 ? "−" : "+"}${Math.abs(v).toFixed(1)}${unit}`;
const setText = (id, text) => {
  if ($(id).textContent !== text) $(id).textContent = text;
};
let scene;
try {
  scene = createScene($("viewport"), $("detail-canvas"));
  $("loading").remove();
  document.body.dataset.ready = "true";
} catch (error) {
  $("loading").innerHTML =
    '<div class="webgl-error"><b>The 3D view could not start.</b><br>This scene needs a browser with WebGL 2 support. Try a current browser with graphics acceleration enabled.<br>The task descriptions and About panel remain available.</div>';
  for (const b of document.querySelectorAll(
    ".playback button,.manual button,.manual input,.view-button,.task-tab",
  ))
    b.disabled = true;
  document.body.dataset.ready = "error";
  console.error("Workcell rendering unavailable:", error.message);
}

function view(key) {
  scene?.setView(key, matchMedia("(prefers-reduced-motion: reduce)").matches);
  document.body.dataset.view = key;
  document.querySelectorAll("[data-view]").forEach((b) => {
    const selected = b.dataset.view === key;
    b.classList.toggle("active", selected);
    b.setAttribute("aria-pressed", String(selected));
  });
}
function updateUI() {
  const t = state.tasks[state.active],
    config = TASKS[state.active];
  setText("task-title", config.title);
  setText("task-description", config.description);
  setText("secondary-axis", config.axis);
  setText(
    "inset-title",
    state.active === "usb" ? "01 / CONNECTOR DETAIL" : "02 / DUAL-PIN DETAIL",
  );
  setText(
    "progress-count",
    `${Object.values(state.tasks).filter((x) => x.seated).length} / 2 seated`,
  );
  document.querySelectorAll("[data-task]").forEach((button) => {
    const selected = button.dataset.task === state.active;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
    const check = $(`check-${button.dataset.task}`);
    check.textContent = state.tasks[button.dataset.task].seated ? "✓" : "○";
    check.classList.toggle("done", state.tasks[button.dataset.task].seated);
  });
  const stage =
    t.stage === "approach" ? 0 : ["align", "aligned"].includes(t.stage) ? 1 : 2;
  ["approach", "align", "insert"].forEach((name, i) => {
    const el = $(`stage-${name}`);
    el.classList.toggle("current", i === stage && !t.seated);
    el.classList.toggle("done", i < stage || t.seated);
  });
  $("offset-value").innerHTML =
    `${Math.hypot(t.x, t.y).toFixed(2)} <small>mm</small>`;
  $("angle-value").innerHTML =
    `${Math.abs(t.angle).toFixed(1)} <small>°</small>`;
  setText("x-value", signed(t.x, " mm"));
  setText("y-value", signed(t.y, " mm"));
  setText("rotation-value", signed(t.angle, "°"));
  const params = [
    ["offset-x", "x"],
    ["offset-y", "y"],
    ["offset-angle", "angle"],
  ];
  params.forEach(([id, k]) => {
    const slider = $(id);
    if (document.activeElement !== slider) slider.value = t[k];
    slider.disabled = state.running;
  });
  $("align").disabled = state.running;
  $("insert").disabled = state.running || t.seated;
  setText("play-icon", state.running ? "Ⅱ" : "▶");
  setText(
    "play-label",
    state.running
      ? "Pause"
      : state.mode
        ? "Resume"
        : state.finished
          ? "Replay both tasks"
          : "Play both tasks",
  );
  setText(
    "playback-status",
    state.running
      ? "Scripted playback"
      : state.mode
        ? "Paused"
        : state.finished
          ? "Sequence complete"
          : "Ready to explore",
  );
  let message = "Fine alignment needed before insertion.";
  if (t.seated)
    message =
      "Seated in the model. No electrical connection is being measured.";
  else if (t.blocked)
    message =
      "Insertion blocked: correct the lateral / secondary offset and rotation first.";
  else if (state.running)
    message =
      state.mode === "align"
        ? "Scripted fine-alignment motion…"
        : state.mode === "insert" || t.stage === "insert"
          ? "Advancing along the insertion axis…"
          : "Scripted approach and alignment…";
  else if (aligned(t))
    message = "Within the illustrative alignment gate. Try insertion.";
  setText("alignment-message", message);
  $("alignment-message").classList.toggle("blocked", t.blocked);
  document.body.dataset.activeTask = state.active;
  document.body.dataset.phase = t.stage;
  document.body.dataset.running = String(state.running);
}

document.querySelectorAll("[data-task]").forEach((b) =>
  b.addEventListener("click", () => {
    state.active = b.dataset.task;
    state.running = false;
    state.mode = null;
    state.finished = false;
    view(state.active);
    updateUI();
  }),
);
document
  .querySelectorAll("[data-view]")
  .forEach((b) => b.addEventListener("click", () => view(b.dataset.view)));
$("play").addEventListener("click", () => {
  if (state.running) state.running = false;
  else if (state.mode) state.running = true;
  else {
    startSequence(state);
    view("overview");
  }
  updateUI();
});
$("reset").addEventListener("click", () => {
  reset(state);
  view("overview");
  updateUI();
});
$("speed").addEventListener("change", () => {
  state.speed = Number($("speed").value);
});
for (const [id, axis] of [
  ["offset-x", "x"],
  ["offset-y", "y"],
  ["offset-angle", "angle"],
])
  $(id).addEventListener("input", (e) => {
    setOffset(state, axis, Number(e.target.value));
    updateUI();
  });
$("align").addEventListener("click", () => {
  startAlign(state);
  view(state.active);
  updateUI();
});
$("insert").addEventListener("click", () => {
  tryInsert(state);
  updateUI();
});
for (const id of ["about-open", "limits-open"])
  $(id).addEventListener("click", () => {
    $("about-dialog").showModal();
    if (state.running) {
      state.running = false;
      updateUI();
    }
  });
$("about-dialog").addEventListener("click", (e) => {
  if (e.target === $("about-dialog")) {
    const r = $("about-dialog").getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      $("about-dialog").close();
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && state.running) {
    state.running = false;
    updateUI();
  }
});
// Read-only state is useful for accessibility and automated interaction checks.
window.carryqDemo = Object.freeze({
  snapshot: () => JSON.parse(JSON.stringify(state)),
});
let last = performance.now(),
  uiTime = 0;
function tick(now) {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  advance(state, dt);
  scene?.render(state, dt);
  uiTime += dt;
  if (uiTime > 0.1) {
    updateUI();
    uiTime = 0;
  }
  requestAnimationFrame(tick);
}
updateUI();
if (scene) requestAnimationFrame(tick);
