import React, { useEffect, useRef, useState } from "react";
import { encodeExample } from "./encoding.mjs";
import { useActionPlayback } from "./useActionPlayback.js";
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
  const [length, setLength] = useState(32);
  const playback = useActionPlayback(length, .42);
  const rows = encodeExample({increment: 1.25 / 8, reset: 8, steps: length});
  const completed = Math.floor(playback.progress);
  const fraction = playback.progress - completed;
  const before = completed ? rows[completed - 1] : {requested: 0, mlSum: 0, cqSum: 0};
  const after = rows[Math.min(completed, length - 1)];
  const value = key => before[key] + (after[key] - before[key]) * fraction;
  const x = t => 535 + t / length * 488;
  const max = length * .5 * 1.08;
  const y = value => 277 - value / max * 187;
  const line = key => [[x(0), y(0)], ...rows.slice(0, completed).map(item => [x(item.step), y(item[key])]),
    ...(fraction ? [[x(playback.progress), y(value(key))]] : [])].map(point => point.join(",")).join(" ");
  const ticks = [0, length / 4, length / 2, length * .75, length];
  const cursor = x(playback.progress);
  const gap = [[x(0),y(0)],...rows.slice(0,completed).map(row=>[x(row.step),y(row.mlSum)]),...(fraction?[[cursor,y(value('mlSum'))]]:[]),[cursor,y(value('requested'))],...rows.slice(0,completed).reverse().map(row=>[x(row.step),y(row.requested)])].map(point=>point.join(',')).join(' ');
  const windowStart = Math.min(length-8,Math.floor(Math.max(0,playback.progress-.00001)/8)*8);
  const localProgress = playback.progress-windowStart;
  const localCompleted = Math.floor(localProgress),localFraction = localProgress-localCompleted;
  const base = windowStart ? rows[windowStart-1] : {requested:0,cqSum:0};
  const windowRows = rows.slice(windowStart,windowStart+8);
  const zx = t=>60+t/8*690, zy = value=>179-value/1.6*143;
  const localValue = key=>value(key)-base[key];
  const localLine = key=>[[zx(0),zy(0)],...windowRows.slice(0,localCompleted).map((row,index)=>[zx(index+1),zy(row[key]-base[key])]),...(localFraction?[[zx(localProgress),zy(localValue(key))]]:[])].map(point=>point.join(',')).join(' ');
  return <figure className={"research-diagram motivation-diagram"+(playback.playing?" is-playing":"")} ref={playback.host}>
    <div className="diagram-topline"><h3>One small command, repeated over time</h3><div className="diagram-legend"><span className="source-key">Requested</span><span className="ml-key">Memoryless</span><span className="cq-key">CarryQ</span></div></div>
    <div className="diagram-scroll">
      <svg viewBox="0 0 1100 340" role="img" aria-label={`Continuous animation of ${length} computed actions and cumulative command sums`}>
        <rect className="diagram-zone" x="16" y="20" width="233" height="289" rx="12"/>
        <text className="diagram-section-label" x="34" y="46">FINE ALIGNMENT</text>
        <g className="connector-sketch">
          <g transform={`translate(0 ${12 * Math.min(1, playback.progress / 8)})`}><path d="M53 102h72v52H53zM68 154v29h9v-29M104 154v29h9v-29M85 78v24M94 78v24"/><path className="cq-stroke" d="M61 113h57"/></g>
          <path d="M54 222h142v38H54zM77 235h17M130 235h17"/>
          <path className="source-stroke" d="M153 113v80" strokeDasharray="4 5"/>
          <circle className="source-dot" cx="153" cy={113 + 80 * fraction} r="4"/>
        </g>
        <text x="34" y="284" className="diagram-note">A small increment at every step</text>
        <rect className="diagram-zone" x="269" y="20" width="215" height="289" rx="12"/>
        <text className="diagram-section-label" x="287" y="46">SAME QUANTIZATION GRID</text>
        <line className="axis-stroke" x1="327" y1="83" x2="327" y2="233"/>
        {[103,158,213].map(cy => <line key={cy} className="axis-stroke" x1="318" y1={cy} x2="337" y2={cy}/>)}
        <text x="304" y="108" textAnchor="end">+½</text><text x="304" y="163" textAnchor="end">0</text><text x="304" y="218" textAnchor="end">−½</text>
        <circle className="source-dot" cx="327" cy="141" r="6"/>
        <circle className="ml-dot" cx="327" cy="103" r="6"/>
        <path className="diagram-wire" d="M341 141H367V103H341"/>
        <text className="source-text" x="351" y="165">aₜ = 0.15625Δ</text>
        <text className="ml-text" x="351" y="94">qₜ = 0.50Δ</text>
        <text x="287" y="264" className="diagram-note">Same-sign error repeats:</text>
        <text x="287" y="284" className="source-text">+0.34375Δ per action</text>
        <text className="diagram-section-label" x="535" y="46">CUMULATIVE COMMAND</text>
        {Array.from({length: length / 8}, (_,i) => <g key={i}><rect x={x(i*8)} y="78" width={488*8/length} height="199" fill={i%2 ? "#8080ff08" : "transparent"}/>{i>0 && <line className="window-boundary" x1={x(i*8)} x2={x(i*8)} y1="78" y2="277"/>}</g>)}
        {[0,.25,.5,.75,1].map(ratio => <g key={ratio}><line className="chart-grid" x1="535" x2="1023" y1={y(ratio*length*.5)} y2={y(ratio*length*.5)}/><text className="axis-label" x="523" y={y(ratio*length*.5)+4} textAnchor="end">{ratio*length*.5}Δ</text></g>)}
        {ticks.map(t => <text key={t} className="axis-label" x={x(t)} y="301" textAnchor="middle">{t}</text>)}
        <text className="diagram-note" x="1023" y="326" textAnchor="end">Executed actions · 8-action reset windows</text>
        <line x1={cursor} x2={cursor} y1="78" y2="277" className="action-cursor"/>
        <polygon points={gap} className="cumulative-gap"/>
        <polyline className="diagram-curve source-stroke" points={line("requested")}/>
        <polyline className="diagram-curve ml-stroke" points={line("mlSum")}/>
        <polyline className="diagram-curve cq-stroke" points={line("cqSum")}/>
        {[["requested","source-dot"],["mlSum","ml-dot"],["cqSum","cq-dot"]].map(([key,color])=><circle key={key} className={color} cx={cursor} cy={y(value(key))} r="5"/>)}
        {completed>=4 && <g><line className="gap-bracket" x1={cursor} x2={cursor} y1={y(value('mlSum'))} y2={y(value('requested'))}/><text className="gap-label" x={cursor>970?cursor-10:cursor+10} textAnchor={cursor>970?'end':'start'} y={(y(value('mlSum'))+y(value('requested')))/2}>+{(value('mlSum')-value('requested')).toFixed(2)}Δ</text></g>}
      </svg>
    </div>
    <div className="motivation-window">
      <div><h4>Inside one reset window</h4><p>CarryQ alternates its codewords so that successive errors compensate.</p><span>Actions {windowStart+1}–{windowStart+8}</span></div>
      <div className="window-plot"><svg viewBox="0 0 800 230" role="img" aria-label="Magnified CarryQ and requested cumulative commands within the current eight-action window">
        {[0,.5,1,1.5].map(t=><g key={t}><line className="chart-grid" x1="60" x2="750" y1={zy(t)} y2={zy(t)}/><text x="47" y={zy(t)+5} textAnchor="end">{t}Δ</text></g>)}
        {[0,2,4,6,8].map(t=><text key={t} x={zx(t)} y="205" textAnchor="middle">{t}</text>)}
        <text x="750" y="226" textAnchor="end">Action within window</text>
        <polyline className="diagram-curve source-stroke" points={localLine('requested')}/>
        <polyline className="diagram-curve cq-stroke" points={localLine('cqSum')}/>
        <circle className="source-dot" cx={zx(localProgress)} cy={zy(localValue('requested'))} r="5"/>
        <circle className="cq-dot" cx={zx(localProgress)} cy={zy(localValue('cqSum'))} r="5"/>
      </svg></div>
    </div>
    <div className="motivation-readouts">
      <span>Requested sum <b className="source-text">{value("requested").toFixed(2)}Δ</b></span>
      <span>Memoryless sum <b className="ml-text">{value("mlSum").toFixed(2)}Δ</b></span>
      <span>CarryQ sum <b className="cq-text">{value("cqSum").toFixed(2)}Δ</b></span>
      <span>Memoryless discrepancy <b>{(value("mlSum")-value("requested")).toFixed(2)}Δ</b></span>
    </div>
    <div className="diagram-controls motivation-controls">
      <button onClick={playback.toggle}>{playback.playing ? "Pause animation" : "Play animation"}</button>
      <label>Executed actions<input aria-label="Executed actions" type="range" min="0" max={length} step=".01" value={playback.progress} onChange={event=>playback.seek(+event.target.value)}/></label>
      <output>{completed} / {length}</output>
      <select aria-label="Animation action count" value={length} onChange={event=>setLength(+event.target.value)}>{[16,32,64].map(n=><option key={n} value={n}>{n} actions</option>)}</select>
    </div>
    <figcaption>Scalar example on a fixed grid, with an eight-action residual reset.</figcaption>
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
