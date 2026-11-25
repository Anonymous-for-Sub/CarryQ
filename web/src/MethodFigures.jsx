import React, { useState, useEffect } from "react";
import "./method-figures.css";
import paperArchitecture from "./figures/paper-architecture.svg?raw";
import { encodeExample } from "./encoding.mjs";
import ResetResponse from "./ResetResponse.jsx";
const assets = import.meta.env.BASE_URL + "figures/";
const signed = value => (value < 0 ? "−" : "+") + Math.abs(value).toFixed(2);
export function PaperFigure({
  name,
  alt,
  caption,
  className = ""
}) {
  return <figure className={"paper-figure " + className}>
      <a href={assets + name} aria-label={"Open full figure: " + alt}>
        <img src={assets + name} loading="lazy" decoding="async" alt={alt} />
      </a>
      <figcaption>{caption}</figcaption>
    </figure>;
}
const diagramParts = [{
  label: "Full diagram",
  title: "Feedback across action steps",
  text: "At each step, CarryQ adds the preceding residual before selecting a codeword. The gray and purple rows show the choices made by Memoryless and CarryQ.",
  equation: "uₜ = aₜ + rₜ",
  regions: []
}, {
  label: "Residual addition",
  title: "Adjust the next quantizer input",
  text: "The incoming residual rₜ and source action aₜ meet at the sum node. This adjusted input changes the next codeword choice.",
  equation: "uₜ = aₜ + rₜ",
  regions: [[53, 60, 205, 188], [332, 60, 205, 188], [612, 60, 205, 188]]
}, {
  label: "Token and decoder",
  title: "Use the existing action interface",
  text: "The selected token zₜ passes through the same decoder D. CarryQ alternates the illustrated codewords across time to compensate for earlier rounding.",
  equation: "zₜ = Qᵦ(uₜ),   qₜ = D(zₜ)",
  regions: [[115, 325, 90, 135], [395, 325, 90, 135], [675, 325, 90, 135]]
}, {
  label: "Carry and reset",
  title: "Keep the remaining discrepancy",
  text: "Subtract the decoded value, clip the remaining residual, and carry it to the next action. The green boundary clears feedback for the next window.",
  equation: "rₜ₊₁ = clip(uₜ − qₜ, −Δᵦ/2, Δᵦ/2)",
  regions: [[66, 487, 120, 105], [346, 487, 120, 105], [626, 487, 120, 105], [895, 250, 20, 385]]
}];
export function Architecture() {
  const [part, setPart] = useState(0);
  const [step, setStep] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const row = encodeExample({
    increment: .18,
    reset: 8
  })[step - 1];
  const active = diagramParts[part];
  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [expanded]);
  return <figure className="paper-architecture">
      <div className="architecture-toolbar">
        <h3>Method overview</h3>
        <button onClick={() => setExpanded(true)}>Expand figure</button>
      </div>
      <div className="architecture-body">
        <div className="architecture-scroll">
          <div className="architecture-art">
            <div className="original-art" role="img" aria-label="Original CarryQ paper architecture, showing residual feedback over three action steps" dangerouslySetInnerHTML={{
            __html: paperArchitecture
          }} />
            <svg className="architecture-overlay" viewBox="0 0 968 640" aria-hidden="true">
              {active.regions.map(([x, y, width, height], i) => <rect key={i} x={x} y={y} width={width} height={height} rx="8" className="diagram-highlight" />)}
            </svg>
          </div>
        </div>
        <aside className="architecture-explanation">
          <div className="architecture-tabs" role="group" aria-label="Architecture detail">
            {diagramParts.map((item, index) => <button key={item.label} aria-pressed={part === index} onClick={() => setPart(index)}>{item.label}</button>)}
          </div>
          <h4>{active.title}</h4>
          <p>{active.text}</p>
          <div className="architecture-equation">{active.equation}</div>
          <div className="diagram-example">
            <div className="diagram-example-heading"><span>Inspect the example</span><span>Grid units</span></div>
            <div className="figure-options" role="group" aria-label="Example action step">
              {[1, 2, 3].map(t => <button key={t} aria-pressed={step === t} onClick={() => setStep(t)}>t = {t}</button>)}
            </div>
            <dl>
              <dt>Source aₜ</dt><dd>{signed(row.source)}</dd>
              <dt>Residual rₜ</dt><dd>{signed(row.previous)}</dd>
              <dt>Adjusted uₜ</dt><dd>{signed(row.input)}</dd>
              <dt>Decoded qₜ</dt><dd>{signed(row.cq)}</dd>
              <dt>Carry rₜ₊₁</dt><dd>{signed(row.residual)}</dd>
            </dl>
          </div>
        </aside>
      </div>
      <figcaption>The original paper diagram, rendered as vector paths. Select a part to follow its operation, or inspect the three-step scalar example.</figcaption>
      {expanded && <div className="figure-modal" role="dialog" aria-modal="true" aria-label="Expanded architecture" onKeyDown={event => {
      if (event.key === "Escape") setExpanded(false);
      if (event.key === "Tab") event.preventDefault();
    }}>
        <button autoFocus className="close-figure" onClick={() => setExpanded(false)}>Close ×</button>
        <div className="expanded-art" dangerouslySetInnerHTML={{
        __html: paperArchitecture
      }} />
      </div>}
    </figure>;
}
export function TokenTape({
  rows,
  step,
  reset,
  seek
}) {
  const labels = [["Requested", "source"], ["Memoryless", "ml"], ["CarryQ", "cq"], ["Residual out", "residual"]];
  return <div className="token-tape" aria-label="Per-action commands in grid units">
      <div className="tape-labels" aria-hidden="true">
        <span>Action</span>
        {labels.map(([label]) => <span key={label}>{label}</span>)}
      </div>
      <div className="tape-scroll">
        {rows.map(row => <button key={row.step} className={"tape-step" + ((row.step - 1) % reset === 0 ? " boundary" : "")} aria-label={`Action ${row.step}: requested ${signed(row.source)}, Memoryless ${signed(row.ml)}, CarryQ ${signed(row.cq)}, residual out ${signed(row.residual)}`} aria-pressed={row.step === step} onClick={() => seek(row.step)}>
            <span className="tape-index">{row.step}</span>
            {labels.map(([, key]) => <span key={key} className={key}>{signed(row[key])}</span>)}
          </button>)}
      </div>
    </div>;
}
const terms = {
  4: [["Memoryless", 0.09658, 0.33692, 0.43350], ["CarryQ", 0.13777, -0.13110, 0.00667]],
  6: [["Memoryless", 0.005943, 0.016570, 0.022514], ["CarryQ", 0.008486, -0.008046, 0.000439]]
};
export function TemporalEvidence() {
  return <section className="section wrap" id="analysis">
    <div className="section-head"><h2>Why cumulative error falls</h2><p>CarryQ changes how errors add together across an execution window.</p></div>
    <div className="analysis-grid">
      <figure className="technical-figure ledger">
        <div className="figure-heading"><h3>Local energy and cross-time interaction</h3><span className="ledger-equation">T = L + X</span></div>
        <div className="ledger-key"><span><i className="l"/>Local energy L</span><span><i className="x"/>Cross-time term X</span><span><i className="t"/>Endpoint T</span></div>
        <div className="ledger-bit-grid">{[4,6].map(bits=>{
          const data=terms[bits], scale=data[0][3];
          const reduction=bits===4?'98.46':'98.05';
          return <div className="ledger-bit" key={bits} aria-label={`${bits}-bit error decomposition`}>
            <div className="ledger-bit-heading"><h4>{bits} bits</h4><span>{reduction}% lower endpoint error</span></div>
            {data.map(([method,local,cross,total])=><div className="ledger-row" key={method}>
              <div className="ledger-label"><b>{method}</b><span>T = {total.toFixed(bits===4?5:6)}</span></div>
              <div className="ledger-track" role="img" aria-label={`L ${local}, X ${cross}, T ${total}`}>
                <i className="l" style={{width:local/scale*100+'%'}}/>
                <i className={cross<0?'x cancel':'x'} style={{left:(cross<0?total:local)/scale*100+'%',width:Math.abs(cross)/scale*100+'%'}}/>
                <i className="t" style={{left:total/scale*100+'%'}}/>
              </div>
              <span className="ledger-effect">{cross<0?'Cross-time cancellation':'Cross-time reinforcement'}</span>
            </div>)}
          </div>;
        })}</div>
        <figcaption>Means across 12 LIBERO tasks. Each bit width uses its Memoryless endpoint as the unit. The hatched region shows cancellation of local error.</figcaption>
      </figure>
      <ResetResponse/>
    </div>
  </section>;
}
