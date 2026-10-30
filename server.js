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
const Inventory=require('./lib/inventory');
const {BalanceBots}=require('./lib/bots');
const HeroRules=require('./shared/heroes');
const Maps=require('./shared/maps');
const ModeRules=require('./shared/modes'),{GameModes}=require('./lib/game-modes');
const {fixedClock}=require('./lib/timing');
const {version}=require('./package.json');
function createGameServer({reconnectGrace=30000,drainDelay=500,autoStart=false}={}) {
  const app=express(), server=http.createServer(app), io=new Server(server,{maxHttpBufferSize:4096,connectionStateRecovery:{maxDisconnectionDuration:reconnectGrace}});
  const rooms=new Map(), combats=new Map(),matches=new Map(),disconnectTimers=new Map();
  let draining=false,shutdownPromise=null;
  const revision=process.env.RAILWAY_GIT_COMMIT_SHA||process.env.APP_REVISION||'local';
  app.disable('x-powered-by');
  app.get('/health',(_req,res)=>res.status(draining?503:200).json({ok:!draining,version,revision:/^[a-f0-9]{7,40}$/i.test(revision)?revision.slice(0,12):'local'}));
  app.use('/vendor',express.static(path.join(__dirname,'node_modules/three/build')));
  // Revalidate the release as a whole after deployments, including imported modules.
  const liveAssets={setHeaders:res=>res.setHeader('Cache-Control','no-store')};
  app.use('/shared',express.static(path.join(__dirname,'shared'),liveAssets));
  app.use(express.static(path.join(__dirname,'public'),liveAssets));
  function leave(socket) {
    clearTimeout(disconnectTimers.get(socket.id));disconnectTimers.delete(socket.id);
    const code=socket.data.room,room=rooms.get(code),match=matches.get(code),combat=combats.get(code);
    if(room){const leaving=room.get(socket.id);if(leaving)match?.modes?.disconnected(room,leaving);room.delete(socket.id);socket.leave(code);if(![...room.values()].some(p=>!p.isBot)){for(const bot of [...room.values()])combat?.bots.remove(room,bot);rooms.delete(code);combats.delete(code);matches.delete(code);}else{if(match?.host===socket.id)match.host=[...room.values()].find(p=>!p.isBot&&p.connected!==false)?.id||null;combat?.bots.reconcile(room,match,Date.now());}}
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
      if([...room.values()].filter(p=>!p.isBot).length>=10) return ack({error:'This room is full (10 players).'});
      const match=matches.get(code)||new Objective(socket.id);
      if(!matches.has(code)){match.phase=autoStart?'playing':'lobby';match.lobbyEnabled=!autoStart;match.mapId=Maps.compatible(data.map,'normal_ctf')?data.map:'castle';match.locations=World.getMap(match.mapId).points;match.reset();}
      if(['ffa','kit_ladder','juggernaut','payload_escort'].includes(match.mode)&&match.phase==='playing'&&(match.winner||match.modes?.canAct(Date.now())===false))return ack({error:'This FFA match has ended. Join when the room returns to the lobby.'});
      if(match.mode==='duel_1v1'&&match.phase!=='lobby')return ack({error:'This duel is in progress. Join after the room returns to its lobby.'});
      const individual=!ModeRules.definitions[match.mode].teams;
      const team=match.chooseTeam(individual?new Map([...room].map(([id,p])=>[id,{...p,team:p.lobbyTeam||'red'}])):room,individual?undefined:data.team);
      if(!team)return ack({error:'That team is full (5 players). Choose the other team.'});
      leave(socket);
      combats.get(code)?.bots.reserveSeat(room,team);
      const used=new Set([...room.values()].map(p=>p.spawnIndex));
      let spawnIndex=team==='red'?1:0;while(used.has(spawnIndex))spawnIndex+=2;
      const player={id:socket.id,name:(typeof data.name==='string'?data.name:'Player').trim().slice(0,20)||'Player',...World.spawn(spawnIndex),map:match.mapId,hero:HeroRules.has(data.hero)?data.hero:'knight',team,connected:true,resumeToken:crypto.randomBytes(24).toString('hex'),input:{},lastInput:0,life:0};
      if(!combats.has(code)){const combat=new Combat((event,data)=>io.to(code).emit(event,data));combat.map=match.mapId;combat.inLobby=!autoStart;combat.heroes=new Heroes(combat);combat.potions=new Potions(combat);combat.bots=new BalanceBots(combat);combats.set(code,combat);}
      if(!match.modes)new GameModes(match,combats.get(code));
      combats.get(code).init(player,spawnIndex,Date.now());
      matches.set(code,match);
      room.set(socket.id,player);rooms.set(code,room);match.modes.join(room,player,Date.now());combats.get(code).bots.reconcile(room,match,Date.now());socket.data.room=code;socket.join(code);
      ack({id:socket.id,code,player:pack(player,true),resumeToken:player.resumeToken,match:match.snapshot()});
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
        for(const effect of combat.heroes.effects)if(effect.owner===oldId)effect.owner=p.id;for(const unit of combat.heroes.units.units)if(unit.owner===oldId)unit.owner=p.id;
        for(const history of combat.history)if(history.poses.has(oldId)){history.poses.set(p.id,history.poses.get(oldId));history.poses.delete(oldId);}
        for(const other of room.values()){if(other.chargeHits)other.chargeHits=other.chargeHits.map(id=>id===oldId?p.id:id);if(match.modes?.extra.active)for(const key of ['poisonOwner','witherOwner','burnOwner'])if(other[key]===oldId)other[key]=p.id;}
      }
      for(const t of room.values()){if(t.overhealthOwner===oldId)t.overhealthOwner=p.id;if(t.defenseOwner?.id===oldId)t.defenseOwner.id=p.id;}
      p.connected=true;match.modes?.record(p);if(!match.host)match.host=p.id;combat.bots.reconcile(room,match,Date.now());p.jumpQueued=false;p.input={};p.lastInput=0;socket.data.room=data.code;socket.join(data.code);
      ack({id:p.id,code:data.code,player:pack(p,true),resumeToken:p.resumeToken,match:match.snapshot()});
    });
    socket.on('input',data=> {
      const p=rooms.get(socket.data.room)?.get(socket.id);
      if(!p||p.roundLocked||p.inventoryOpen||!data||typeof data!=='object') return;
      if(data.jump===true&&!p.input.jump)p.jumpQueued=true;
      p.input={};
      for(const key of ['forward','back','left','right','jump','sprint','block']) p.input[key]=data[key]===true;
      if(Number.isFinite(data.yaw)) p.input.yaw=data.yaw%(2*Math.PI);
      if(Number.isFinite(data.pitch)) p.input.pitch=Math.max(-1.5,Math.min(1.5,data.pitch));
      p.lastInput=Date.now();
    });
    function inventoryReply(p,result,ack){ack({...result,state:Inventory.snapshot(p)});}
    for(const event of ['inventory-open','inventory-click','inventory-close','hotbar-select'])socket.on(event,(data,ack=()=>{})=>{
      if(typeof ack!=='function')return;const p=rooms.get(socket.data.room)?.get(socket.id);if(!p)return ack({error:'Join a room first.'});
      let result;if(event==='inventory-open')result=Inventory.open(p);else if(event==='inventory-close')result=Inventory.close(p);else if(event==='inventory-click')result=Inventory.click(p,data?.index,data?.revision);else result=p.inventoryOpen?{error:'Close inventory before switching hotbar slots.'}:Inventory.select(p,data?.index);
      inventoryReply(p,result,ack);
    });
    socket.on('equip',key=>{const p=rooms.get(socket.data.room)?.get(socket.id);if(p)combats.get(socket.data.room).select(p,key);});
    socket.on('action',data=>{const room=rooms.get(socket.data.room),p=room?.get(socket.id);if(p&&data&&typeof data==='object')combats.get(socket.data.room).attack(room,p,data.kind,Date.now(),data.time);});
    socket.on('wind-use',(_data,ack=()=>{})=>{
      if(typeof ack!=='function')return;const p=rooms.get(socket.data.room)?.get(socket.id),combat=combats.get(socket.data.room);
      if(!p||!combat)return ack({error:'Join a room first.'});
      const now=Date.now(),error=combat.windError(p,now);if(error)return ack({error});
      combat.wind(p,now);ack({ok:true,readyAt:p.windReady});
    });
    socket.on('ping-check',(_data,ack)=>{if(typeof ack==='function')ack({serverTime:Date.now()});});
    socket.on('potion-select',(id,ack=()=>{})=>{
      if(typeof ack!=='function')return;const p=rooms.get(socket.data.room)?.get(socket.id);
      if(!p)return ack({error:'Join a room first.'});ack(combats.get(socket.data.room).potions.select(p,id));
    });
    socket.on('potion-use',(data,ack=()=>{})=>{
      if(typeof ack!=='function')return;const room=rooms.get(socket.data.room),p=room?.get(socket.id);
      if(!p)return ack({error:'Join a room first.'});const potions=combats.get(socket.data.room).potions;if(data?.id!==undefined){const result=potions.select(p,data.id);if(result.error)return ack(result);}ack(potions.use(room,p,Date.now()));
    });
    socket.on('ability',(key,ack=()=>{})=>{
      if(typeof ack!=='function')return;const code=socket.data.room,room=rooms.get(code),p=room?.get(socket.id);
      if(!p)return ack({error:'Join a room first.'});ack(combats.get(code).heroes.use(room,p,key,Date.now()));
    });
    socket.on('hero-select',(hero,ack=()=>{})=>{
      if(typeof ack!=='function')return;const p=rooms.get(socket.data.room)?.get(socket.id);
      if(!p||!HeroRules.has(hero))return ack({error:'Select a valid kit.'});if(p.classLocked)return ack({error:'Kit selection is locked for this game mode.'});p.duelReady=false;p.pendingHero=hero;if(matches.get(socket.data.room).phase==='lobby'){const combat=combats.get(socket.data.room);combat.heroes.specialized.cleanup(rooms.get(socket.data.room),p);combat.heroes.spawn(p,Date.now());combat.potions.spawn(p,Date.now());}ack({ok:true});
    });
    function lobbyContext(ack){const code=socket.data.room,room=rooms.get(code),match=matches.get(code),combat=combats.get(code);if(!room||!match){ack({error:'Join a lobby first.'});return null;}return {room,match,combat};}
    function resetRoom(room,match,combat){match.locations=World.getMap(match.mapId).points;match.reset();combat.map=match.mapId;combat.matchOver=false;combat.projectiles=[];combat.history=[];combat.heroes.clear();for(const p of room.values()){Object.assign(p,World.spawn(p.spawnIndex),{map:match.mapId,input:{},lastInput:0,life:p.life+1});combat.init(p,p.spawnIndex,Date.now());}match.modes?.lobby(room,Date.now());}
    socket.on('lobby-mode',(id,ack=()=>{})=>{if(typeof ack!=='function')return;const ctx=lobbyContext(ack);if(!ctx)return;const {room,match,combat}=ctx;if(match.host!==socket.id||match.phase!=='lobby')return ack({error:'Only the host can change the game mode in the lobby.'});if(!ModeRules.has(id))return ack({error:'Choose a valid game mode.'});match.mode=id;if(!Maps.compatible(match.mapId,id))match.mapId=match.generalMap||'castle';match.modes.teamsFor(room);combat.bots.reconcile(room,match,Date.now());resetRoom(room,match,combat);combat.bots.reconcile(room,match,Date.now());ack({ok:true});});
    socket.on('lobby-add-bot',(data,ack=()=>{})=>{if(typeof ack!=='function')return;const ctx=lobbyContext(ack);if(!ctx)return;const {room,match,combat}=ctx;if(match.host!==socket.id||match.phase!=='lobby')return ack({error:'Only the host can add bots before the match starts.'});if(data?.team!==undefined&&!['auto','red','blue'].includes(data.team))return ack({error:'Choose Auto, Red or Blue for the bot team.'});ack(combat.bots.add(room,match,data?.team,Date.now()));});
    socket.on('lobby-remove-bot',(_data,ack=()=>{})=>{if(typeof ack!=='function')return;const ctx=lobbyContext(ack);if(!ctx)return;const {room,match,combat}=ctx;if(match.host!==socket.id||match.phase!=='lobby')return ack({error:'Only the host can remove bots before the match starts.'});const bot=[...room.values()].reverse().find(p=>p.isBot&&p.manualBot);if(!bot)return ack({error:'No manually added bots to remove. Turn off automatic balancing to remove balancing bots.'});combat.bots.remove(room,bot);combat.bots.reconcile(room,match,Date.now());ack({ok:true});});
    socket.on('lobby-ready',(ready,ack=()=>{})=>{if(typeof ack!=='function')return;const ctx=lobbyContext(ack);if(!ctx)return;const p=ctx.room.get(socket.id);if(ctx.match.mode!=='duel_1v1'||ctx.match.phase!=='lobby'||typeof ready!=='boolean')return ack({error:'Ready is available in a duel lobby.'});p.duelReady=ready;ack({ok:true});});
    socket.on('lobby-map',(id,ack=()=>{})=>{if(typeof ack!=='function')return;const ctx=lobbyContext(ack);if(!ctx)return;const {room,match,combat}=ctx;if(match.host!==socket.id||match.phase!=='lobby')return ack({error:'Only the host can change maps while in the lobby.'});if(!Maps.compatible(id,match.mode))return ack({error:'Choose a valid map for this mode. Custom railway maps are available only in Payload Escort.'});if(!Maps.payloadDefinitions[id])match.generalMap=id;else if(!Maps.payloadDefinitions[match.mapId])match.generalMap=match.mapId;match.mapId=id;resetRoom(room,match,combat);ack({ok:true});});
    socket.on('lobby-bots',(enabled,ack=()=>{})=>{if(typeof ack!=='function')return;const ctx=lobbyContext(ack);if(!ctx)return;const {room,match,combat}=ctx;if(match.host!==socket.id||match.phase!=='lobby')return ack({error:'Only the host can change balancing bots before the match starts.'});if(!match.modes.capture)return ack({error:'Team-balancing bots are available in Normal CTF and Random Kit.'});if(typeof enabled!=='boolean')return ack({error:'Choose whether balancing bots are enabled.'});match.balanceBots=enabled;combat.bots.reconcile(room,match,Date.now());ack({ok:true});});
    socket.on('match-start',(_data,ack=()=>{})=>{if(typeof ack!=='function')return;const ctx=lobbyContext(ack);if(!ctx)return;const {room,match,combat}=ctx;if(match.host!==socket.id||match.phase!=='lobby')return ack({error:'Only the host can start a waiting lobby.'});combat.bots.reconcile(room,match,Date.now());const error=match.modes.validateStart(room);if(error)return ack({error});resetRoom(room,match,combat);match.phase='playing';combat.inLobby=false;match.modes.start(room,Date.now());ack({ok:true});});
    socket.on('lobby-team',(team,ack=()=>{})=>{if(typeof ack!=='function')return;const ctx=lobbyContext(ack);if(!ctx)return;const {room,match}=ctx,p=room.get(socket.id);if(!match.modes.teams)return ack({error:'This game mode has no teams.'});if(match.phase!=='lobby'||!['red','blue'].includes(team))return ack({error:'Choose a team in the lobby.'});const others=new Map([...room].filter(([id,t])=>id!==p.id&&!t.isBot));if(!match.chooseTeam(others,team))return ack({error:'That team is full.'});combats.get(socket.data.room).bots.reserveSeat(room,team);p.team=team;p.lobbyTeam=team;p.duelReady=false;const used=new Set([...others.values()].map(t=>t.spawnIndex));let index=team==='red'?1:0;while(used.has(index))index+=2;p.spawnIndex=index;Object.assign(p,World.spawn(index));combats.get(socket.data.room).bots.reconcile(room,match,Date.now());ack({ok:true});});
    socket.on('lobby-return',(_data,ack=()=>{})=>{if(typeof ack!=='function')return;const ctx=lobbyContext(ack);if(!ctx)return;const {room,match,combat}=ctx;if(!match.winner)return ack({error:'Finish the match before returning the room to its lobby.'});match.phase='lobby';combat.inLobby=true;resetRoom(room,match,combat);ack({ok:true});});
    socket.on('restart',(_data,ack=()=>{})=>{
      if(typeof ack!=='function')return;
      const code=socket.data.room,room=rooms.get(code),match=matches.get(code),combat=combats.get(code);
      if(!room||!match||match.host!==socket.id)return ack({error:'Only the current room host can start a rematch.'});
      if(!match.winner)return ack({error:'This match is still running.'});
      if(match.lobbyEnabled){match.phase='lobby';combat.inLobby=true;}
      if(match.lobbyEnabled){resetRoom(room,match,combat);return ack({ok:true});}
      match.reset();combat.matchOver=false;combat.projectiles=[];combat.history=[];combat.heroes.clear();
      for(const p of room.values()){
        Object.assign(p,World.spawn(p.spawnIndex),{input:{},lastInput:0,life:p.life+1});combat.init(p,p.spawnIndex,Date.now());
      }
      ack({ok:true});
    });
    for(const action of ['buy','sell','move'])socket.on('upgrade-'+action,(data,ack=()=>{})=>{if(typeof ack!=='function')return;const p=rooms.get(socket.data.room)?.get(socket.id),uw=matches.get(socket.data.room)?.modes.upgrade;if(!p||!uw?.active)return ack({error:'Join Upgrade Wars first.'});ack(uw.items.transaction(p,action,data,Date.now()));});
    socket.on('upgrade-ready',(value,ack=()=>{})=>{if(typeof ack!=='function')return;const p=rooms.get(socket.data.room)?.get(socket.id),uw=matches.get(socket.data.room)?.modes.upgrade;if(!p||!uw?.active)return ack({error:'Join Upgrade Wars first.'});ack(uw.ready(p,value,Date.now()));});
    socket.on('leave',()=>leave(socket));
    socket.on('disconnect',reason=>{
      const room=rooms.get(socket.data.room),p=room?.get(socket.id);
      if(!p)return;
      if(['client namespace disconnect','server namespace disconnect','server shutting down'].includes(reason)){leave(socket);return;}
      if(matches.get(socket.data.room)?.mode==='juggernaut')matches.get(socket.data.room).modes.extra.accrue(room,Date.now());Inventory.close(p);p.connected=false;const combat=combats.get(socket.data.room);if(HeroRules.heroes[p.hero]?.specialized)combat.heroes.specialized.cleanup(room,p);p.overhealth=0;p.overhealthUntil=0;const match=matches.get(socket.data.room);match?.modes?.disconnected(room,p);if(match?.host===socket.id)match.host=[...room.values()].find(t=>!t.isBot&&t.connected!==false)?.id||null;p.jumpQueued=false;p.input={};p.lastInput=0;p.blocking=false;p.drawAt=0;p.drinking=null;p.dash=null;p.kx=p.kz=0;
      console.warn('Player connection interrupted:',reason);
      const timer=setTimeout(()=>leave(socket),reconnectGrace);timer.unref();disconnectTimers.set(socket.id,timer);
    });
  });
  function pack(p,privateItems=false) {return {...(privateItems?Inventory.snapshot(p):{}),heldItem:Inventory.held(p),activeSlot:p.activeSlot,hasItemSlots:!!p.itemSlots,isBot:!!p.isBot,mode:p.mode||'normal_ctf',upgradeWars:(p.mode==='upgrade_wars'&&p.uw?{money:p.uw.money,items:[...p.uw.items],ready:p.uw.ready}:null),soloSide:p.soloSide,classLocked:!!p.classLocked,roundLocked:!!p.roundLocked,duelReady:!!p.duelReady,id:p.id,name:p.name,healingDone:p.healingDone||0,objectiveTime:p.objectiveTime||0,juggernaut:!!p.juggernaut,ladderIndex:p.ladderIndex,juggerTime:p.juggerTime,juggerKills:p.juggerKills,team:ModeRules.definitions[p.mode]?.teams===false?null:p.team,map:p.map,connected:p.connected,x:p.x,y:p.y,z:p.z,yaw:p.yaw,pitch:p.pitch,vy:p.vy,flightLift:p.flightLift??null,itemJumpScale:p.itemJumpScale||1,grounded:p.grounded,hp:p.hp,maxHp:p.maxHp,overhealth:p.overhealth||0,overhealthUntil:p.overhealthUntil||0,hero:p.hero,pendingHero:p.pendingHero,canShield:p.canShield,windReady:p.windReady,abilityReady:p.abilityReady,ult:p.ult,status:p.status,speedScale:p.speedScale,attackSpeed:p.attackSpeed,motionSerial:p.motionSerial,inventory:p.inventory,selectedPotion:p.selectedPotion,potionReady:p.potionReady,potionAt:p.potionAt,potionKind:p.potionKind,drinking:p.drinking,armor:p.armor,weapon:p.weapon,blocking:p.blocking,shieldUntil:p.shieldUntil,nextAttack:p.nextAttack,drawAt:p.drawAt,attackAt:p.attackAt,attackSerial:p.attackSerial,deadUntil:p.deadUntil,protectedUntil:p.protectedUntil,kills:p.kills,deaths:p.deaths,kx:p.kx,kz:p.kz,life:p.life};}
  let ticks=0;
  const clock=fixedClock(performance.now());
  const timer=setInterval(()=>clock.advance(performance.now(),dt=>{
    if(draining)return;
    for(const [code,room] of rooms){
      const now=Date.now(),combat=combats.get(code),match=matches.get(code);match.modes.beforeTick(room,now);combat.bots.reconcile(room,match,now);combat.bots.tick(room,match,now);combat.tick(room,now,dt);if(match.modes.capture)match.tick(room,dt,now);else match.modes.afterTick(room,now);
      combat.healthPacks.tick(room,match,now);
      if(match.modes.capture&&!combat.inLobby&&!match.winner&&match.status!=='waiting')for(const p of room.values())if(p.connected!==false&&p.hp>0&&match.points.some(point=>match.inside(p,point)))combat.heroes.charge(p,3*dt,now);
      if(match.winner&&!combat.matchOver){combat.heroes.clear();combat.projectiles=[];for(const p of room.values()){p.overhealth=0;p.overhealthUntil=0;p.dash=null;}}
      combat.matchOver=!!match.winner;
      if(ticks%3===0){io.to(code).volatile.emit('state',{serverTime:now,healthPacks:combat.healthPacks.snapshot(match),players:[...room.values()].map(p=>pack(p)),units:combat.heroes.units.snapshot(),projectiles:combat.snapshot(now),effects:combat.heroes.snapshot(),match:match.snapshot()});for(const p of room.values())if(!p.isBot&&p.connected!==false&&p.lastInventorySent!==p.inventoryRevision){p.lastInventorySent=p.inventoryRevision;io.to(p.id).emit('inventory-state',Inventory.snapshot(p));}}
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
