import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import videos from './videos.json';
import insertion from './insertion.json';
import real from './real.json';
import './style.css';
import { TemporalEvidence } from './MethodFigures.jsx';
import CodewordExplorer from './CodewordExplorer.jsx';
import {MotivationDiagram,SystemArchitecture} from "./ResearchDiagrams.jsx";
import Workcell from './Workcell.jsx';
import './refinement.css';
const BASE = import.meta.env.BASE_URL;
const file = p => BASE + p;
const codeLink = import.meta.env.VITE_SUPPLEMENTARY === 'true' ? '../code/README.md' : 'https://github.com/Anonymous-for-Sub/CarryQ';
const paper = file('paper.pdf');
const supplement = import.meta.env.VITE_SUPPLEMENTARY === 'true' ? '../appendix.pdf' : file('appendix.pdf');
const fmt = n => Number(n).toFixed(2);
const links = [['demo', 'Demo'], ['method', 'Method'], ['real', 'Real robot'], ['results', 'Results'], ['analysis', 'Analysis'], ['gallery', 'Videos']];
function Wordmark() {
  return <><span className="wordmark-carry">Carry</span><span className="wordmark-q">Q</span></>;
}
function Video({
  item,
  hero = false
}) {
  const ref = useRef();
  useEffect(() => {
    const node = ref.current;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) node.pause();
    }, {
      threshold: .15
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return <figure className={'video-card ' + (hero ? 'hero-video' : '')}><video ref={ref} controls playsInline muted preload="none" poster={file('media/' + item.poster)} src={file('media/' + item.file)} aria-label={item.title + ' Memoryless versus CarryQ comparison'} /><figcaption><strong>{item.title}</strong><span>Memoryless ← → CarryQ</span></figcaption></figure>;
}
function SectionHead({
  n,
  title,
  children
}) {
  return <div className="section-head"><div className="eyebrow">{n}</div><h2>{title}</h2>{children && <p>{children}</p>}</div>;
}

const resultSets = {
  Replay: {
    note: 'Fixed-source replay on six sensitivity-selected LIBERO tasks, conditioned on successful continuous references. Each pair shares source commands, codewords, decoder and budget.',
    rows: [['Scalar', 66.08, 96.04, 'Gain 95% CI [27.27, 32.68] pp'], ['Vector codebook', 70.13, 78.97, 'Gain 95% CI [5.07, 12.59] pp'], ['Native Praxis', 64.34, 95.01, 'Gain 95% CI [28.46, 32.84] pp']]
  },
  'Additional tasks': {
    note: 'Twelve independently selected LIBERO tasks. Unconditional task-balanced success over 120 demonstrations at 4 and 6 bits.',
    rows: [['12-task extension', 58.75, 92.92, '141 → 223 successes / 240 conditions']]
  },
  'Closed-loop': {
    note: 'Frozen policies, paired initial states and per-arm replanning. Each row retains its own action interface and evaluation protocol.',
    rows: [['OpenVLA-OFT · Spatial', 98.75, 100, '80 initial states; gain CI [0.00, 3.75] pp'], ['OpenVLA-OFT · Pro', 95, 97.5, '80 initial states; gain CI [−2.50, 7.50] pp'], ['OpenVLA-OFT · Plus', 78.75, 83.75, '80 initial states; gain CI [−3.75, 13.75] pp'], ['SeedPolicy · RoboTwin', 20.83, 33.33, '25 → 40 / 120; six settings'], ['robomimic · Can', 52.25, 57.75, '209 → 231 / 400; confirmation cohort']]
  }
};
function Bars({
  rows
}) {
  return <div className="bars">{rows.map(([label, ml, cq, detail]) => <div className="bar-row" key={label}><div className="bar-label"><strong>{label}</strong><span>+{fmt(cq - ml)} pp</span></div><div className="bar-track" title={`Memoryless ${fmt(ml)}%`}><span className="bar ml" style={{
          width: ml + '%'
        }} /><b>{fmt(ml)}%</b></div><div className="bar-track" title={`CarryQ ${fmt(cq)}%`}><span className="bar cq" style={{
          width: cq + '%'
        }} /><b>{fmt(cq)}%</b></div><p>{detail}</p></div>)}</div>;
}
function Results() {
  const [table, setTable] = useState(false);
  const [bits, setBits] = useState(8);
  const fine = ['USB-C', 'Charger'].map(task => {
    const get = method => insertion.find(row => +row.bits === bits && row.task === task && row.method === method);
    return [task, +get('Memoryless').s2_pct, +get('CarryQ').s2_pct, `${get('Memoryless').s2_successes} → ${get('CarryQ').s2_successes} / 120 episodes`];
  });
  return <section id="results" className="wrap section">
    <SectionHead n="Execution evidence" title="Execution across tokenizers, tasks and policies">A shared interface isolates what temporal encoding changes.</SectionHead>
    <div className="chart-top evaluation-top"><div className="legend"><span className="baseline">Memoryless</span><span className="ours">CarryQ</span></div><button className="text-button" onClick={()=>setTable(!table)}>{table?'Chart view':'Table view'}</button></div>
    <div className="evaluation-grid">
      {Object.entries(resultSets).map(([name,data])=><article className="panel-surface evaluation-card" key={name}>
        <div className="evaluation-heading"><h3>{name}</h3><span>Task success (%)</span></div>
        {table ? <div className="table-scroll"><table><thead><tr><th>Setting</th><th>ML</th><th>CarryQ</th><th>Gain</th></tr></thead><tbody>{data.rows.map(([label,a,b,note])=><tr key={label}><td>{label}<small>{note}</small></td><td>{fmt(a)}%</td><td>{fmt(b)}%</td><td>+{fmt(b-a)}</td></tr>)}</tbody></table></div> : name==='Additional tasks' ? <div className="additional-summary">
          <span className="cohort-label">12 independently selected LIBERO tasks</span>
          <div className="additional-stat"><span>Memoryless</span><strong className="baseline">58.75<small>%</small></strong><small>141 / 240</small></div>
          <div className="additional-stat"><span>CarryQ</span><strong className="ours">92.92<small>%</small></strong><small>223 / 240</small></div>
          <div className="cohort-gain">+34.17 <span>percentage points</span></div>
        </div> : <Bars rows={data.rows}/>}
        <p className="caption evaluation-note">{data.note}</p>
      </article>)}
    </div>
    <div className="insertion-result"><div><div className="eyebrow">Fine insertion · OpenVLA-OFT</div><h3>Temporal feedback at finer precision.</h3><p>USB-C and two-blade charger insertion with Franka Panda in MuJoCo. Each method uses 120 episodes per task and bit width.</p><div className="tabs" aria-label="Insertion bit width">{[8,6,4].map(b=><button key={b} aria-pressed={bits===b} onClick={()=>setBits(b)}>{b} bits</button>)}</div><p className="small">H = 8 · K = 4 · 10 Hz<br/>S2: completed insertion</p></div><div className="panel-surface"><Bars rows={fine}/></div></div>
  </section>;
}
function Real() {
  return <section className="section wrap" id="real">
    <SectionHead n="Real robot" title="Real-robot charging connector insertion">Charging connector insertion on PiPER with π₀.₅. The goal is complete insertion into a power strip, verified by electrical connection.</SectionHead>
    <div className="real-photos">{[1,2,3].map(i=><figure key={i}><img loading="lazy" src={file(`media/real-${i}.jpg`)} alt={['Real PiPER arm approaching the power strip','Charging connector aligned with the socket','Charging connector successfully inserted'][i-1]}/><figcaption><span>0{i}</span>{['Approach','Align','Insert'][i-1]}</figcaption></figure>)}</div>
    <div className="real-result-head"><h3>One policy. A different encoding rule.</h3><p>50 trials per configuration · 10 Hz · K = 4</p></div>
    <div className="real-bit-grid">{[4,6].map(bits=>{
      const ml=real.find(row=>row.method==='Memoryless' && +row.bits_per_coordinate===bits);
      const cq=real.find(row=>row.method==='CarryQ' && +row.bits_per_coordinate===bits);
      return <article className="real-bit-card panel-surface" key={bits} aria-label={`${bits}-bit real robot results`}>
        <div className="real-bit-heading"><h4>{bits}-bit encoding</h4><span>+{+cq.insertion_power_pct-ml.insertion_power_pct} pp</span></div>
        <p className="real-stage-label">S2 · Insertion & power</p>
        <div className="real-comparison"><div className="real-stat"><span className="baseline">Memoryless</span><strong>{ml.insertion_power_pct}<small>%</small></strong><span>{ml.insertion_power_successes} / 50 trials</span></div><span className="stat-arrow">→</span><div className="real-stat"><span className="ours">CarryQ</span><strong className="ours">{cq.insertion_power_pct}<small>%</small></strong><span>{cq.insertion_power_successes} / 50 trials</span></div></div>
        <div className="real-alignment"><span>S1 · Alignment</span><span><b className="baseline">{ml.alignment_pct}%</b><i>→</i><b className="ours">{cq.alignment_pct}%</b></span></div>
      </article>;
    })}</div>
    <p className="caption">The encoders share joint-target differencing, integration and low-level control. Continuous execution achieves 18% S2 success. Full controls and trial counts are in the supplement.</p>
  </section>;
}

function Gallery() {
  const [filter, setFilter] = useState('All');
  return <section className="section wrap" id="gallery"><SectionHead n="Video gallery" title="Recorded task comparisons">Selected Memoryless-failure / CarryQ-success pairs, shown side by side with matched cameras.</SectionHead><div className="tabs">{['All', 'Replay', 'Closed-loop'].map(f => <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f}</button>)}</div><div className="video-grid">{videos.filter(v => filter === 'All' || v.group === filter).map(v => <div key={v.file}><Video item={v} /><p className="caption">{v.group === 'Replay' ? 'Matched recorded-source replay.' : v.source_id.startsWith('robotwin') ? 'Separate paired SeedPolicy qualitative recording.' : 'Saved paired closed-loop execution.'} 4-bit encoding · complete export at 20 fps.</p></div>)}</div></section>;
}
function VideoSelector() {
  const [selected, setSelected] = useState(videos[6]);
  return <div className="video-selector">
      <Video key={selected.file} item={selected} hero />
      <div className="video-playlist" role="group" aria-label="Recorded comparison task">
        <h2>Execution comparisons</h2>
        {videos.map(item => <button key={item.file} aria-pressed={item.file === selected.file} onClick={() => setSelected(item)}>
            <span>{item.title}</span><span aria-hidden="true">▷</span>
          </button>)}
      </div>
    </div>;
}
function MethodSection() {
  return <section className="section wrap" id="method">
      <SectionHead n="Method" title="Carry error forward through the token sequence">
        CarryQ uses the residual from earlier choices to adjust the next quantizer input.
        A short memory state lets successive errors compensate within the same action interface.
      </SectionHead>
      <SystemArchitecture />
      <div className="method-concepts">
        <article><h3>Residual addition</h3><p>The previous discrepancy adjusts the next source command before token selection.</p></article>
        <article><h3>Fixed action interface</h3><p>The vocabulary, decoder and token budget stay matched within each comparison.</p></article>
        <article><h3>Window-level feedback</h3><p>Carry the remaining residual across executed actions and reset at the next chunk or query.</p></article>
      </div>
      <div className="mechanism-heading">
        <h3>Follow every codeword choice</h3>
        <p>Follow the automatic codeword sequence, or change the increment and reset length to inspect the residual.</p>
      </div>
      <CodewordExplorer />
      <div className="integration-panel">
        <div>
          <h3>Prediction-time encoding</h3>
          <p>Completed policy predictions feed into CarryQ before control.</p>
          <div className="integration-flow"><span>Policy chunk</span><i>→</i><span className="highlight">CarryQ</span><i>→</i><span>Decode</span><i>→</i><span>Execute K</span></div>
          <small>OpenVLA-OFT · Can · SeedPolicy · π₀.₅ + PiPER</small>
        </div>
        <div>
          <h3>Encoded training targets</h3>
          <p>CarryQ also constructs labels for a token-predicting policy.</p>
          <div className="integration-flow"><span>Source actions</span><i>→</i><span className="highlight">CarryQ labels</span><i>→</i><span>Train policy</span></div>
          <small>BAR-Smol with native Praxis tokens</small>
        </div>
      </div>
    </section>;
}
function Citation() {
  const [copied, setCopied] = useState(false);
  const bibtex = `@misc{carryq,
  title = {Beyond Pointwise Accuracy: Temporal Error Structure in Robot Action Tokenization},
  note = {Authors and arXiv information coming soon}
}`;
  return <section className="section wrap citation" id="citation"><div className="citation-heading"><h2>Citation</h2><button onClick={async()=>{await navigator.clipboard.writeText(bibtex);setCopied(true);}}> {copied?'Copied':'Copy BibTeX'} </button></div><p className="caption">Author and arXiv details will be added when available.</p><pre><code>{bibtex}</code></pre></section>;
}

function App() {
  return <>
    <a className="skip" href="#main">Skip to content</a>
    <nav className="nav"><div className="wrap nav-inner">
      <a className="brand wordmark" href="#" aria-label="CarryQ"><Wordmark /></a>
      <div className="nav-links">{links.map(([id, label]) => <a key={id} href={"#" + id}>{label}</a>)}</div>
    </div></nav>
    <main id="main">
      <header className="hero wrap">
        <div className="hero-intro">
          <h1>Beyond Pointwise Accuracy:<br/><span>Temporal Error Structure in Robot Action Tokenization</span></h1>
          <p className="hero-description">CarryQ · Temporal residual-feedback action encoding</p>
          <p className="publication-people"><span>Authors coming soon</span><span>Affiliations coming soon</span></p>
          <div className="resource-buttons">
            <a className="button primary" href={paper}>Paper</a>
            <a className="button" href={codeLink}>Code</a>
            <a className="button" href={supplement}>Supplementary material</a>
          </div>
        </div>
        <Workcell />
        <div className="stats">
          <div><strong>66.08 → 96.04<span>%</span></strong><h3>Scalar replay success</h3><p>Six LIBERO tasks · shared commands</p></div>
          <div><strong>15.42 → 43.33<span>%</span></strong><h3>Simulated fine insertion</h3><p>8-bit · USB-C and charger mean</p></div>
          <div><strong>16 → 42<span>%</span></strong><h3>Real insertion and power</h3><p>6-bit · π₀.₅ + PiPER</p></div>
        </div>
      </header>
      <section className="section wrap" id="comparisons">
        <SectionHead n="Recorded execution" title="Compare Memoryless and CarryQ">
          Paired examples across action tokenizers and policy sources.
        </SectionHead>
        <VideoSelector />
      </section>
      <section className="section wrap" id="motivation">
        <SectionHead n="The problem" title="Small rounding errors can persist">
          Fine alignment often requires repeated small increments. When their encoding errors point in the same direction, the cumulative command diverges.
        </SectionHead>
        <MotivationDiagram />
      </section>
      <MethodSection />
      <TemporalEvidence />
      <Real />
      <Results />
      <Gallery />
      <Citation />
    </main>
    <footer className="wrap"><a className="brand wordmark" href="#" aria-label="CarryQ"><Wordmark /></a><span>Temporal residual-feedback action encoding</span></footer>
  </>;
}
createRoot(document.getElementById('root')).render(<App />);
