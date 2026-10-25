const test=require('node:test');
const assert=require('node:assert/strict');
const {io}=require('socket.io-client');
const {createGameServer}=require('../server');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function once(socket,event){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Timed out: '+event)),3000);socket.once(event,data=>{clearTimeout(timer);resolve(data);});});}
test('real clients share authoritative movement; rooms isolate players and clean up',async()=>{
 const game=createGameServer();await new Promise(r=>game.server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${game.server.address().port}`;
 const clients=[];
 async function client(){const s=io(base,{transports:['websocket'],forceNew:true});clients.push(s);await once(s,'connect');return s;}
 const join=(s,data)=>new Promise(r=>s.emit('join',data,r));
 try{
  assert.equal((await fetch(base+'/health')).status,200);
  for(const file of ['/','/game.js','/vendor/three.module.js','/vendor/three.core.js','/shared/world.js','/practice/'])assert.equal((await fetch(base+file)).status,200,file);
  const a=await client(),b=await client(),c=await client();
  const first=await join(a,{create:true,name:'Alpha'});assert.match(first.code,/^[A-F0-9]{6}$/);
  assert.ok((await join(b,{code:'BAD'})).error);
  await join(b,{code:first.code,name:'Bravo'});const isolated=await join(c,{create:true,name:'Charlie'});
  const initial=await once(b,'state');assert.equal(initial.players.length,2);assert.ok(initial.players.some(p=>p.name==='Alpha'));
  assert.equal((await once(c,'state')).players.length,1);assert.notEqual(first.code,isolated.code);
  // Client-supplied coordinates and velocity are ignored.
  a.emit('input',{x:999,y:999,speed:999,yaw:NaN});await wait(80);
  let state=await once(b,'state'),p=state.players.find(p=>p.id===a.id);assert.equal(p.x,first.player.x);assert.ok(p.y<1);
  const origin={...p};const stream=setInterval(()=>a.emit('input',{forward:true,yaw:0}),30);await wait(500);clearInterval(stream);a.emit('input',{});
  state=await once(b,'state');p=state.players.find(p=>p.id===a.id);assert.ok(p.z<origin.z-1);assert.ok(p.z>origin.z-4);
  const frozen=p.z;await wait(400);state=await once(b,'state');assert.ok(Math.abs(state.players.find(p=>p.id===a.id).z-frozen)<.2);
  a.disconnect();state=await once(b,'state');assert.equal(state.players.length,1);
  b.emit('leave');c.emit('leave');await wait(100);assert.equal(game.rooms.size,0);
 }finally{clients.forEach(s=>s.disconnect());await new Promise(r=>game.io.close(r));}
});
