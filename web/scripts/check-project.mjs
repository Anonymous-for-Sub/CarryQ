import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const folder=process.env.CARRYQ_SCREENSHOTS||'/tmp/carryq-project-qa';await mkdir(folder,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--disable-gpu','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[],requests=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});page.on('request',r=>requests.push(r.url()));
try{
 await page.goto(process.argv[2]||'http://127.0.0.1:38125/CarryQ/',{waitUntil:'networkidle'});
 await page.emulateMedia({reducedMotion:'reduce'});
 assert.equal(await page.locator('iframe').count(),0);
 assert.ok(!requests.some(u=>u.includes('/InsertionDemo-')),'demo should load only on request');
 await page.waitForFunction(()=>document.querySelector('#playback-view')?.disabled===false);
 await page.screenshot({path:folder+'/desktop-hero.png'});
 await page.locator('#method').scrollIntoViewIfNeeded();await page.screenshot({path:folder+'/desktop-method.png'});
 await page.locator('#reset').selectOption('1');const summary=await page.locator('.mechanism-summary').innerText();const values=[...summary.matchAll(/(\d+\.\d+) Δ/g)].map(m=>m[1]);assert.equal(values[0],values[1]);await page.locator('#reset').selectOption('8');
 await page.locator('#results').scrollIntoViewIfNeeded();assert.equal(await page.locator('.evaluation-card').count(),3);await page.getByRole('button',{name:'Table view',exact:true}).click();assert.equal(await page.locator('.evaluation-grid tbody tr').count(),9);await page.screenshot({path:folder+'/desktop-results.png'});await page.getByRole('button',{name:'Chart view',exact:true}).click();
 await page.locator('#real').scrollIntoViewIfNeeded();assert.equal(await page.locator('.real-results-table tbody tr').count(),2);assert.match(await page.getByRole('row',{name:'4-bit real robot results',exact:true}).innerText(),/36/);assert.match(await page.getByRole('row',{name:'6-bit real robot results',exact:true}).innerText(),/42/);await page.screenshot({path:folder+'/desktop-real.png'});
 await page.locator('#gallery').getByRole('button',{name:'Replay',exact:true}).click();assert.equal(await page.locator('#gallery video').count(),3);await page.locator('#gallery').getByRole('button',{name:'All',exact:true}).click();assert.equal(await page.locator('#gallery video').count(),8);
 await page.locator('#gallery video').first().evaluate(async v=>{await v.play()});await page.waitForTimeout(500);assert.ok(await page.locator('#gallery video').first().evaluate(v=>v.currentTime>0));
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(250);await page.screenshot({path:folder+'/mobile-hero.png'});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile page overflow');
 await page.locator('#method').scrollIntoViewIfNeeded();await page.screenshot({path:folder+'/mobile-method.png'});await page.locator('#demo').scrollIntoViewIfNeeded();await page.screenshot({path:folder+'/mobile-demo-cover.png'});
 assert.deepEqual(errors,[]);console.log('PASS: responsive page, exact controls, live computation, results, galleries, video playback, lazy demo and no page errors.');
}finally{await browser.close()}
