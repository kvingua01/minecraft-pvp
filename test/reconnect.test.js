const test=require('node:test'),assert=require('node:assert/strict');
const {io}=require('socket.io-client'),{createGameServer}=require('../server');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const once=(s,event)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Timed out: '+event)),3000);s.once(event,data=>{clearTimeout(timer);resolve(data);});});
async function setup(grace,fn){const game=createGameServer({reconnectGrace:grace});await new Promise(r=>game.server.listen(0,'127.0.0.1',r));const clients=[],url=`http://127.0.0.1:${game.server.address().port}`;
 const send=(s,event,data)=>new Promise(r=>s.emit(event,data,r));
 async function client(options={}){const s=io(url,{transports:['websocket'],forceNew:true,...options});clients.push(s);await once(s,'connect');return s;}
 try{await fn({game,client,send});}finally{clients.forEach(s=>s.disconnect());await new Promise(r=>game.io.close(r));}}
test('temporary transport loss recovers the same player without resetting health, class or scores',async()=>setup(1500,async({game,client,send})=>{
 const a=await client({reconnectionDelay:200,reconnectionDelayMax:200,randomizationFactor:0}),b=await client();const joined=await send(a,'join',{create:true,team:'red',hero:'frost'});await send(b,'join',{code:joined.code,team:'blue'});await once(a,'state');
 const oldId=a.id,room=game.rooms.get(joined.code),p=room.get(oldId);Object.assign(p,{x:0,y:0,z:10,hp:77,kills:2,ult:43});p.inventory.healing=1;p.selectedPotion='speed';
 const disconnected=once(a,'disconnect'),reconnected=once(a,'connect');a.io.engine.close();await disconnected;await wait(40);
 assert.ok(room.has(oldId));assert.equal(p.connected,false);assert.equal(game.matches.get(joined.code).status,'waiting');
 await reconnected;const result=await send(a,'resume',{code:joined.code,token:joined.resumeToken});assert.equal(result.player.hp,77);assert.equal(result.player.hero,'frost');assert.equal(result.player.kills,2);assert.equal(result.player.ult,43);assert.equal(result.player.inventory.healing,1);assert.equal(result.player.selectedPotion,'speed');assert.equal(p.connected,true);assert.equal(room.size,2);
 const state=await once(b,'state');assert.equal(state.match.status,'active');assert.ok(!JSON.stringify(state).includes(joined.resumeToken));
}));
test('private resume token restores a new socket identity and retains host/effect ownership',async()=>setup(1500,async({game,client,send})=>{
 const a=await client({reconnection:false}),b=await client();const joined=await send(a,'join',{create:true,team:'red'});await send(b,'join',{code:joined.code,team:'blue'});const oldId=a.id;
 game.combats.get(joined.code).heroes.effects.push({id:100,owner:oldId,life:0,kind:'heal',x:0,y:0,z:10,radius:1,expires:Date.now()+1000});
 const disconnected=once(a,'disconnect');a.io.engine.close();await disconnected;await wait(30);const n=await client();
 assert.ok((await send(n,'resume',{code:joined.code,token:'0'.repeat(48)})).error);
 const result=await send(n,'resume',{code:joined.code,token:joined.resumeToken});assert.equal(result.id,n.id);assert.notEqual(n.id,oldId);assert.equal(game.matches.get(joined.code).host,n.id);assert.equal(game.rooms.get(joined.code).size,2);assert.equal(game.rooms.get(joined.code).has(oldId),false);assert.equal(game.combats.get(joined.code).heroes.effects[0].owner,n.id);
}));
test('expired reservations clean up, transfer host, and report an ended session',async()=>setup(80,async({game,client,send})=>{
 const a=await client({reconnection:false}),b=await client();const joined=await send(a,'join',{create:true,team:'red'});await send(b,'join',{code:joined.code,team:'blue'});const oldId=a.id;
 const disconnected=once(a,'disconnect');a.io.engine.close();await disconnected;await wait(150);assert.equal(game.rooms.get(joined.code).has(oldId),false);assert.equal(game.matches.get(joined.code).host,b.id);
 const n=await client();assert.ok((await send(n,'resume',{code:joined.code,token:joined.resumeToken})).error);
}));
