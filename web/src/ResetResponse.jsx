import React, { useState } from "react";
import data from "./reset-response.json";

const colors = ["#939eaf", "#77bdb4", "#a398ff"];
function ResetChart({mode, action, onInspect}) {
  const cumulative=mode==="cumulative", length=cumulative?300:75;
  const position=cumulative?action:Math.ceil(action/4), index=position-1;
  const minimum=cumulative?0:6, maximum=cumulative?1000:14;
  const x=value=>70+value/length*480;
  const y=value=>314-(value-minimum)/(maximum-minimum)*254;
  const ticks=cumulative?[0,250,500,750,1000]:[6,8,10,12,14];
  function inspect(event) {
    const svg=event.currentTarget,point=svg.createSVGPoint();
    point.x=event.clientX;point.y=event.clientY;
    const local=point.matrixTransform(svg.getScreenCTM().inverse());
    const selected=Math.max(1,Math.min(length,Math.round((local.x-70)/480*length)));
    onInspect(cumulative?selected:selected*4);
  }
  return <div className="reset-chart" data-mode={mode}>
    <div className="reset-chart-heading"><h4>{cumulative?'Cumulative':'Per query'}</h4><span>{cumulative?'Action':'Query'} {position}</span></div>
    <svg viewBox="0 0 600 376" role="img" aria-label={cumulative?'Cumulative prefix cost over 300 executed actions':'Prefix AUC over 75 policy queries'} onPointerMove={inspect}>
      <text x="70" y="31" className="axis-label">{cumulative?'Prefix cost':'Prefix AUC'} (mm·step)</text>
      {ticks.map(value=><g key={value}><line x1="70" x2="550" y1={y(value)} y2={y(value)} className="chart-grid"/><text x="57" y={y(value)+5} textAnchor="end">{value}</text></g>)}
      {(cumulative?[0,100,200,300]:[1,25,50,75]).map(value=><text key={value} x={x(value)} y="341" textAnchor="middle">{value}</text>)}
      <text x="550" y="366" textAnchor="end">{cumulative?'Executed action':'Policy query'}</text>
      <line x1={x(position)} x2={x(position)} y1="60" y2="314" className="action-cursor"/>
      {data.series.map((series,i)=>{
        const values=series[mode];
        const points=[...(cumulative?[[x(0),y(0)]]:[]),...values.map((value,t)=>[x(t+1),y(value)])].map(point=>point.join(',')).join(' ');
        return <g key={series.reset}><polyline points={points} fill="none" stroke={colors[i]} strokeWidth={i===2?3:2.1} strokeDasharray={i===0?'7 5':i===1?'7 3 2 3':undefined}/>{values.map((value,t)=>t%10===0 || t===values.length-1?<circle key={t} cx={x(t+1)} cy={y(value)} r="2.5" fill={colors[i]}/>:null)}<circle cx={x(position)} cy={y(values[index])} r="5" fill="#10141d" stroke={colors[i]} strokeWidth="2"/></g>;
      })}
    </svg>
    <div className="reset-readouts">{data.series.map((series,i)=><span key={series.reset}>{series.label}<b style={{color:colors[i]}}>{series[mode][index].toFixed(2)}</b></span>)}</div>
  </div>;
}

export default function ResetResponse() {
  const [action,setAction]=useState(300);
  const reduction=(100*(1-data.series[2].cumulative.at(-1)/data.series[0].cumulative.at(-1))).toFixed(2);
  return <figure className="technical-figure reset-response">
    <div className="figure-heading"><h3>Residual lifetime</h3><span className="reset-reduction">{reduction}% lower total prefix cost</span></div>
    <div className="reset-legend">{data.series.map((series,i)=><span key={series.reset} style={{'--series-color':colors[i]}}>{series.label}</span>)}</div>
    <div className="reset-chart-grid"><ResetChart mode="cumulative" action={action} onInspect={setAction}/><ResetChart mode="queries" action={action} onInspect={setAction}/></div>
    <figcaption>Same Can source commands across 75 four-action queries. CarryQ retains feedback through all four actions. <a href={import.meta.env.BASE_URL+'data/reset-response.csv'}>Source data</a></figcaption>
  </figure>;
}
