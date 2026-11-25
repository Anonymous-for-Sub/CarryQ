import React, { useState } from "react";
import { encodeExample } from "./encoding.mjs";
import { useActionPlayback } from "./useActionPlayback.js";
import { TokenTape } from "./MethodFigures.jsx";

const signed = value => (value < 0 ? "−" : "+") + Math.abs(value).toFixed(2);

export default function CodewordExplorer() {
  const [increment, setIncrement] = useState(.18);
  const [reset, setReset] = useState(8);
  const playback = useActionPlayback(16, 1.15);
  const rows = encodeExample({increment, reset});
  const step = Math.min(16, Math.floor(playback.progress) + 1);
  const current = rows[step - 1];
  const fraction = playback.progress >= 16 ? 1 : playback.progress % 1;
  const phase = Math.min(3, Math.floor(fraction * 4));
  const phases = ["Read residual", "Adjust input", "Choose codeword", "Carry residual"];
  const x = value => 68 + (value + .65) / 1.65 * 568;
  const adjusted = x(current.source + current.previous * Math.min(1, fraction * 4));
  const quantized = x(current.cq);
  const travel = Math.min(1, Math.max(0, (fraction - .45) * 4));
  const particleX = adjusted + (quantized - adjusted) * (3 * travel ** 2 - 2 * travel ** 3);
  const particleY = (1-travel)**3*139 + 3*(1-travel)**2*travel*185 + 3*(1-travel)*travel**2*166 + travel**3*208;
  const residualAngle = current.residual * 140;
  const angle = residualAngle * Math.PI / 180;
  const needle = [95 + 57 * Math.sin(angle), 91 - 57 * Math.cos(angle)];
  return <div className={"codeword-explorer" + (playback.playing ? " is-playing" : "")} ref={playback.host}>
    <div className="mechanism panel-surface">
      <div className="mechanism-plot routing-plot">
        <div className="chart-top"><h3>The quantizer chooses. The residual remembers.</h3></div>
        <div className="encoding-phases">{phases.map((label,i)=><span key={label} className={phase===i?"current":""}><small>0{i+1}</small>{label}</span>)}</div>
        <svg viewBox="0 0 720 330" role="img" aria-label={`Action ${step}: source ${signed(current.source)}, adjusted input ${signed(current.input)}, decoded codeword ${signed(current.cq)}, residual ${signed(current.residual)}`}>
          <defs><linearGradient id="input-span"><stop stopColor="#d6b479"/><stop offset="1" stopColor="#9d92ff"/></linearGradient></defs>
          <text x="40" y="34" className="route-label">CONTINUOUS INPUT</text>
          <text x="638" y="34" textAnchor="end" className="route-number">Action {step} / 16</text>
          <line x1="68" x2="636" y1="98" y2="98" className="input-rail"/>
          {[-.5,0,.5,1].map(value=><g key={value}><line x1={x(value)} x2={x(value)} y1="92" y2="105" className="route-tick"/><text x={x(value)} y="123" textAnchor="middle">{signed(value)}Δ</text></g>)}
          <line x1={x(current.source)} x2={adjusted} y1="98" y2="98" className="input-adjustment"/>
          <circle cx={x(current.source)} cy="98" r="6" className="source-dot"/>
          <text x={x(current.source)} y="72" textAnchor="middle" className="source-text">aₜ</text>
          <circle cx={adjusted} cy="98" r="9" className="input-packet"/>
          <text x={adjusted} y="51" textAnchor="middle" className="cq-text">uₜ = {signed(current.input)}Δ</text>
          <path d={`M${adjusted} 139C${adjusted} 185 ${quantized} 166 ${quantized} 208`} className={"quantization-route"+(phase>=2?" selected":"")}/>
          <circle r="4" cx={particleX} cy={particleY} className="route-particle"/>
          <text x="40" y="185" className="route-label">CODEWORDS</text>
          <line x1="68" x2="636" y1="234" y2="234" className="codeword-rail"/>
          {[-.5,.5].map(value=><g key={value} className={current.cq===value?"chosen-codeword":""}><circle cx={x(value)} cy="234" r="23" className="codeword-node"/><text x={x(value)} y="239" textAnchor="middle">{signed(value)}</text></g>)}
          <text x="637" y="205" textAnchor="end" className="route-label">qₜ = {signed(current.cq)}Δ</text>
          <path d={`M${quantized} 262V294H662V98H652`} className={"routing-carry"+(phase===3?" flowing":"")}/>
          <rect x="217" y="280" width="292" height="27" rx="5" className="wire-label-background"/>
          <text x="363" y="299" textAnchor="middle" className="cq-text">Carry rₜ₊₁ = uₜ − qₜ = {signed(current.residual)}Δ</text>
        </svg>
        <div className="playback"><button onClick={playback.toggle}>{playback.playing ? "Pause" : "Play animation"}</button><label className="sr-only" htmlFor="step">Action step</label><input id="step" type="range" min="1" max="16" value={step} onChange={event=>playback.seek(+event.target.value-1)}/><output>Step {step}/16</output></div>
      </div>
      <div className="mechanism-inspector">
        <div className="eyebrow">Residual state</div>
        <svg className="residual-dial" viewBox="0 0 190 120" role="img" aria-label={`Outgoing residual ${signed(current.residual)} grid units`}>
          <path d="M39 71A60 60 0 0 1 151 71" className="dial-track"/>
          <line x1="95" y1="91" x2={needle[0]} y2={needle[1]} className="dial-needle"/>
          <circle cx="95" cy="91" r="5" className="cq-dot"/>
          <text x="22" y="94">−½</text><text x="158" y="94">+½</text><text x="95" y="20" textAnchor="middle">0</text>
          <text x="95" y="117" textAnchor="middle" className="dial-value">{signed(current.residual)}Δ</text>
        </svg>
        <label htmlFor="increment">Requested increment <output>{increment.toFixed(2)} Δ</output></label><input id="increment" type="range" min=".06" max=".44" step=".02" value={increment} onChange={event=>setIncrement(+event.target.value)}/>
        <label htmlFor="reset">Reset every</label><select id="reset" value={reset} onChange={event=>setReset(+event.target.value)}>{[1,2,4,8,16].map(n=><option key={n} value={n}>{n} action{n>1?"s":""}</option>)}</select>
        <div className="trace"><div><span>Incoming rₜ</span><b>{signed(current.previous)}</b></div><div><span>Adjusted uₜ</span><b>{signed(current.input)}</b></div><div className="trace-token"><span>Chosen qₜ</span><b>{signed(current.cq)}</b></div></div>
        <p className="small">Midpoint grid, in units of Δ. Feedback clears at the dashed sequence boundaries.</p>
      </div>
      <div className="mechanism-summary"><span>At action {step}, cumulative error magnitude</span><strong className="baseline">Memoryless {Math.abs(current.mlSum-current.requested).toFixed(2)} Δ</strong><strong className="ours">CarryQ {Math.abs(current.cqSum-current.requested).toFixed(2)} Δ</strong></div>
    </div>
    <TokenTape rows={rows} step={step} reset={reset} seek={next=>playback.seek(next-1)}/>
  </div>;
}
