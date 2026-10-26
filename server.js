const express = require('express');
const http = require('node:http');
const { Server } = require('socket.io');
const path = require('node:path');
const crypto = require('node:crypto');
const { Combat } = require('./lib/combat');
const World = require('./shared/world');
const {Objective}=require('./lib/objective');
const {Heroes}=require('./lib/heroes');
const {Potions}=require('./lib/potions');
const HeroRules=require('./shared/heroes');
const {fixedClock}=require('./lib/timing');
const {version}=require('./package.json');
function createGameServer({reconnectGrace=30000,drainDelay=500}={}) {
  const app=express(), server=http.createServer(app), io=new Server(server,{maxHttpBufferSize:4096,connectionStateRecovery:{maxDisconnectionDuration:reconnectGrace}});
  const rooms=new Map(), combats=new Map(),matches=new Map(),disconnectTimers=new Map();
  let draining=false,shutdownPromise=null;
  const revision=process.env.RAILWAY_GIT_COMMIT_SHA||process.env.APP_REVISION||'local';
  app.disable('x-powered-by');
  app.get('/health',(_req,res)=>res.status(draining?503:200).json({ok:!draining,version,revision:/^[a-f0-9]{7,40}$/i.test(revision)?revision.slice(0,12):'local'}));
  app.use('/vendor',express.static(path.join(__dirname,'node_modules/three/build')));
  app.use('/shared',express.static(path.join(__dirname,'shared')));
  app.use(express.static(path.join(__dirname,'public')));
  function leave(socket) {
    clearTimeout(disconnectTimers.get(socket.id));disconnectTimers.delete(socket.id);
    const room=rooms.get(socket.data.room);
    if(room) {room.delete(socket.id);socket.leave(socket.data.room);if(!room.size){rooms.delete(socket.data.room);combats.delete(socket.data.room);matches.delete(socket.data.room);}}
    const match=matches.get(socket.data.room);if(match&&match.host===socket.id)match.host=room.keys().next().value||null;
    socket.data.room=null;
  }
  io.on('connection',socket=> {
    socket.on('join',(data,ack=()=>{})=> {
      if(typeof ack!=='function') return;
      if(draining)return ack({error:'The server is updating. Please try again shortly.'});
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
      const player={id:socket.id,name:(typeof data.name==='string'?data.name:'Player').trim().slice(0,20)||'Player',...World.spawn(spawnIndex),hero:HeroRules.has(data.hero)?data.hero:'knight',team,connected:true,resumeToken:crypto.randomBytes(24).toString('hex'),input:{},lastInput:0,life:0};
      if(!combats.has(code)){const combat=new Combat((event,data)=>io.to(code).emit(event,data));combat.heroes=new Heroes(combat);combat.potions=new Potions(combat);combats.set(code,combat);}
      combats.get(code).init(player,spawnIndex,Date.now());
      matches.set(code,match);
      room.set(socket.id,player);rooms.set(code,room);socket.data.room=code;socket.join(code);
      ack({id:socket.id,code,player:pack(player),resumeToken:player.resumeToken,match:match.snapshot()});
    });
    socket.on('resume',(data,ack=()=>{})=>{
      if(typeof ack!=='function')return;
      if(!data||typeof data.code!=='string'||typeof data.token!=='string'||data.token.length!==48)return ack({error:'The previous session is unavailable. Join the room again.'});
      const room=rooms.get(data.code),p=room&&[...room.values()].find(p=>p.resumeToken===data.token);
      if(!p)return ack({error:'Your previous match ended, restarted, or the reconnect window expired. Create or join an arena again.'});
      if(p.connected&&p.id!==socket.id)return ack({error:'This player session is still active. Try reconnecting again shortly.'});
      const oldId=p.id,combat=combats.get(data.code),match=matches.get(data.code);
      clearTimeout(disconnectTimers.get(oldId));disconnectTimers.delete(oldId);
      if(oldId!==socket.id){
        room.delete(oldId);p.id=socket.id;room.set(p.id,p);
        if(match.host===oldId)match.host=p.id;
        for(const arrow of combat.projectiles)if(arrow.owner===oldId)arrow.owner=p.id;
        for(const effect of combat.heroes.effects)if(effect.owner===oldId)effect.owner=p.id;
        for(const history of combat.history)if(history.poses.has(oldId)){history.poses.set(p.id,history.poses.get(oldId));history.poses.delete(oldId);}
        for(const other of room.values())if(other.chargeHits)other.chargeHits=other.chargeHits.map(id=>id===oldId?p.id:id);
      }
      p.connected=true;p.jumpQueued=false;p.input={};p.lastInput=0;socket.data.room=data.code;socket.join(data.code);
      ack({id:p.id,code:data.code,player:pack(p),resumeToken:p.resumeToken,match:match.snapshot()});
    });
    socket.on('input',data=> {
      const p=rooms.get(socket.data.room)?.get(socket.id);
      if(!p||!data||typeof data!=='object') return;
      if(data.jump===true&&!p.input.jump)p.jumpQueued=true;
      p.input={};
      for(const key of ['forward','back','left','right','jump','sprint','block']) p.input[key]=data[key]===true;
      if(Number.isFinite(data.yaw)) p.input.yaw=data.yaw%(2*Math.PI);
      if(Number.isFinite(data.pitch)) p.input.pitch=Math.max(-1.5,Math.min(1.5,data.pitch));
      p.lastInput=Date.now();
    });
    socket.on('equip',key=>{const p=rooms.get(socket.data.room)?.get(socket.id);if(p)combats.get(socket.data.room).select(p,key);});
    socket.on('action',data=>{const room=rooms.get(socket.data.room),p=room?.get(socket.id);if(p&&data&&typeof data==='object')combats.get(socket.data.room).attack(room,p,data.kind,Date.now(),data.time);});
    socket.on('ping-check',(_data,ack)=>{if(typeof ack==='function')ack({serverTime:Date.now()});});
    socket.on('potion-select',(id,ack=()=>{})=>{
      if(typeof ack!=='function')return;const p=rooms.get(socket.data.room)?.get(socket.id);
      if(!p)return ack({error:'Join a room first.'});ack(combats.get(socket.data.room).potions.select(p,id));
    });
    socket.on('potion-use',(_data,ack=()=>{})=>{
      if(typeof ack!=='function')return;const room=rooms.get(socket.data.room),p=room?.get(socket.id);
      if(!p)return ack({error:'Join a room first.'});ack(combats.get(socket.data.room).potions.use(room,p,Date.now()));
    });
    socket.on('ability',(key,ack=()=>{})=>{
      if(typeof ack!=='function')return;const code=socket.data.room,room=rooms.get(code),p=room?.get(socket.id);
      if(!p)return ack({error:'Join a room first.'});ack(combats.get(code).heroes.use(room,p,key,Date.now()));
    });
    socket.on('hero-select',(hero,ack=()=>{})=>{
      if(typeof ack!=='function')return;const p=rooms.get(socket.data.room)?.get(socket.id);
      if(!p||!HeroRules.has(hero))return ack({error:'Select one of the eight heroes.'});p.pendingHero=hero;ack({ok:true});
    });
    socket.on('restart',(_data,ack=()=>{})=>{
      if(typeof ack!=='function')return;
      const code=socket.data.room,room=rooms.get(code),match=matches.get(code),combat=combats.get(code);
      if(!room||!match||match.host!==socket.id)return ack({error:'Only the current room host can start a rematch.'});
      if(!match.winner)return ack({error:'This match is still running.'});
      match.reset();combat.matchOver=false;combat.projectiles=[];combat.history=[];combat.heroes.clear();
      for(const p of room.values()){
        Object.assign(p,World.spawn(p.spawnIndex),{input:{},lastInput:0,life:p.life+1});combat.init(p,p.spawnIndex,Date.now());
      }
      ack({ok:true});
    });
    socket.on('leave',()=>leave(socket));
    socket.on('disconnect',reason=>{
      const room=rooms.get(socket.data.room),p=room?.get(socket.id);
      if(!p)return;
      if(['client namespace disconnect','server namespace disconnect','server shutting down'].includes(reason)){leave(socket);return;}
      p.connected=false;p.jumpQueued=false;p.input={};p.lastInput=0;p.blocking=false;p.drawAt=0;p.drinking=null;p.dash=null;p.kx=p.kz=0;
      console.warn('Player connection interrupted:',reason);
      const timer=setTimeout(()=>leave(socket),reconnectGrace);timer.unref();disconnectTimers.set(socket.id,timer);
    });
  });
  function pack(p) {return {id:p.id,name:p.name,team:p.team,connected:p.connected,x:p.x,y:p.y,z:p.z,yaw:p.yaw,pitch:p.pitch,vy:p.vy,grounded:p.grounded,hp:p.hp,maxHp:p.maxHp,hero:p.hero,pendingHero:p.pendingHero,canShield:p.canShield,abilityReady:p.abilityReady,ult:p.ult,status:p.status,speedScale:p.speedScale,attackSpeed:p.attackSpeed,motionSerial:p.motionSerial,inventory:p.inventory,selectedPotion:p.selectedPotion,potionReady:p.potionReady,potionAt:p.potionAt,potionKind:p.potionKind,drinking:p.drinking,armor:p.armor,weapon:p.weapon,blocking:p.blocking,shieldUntil:p.shieldUntil,nextAttack:p.nextAttack,drawAt:p.drawAt,attackAt:p.attackAt,attackSerial:p.attackSerial,deadUntil:p.deadUntil,protectedUntil:p.protectedUntil,kills:p.kills,deaths:p.deaths,kx:p.kx,kz:p.kz,life:p.life};}
  let ticks=0;
  const clock=fixedClock(performance.now());
  const timer=setInterval(()=>clock.advance(performance.now(),dt=>{
    if(draining)return;
    for(const [code,room] of rooms){
      const now=Date.now(),combat=combats.get(code),match=matches.get(code);combat.tick(room,now,dt);match.tick(room,dt);
      if(!match.winner&&match.status!=='waiting')for(const p of room.values())if(p.connected!==false&&p.hp>0&&p.y>=.19&&p.y<=.65&&p.x*p.x+p.z*p.z<=16)combat.heroes.charge(p,3*dt,now);
      combat.matchOver=!!match.winner;
      if(ticks%3===0)io.to(code).volatile.emit('state',{serverTime:now,players:[...room.values()].map(pack),projectiles:combat.snapshot(now),effects:combat.heroes.snapshot(),match:match.snapshot()});
    }
    ticks++;
  }),8);
  function shutdown(){
    if(shutdownPromise)return shutdownPromise;draining=true;io.emit('server-restarting');
    shutdownPromise=new Promise(resolve=>setTimeout(()=>io.close(resolve),drainDelay));return shutdownPromise;
  }
  server.on('close',()=>{clearInterval(timer);for(const timer of disconnectTimers.values())clearTimeout(timer);disconnectTimers.clear();});
  return {app,server,io,rooms,combats,matches,shutdown};
}
if(require.main===module) {
 const {server,shutdown}=createGameServer();
 for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>{const deadline=setTimeout(()=>process.exit(1),10000);deadline.unref();shutdown().then(()=>process.exit(0));});
 server.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('Blockward server listening'));
}
module.exports={createGameServer};
