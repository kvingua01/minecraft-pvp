const test=require('node:test'),assert=require('node:assert/strict');
const {io}=require('socket.io-client'),{createGameServer}=require('../server');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){const end=Date.now()+2500;while(!fn()&&Date.now()<end)await wait(10);assert.ok(fn(),'Expected potion state did not arrive');}
test('real clients cannot forge potion counts, cooldowns or buffs; drinking and thrown splash effects synchronize',async()=>{
 const game=createGameServer();await new Promise(r=>game.server.listen(0,'127.0.0.1',r));const clients=[],url=`http://127.0.0.1:${game.server.address().port}`,send=(s,e,d)=>new Promise(r=>s.emit(e,d,r));
 async function client(){const s=io(url,{transports:['websocket']});clients.push(s);await new Promise(r=>s.once('connect',r));return s;}
 try{
 const a=await client(),b=await client(),c=await client(),joined=await send(a,'join',{create:true,team:'red'});await send(b,'join',{code:joined.code,team:'blue'});await send(c,'join',{code:joined.code,team:'red'});
 const room=game.rooms.get(joined.code),pa=room.get(a.id),pb=room.get(b.id),ally=room.get(c.id);
 assert.equal(Object.keys(joined.player.inventory).length,7);assert.equal(pa.inventory.healing,2);assert.ok((await send(a,'potion-select','__proto__')).error);
 a.emit('input',{inventory:{healing:999},potionReady:0,status:{strength:9999999999999}});await wait(40);assert.equal(pa.inventory.healing,2);assert.equal(pa.status.strength,undefined);
 pa.hp=100;assert.ok((await send(a,'potion-use',{heal:999})).ok);assert.equal(pa.hp,100);assert.equal(pa.inventory.healing,1);assert.ok((await send(a,'ability','q')).error);await send(a,'potion-select','strength');assert.ok((await send(a,'potion-use',{})).error);await until(()=>pa.hp===140);assert.equal(pa.status.strength,undefined);assert.equal(pa.inventory.strength,1);
 Object.assign(pa,{x:0,y:0,z:10,potionReady:0,protectedUntil:0,yaw:0,pitch:0});Object.assign(pb,{x:0,y:0,z:7,protectedUntil:0});Object.assign(ally,{x:2,y:0,z:8,protectedUntil:0});a.emit('input',{yaw:0,pitch:0});await send(a,'potion-select','damage');assert.ok((await send(a,'potion-use',{})).ok);assert.equal(pa.inventory.damage,0);await until(()=>pb.hp<180);assert.equal(ally.hp,180);assert.ok(pa.ult>0);
 pa.potionReady=0;assert.ok((await send(a,'potion-use',{})).error);
 const snapshot=await new Promise(r=>b.once('state',r));assert.equal(snapshot.players.find(p=>p.id===a.id).inventory.damage,0);assert.equal(snapshot.players.find(p=>p.id===b.id).hp,pb.hp);
 }finally{clients.forEach(s=>s.disconnect());await new Promise(r=>game.io.close(r));}
});
