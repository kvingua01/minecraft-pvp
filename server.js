const express = require('express');
const http = require('node:http');
const { Server } = require('socket.io');
const path = require('node:path');
const crypto = require('node:crypto');
const World = require('./shared/world');
function createGameServer() {
  const app=express(), server=http.createServer(app), io=new Server(server,{maxHttpBufferSize:4096});
  const rooms=new Map();
  app.get('/health',(_req,res)=>res.json({ok:true}));
  app.use('/vendor',express.static(path.join(__dirname,'node_modules/three/build')));
  app.use('/shared',express.static(path.join(__dirname,'shared')));
  app.use(express.static(path.join(__dirname,'public')));
  function leave(socket) {
    const room=rooms.get(socket.data.room);
    if(room) {room.delete(socket.id);socket.leave(socket.data.room);if(!room.size)rooms.delete(socket.data.room);}
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
      leave(socket);
      const player={id:socket.id,name:(typeof data.name==='string'?data.name:'Player').trim().slice(0,20)||'Player',...World.spawn(room.size),input:{},lastInput:0};
      room.set(socket.id,player);rooms.set(code,room);socket.data.room=code;socket.join(code);
      ack({id:socket.id,code,player:pack(player)});
    });
    socket.on('input',data=> {
      const p=rooms.get(socket.data.room)?.get(socket.id);
      if(!p||!data||typeof data!=='object') return;
      p.input={};
      for(const key of ['forward','back','left','right','jump','sprint']) p.input[key]=data[key]===true;
      if(Number.isFinite(data.yaw)) p.input.yaw=data.yaw%(2*Math.PI);
      if(Number.isFinite(data.pitch)) p.input.pitch=Math.max(-1.5,Math.min(1.5,data.pitch));
      p.lastInput=Date.now();
    });
    socket.on('leave',()=>leave(socket));
    socket.on('disconnect',()=>leave(socket));
  });
  function pack(p) {return {id:p.id,name:p.name,x:p.x,y:p.y,z:p.z,yaw:p.yaw,pitch:p.pitch,vy:p.vy,grounded:p.grounded};}
  let ticks=0;
  const timer=setInterval(()=> {
    for(const [code,room] of rooms) {
      for(const p of room.values()) World.step(p,Date.now()-p.lastInput<300?p.input:{},1/60);
      if(ticks%3===0) io.to(code).emit('state',{players:[...room.values()].map(pack)});
    }
    ticks++;
  },1000/60);
  server.on('close',()=>clearInterval(timer));
  return {app,server,io,rooms};
}
if(require.main===module) {
 const {server}=createGameServer();
 server.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('Blockward server listening'));
}
module.exports={createGameServer};
