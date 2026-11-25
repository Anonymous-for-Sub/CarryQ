import React, { lazy, Suspense, useEffect, useRef, useState } from "react";
const LiveWorkcell = lazy(() => import("./InsertionDemo.jsx"));
import CameraFeedLabels from "./CameraFeedLabels.jsx";
import PlayOverlay from "./PlayOverlay.jsx";
const base = import.meta.env.BASE_URL;
function RecordedScene() {
  const container = useRef(null);
  const player = useRef(null);
  const [ready, setReady] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(28.046);
  const [phase, setPhase] = useState("Loading recorded scene…");
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState(false);
  const [started,setStarted] = useState(false);
  const [task, setTask] = useState("both");
  const [view, setView] = useState("overview");
  useEffect(() => {
    const abort = new AbortController();
    let instance;
    import("./recordedWorkcell.js").then(({
      createRecordedWorkcell
    }) => createRecordedWorkcell(container.current, {
      signal: abort.signal,
      onTime: (next, label) => {
        setTime(next);
        setPhase(label);
      },
      onReady: total => {
        setDuration(total);
        setReady(true);
      }
    })).then(next => {
      if (abort.signal.aborted) {
        next.dispose();
        return;
      }
      instance = next;
      player.current = next;
    }).catch(failure => {
      if (!abort.signal.aborted) {
        setError(failure.message);
        setPhase("3D playback unavailable");
      }
    });
    return () => {
      abort.abort();
      instance?.dispose();
      player.current = null;
    };
  }, []);
  return <div className="recorded-scene">
      <div className="recorded-canvas" ref={container}>
        {!ready && <img className="workcell-poster" src={base + "media/workcell-poster.jpg"} alt="Two Franka arms with USB-C and charger insertion fixtures" />}
        {!ready && <span className="scene-load" role="status">{error || "Loading 3D scene…"}</span>}
        {ready && !started && <PlayOverlay onPlay={()=>{player.current.play(true);setPlaying(true);setStarted(true);}}/>}
        <CameraFeedLabels onSelect={key=>{setView(key);player.current?.setView(key);}} />
        <span className="orbit-hint">Drag to rotate · Scroll to zoom</span>
      </div>
      <aside className="workcell-controls">
        <div className="eyebrow">Precision insertion</div>
        <h3>Explore both tasks</h3>
        <label htmlFor="playback-task">Task</label>
        <select id="playback-task" disabled={!ready} value={task} onChange={event => {
        setTask(event.target.value);
        player.current.task(event.target.value);
      }}>
          <option value="both">Both tasks</option>
          <option value="usb">USB-C insertion</option>
          <option value="charger">Charger insertion</option>
        </select>
        <label htmlFor="playback-view">Camera</label>
        <select id="playback-view" disabled={!ready} value={view} onChange={event => {
        setView(event.target.value);
        player.current.setView(event.target.value);
      }}>
          <option value="overview">Workcell</option>
          <option value="setup">Full camera setup</option>
          <option value="usb">USB-C close-up</option>
          <option value="charger">Charger close-up</option>
          <option value="global-usb">USB-C external camera</option>
          <option value="wrist-usb">USB-C wrist camera</option>
          <option value="global-charger">Charger external camera</option>
          <option value="wrist-charger">Charger wrist camera</option>
        </select>
        <div className="actions">
          <button className="primary" disabled={!ready} onClick={() => {
          player.current.play(!playing);
          if(!playing)setStarted(true);
          setPlaying(!playing);
        }}>{playing ? "Pause" : "Play"}</button>
          <button disabled={!ready} onClick={() => {
          player.current.play(false);
          player.current.reset();
          setPlaying(false);
          setStarted(false);
        }}>Reset</button>
        </div>
        <span className="playback-phase" role="status">{phase}</span>
      </aside>
      <div className="scene-timeline">
        <label htmlFor="scene-time">Playback</label>
        <input id="scene-time" type="range" min="0" max={duration} step="any" value={time} disabled={!ready} onChange={event => player.current.seek(+event.target.value)} />
        <output>{time.toFixed(1)} / {duration.toFixed(1)} s</output>
      </div>
    </div>;
}
export default function Workcell() {
  const [mode, setMode] = useState("recorded");
  return <section id="demo" className="hero-workcell">
      <div className="workcell-heading">
        <h2>Interactive insertion workcell</h2>
        <div className="figure-options" role="group" aria-label="Workcell mode">
          <button aria-pressed={mode === "recorded"} onClick={() => setMode("recorded")}>Recorded 3D</button>
          <button aria-pressed={mode === "live"} onClick={() => setMode("live")}>Live physics</button>
        </div>
      </div>
      {mode === "recorded" ? <RecordedScene /> : <div className="demo-stage is-loaded"><Suspense fallback={<div className="demo-loading">Loading MuJoCo physics…</div>}><LiveWorkcell /></Suspense></div>}
      <p className="caption">USB-C and charger insertion in a scripted MuJoCo workcell. Recorded policy comparisons appear below.</p>
    </section>;
}
