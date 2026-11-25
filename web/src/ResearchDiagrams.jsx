import React, { useEffect, useRef, useState } from "react";
import { encodeExample } from "./encoding.mjs";
import "./research-diagrams.css";

function usePlayback(length, delay) {
  const host = useRef(null);
  const [step, setStep] = useState(length);
  const [playing, setPlaying] = useState(() => !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const visible = useRef(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => { visible.current = entry.isIntersecting; }, {threshold: 0.15});
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      if (visible.current && !document.hidden) setStep(value => (value + 1) % (length + 1));
    }, delay);
    return () => clearInterval(timer);
  }, [playing, length, delay]);
  return {host, step, playing, toggle: () => setPlaying(value => !value), seek: value => {setPlaying(false);setStep(value);}};
}

const number = value => (value < 0 ? "−" : "+") + Math.abs(value).toFixed(2);

function DiagramControls({playback, length, label}) {
  return <div className="diagram-controls">
    <button onClick={playback.toggle}>{playback.playing ? "Pause animation" : "Play animation"}</button>
    <label>{label}<input aria-label={label} type="range" min="0" max={length} value={playback.step} onChange={event => playback.seek(+event.target.value)} /></label>
    <output>{playback.step} / {length}</output>
  </div>;
}

export function MotivationDiagram() {
  const playback = usePlayback(8, 900);
  const rows = encodeExample({increment: 1.25 / 8, reset: 8, steps: 8});
  const row = rows[Math.max(0, playback.step - 1)];
  const endpoint = playback.step ? row.requested : 0;
  const ml = playback.step ? row.mlSum : 0;
  const cq = playback.step ? row.cqSum : 0;
  const x = t => 535 + t * 61;
  const y = value => 277 - value * 45;
  const line = key => [[x(0), y(0)], ...rows.slice(0, playback.step).map(item => [x(item.step), y(item[key])])].map(point => point.join(",")).join(" ");
  return <figure className={"research-diagram motivation-diagram"+(playback.playing?" is-playing":"")} ref={playback.host}>
    <div className="diagram-topline"><h3>One small command, repeated over time</h3><div className="diagram-legend"><span className="source-key">Requested</span><span className="ml-key">Memoryless</span><span className="cq-key">CarryQ</span></div></div>
    <div className="diagram-scroll">
      <svg viewBox="0 0 1100 340" role="img" aria-label="Animated small-increment quantization and cumulative command sums over eight actions">
        <defs><marker id="mot-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7" fill="#6b7291"/></marker></defs>
        <rect className="diagram-zone" x="16" y="20" width="233" height="289" rx="12"/>
        <text className="diagram-section-label" x="34" y="46">FINE ALIGNMENT</text>
        <g className="connector-sketch">
          <path d="M53 102h72v52H53zM68 154v29h9v-29M104 154v29h9v-29" />
          <path d="M85 78v24M94 78v24M54 222h142v38H54zM77 235h17M130 235h17" />
          <path className="source-stroke" d="M153 113v80" markerEnd="url(#mot-arrow)" strokeDasharray="4 5"/>
          <path className="cq-stroke" d={`M61 ${102 + playback.step * 1.3}h57`} />
        </g>
        <text x="34" y="284" className="diagram-note">Small requested increment</text>
        <rect className="diagram-zone" x="269" y="20" width="215" height="289" rx="12"/>
        <text className="diagram-section-label" x="287" y="46">SAME QUANTIZATION GRID</text>
        <line className="axis-stroke" x1="327" y1="83" x2="327" y2="233"/>
        <line className="axis-stroke" x1="318" y1="103" x2="337" y2="103"/>
        <line className="axis-stroke" x1="318" y1="158" x2="337" y2="158"/>
        <line className="axis-stroke" x1="318" y1="213" x2="337" y2="213"/>
        <text x="304" y="108" textAnchor="end">+½</text><text x="304" y="163" textAnchor="end">0</text><text x="304" y="218" textAnchor="end">−½</text>
        <circle className="source-dot" cx="327" cy="141" r="6"/>
        <circle className="ml-dot" cx="327" cy="103" r="6"/>
        <path className="diagram-wire" d="M341 141H367V103H341" />
        <text className="source-text" x="351" y="165">aₜ = 0.15625Δ</text>
        <text className="ml-text" x="351" y="94">qₜ = 0.50Δ</text>
        <text x="287" y="264" className="diagram-note">Memoryless repeats</text>
        <text x="287" y="284" className="diagram-note">the same positive error.</text>
        <text className="diagram-section-label" x="535" y="46">CUMULATIVE COMMAND</text>
        {[0, 1, 2, 3, 4].map(value => <g key={value}><line className="chart-grid" x1="535" x2="1023" y1={y(value)} y2={y(value)}/><text className="axis-label" x="523" y={y(value) + 4} textAnchor="end">{value}Δ</text></g>)}
        {[0, 2, 4, 6, 8].map(t => <text key={t} className="axis-label" x={x(t)} y="301" textAnchor="middle">{t}</text>)}
        <text className="diagram-note" x="1023" y="326" textAnchor="end">Executed actions</text>
        <polyline className="diagram-curve source-stroke" points={line("requested")}/>
        <polyline className="diagram-curve ml-stroke" points={line("mlSum")}/>
        <polyline className="diagram-curve cq-stroke" points={line("cqSum")}/>
        <circle className="source-dot" cx={x(playback.step)} cy={y(endpoint)} r="5"/>
        <circle className="ml-dot" cx={x(playback.step)} cy={y(ml)} r="5"/>
        <circle className="cq-dot" cx={x(playback.step)} cy={y(cq)} r="5"/>
      </svg>
    </div>
    <div className="motivation-readouts">
      <span>Requested sum <b className="source-text">{endpoint.toFixed(2)}Δ</b></span>
      <span>Memoryless sum <b className="ml-text">{ml.toFixed(2)}Δ</b></span>
      <span>CarryQ sum <b className="cq-text">{cq.toFixed(2)}Δ</b></span>
      <span>Memoryless discrepancy <b>{(ml - endpoint).toFixed(2)}Δ</b></span>
    </div>
    <DiagramControls playback={playback} length={8} label="Executed actions"/>
    <figcaption>Computed scalar example. CarryQ changes the sequence of codeword choices so that successive errors compensate.</figcaption>
  </figure>;
}

const interfaceModes = {
  Scalar: {policy: "Frozen action policy", frontend: "Incremental commands", quantizer: "Scalar Qᵦ", carry: "clip(uₜ − qₜ, ±Δᵦ/2)", decoder: "Scalar decoder", controller: "Task controller"},
  Vector: {policy: "Shared source policy", frontend: "Six motion coordinates", quantizer: "Vector Q", carry: "clip(aₜ + rₜ, −1, 1) − c_z", decoder: "Frozen codebook", controller: "Task controller"},
  "Joint targets": {policy: "π₀.₅ / joint policy", frontend: "Difference joint targets", quantizer: "Scalar Qᵦ", carry: "clip(uₜ − qₜ, ±Δᵦ/2)", decoder: "Decode and integrate", controller: "Joint controller"},
};

function TokenRow({x, y, values, active, className = ""}) {
  return <g className={className}>{values.map((value, i) => <g key={i}>
    <rect x={x + i * 16} y={y} width="12" height="16" rx="2" className={i < active ? "token-cell active" : "token-cell"}/>
    {value && <text x={x + i * 16 + 6} y={y + 12} textAnchor="middle" className="tiny-token">{value}</text>}
  </g>)}</g>;
}

export function SystemArchitecture() {
  const playback = usePlayback(3, 1200);
  const [mode, setMode] = useState("Scalar");
  const [expanded, setExpanded] = useState(false);
  const settings = interfaceModes[mode];
  const rows = encodeExample({increment: .18, reset: 8, steps: 3});
  const Diagram = () => <svg viewBox="0 0 1120 474" role="img" aria-label="Animated CarryQ system architecture from observations and frozen policy through temporal encoding, decoding, execution and replanning">
    <defs><marker id="architecture-wire-head" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7" fill="#777b9a"/></marker></defs>
    <text className="diagram-section-label" x="22" y="25">POLICY AND CONTROL INTERFACE</text>
    {[
      [22, 144, "Observations", "Images · state · goal"],
      [202, 183, settings.policy, "Complete prediction"],
      [420, 162, "Action chunk", settings.frontend],
      [617, 215, "CarryQ encoder", "Temporal token selection"],
      [869, 228, settings.decoder, settings.controller],
    ].map(([x, width, title, subtitle], index) => <g key={title}>
      <rect x={x} y="43" width={width} height="76" rx="8" className={index === 3 ? "diagram-module encoder-module" : "diagram-module"}/>
      <text x={x + 13} y="66" className={index === 3 ? "cq-text module-title" : "module-title"}>{title}</text>
      <text x={x + 13} y="87" className="diagram-note">{subtitle}</text>
      {index === 2 && <TokenRow x={x + 13} y={96} values={Array(8).fill("")} active={4}/>}
      {index < 4 && <path className="diagram-wire" markerEnd="url(#architecture-wire-head)" d={`M${x + width + 3} 80H${[202,420,617,869][index] - 8}`}/>}
    </g>)}
    <path className="diagram-wire replan-wire" d="M985 122V151H93V123" markerEnd="url(#architecture-wire-head)"/>
    <rect x="339" y="137" width="422" height="25" rx="5" className="wire-label-background"/>
    <text x="550" y="154" textAnchor="middle" className="diagram-note">Execute K actions · observe again · start a new query</text>
    <rect x="22" y="187" width="1075" height="234" rx="12" className="encoder-detail"/>
    <text x="42" y="211" className="diagram-section-label">INSIDE CARRYQ</text>
    <text x="1075" y="211" textAnchor="end" className="diagram-note">Same vocabulary · same decoder · same token budget</text>
    {rows.map((row, i) => {
      const x = 43 + i * 350;
      const selected = playback.step === i + 1;
      return <g key={i} className={selected ? "active-encoding-step" : ""}>
        <rect x={x} y="227" width="320" height="163" rx="9" className={selected ? "encoding-step selected" : "encoding-step"}/>
        <text x={x + 15} y="249" className="module-title">Action {i + 1}</text>
        <text x={x + 302} y="249" textAnchor="end" className="source-text">aₜ = +0.18Δ</text>
        <text x={x + 15} y="278" className="diagram-note">rₜ = {number(row.previous)}Δ</text>
        <circle cx={x + 122} cy="276" r="12" className="sum-node"/>
        <text x={x + 122} y="281" textAnchor="middle" className="sum-symbol">+</text>
        <path className="cq-wire" d={`M${x+100} 276H${x+108}M${x+136} 276H${x+155}`}/>
        <rect x={x + 159} y="260" width="65" height="32" rx="6" className="quantizer-node"/>
        <text x={x + 191} y="281" textAnchor="middle" className="cq-text">{mode === "Vector" ? "Q" : "Qᵦ"}</text>
        <path className="cq-wire" d={`M${x+225} 276H${x+238}`} />
        <rect x={x + 242} y="260" width="60" height="32" rx="6" className="decoder-node"/>
        <text x={x + 272} y="281" textAnchor="middle">D</text>
        <text x={x + 15} y="315" className="diagram-note">Adjusted uₜ</text>
        <text x={x + 302} y="315" textAnchor="end" className="source-text">{number(row.input)}Δ</text>
        <text x={x + 15} y="338" className="diagram-note">Decoded qₜ</text>
        <text x={x + 302} y="338" textAnchor="end" className="cq-text">{number(row.cq)}Δ</text>
        <path className={selected ? "residual-path flowing" : "residual-path"} d={`M${x+272} 347V368H${x+122}V291`} />
        <rect x={x + 155} y="357" width="110" height="22" rx="4" className="wire-label-background"/>
        <text x={x + 210} y="373" textAnchor="middle" className="carry-label">Carry {number(row.residual)}Δ</text>
        {i < 2 && <path className={selected ? "carry-between flowing" : "carry-between"} d={`M${x+320} 369H${x+340}V276H${x+350}`} markerEnd="url(#architecture-wire-head)"/>}
      </g>;
    })}
    <text className="diagram-note" x="43" y="411">Residual update</text>
    <text className="cq-text" x="170" y="411">rₜ₊₁ = {settings.carry}</text>
    <line className="reset-boundary" x1="1080" x2="1080" y1="229" y2="390"/>
    <text className="diagram-note" x="1092" y="445" textAnchor="end">Reset residual at each chunk or policy query</text>
    <text className="diagram-note" x="22" y="461">The three-step scalar example is shown in grid units.</text>
  </svg>;

  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {document.body.style.overflow = previous;};
  }, [expanded]);
  return <figure className={"research-diagram system-architecture"+(playback.playing?" is-playing":"")} ref={playback.host}>
    <div className="diagram-topline">
      <h3>Method overview</h3>
      <div className="diagram-tools">
        <div className="figure-options" role="group" aria-label="Action interface">{Object.keys(interfaceModes).map(name => <button key={name} aria-pressed={mode === name} onClick={() => setMode(name)}>{name}</button>)}</div>
        <button onClick={() => setExpanded(true)}>Expand</button>
      </div>
    </div>
    <div className="diagram-scroll"><Diagram /></div>
    <DiagramControls playback={playback} length={3} label="Encoding step"/>
    <figcaption>CarryQ connects completed action prediction to execution. For token-predicting BAR-Smol, the same temporal rule constructs training labels, followed by standard token decoding at inference.</figcaption>
    {expanded && <div className="figure-modal" role="dialog" aria-modal="true" aria-label="Expanded architecture" onKeyDown={event => {if(event.key === "Escape")setExpanded(false);if(event.key === "Tab")event.preventDefault();}}>
      <button autoFocus className="close-figure" onClick={() => setExpanded(false)}>Close</button>
      <div className="expanded-research-diagram"><Diagram /></div>
    </div>}
  </figure>;
}
