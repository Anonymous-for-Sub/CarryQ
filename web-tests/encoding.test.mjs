import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeExample} from '../web/src/encoding.mjs';
test('one-action reset is exactly memoryless',()=>{for(const increment of [.06,.18,.30,.44])for(const r of encodeExample({increment,reset:1}))assert.equal(r.ml,r.cq)});
test('residual telescopes within each reset window',()=>{for(const reset of [2,4,8,16])for(const increment of [.06,.18,.30,.44]){let error=0;for(const r of encodeExample({increment,reset})){if((r.step-1)%reset===0)error=0;error+=r.cq-r.source;assert.ok(Math.abs(error+r.residual)<1e-10);assert.ok(Math.abs(error)<=.5+1e-10)}}});
