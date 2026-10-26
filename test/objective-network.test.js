const test=require('node:test'),assert=require('node:assert/strict');
const {io}=require('socket.io-client');const {createGameServer}=require('../server');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const once=(s,event)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Timed out '+event)),3000);s.once(event,data=>{clearTimeout(timer);resolve(data);});});
test('real clients receive teams, contested states, victory, and an authorized rematch',async()=>{
 const game=createGameServer({autoStart:true});await new Promise(r=>game.server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${game.server.address().port}`,clients=[];
 const emit=(s,event,data)=>new Promise(r=>s.emit(event,data,r));
 async function connect(){const s=io(url,{transports:['websocket']});clients.push(s);await once(s,'connect');return s;}
 try{
 const a=await connect(),b=await connect(),c=await connect();const first=await emit(a,'join',{create:true,team:'red'}),second=await emit(b,'join',{code:first.code,team:'blue'});await emit(c,'join',{code:first.code,team:'red'});
 assert.equal(first.player.team,'red');assert.ok(first.player.x<0);assert.equal(second.player.team,'blue');assert.ok(second.player.x>0);
 const room=game.rooms.get(first.code),match=game.matches.get(first.code),pa=room.get(a.id),pb=room.get(b.id);
 a.emit('input',{team:'blue',score:100});a.emit('capture',{score:100});await wait(50);assert.equal(pa.team,'red');assert.equal(match.scores.red,0);
 Object.assign(pa,{x:0,z:0,y:.24,hp:100,protectedUntil:0});await wait(200);assert.ok(match.meter>0);
 Object.assign(pb,{x:1,z:0,y:.24});await wait(60);const meter=match.meter;await wait(100);const state=await once(b,'state');assert.equal(state.match.contested,true);assert.equal(match.meter,meter);
 pb.x=12;match.control='red';match.meter=100;match.scores.red=299.99;await wait(80);const finished=await once(a,'state');assert.equal(finished.match.winner,'red');assert.equal(finished.match.scores.red,300);
 assert.ok((await emit(b,'restart',{})).error);const oldLife=pa.life;assert.deepEqual(await emit(a,'restart',{}),{ok:true});assert.equal(pa.life,oldLife+1);assert.equal(pa.hp,pa.maxHp);assert.equal(match.winner,null);assert.deepEqual(match.scores,{red:0,blue:0});assert.equal(game.combats.get(first.code).projectiles.length,0);
 a.disconnect();await wait(60);assert.equal((await once(b,'state')).match.host,b.id);assert.ok((await emit(b,'restart',{})).error);
 }finally{clients.forEach(s=>s.disconnect());await new Promise(r=>game.io.close(r));}
});
