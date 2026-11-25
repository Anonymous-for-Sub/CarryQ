// Deterministic scalar teaching example, in grid units. Not trial measurements.
export function encodeExample({increment=.18,steps=16,reset=8}={}) {
  let residual=0, mlSum=0, cqSum=0;
  const rows=[];
  for(let t=0;t<steps;t++){
    if(t%reset===0)residual=0;
    const input=increment+residual, ml=Math.round(increment-.5)+.5, cq=Math.round(input-.5)+.5;
    const previous=residual;residual=Math.max(-.5,Math.min(.5,input-cq));mlSum+=ml;cqSum+=cq;
    rows.push({step:t+1,source:increment,input,residual,previous,ml,cq,requested:(t+1)*increment,mlSum,cqSum});
  }
  return rows;
}
