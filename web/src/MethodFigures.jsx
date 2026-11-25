import React, { useState } from "react";
import "./method-figures.css";

const assets = import.meta.env.BASE_URL + "figures/";
const signed = (value) =>
  (value < 0 ? "−" : "+") + Math.abs(value).toFixed(2);

export function PaperFigure({ name, alt, caption, className = "" }) {
  return (
    <figure className={"paper-figure " + className}>
      <a href={assets + name} aria-label={"Open full figure: " + alt}>
        <img src={assets + name} loading="lazy" decoding="async" alt={alt} />
      </a>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

function FlowNode({ label, equation, children, accent = false }) {
  return (
    <div className={"flow-node" + (accent ? " feedback" : "")}>
      <span>{label}</span>
      <strong>{equation}</strong>
      <small>{children}</small>
    </div>
  );
}

export function Architecture() {
  const [feedback, setFeedback] = useState(true);
  return (
    <figure className="technical-figure architecture">
      <div className="figure-heading">
        <h3>Where CarryQ acts</h3>
        <div className="figure-options" role="group" aria-label="Encoding rule">
          <button aria-pressed={!feedback} onClick={() => setFeedback(false)}>Memoryless</button>
          <button aria-pressed={feedback} onClick={() => setFeedback(true)}>CarryQ</button>
        </div>
      </div>
      <div className="flow-layout">
        <div className="flow-context">
          <span>Frozen policy / recorded replay</span>
          <b>Source chunk</b>
          <div className="chunk-tiles"><i>a₁</i><i>a₂</i><i>a₃</i><i>…</i><i>aₖ</i></div>
        </div>
        <span className="flow-arrow" aria-hidden="true">→</span>
        <div className="flow-encoder">
          <div className="flow-label">ACTION INTERFACE <small>Same codebook and token count</small></div>
          <div className="flow-nodes">
            <FlowNode label={feedback ? "Add residual" : "Take source"} equation={feedback ? "uₜ = aₜ + rₜ" : "uₜ = aₜ"} accent={feedback}>Encoder input</FlowNode>
            <span className="flow-arrow" aria-hidden="true">→</span>
            <FlowNode label="Quantize" equation="zₜ = Qᵦ(uₜ)">Token selection</FlowNode>
            <span className="flow-arrow" aria-hidden="true">→</span>
            <FlowNode label="Decode" equation="qₜ = D(zₜ)">Controller command</FlowNode>
          </div>
          <div className={"residual-loop" + (feedback ? "" : " inactive")}>
            <span aria-hidden="true">↶</span>
            <span><b>{feedback ? "Carry to the next action" : "Independent token selection"}</b>
            <small>{feedback ? "rₜ₊₁ = clip(uₜ − qₜ, −Δ/2, +Δ/2)" : "No residual state"}</small></span>
          </div>
        </div>
        <span className="flow-arrow" aria-hidden="true">→</span>
        <div className="flow-context">
          <span>Same controller</span>
          <b>Execute commands</b>
          <div className="chunk-tiles decoded"><i>q₁</i><i>q₂</i><i>q₃</i><i>…</i><i>qₖ</i></div>
        </div>
      </div>
      <div className="query-strip">
        <span><b>Initialize</b> r₁ = 0</span>
        <span><b>Execute</b> K actions</span>
        <span><b>Replan</b> reset at the next query</span>
      </div>
      <figcaption>The scalar encoder uses the decoded value to update its residual. In closed loop, the same policy produces a new chunk after every execution window.</figcaption>
    </figure>
  );
}

export function TokenTape({ rows, step, reset, seek }) {
  const labels = [
    ["Requested", "source"],
    ["Memoryless", "ml"],
    ["CarryQ", "cq"],
    ["Residual out", "residual"],
  ];
  return (
    <div className="token-tape" aria-label="Per-action commands in grid units">
      <div className="tape-labels" aria-hidden="true">
        <span>Action</span>
        {labels.map(([label]) => <span key={label}>{label}</span>)}
      </div>
      <div className="tape-scroll">
        {rows.map((row) => (
          <button key={row.step}
            className={"tape-step" + ((row.step - 1) % reset === 0 ? " boundary" : "")}
            aria-label={`Action ${row.step}: requested ${signed(row.source)}, Memoryless ${signed(row.ml)}, CarryQ ${signed(row.cq)}, residual out ${signed(row.residual)}`}
            aria-pressed={row.step === step} onClick={() => seek(row.step)}>
            <span className="tape-index">{row.step}</span>
            {labels.map(([, key]) => <span key={key} className={key}>{signed(row[key])}</span>)}
          </button>
        ))}
      </div>
    </div>
  );
}

const terms = {
  4: [["Memoryless", 0.09658, 0.33692, 0.43350], ["CarryQ", 0.13777, -0.13110, 0.00667]],
  6: [["Memoryless", 0.005943, 0.016570, 0.022514], ["CarryQ", 0.008486, -0.008046, 0.000439]],
};

export function TemporalEvidence() {
  const [bits, setBits] = useState(4);
  const data = terms[bits];
  const scale = data[0][3];
  const reduction = bits === 4 ? "98.46" : "98.05";
  return (
    <section className="section wrap" id="analysis">
      <div className="section-head">
        <div className="eyebrow">Temporal analysis</div>
        <h2>Why cumulative error falls</h2>
        <p>CarryQ changes how errors add together across an execution window.</p>
      </div>
      <div className="analysis-grid">
        <figure className="technical-figure ledger">
          <div className="figure-heading">
            <h3>Local energy and cross-time interaction</h3>
            <div className="figure-options" role="group" aria-label="Decomposition bit width">
              {[4, 6].map((b) => <button key={b} aria-pressed={bits === b} onClick={() => setBits(b)}>{b} bits</button>)}
            </div>
          </div>
          <div className="ledger-key">
            <span><i className="l" /> Local energy L</span>
            <span><i className="x" /> Cross-time term X</span>
            <span><i className="t" /> Endpoint T</span>
          </div>
          <div className="ledger-rows">
            {data.map(([method, local, cross, total]) => (
              <div className="ledger-row" key={method}>
                <div className="ledger-label"><b>{method}</b><span>T = {total.toFixed(bits === 4 ? 5 : 6)}</span></div>
                <div className="ledger-track" role="img" aria-label={`L ${local}, X ${cross}, T ${total}`}>
                  <i className="l" style={{width: local / scale * 100 + "%"}} />
                  <i className={cross < 0 ? "x cancel" : "x"} style={{
                    left: (cross < 0 ? total : local) / scale * 100 + "%",
                    width: Math.abs(cross) / scale * 100 + "%",
                  }} />
                  <i className="t" style={{left: total / scale * 100 + "%"}} />
                </div>
                <small>{cross < 0 ? "← Errors partly cancel" : "Errors reinforce →"}</small>
              </div>
            ))}
          </div>
          <div className="ledger-result"><strong>−{reduction}%</strong><span>squared endpoint error</span></div>
          <figcaption>Means over chunks from 12 LIBERO tasks. Bar lengths use the memoryless endpoint as the unit. The hatched segment subtracts from L when X is negative.</figcaption>
        </figure>
        <PaperFigure name="reset-response.png" className="reset-figure"
          alt="Cumulative prefix cost across 300 executed actions for Memoryless, two-step reset and CarryQ"
          caption={<><b>Residual lifetime.</b> On the same Can source commands, keeping feedback over all four actions reduces prefix cost across 75 queries.</>} />
      </div>
    </section>
  );
}
