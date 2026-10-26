const {chromium}=require('playwright'),{createGameServer}=require('../server'),H=require('../shared/heroes'),assert=require('node:assert/strict');
(async()=>{
 const game=createGameServer();await new Promise(r=>game.server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${game.server.address().port}`;
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE_PATH||(require('node:fs').existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 try{
 const page=await browser.newPage({viewport:{width:1365,height:768}}),errors=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.waitForFunction(()=>window.arenaDiagnostics);
 for(const [id,h]of Object.entries(H.heroes)){
  const card=page.locator(`#hero-options button[data-hero="${id}"]`),box=await card.boundingBox();assert.ok(box&&box.y>=0&&box.y+box.height<=768&&box.x>=0&&box.x+box.width<=1365,`${h.name} must be visible without opening a dropdown`);
 }
 await page.screenshot({path:'/tmp/blockward-hero-picker.png'});
 for(const [id,h]of Object.entries(H.heroes)){
  const card=page.locator(`#hero-options button[data-hero="${id}"]`);await card.click();assert.equal(await card.getAttribute('aria-pressed'),'true');assert.match(await page.locator('#hero-description').textContent(),new RegExp(h.q.name));
  await page.click('#create');await page.waitForFunction(id=>window.arenaDiagnostics().joined&&window.arenaDiagnostics().hero===id,id);
  const info=await page.evaluate(()=>window.arenaDiagnostics()),player=game.rooms.get(info.room).get(info.id);assert.equal(player.hero,id);assert.equal(player.hp,h.health);assert.equal(player.weapon,h.weapon);
  await page.waitForFunction(()=>window.arenaDiagnostics().locked||document.querySelector('#pause-error').textContent.length>0);if(await page.evaluate(()=>window.arenaDiagnostics().locked))await page.keyboard.press('Escape');await page.locator('#pause').waitFor({state:'visible'});
  assert.equal(await page.locator('#next-hero-options button').count(),8);
  await page.click('#leave');await page.locator('#menu').waitFor({state:'visible'});console.log(`${h.name}: visible card joins with the correct playable class`);
 }
 assert.deepEqual(errors,[]);console.log('All eight hero choices work through real clicks; no browser errors');
 }finally{await browser.close();await new Promise(r=>game.io.close(r));}
})().catch(e=>{console.error(e);process.exit(1)});
