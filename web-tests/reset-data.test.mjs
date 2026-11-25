import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

test("website reset curves preserve every aggregate source measurement", () => {
  const raw=readFileSync(new URL("../web/public/data/reset-response.csv",import.meta.url));
  const data=JSON.parse(readFileSync(new URL("../web/src/reset-response.json",import.meta.url),"utf8"));
  assert.equal(createHash("sha256").update(raw).digest("hex"),data.source_sha256);
  const rows=raw.toString().trim().split("\n").slice(1).map(line=>line.split(",").map(Number));
  for (const series of data.series) {
    const source=rows.filter(row=>row[1]===series.reset);
    assert.equal(series.cumulative.length,300);
    assert.equal(series.queries.length,75);
    assert.deepEqual(series.cumulative,source.map(row=>row[3]));
    assert.deepEqual(series.queries,source.filter((row,index)=>index%4===0).map(row=>row[5]));
  }
});
