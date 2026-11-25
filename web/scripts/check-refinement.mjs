import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const folder = process.env.CARRYQ_SCREENSHOTS || "/tmp/carryq-refinement";
await mkdir(folder,{recursive:true});
const browser=await chromium.launch({headless:true,args:["--disable-gpu","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
try {
  const page=await browser.newPage({viewport:{width:1440,height:1100}});
  const errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  page.on("response",response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
  await page.goto(process.argv[2] || "http://127.0.0.1:38125/CarryQ/",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.querySelector('#playback-view')?.disabled===false);
  assert.deepEqual(await page.locator('.hero-intro .resource-buttons a').allTextContents(),['Paper','Code','Supplementary material']);
  assert.equal(await page.locator('.hero-intro').evaluate(element=>getComputedStyle(element).textAlign),'start');
  assert.ok(await page.locator('.hero-intro').evaluate(element=>element.getBoundingClientRect().height>300));
  assert.ok(!(await page.locator('main').innerText()).includes('Anonymous submission'));
  assert.match(await page.locator('.publication-people').innerText(),/Authors coming soon.*Affiliations coming soon/s);
  await page.screenshot({path:folder+'/hero.png'});
  await page.locator('#demo').screenshot({path:folder+'/workcell.png'});

  const motivation=page.locator('.motivation-diagram');
  await motivation.scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>+document.querySelector('input[aria-label="Executed actions"]').value>.8);
  await motivation.getByLabel('Animation action count').selectOption('64');
  await page.waitForFunction(()=>+document.querySelector('input[aria-label="Executed actions"]').value>.2);
  await motivation.getByRole('slider',{name:'Executed actions',exact:true}).fill('32');
  assert.match(await motivation.locator('.motivation-readouts').innerText(),/16.00Δ/);
  assert.equal(await motivation.locator('polyline.ml-stroke').getAttribute('points').then(value=>value.split(' ').length),33);
  await motivation.screenshot({path:folder+'/motivation.png'});

  const explorer=page.locator('.codeword-explorer');
  await explorer.scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>+document.querySelector('#step').value>1);
  await page.locator('#step').fill('7');
  await explorer.screenshot({path:folder+'/codewords.png'});
  await page.locator('#reset').selectOption('1');
  const values=[...(await explorer.locator('.mechanism-summary').innerText()).matchAll(/(\d+\.\d+) Δ/g)].map(match=>match[1]);
  assert.equal(values[0],values[1]);
  await page.locator('#reset').selectOption('8');

  const reset=page.locator('.reset-response');
  await reset.scrollIntoViewIfNeeded();
  assert.equal(await reset.locator('.reset-chart').count(),2);
  assert.equal(await reset.locator('[data-mode="cumulative"] polyline').first().getAttribute('points').then(value=>value.split(' ').length),301);
  assert.equal(await reset.locator('[data-mode="queries"] polyline').first().getAttribute('points').then(value=>value.split(' ').length),75);
  assert.match(await reset.locator('.reset-reduction').innerText(),/35.14/);
  assert.equal(await page.locator('.ledger-bit').count(),2);
  assert.equal(await page.locator('.codeword-explorer .tag').count(),0);
  assert.equal(await page.locator('.real-stage-label').count(),0);
  assert.ok(!(await page.locator('#real').innerText()).includes('3 / 50 trials'));
  await reset.screenshot({path:folder+'/reset-response.png'});

  await page.locator('#real').screenshot({path:folder+'/real.png'});
  assert.equal(await page.locator('.real-results-table tbody tr').count(),2);
  assert.match(await page.getByRole('row',{name:'4-bit real robot results',exact:true}).innerText(),/36/);
  assert.match(await page.getByRole('row',{name:'6-bit real robot results',exact:true}).innerText(),/42/);
  const boxes=await page.locator('.evaluation-card').evaluateAll(elements=>elements.map(element=>({left:element.getBoundingClientRect().left,top:element.getBoundingClientRect().top})));
  assert.equal(boxes.length,3);
  assert.ok(Math.abs(boxes[0].left-boxes[1].left)<2 && boxes[1].top>boxes[0].top);
  assert.ok(boxes[2].left>boxes[0].left && Math.abs(boxes[2].top-boxes[0].top)<2);
  await page.locator('#results').screenshot({path:folder+'/results.png'});
  await page.locator('#citation').screenshot({path:folder+'/citation.png'});
  assert.equal(await page.locator('.resources').count(),0);
  assert.match(await page.locator('#citation code').innerText(),/arXiv information coming soon/);

  await page.setViewportSize({width:390,height:844});
  for(const [selector,name] of [['.hero-intro','hero'],['#demo','demo'],['.codeword-explorer','codewords'],['.reset-response','reset'],['#real','real'],['#results','results'],['#citation','citation']]) {
    await page.locator(selector).screenshot({path:`${folder}/mobile-${name}.png`});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),selector+' mobile page overflow');
  }
  assert.deepEqual(errors,[]);
  await writeFile(folder+'/checks.json',JSON.stringify({errors,status:'passed',checks:['default autoplay','16/32/64 action horizons','exact 300/75-point reset data','parallel results','both real-robot bit widths','header and citation','mobile layout']},null,2));
  console.log('PASS: continuous autoplay, codeword routing, exact reset data, simultaneous results, citation and mobile layout.');
} finally { await browser.close(); }
