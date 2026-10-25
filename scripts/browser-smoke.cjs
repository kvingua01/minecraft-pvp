const {chromium}=require('playwright');
const {createGameServer}=require('../server');
const assert=require('node:assert/strict');
(async()=>{
 const game=createGameServer();await new Promise(r=>game.server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${game.server.address().port}`;
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE_PATH||(require('node:fs').existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 try{
 const contexts=await Promise.all([browser.newContext({viewport:{width:1280,height:800}}),browser.newContext({viewport:{width:1280,height:800}})]),pages=await Promise.all(contexts.map(c=>c.newPage())),[a,b]=pages,errors=[];
 for(const p of pages){p.setDefaultTimeout(12000);p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.waitForFunction(()=>window.arenaDiagnostics);}
 await a.fill('#name','Alpha');await a.click('#create');await a.waitForFunction(()=>window.arenaDiagnostics().joined);
 const info=await a.evaluate(()=>window.arenaDiagnostics());await b.fill('#name','Bravo');await b.fill('#code',info.room);await b.click('.join-row button');await b.waitForFunction(()=>window.arenaDiagnostics().remotes.length===1);await a.waitForFunction(()=>window.arenaDiagnostics().remotes.length===1);
 console.log('Two browser clients joined combat arena');
 await a.bringToFront();if(!await a.evaluate(()=>window.arenaDiagnostics().locked))await a.click('#resume');await a.waitForFunction(()=>window.arenaDiagnostics().locked);
 const room=game.rooms.get(info.room),pa=room.get(info.id),bid=(await b.evaluate(()=>window.arenaDiagnostics())).id,pb=room.get(bid);
 function place(){Object.assign(pa,{x:0,y:0,z:10,protectedUntil:0,nextAttack:0,kx:0,kz:0,vy:0,fallPeak:0});Object.assign(pb,{x:0,y:0,z:7,protectedUntil:0,kx:0,kz:0,vy:0,fallPeak:0});}
 place();await a.waitForTimeout(350);
 await a.evaluate(()=>{const d=window.arenaDiagnostics();document.dispatchEvent(new MouseEvent('mousemove',{movementX:d.yaw/.002,movementY:d.pitch/.002}));});await a.waitForTimeout(100);
 await a.mouse.down({button:'right'});await a.waitForFunction(()=>window.arenaDiagnostics().blocking);await a.mouse.up({button:'right'});await a.waitForFunction(()=>!window.arenaDiagnostics().blocking);console.log('First-person shield raises and lowers');
 await a.mouse.down();await a.mouse.up();await b.waitForFunction(()=>window.arenaDiagnostics().hp<100);assert.equal(pb.hp,84);console.log('Melee click deals authoritative damage and updates both HUDs');
 await a.keyboard.press('2');await a.waitForFunction(()=>window.arenaDiagnostics().weapon==='axe');await a.keyboard.press('3');await a.waitForFunction(()=>window.arenaDiagnostics().weapon==='mace');await a.keyboard.press('4');await a.waitForFunction(()=>window.arenaDiagnostics().weapon==='bow');
 place();await a.waitForTimeout(400);await a.mouse.down();await a.waitForTimeout(1100);assert.match(await a.locator('#weapon-status').textContent(),/DRAW/);await a.mouse.up();await b.waitForFunction(()=>window.arenaDiagnostics().hp<84);console.log('Bow draws, releases a server projectile and damages the other browser');
 await a.keyboard.press('5');await a.waitForFunction(()=>window.arenaDiagnostics().weapon==='crossbow');place();await a.waitForTimeout(250);await a.mouse.down();await a.mouse.up();await a.waitForFunction(()=>document.querySelector('#weapon-status').textContent.startsWith('RELOADING'));assert.match(await a.locator('#weapon-status').textContent(),/RELOADING/);console.log('Crossbow shows reload cooldown');
 await a.keyboard.press('1');await a.waitForFunction(()=>window.arenaDiagnostics().weapon==='sword');place();pb.hp=16;await a.waitForTimeout(300);await a.mouse.down();await a.mouse.up();await b.waitForFunction(()=>window.arenaDiagnostics().hp===0);assert.equal(await b.locator('#death').isVisible(),true);await a.waitForFunction(()=>window.arenaDiagnostics().kills===1);assert.ok((await a.locator('#kill-feed').textContent()).includes('Bravo'));console.log('Elimination, kill feed, scores, and first-person death countdown passed');
 await b.waitForFunction(()=>window.arenaDiagnostics().hp===100,{},{timeout:8000});assert.equal(await b.locator('#death').isVisible(),false);console.log('Automatic 4-second respawn passed');
 await a.screenshot({path:'/tmp/blockward-phase2.png'});
 await a.keyboard.press('Escape');await a.waitForFunction(()=>!window.arenaDiagnostics().locked);await a.click('#resume');await a.waitForFunction(()=>window.arenaDiagnostics().locked);console.log('Escape/resume regression passed');
 // Cancel a draw when pointer lock is lost; resuming must not fire an old arrow.
 await a.keyboard.press('4');await a.waitForFunction(()=>window.arenaDiagnostics().weapon==='bow');pa.nextAttack=0;
 await a.mouse.down();await a.waitForTimeout(200);assert.ok(pa.drawAt);await a.keyboard.press('Escape');await a.mouse.up();await a.waitForTimeout(80);assert.equal(pa.drawAt,0);await a.click('#resume');await a.waitForFunction(()=>window.arenaDiagnostics().locked);console.log('Paused bow draw cancels safely');
 const before=(await a.evaluate(()=>window.arenaDiagnostics())).position;
 await a.keyboard.down('KeyW');await a.waitForFunction(origin=>{const p=window.arenaDiagnostics().position;return Math.hypot(p.x-origin.x,p.z-origin.z)>1.5;},before);await a.keyboard.up('KeyW');
 const after=(await a.evaluate(()=>window.arenaDiagnostics())).position;assert.ok(Math.hypot(pa.x-before.x,pa.z-before.z)>.5);
 await a.keyboard.down('Space');await a.waitForFunction(y=>window.arenaDiagnostics().position.y>y+.3,after.y);await a.keyboard.up('Space');await a.waitForFunction(y=>window.arenaDiagnostics().position.y<y+.1,after.y);console.log('Movement, jump, and gravity regression passed');
 await a.keyboard.down('Tab');assert.equal(await a.locator('#roster').isVisible(),true);assert.match(await a.locator('#roster').textContent(),/1 K/);await a.keyboard.up('Tab');
 await a.keyboard.press('Escape');await a.click('#leave');await b.waitForFunction(()=>window.arenaDiagnostics().remotes.length===0);console.log('Leave removes remote combat avatar');
 await a.goto(url+'/practice/');await a.click('#start');await a.click('#target');assert.equal(await a.locator('#score').textContent(),'Score: 1');console.log('Original practice game regression passed');
 assert.deepEqual(errors,[]);console.log('No browser runtime errors');
 }finally{await browser.close();await new Promise(r=>game.io.close(r));}
})().catch(e=>{console.error(e);process.exit(1)});
