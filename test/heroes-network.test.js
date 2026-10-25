const test=require('node:test'),assert=require('node:assert/strict');
const {io}=require('socket.io-client'),{createGameServer}=require('../server');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function fixture(fn){const game=createGameServer();await new Promise(r=>game.server.listen(0,'127.0.0.1',r));const sockets=[],url=`http://127.0.0.1:${game.server.address().port}`;
 const send=(s,event,data)=>new Promise(r=>s.emit(event,data,r));
 async function client(){const s=io(url,{transports:['websocket']});sockets.push(s);await new Promise((resolve,reject)=>{s.once('connect',resolve);s.once('connect_error',reject);});return s;}
 try{await fn({game,client,send});}finally{sockets.forEach(s=>s.disconnect());await new Promise(r=>game.io.close(r));}}
test('socket abilities enforce class, cooldown and charge; real bolts slow; class changes wait for respawn',async()=>fixture(async({game,client,send})=>{
 const a=await client(),b=await client();const joined=await send(a,'join',{create:true,team:'red',hero:'frost'});await send(b,'join',{code:joined.code,team:'blue',hero:'paladin'});
 assert.equal(joined.player.hero,'frost');assert.equal(joined.player.hp,105);assert.equal(joined.player.weapon,'staff');assert.equal(joined.player.ult,0);assert.ok((await send(a,'ability','q')).error);
 const room=game.rooms.get(joined.code),pa=room.get(a.id),pb=room.get(b.id);
 Object.assign(pa,{x:0,y:0,z:10,protectedUntil:0,yaw:0,pitch:0});Object.assign(pb,{x:0,y:0,z:7,protectedUntil:0});a.emit('input',{yaw:0});
 assert.ok((await send(a,'ability','q')).ok);assert.ok((await send(a,'ability','q')).error);await wait(180);assert.ok(pb.hp<pb.maxHp);assert.ok(pb.status.slow>Date.now());assert.ok(pa.ult>0);
 a.emit('input',{hero:'mace',ult:100,abilityReady:{q:0},speedScale:99,hp:999});await wait(30);assert.equal(pa.hero,'frost');assert.ok(pa.ult<100);assert.equal(pa.hp,105);assert.ok((await send(a,'ability','r')).error);
 pb.x=10;assert.ok((await send(a,'ability','e')).ok);assert.equal(game.combats.get(joined.code).heroes.solids().length,1);
 assert.ok((await send(a,'hero-select','mace')).ok);assert.equal(pa.hero,'frost');assert.equal(pa.pendingHero,'mace');assert.ok((await send(a,'hero-select','__proto__')).error);
 pa.ult=100;assert.ok((await send(a,'ability','r')).ok);assert.equal(pa.ult,0);assert.ok(game.combats.get(joined.code).heroes.effects.some(e=>e.kind==='blizzard'));
 pa.hp=0;pa.deadUntil=Date.now()-1;await wait(70);assert.equal(pa.hero,'mace');assert.equal(pa.hp,160);assert.equal(pa.weapon,'mace');assert.equal(pa.ult,0);
}));
test('actual ally healing and contested objective participation earn ultimate charge without idle charge',async()=>fixture(async({game,client,send})=>{
 const a=await client(),b=await client(),ally=await client();const first=await send(a,'join',{create:true,team:'red',hero:'paladin'});await send(b,'join',{code:first.code,team:'blue'});await send(ally,'join',{code:first.code,team:'red'});
 const room=game.rooms.get(first.code),pa=room.get(a.id),pb=room.get(b.id),friend=room.get(ally.id);
 await wait(80);assert.equal(pa.ult,0);Object.assign(pa,{x:0,y:0,z:10,protectedUntil:0});Object.assign(friend,{x:2,y:0,z:10,hp:80,protectedUntil:0});assert.ok((await send(a,'ability','q')).ok);await wait(100);assert.ok(friend.hp>80);assert.ok(pa.ult>0);
 Object.assign(pa,{x:0,y:.24,z:0,ult:0,vy:0});Object.assign(pb,{x:1,y:.24,z:0,vy:0});await wait(200);assert.equal(game.matches.get(first.code).contested,true);assert.ok(pa.ult>.2);assert.ok(pa.ult<2);
}));
