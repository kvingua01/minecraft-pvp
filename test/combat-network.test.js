const test=require('node:test');
const assert=require('node:assert/strict');
const {io}=require('socket.io-client');
const {createGameServer}=require('../server');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const once=(s,e)=>new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(new Error('Timed out '+e)),3000);s.once(e,v=>{clearTimeout(t);resolve(v);});});
test('two socket clients fight, block, die and respawn without trusting client damage',async()=>{
 const game=createGameServer();await new Promise(r=>game.server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${game.server.address().port}`,sockets=[];
 async function connect(){const s=io(base,{transports:['websocket']});sockets.push(s);await once(s,'connect');return s;}
 const join=(s,data)=>new Promise(r=>s.emit('join',data,r));
 try{
 const a=await connect(),b=await connect();const {code}=await join(a,{create:true,name:'Alpha'});await join(b,{code,name:'Bravo'});
 const room=game.rooms.get(code),pa=room.get(a.id),pb=room.get(b.id);
 // Only this server-side test fixture places players in melee range. No production teleport API exists.
 function place(){Object.assign(pa,{x:0,y:0,z:10,yaw:0,pitch:0,protectedUntil:0,nextAttack:0,kx:0,kz:0,fallPeak:0});Object.assign(pb,{x:0,y:0,z:7,yaw:Math.PI,pitch:0,protectedUntil:0,kx:0,kz:0,fallPeak:0});}
 place();a.emit('damage',{target:b.id,amount:10000});a.emit('input',{hp:999,armor:1,weapon:'axe',yaw:0});a.emit('equip','__proto__');await wait(50);assert.equal(pa.weapon,'sword');assert.equal(pa.hp,100);assert.equal(pb.hp,100);
 const hit=once(b,'combat');a.emit('action',{kind:'attack',damage:999,target:b.id});assert.equal((await hit).type,'attack');await wait(100);assert.equal(pb.hp,84);
 a.emit('action',{kind:'attack'});await wait(30);assert.equal(pb.hp,84);
 place();b.emit('input',{block:true,yaw:Math.PI});await wait(50);a.emit('action',{kind:'attack'});await wait(50);assert.equal(pb.hp,84);
 place();a.emit('equip','axe');await wait(20);a.emit('action',{kind:'attack'});await wait(50);assert.ok(pb.shieldUntil>Date.now());assert.equal(pb.hp,84);
 place();b.emit('input',{block:false,yaw:Math.PI});pb.hp=20;a.emit('action',{kind:'attack'});await wait(70);assert.equal(pb.hp,0);assert.equal(pa.kills,1);assert.equal(pb.deaths,1);
 b.emit('action',{kind:'attack'});b.emit('input',{forward:true,yaw:0});const oldZ=pb.z;await wait(150);assert.equal(pb.z,oldZ);
 pb.deadUntil=Date.now()-1;await wait(60);assert.equal(pb.hp,100);assert.equal(pb.life,1);assert.ok(pb.protectedUntil>Date.now());
 const state=await once(a,'state');assert.equal(state.players.find(p=>p.id===b.id).hp,100);assert.equal(state.players.find(p=>p.id===a.id).kills,1);
 }finally{sockets.forEach(s=>s.disconnect());await new Promise(r=>game.io.close(r));}
});
