const {chromium}=require('playwright'),{createGameServer}=require('../server'),assert=require('node:assert/strict');
(async()=>{
 const game=createGameServer();await new Promise(r=>game.server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${game.server.address().port}`;
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE_PATH||(require('node:fs').existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 try{
  const a=await browser.newPage({viewport:{width:1280,height:800}}),b=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
  for(const p of [a,b]){p.setDefaultTimeout(15000);p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.waitForFunction(()=>window.arenaDiagnostics);}
  assert.equal(await a.locator('#hero option').count(),8);await a.selectOption('#hero','frost');assert.match(await a.locator('#hero-description').textContent(),/Ice Bolt/);
  await a.fill('#name','Frost tester');await a.selectOption('#team','red');await a.click('#create');await a.waitForFunction(()=>window.arenaDiagnostics().joined);
  const info=await a.evaluate(()=>window.arenaDiagnostics());await b.fill('#name','Target');await b.selectOption('#team','blue');await b.fill('#code',info.room);await b.click('.join-row button');await b.waitForFunction(()=>window.arenaDiagnostics().remotes.length===1);
  const room=game.rooms.get(info.room),pa=room.get(info.id),pb=room.get((await b.evaluate(()=>window.arenaDiagnostics())).id);
  async function resume(){await a.bringToFront();if(!await a.evaluate(()=>window.arenaDiagnostics().locked))await a.click('#resume');await a.waitForFunction(()=>window.arenaDiagnostics().locked);}
  function place(){Object.assign(pa,{x:0,y:0,z:10,protectedUntil:0,kx:0,kz:0,vy:0,fallPeak:0,input:{},lastInput:0});Object.assign(pb,{x:0,y:0,z:7,protectedUntil:0,kx:0,kz:0,vy:0,fallPeak:0,input:{},lastInput:0});}
  async function aim(){await a.evaluate(()=>{const d=window.arenaDiagnostics();document.dispatchEvent(new MouseEvent('mousemove',{movementX:d.yaw/.002,movementY:d.pitch/.002}));});}
  await resume();place();await a.waitForFunction(()=>window.arenaDiagnostics().position.z>9.9&&Math.abs(window.arenaDiagnostics().position.x)<.1);await aim();
  await a.keyboard.press('r');await a.waitForFunction(()=>document.querySelector('#ability-message').textContent.includes('100%'));assert.equal(pa.ult,0);
  await a.keyboard.press('q');await b.waitForFunction(()=>window.arenaDiagnostics().hp<180);assert.ok(pb.status.slow>Date.now());await a.waitForFunction(()=>document.querySelector('#ability-q').textContent.match(/\ds/));console.log('Eight classes, Frost primary, Q damage/slow and server cooldown HUD passed');
  pb.x=10;await a.keyboard.press('e');await a.waitForFunction(()=>document.querySelector('#ability-e').textContent.match(/\ds/));assert.equal(game.combats.get(info.room).heroes.solids().length,1);
  await a.keyboard.down('w');await a.waitForFunction(()=>window.arenaDiagnostics().position.z<8);await a.waitForTimeout(500);await a.keyboard.up('w');assert.ok((await a.evaluate(()=>window.arenaDiagnostics())).position.z>=7.619);console.log('Server ice wall is visible and blocks predicted movement');
  pa.ult=100;await a.waitForFunction(()=>window.arenaDiagnostics().ult===100);await a.keyboard.press('r');await a.waitForFunction(()=>window.arenaDiagnostics().ult===0);assert.ok(game.combats.get(info.room).heroes.effects.some(e=>e.kind==='blizzard'));console.log('R consumes validated charge and creates a real Blizzard zone');
  await a.screenshot({path:'/tmp/blockward-phase4-frost.png'});
  async function change(hero){await a.keyboard.press('Escape');await a.locator('#pause').waitFor({state:'visible'});await a.selectOption('#next-hero',hero);await a.waitForFunction(id=>window.arenaDiagnostics().pendingHero===id,hero);const previous=pa.hero;assert.notEqual(previous,hero);assert.equal(pa.hero,previous);pa.hp=0;pa.deadUntil=Date.now()-1;await a.waitForFunction(id=>window.arenaDiagnostics().hero===id,hero);await resume();place();await a.waitForFunction(()=>window.arenaDiagnostics().position.z>9.9&&Math.abs(window.arenaDiagnostics().position.x)<.1);await aim();}
  await change('assassin');await a.keyboard.press('e');await a.waitForFunction(()=>document.querySelector('#hero-status').textContent.includes('VANISH'));await b.waitForFunction(()=>window.arenaDiagnostics().remotePlayers.some(p=>p.hero==='assassin'&&p.opacity<.2));console.log('Queued class change applies on respawn; Vanish fades the real remote avatar');
  await a.keyboard.down('d');await a.keyboard.press('q');await a.waitForFunction(()=>window.arenaDiagnostics().position.x>2);await a.keyboard.up('d');console.log('Assassin directional dash moves the real server-controlled player');
  await change('paladin');pa.hp=100;await a.keyboard.press('q');await a.waitForFunction(()=>window.arenaDiagnostics().hp>100);await a.waitForFunction(()=>document.querySelector('#ability-message').textContent.includes('HEALTH'));console.log('Healing Aura restores real health with first-person feedback');
  await change('mace');const hp=pa.hp;await a.keyboard.press('q');await a.waitForFunction(()=>window.arenaDiagnostics().position.y>2);await a.keyboard.press('e');await a.waitForFunction(()=>window.arenaDiagnostics().position.y<.1);assert.equal(pa.hp,hp);console.log('Rocket jump, diving slam and protected landing passed');
  assert.deepEqual(errors,[]);console.log('No hero browser runtime errors');
 }finally{await browser.close();await new Promise(r=>game.io.close(r));}
})().catch(e=>{console.error(e);process.exit(1)});
