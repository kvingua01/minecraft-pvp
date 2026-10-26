const {chromium}=require('playwright'),{createGameServer}=require('../server'),assert=require('node:assert/strict');
(async()=>{
 const game=createGameServer();await new Promise(r=>game.server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${game.server.address().port}`;
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE_PATH||(require('node:fs').existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 try{
 const a=await browser.newPage({viewport:{width:1280,height:800}}),b=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
 for(const p of [a,b]){p.setDefaultTimeout(15000);p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.waitForFunction(()=>window.arenaDiagnostics);}
 await a.selectOption('#hero','frost');await a.selectOption('#team','red');await a.click('#create');await a.waitForFunction(()=>window.arenaDiagnostics().joined);const initial=await a.evaluate(()=>window.arenaDiagnostics());
 await b.selectOption('#team','blue');await b.fill('#code',initial.room);await b.click('.join-row button');await b.waitForFunction(()=>window.arenaDiagnostics().remotes.length===1);
 const p=game.rooms.get(initial.room).get(initial.id);Object.assign(p,{x:0,y:0,z:10,hp:77,kills:2,ult:43,protectedUntil:0});
 await a.bringToFront();if(!await a.evaluate(()=>window.arenaDiagnostics().locked))await a.click('#resume');await a.waitForFunction(()=>window.arenaDiagnostics().hp===77);
 await a.keyboard.down('w');await a.waitForTimeout(150);const ready=p.abilityReady.q;game.io.sockets.sockets.get(initial.id).conn.close();
 await a.waitForFunction(()=>window.arenaDiagnostics().reconnecting);assert.equal(await a.locator('#menu').isVisible(),false);await a.locator('#network-banner').waitFor({state:'visible'});await a.keyboard.press('q');await a.keyboard.up('w');
 await a.waitForFunction(()=>window.arenaDiagnostics().joined&&!window.arenaDiagnostics().reconnecting);const restored=await a.evaluate(()=>window.arenaDiagnostics());
 assert.equal(restored.hero,'frost');assert.equal(restored.room,initial.room);assert.equal(restored.hp,77);assert.equal(restored.kills,2);assert.equal(restored.ult,43);assert.equal(p.abilityReady.q,ready);assert.equal(await a.locator('#menu').isVisible(),false);
 await a.locator('#pause').waitFor({state:'visible'});assert.match(await a.locator('#pause-error').textContent(),/Reconnected/);await a.click('#resume');await a.waitForFunction(()=>window.arenaDiagnostics().locked);
 const position=(await a.evaluate(()=>window.arenaDiagnostics())).position;await a.waitForTimeout(300);const stationary=(await a.evaluate(()=>window.arenaDiagnostics())).position;assert.ok(Math.hypot(position.x-stationary.x,position.z-stationary.z)<.05);console.log('A real transport interruption reconnects automatically without returning to the main menu or replaying held inputs');
 await a.keyboard.down('w');await a.waitForFunction(origin=>{const p=window.arenaDiagnostics().position;return Math.hypot(p.x-origin.x,p.z-origin.z)>.5;},stationary);await a.keyboard.up('w');console.log('Health, hero, ultimate, kills, room and playable controls survive reconnection');
 // Simulate process-local room state disappearing, as it does during a deployment.
 const id=(await a.evaluate(()=>window.arenaDiagnostics())).id;game.rooms.clear();game.matches.clear();game.combats.clear();game.io.sockets.sockets.get(id).conn.close();
 await a.locator('#menu').waitFor({state:'visible'});assert.match(await a.locator('#error').textContent(),/restarted|expired/);assert.equal((await a.evaluate(()=>window.arenaDiagnostics())).joined,false);console.log('A server state reset explains that the match ended instead of silently losing the session');
 assert.deepEqual(errors,[]);console.log('No reconnect browser runtime errors');
 }finally{await browser.close();await new Promise(r=>game.io.close(r));}
})().catch(e=>{console.error(e);process.exit(1)});
