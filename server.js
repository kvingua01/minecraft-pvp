const express = require('express');
const http = require('node:http');
const { Server } = require('socket.io');
const path = require('node:path');
const crypto = require('node:crypto');
const { Combat } = require('./lib/combat');
const World = require('./shared/world');
const {Objective}=require('./lib/objective');
function createGameServer() {
  const app=express(), server=http.createServer(app), io=new Server(server,{maxHttpBufferSize:4096});
  const rooms=new Map(), combats=new Map(),matches=new Map();
  app.get('/health',(_req,res)=>res.json({ok:true}));
  app.use('/vendor',express.static(path.join(__dirname,'node_modules/three/build')));
  app.use('/shared',express.static(path.join(__dirname,'shared')));
  app.use(express.static(path.join(__dirname,'public')));
  function leave(socket) {
    const room=rooms.get(socket.data.room);
    if(room) {room.delete(socket.id);socket.leave(socket.data.room);if(!room.size){rooms.delete(socket.data.room);combats.delete(socket.data.room);matches.delete(socket.data.room);}}
    const match=matches.get(socket.data.room);if(match&&match.host===socket.id)match.host=room.keys().next().value||null;
    socket.data.room=null;
  }
  io.on('connection',socket=> {
    socket.on('join',(data,ack=()=>{})=> {
      if(typeof ack!=='function') return;
      if(!data || typeof data!=='object') return ack({error:'Invalid request.'});
      let code=typeof data.code==='string'?data.code.trim().toUpperCase():'';
      if(data.create) {do {code=crypto.randomBytes(3).toString('hex').toUpperCase();}while(rooms.has(code));}
      else if(!/^[A-F0-9]{6}$/.test(code)||!rooms.has(code)) return ack({error:'Room not found. Ask your friend for their six-character code.'});
      const room=rooms.get(code)||new Map();
      if(room.size>=10) return ack({error:'This room is full (10 players).'});
      const match=matches.get(code)||new Objective(socket.id);
      const team=match.chooseTeam(room,data.team);
      if(!team)return ack({error:'That team is full (5 players). Choose the other team.'});
      leave(socket);
      const used=new Set([...room.values()].map(p=>p.spawnIndex));
      let spawnIndex=team==='red'?1:0;while(used.has(spawnIndex))spawnIndex+=2;
      const player={id:socket.id,name:(typeof data.name==='string'?data.name:'Player').trim().slice(0,20)||'Player',...World.spawn(spawnIndex),team,input:{},lastInput:0,life:0};
      if(!combats.has(code))combats.set(code,new Combat((event,data)=>io.to(code).emit(event,data)));
      combats.get(code).init(player,spawnIndex,Date.now());
      matches.set(code,match);
      room.set(socket.id,player);rooms.set(code,room);socket.data.room=code;socket.join(code);
      ack({id:socket.id,code,player:pack(player),match:match.snapshot()});
    });
    socket.on('input',data=> {
      const p=rooms.get(socket.data.room)?.get(socket.id);
      if(!p||!data||typeof data!=='object') return;
      p.input={};
      for(const key of ['forward','back','left','right','jump','sprint','block']) p.input[key]=data[key]===true;
      if(Number.isFinite(data.yaw)) p.input.yaw=data.yaw%(2*Math.PI);
      if(Number.isFinite(data.pitch)) p.input.pitch=Math.max(-1.5,Math.min(1.5,data.pitch));
      p.lastInput=Date.now();
    });
    socket.on('equip',key=>{const p=rooms.get(socket.data.room)?.get(socket.id);if(p)combats.get(socket.data.room).select(p,key);});
    socket.on('action',data=>{const room=rooms.get(socket.data.room),p=room?.get(socket.id);if(p&&data&&typeof data==='object')combats.get(socket.data.room).attack(room,p,data.kind,Date.now(),data.time);});
    socket.on('restart',(_data,ack=()=>{})=>{
      if(typeof ack!=='function')return;
      const code=socket.data.room,room=rooms.get(code),match=matches.get(code),combat=combats.get(code);
      if(!room||!match||match.host!==socket.id)return ack({error:'Only the current room host can start a rematch.'});
      if(!match.winner)return ack({error:'This match is still running.'});
      match.reset();combat.matchOver=false;combat.projectiles=[];combat.history=[];
      for(const p of room.values()){
        Object.assign(p,World.spawn(p.spawnIndex),{input:{},lastInput:0,life:p.life+1});combat.init(p,p.spawnIndex,Date.now());
      }
      ack({ok:true});
    });
    socket.on('leave',()=>leave(socket));
    socket.on('disconnect',()=>leave(socket));
  });
  function pack(p) {return {id:p.id,name:p.name,team:p.team,x:p.x,y:p.y,z:p.z,yaw:p.yaw,pitch:p.pitch,vy:p.vy,grounded:p.grounded,hp:p.hp,armor:p.armor,weapon:p.weapon,blocking:p.blocking,shieldUntil:p.shieldUntil,nextAttack:p.nextAttack,drawAt:p.drawAt,attackAt:p.attackAt,attackSerial:p.attackSerial,deadUntil:p.deadUntil,protectedUntil:p.protectedUntil,kills:p.kills,deaths:p.deaths,kx:p.kx,kz:p.kz,life:p.life};}
  let ticks=0;
  const timer=setInterval(()=> {
    for(const [code,room] of rooms) {
      const now=Date.now(),combat=combats.get(code),match=matches.get(code);combat.tick(room,now,1/60);match.tick(room,1/60);combat.matchOver=!!match.winner;
      if(ticks%3===0) io.to(code).emit('state',{serverTime:now,players:[...room.values()].map(pack),projectiles:combat.snapshot(now),match:match.snapshot()});
    }
    ticks++;
  },1000/60);
  server.on('close',()=>clearInterval(timer));
  return {app,server,io,rooms,combats,matches};
}
if(require.main===module) {
 const {server}=createGameServer();
 server.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('Blockward server listening'));
}
module.exports={createGameServer};
