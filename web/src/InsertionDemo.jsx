import React, { useEffect, useRef, useState } from "react";
import { OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import {
  MujocoProvider,
  MujocoCanvas,
  useMujoco,
  useMujocoWasm,
  useBeforePhysicsStep,
  useAfterPhysicsStep,
  useGravityCompensation,
  findJointByName,
  findSiteByName,
} from "mujoco-react";
import { solveSelectedIk } from "./selectedIkSolver.js";
import {
  HOME,
  TASKS,
  DOWN,
  PHASES,
  DURATIONS,
  PHASE_LABELS,
  targetFor,
  measuredFit,
  smooth,
} from "./task.js";
import { Cables } from "./Cables.jsx";
import { TaskCameras } from "./TaskCameras.jsx";
import CameraFeedLabels from "./CameraFeedLabels.jsx";
import { WORKCELL_COLORS } from "./workcellAppearance.js";
import PlayOverlay from "./PlayOverlay.jsx";


const config = {
  src: `${import.meta.env.BASE_URL}franka/`,
  sceneFile: "scene.xml",
  homeJoints: TASKS.flatMap((t) => [...HOME.slice(0, 7), t.grip]),
};

function Camera({ view }) {
  const { camera, size } = useThree();
  const controls = useRef();
  useEffect(() => {
    if (view.startsWith('global-') || view.startsWith('wrist-')) return;
    const t = TASKS.find((t) => t.key === view);
    const target = t ? [t.x, t.y, t.mouth + 0.025] : [0.48, 0, 0.27];
    camera.position.set(
      ...(t
        ? [t.x + 0.19, t.y + (t.key === "usb" ? 0.24 : -0.24), t.mouth + 0.17]
        : view==="setup" ? [2.5,-2.6,2.2] : [1.03, -1.55, 1.22]),
    );
    if (size.width < size.height) {
      const scale = t ? 1.35 : 2.2;
      camera.position.set(
        target[0] + (camera.position.x - target[0]) * scale,
        target[1] + (camera.position.y - target[1]) * scale,
        target[2] + (camera.position.z - target[2]) * scale,
      );
      if (!t) target[2] += 0.2;
    }
    camera.near = 0.002;
    camera.fov = 42;
    camera.updateProjectionMatrix();
    controls.current?.target.set(...target);
    controls.current?.update();
  }, [view, camera, size.width, size.height]);
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enabled={!view.startsWith('global-') && !view.startsWith('wrist-')}
      enableDamping
      minDistance={0.05}
      maxDistance={5}
      target={[0.25, 0, 0.28]}
    />
  );
}

function Controller({ command, onStatus, onFinish, onReady, onTask }) {
  const sim = useMujoco();
  const { mujoco } = useMujocoWasm();
  const state = useRef(null);
  const lastReport = useRef(-1);
  useGravityCompensation(true);
  useEffect(() => {
    if (sim.status !== "ready" || !mujoco) return;
    const model = sim.mjModelRef.current,
      data = sim.mjDataRef.current;
    const scratch = new mujoco.MjData(model);
    const arms = TASKS.map((task, index) => {
      const ids = Array.from({ length: 7 }, (_, j) =>
        findJointByName(model, `${task.key}_joint${j + 1}`),
      );
      const addresses = ids.map((id) => model.jnt_qposadr[id]);
      const ranges = ids.map((id) => [
        model.jnt_range[2 * id],
        model.jnt_range[2 * id + 1],
      ]);
      for (let j = 1; j <= 2; j++) {
        const id = findJointByName(model, `${task.key}_finger_joint${j}`);
        data.qpos[model.jnt_qposadr[id]] = (task.grip / 255) * 0.04;
      }
      return {
        task,
        addresses,
        ranges,
        ctrl: index * 8,
        site: findSiteByName(model, `${task.key}_tip`),
      };
    });
    mujoco.mj_forward(model, data);
    if (import.meta.env.DEV)
      window.__insertionTest = { model, data, mujoco, arms, solveSelectedIk };
    state.current = {
      arms,
      scratch,
      active: false,
      queue: [],
      phase: "ready",
      model,
      captured: new Set(),
    };
    if (new URLSearchParams(location.search).has('capture')) window.__captureStates = [];
    onReady(true);
    onStatus("Ready · Choose a task and press Play");
    return () => {
      state.current = null;
      scratch.delete?.();
      delete window.__insertionTest;
      onReady(false);
    };
  }, [sim.status, mujoco]);

  useEffect(() => {
    const s = state.current;
    if (!s || !command.id) return;
    s.queue =
      command.task === "both" ? [0, 1] : [command.task === "usb" ? 0 : 1];
    s.active = true;
    s.phase = "start";
    s.armIndex = s.queue.shift();
  }, [command]);

  const plan = (s, arm, phase, data) => {
    s.scratch.qpos.set(data.qpos);
    const q = arm.addresses.map((a) => data.qpos[a]);
    const goal = solveSelectedIk({
      mujoco,
      model: s.model,
      data: s.scratch,
      siteId: arm.site,
      qposAddresses: arm.addresses,
      currentQ: q,
      targetPosition: targetFor(arm.task, phase),
      targetQuaternion: DOWN,
      jointRanges: arm.ranges,
      maxIterations: 120,
      tolerance: 0.00002,
      damping: 0.00005,
    });
    if (!goal || goal.some((v) => !Number.isFinite(v)))
      throw new Error("Unable to solve insertion pose");
    // Check the actual solved pose before commanding any motion.
    goal.forEach((v, i) => (s.scratch.qpos[arm.addresses[i]] = v));
    mujoco.mj_forward(s.model, s.scratch);
    const p = targetFor(arm.task, phase),
      o = arm.site * 3;
    if (
      Math.hypot(
        s.scratch.site_xpos[o] - p.x,
        s.scratch.site_xpos[o + 1] - p.y,
        s.scratch.site_xpos[o + 2] - p.z,
      ) > 0.00025
    )
      throw new Error("Insertion pose is outside the verified IK tolerance");
    s.from = q;
    s.to = goal;
    s.start = data.time;
    s.phase = phase;
    s.duration = DURATIONS[phase];
    onTask(arm.task.key);
    onStatus(`${arm.task.name} · ${PHASE_LABELS[phase]}`);
  };
  useBeforePhysicsStep((model, data) => {
    const s = state.current;
    if (!s?.active) return;
    const arm = s.arms[s.armIndex];
    try {
      if (s.phase === "start") plan(s, arm, "approach", data);
      if (s.phase === "settle") return;
      const t = (data.time - s.start) / s.duration,
        blend = smooth(t);
      for (let j = 0; j < 7; j++)
        data.ctrl[arm.ctrl + j] = s.from[j] + blend * (s.to[j] - s.from[j]);
      if (t >= 1) {
        const next = PHASES[PHASES.indexOf(s.phase) + 1];
        if (next) plan(s, arm, next, data);
        else {
          s.phase = "settle";
          s.start = data.time;
        }
      }
    } catch (e) {
      s.active = false;
      onStatus(e.message);
      onFinish();
    }
  });
  useAfterPhysicsStep((model, data) => {
    const s = state.current;
    if (!s) return;
    const measured = s.arms.map((a) => {
      const o = a.site * 3,
        r = a.site * 9;
      const tip = Array.from(data.site_xpos.slice(o, o + 3));
      const fit = measuredFit(a.task, tip, [
        data.site_xmat[r + 2],
        data.site_xmat[r + 5],
        data.site_xmat[r + 8],
      ]);
      return { task: a.task.key, tip, ...fit };
    });
    if (window.__captureStates && s.active) {
      const elapsed = data.time - s.start;
      const marks = [
        ['approach', 3.96, 'Approach'], ['register', 1.96, 'Coarse alignment'],
        ['correct', .6, 'Lateral correction'], ['correct', 1.17, 'Centered'],
        ['align', 1.17, 'Pre-insertion'], ['insert', 2.0, 'Insertion'],
        ['settle', .98, 'Seated'],
      ];
      marks.forEach(([phase, delay, label], index) => {
        const key = `${s.armIndex}-${index}`;
        if (s.phase === phase && elapsed >= delay && !s.captured.has(key)) {
          s.captured.add(key);
          window.__captureStates.push({ task: s.arms[s.armIndex].task.key, index, label, phase, measured: measured[s.armIndex], snapshot: sim.api.saveState() });
        }
      });
    }
    if (data.time - lastReport.current > 0.1) {
      lastReport.current = data.time;
      window.__insertion = {
        time: data.time,
        phase: s.phase,
        active: s.active,
        contacts: data.ncon,
        measurements: measured,
        qpos: Array.from(data.qpos),
        actuators: model.nu,
        meshes: model.nmesh,
      };
    }
    if (s.active && s.phase === "settle" && data.time - s.start > 1) {
      const a = s.arms[s.armIndex],
        fit = measured[s.armIndex];
      if (fit.seated) {
        if (s.queue.length) {
          s.armIndex = s.queue.shift();
          s.phase = "start";
        } else {
          s.active = false;
          s.phase = "complete";
          onStatus(
            `${command.task === "both" ? "Both tasks" : a.task.name} · Seated`,
          );
          onFinish();
        }
      } else if (data.time - s.start > 4) {
        s.active = false;
        s.phase = "blocked";
        onStatus(`${a.task.name} · Alignment not reached — reset to retry`);
        onFinish();
      }
    }
  });
  return null;
}

export default function InsertionDemo() {
  const [ready, setReady] = useState(false),
    [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false),
    [generation, setGeneration] = useState(0);
  const [task, setTask] = useState("both"),
    [view, setView] = useState("overview");
  const [status, setStatus] = useState("Loading Franka models…");
  const [command, setCommand] = useState({ id: 0, task: "both" });
  const [details, setDetails] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [started,setStarted] = useState(false);
  const finish = () => {
    setRunning(false);
    setPaused(false);
  };
  const reset = () => {
    setStarted(false);
    setRunning(false);
    setPaused(false);
    setReady(false);
    setActiveTask(null);
    setStatus("Loading Franka models…");
    setCommand({ id: 0, task });
    setGeneration((g) => g + 1);
  };
  const play = () => {
    setStarted(true);
    if (running) {
      setPaused((p) => !p);
      return;
    }
    setRunning(true);
    setPaused(false);
    setCommand((c) => ({ id: c.id + 1, task }));
  };
  return (
    <>
      <MujocoProvider timeout={120000} onError={(e) => setStatus(e.message)}>
        <MujocoCanvas
          key={generation}
          config={config}
          paused={paused}
          shadows
          camera={{
            position: [1.28, -1.45, 1.22],
            up: [0, 0, 1],
            fov: 42,
            near: 0.002,
            far: 30,
          }}
          dpr={[1, 1.5]}
          gl={{ antialias: true }}
          onError={(e) => {
            setStatus(e.message);
            setReady(false);
          }}
          style={{ width: "100%", height: "100%" }}
        >
          <Camera view={view} />
          <Cables />
          <TaskCameras view={view} />
          <Controller
            command={command}
            onStatus={setStatus}
            onFinish={finish}
            onReady={setReady}
            onTask={setActiveTask}
          />
          <color attach="background" args={[WORKCELL_COLORS.background]} />
          <ambientLight intensity={0.9} />
          <directionalLight
            position={[1, -2, 5]}
            intensity={1.7}
            castShadow
            shadow-mapSize={[2048, 2048]}
          />
          <directionalLight position={[-2, 2, 3]} intensity={0.5} />
          <gridHelper
            args={[6, 60, "#a2aaa6", "#c0c6c0"]}
            rotation={[Math.PI / 2, 0, 0]}
            position={[0, 0, -0.054]}
          />
        </MujocoCanvas>
      </MujocoProvider>
      {ready && !started && <PlayOverlay live onPlay={play}/>}
      <CameraFeedLabels onSelect={setView} />
      <section className="panel" aria-label="Insertion controls">
        <div className="title">Franka · Precision insertion</div>
        <label>
          Task
          <select
            aria-label="Task"
            value={task}
            disabled={running}
            onChange={(e) => setTask(e.target.value)}
          >
            <option value="both">Both tasks</option>
            {TASKS.map((t) => (
              <option key={t.key} value={t.key}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <div className="actions">
          <button onClick={play} disabled={!ready}>
            {running ? (paused ? "Resume" : "Pause") : "Play"}
          </button>
          <button onClick={reset}>Reset</button>
        </div>
        <label className="view">
          View
          <select
            aria-label="View"
            value={view}
            onChange={(e) => setView(e.target.value)}
          >
            <option value="overview">Workcell</option>
            <option value="setup">Full camera setup</option>
            <option value="usb">USB-C close-up</option>
            <option value="charger">Power strip close-up</option>
            <option value="global-usb">Global 1 · USB-C</option>
            <option value="global-charger">Global 2 · Power strip</option>
            <option value="wrist-usb">Wrist · USB-C</option>
            <option value="wrist-charger">Wrist · Charger</option>
          </select>
        </label>
        <div className="status" role="status">
          {paused ? "Paused" : status}
        </div>
      </section>
      <button
        className="about"
        onClick={() => setDetails((d) => !d)}
        aria-expanded={details}
      >
        About this scene
      </button>
      {details && (
        <aside className="note">
          <strong>Precision insertion in MuJoCo</strong>
          <p>
            Two Franka Panda arms, a USB-C plug and socket, and a compact
            two-blade charger with a power strip.
          </p>
          <p>
            Scripted actuator control with collision geometry. Parts start
            rigidly held in the grippers; pickup and electrical conduction are
            not simulated. “Seated” is checked from the simulated tip pose, not
            a timer.
          </p>
          <p>
            This task illustration is not a CarryQ policy rollout or an
            experimental result. Drag to orbit, scroll to zoom.
            Global views are fixed; wrist views move rigidly with each hand.
          </p>
          <a href="./site-notes.md">Scene notes and credits</a>
        </aside>
      )}
    </>
  );
}
