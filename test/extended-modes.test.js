const test=require('node:test'),assert=require('node:assert/strict'),{Combat}=require('../lib/combat'),{Heroes}=require('../lib/heroes'),{Potions}=require('../lib/potions'),{Objective}=require('../lib/objective'),{GameModes}=require('../lib/game-modes'),{route}=require('../lib/payload-routes'),W=require('../shared/world'),H=require('../shared/heroes'),Rules=require('../shared/modes');
function fixture(mode,count=3,map='castle'){
 const events=[],c=new Combat((event,data)=>events.push({event,...data}));c.map=map;c.heroes=new Heroes(c);c.potions=new Potions(c);
 const m=new Objective('p0');Object.assign(m,{mode,phase:'lobby',mapId:map,locations:W.getMap(map).points});m.reset();const gm=new GameModes(m,c,()=>.25),room=new Map();
 for(let i=0;i<count;i++){const p={...W.spawn(i),id:'p'+i,name:'P'+i,team:i%2?'blue':'red',map,hero:['knight','archer','paladin'][i%3],life:0,input:{},connected:true,lastInput:0};c.init(p,i,10000);room.set(p.id,p);}gm.teamsFor(room);return {c,m,gm,room,a:room.get('p0'),b:room.get('p1'),d:room.get('p2'),events};
}
function start(f,now=10000){f.m.phase='playing';f.c.inLobby=false;f.gm.start(f.room,now);}
function ready(f){let z=6;for(const p of f.room.values())Object.assign(p,{x:10,y:0,z:z++,protectedUntil:0,vy:0,kx:0,kz:0,input:{},status:{}});}
function kill(f,target,source,now){assert.ok(f.c.damage(f.room,target,source,10000,now,{ability:true}));}
test('seven mode registry preserves the four original identifiers and adds only the requested modes',()=>{assert.deepEqual(Object.keys(Rules.definitions),['normal_ctf','duel_1v1','random_kit','ffa','kit_ladder','payload_escort','juggernaut','upgrade_wars']);});
test('Kit Ladder shares one shuffled playable sequence, advances immediately without healing, and cleans old kit state',()=>{
 const f=fixture('kit_ladder');start(f);ready(f);const order=f.gm.extra.order;assert.equal(order.length,Object.keys(H.heroes).length);assert.equal(new Set(order).size,order.length);assert.notDeepEqual(order,Object.keys(H.heroes));for(const p of f.room.values()){assert.equal(p.hero,order[0]);assert.equal(p.classLocked,true);}assert.equal(f.m.snapshot().points.length,0);
 f.a.hp=37;f.a.ult=100;f.a.status.speed=999999;f.c.projectiles.push({owner:f.a.id});f.c.heroes.effects.push({owner:f.a.id});f.c.heroes.units.units.push({owner:f.a.id});kill(f,f.b,f.a,15000);
 assert.equal(f.a.kills,1);assert.equal(f.a.ladderIndex,1);assert.equal(f.a.hero,order[1]);assert.equal(f.a.hp,37);assert.equal(f.a.ult,0);assert.deepEqual(f.a.status,{});assert.equal(f.a.abilityReady.q,15000);assert.equal(f.c.heroes.units.units.length,0);assert.equal(f.c.projectiles.length,0);assert.equal(f.c.heroes.effects.length,0);assert.equal(f.c.damage(f.room,f.b,f.a,10000,15001),false);assert.equal(f.a.ladderIndex,1);
 // An old AOE cannot award an extra level in the same simulation tick.
 assert.equal(f.c.damage(f.room,f.d,f.a,10000,15000),false);assert.equal(f.a.ladderIndex,1);
});
test('Kit Ladder deaths keep progress, environment kills do not advance, and final-kit kill wins exactly once',()=>{
 const f=fixture('kit_ladder');start(f);ready(f);kill(f,f.b,f.a,15000);const kit=f.a.hero;kill(f,f.a,null,15001);assert.equal(f.a.ladderIndex,1);f.c.tick(f.room,21001,1/60);assert.equal(f.a.hero,kit);assert.equal(f.a.ladderIndex,1);
 for(let i=1;i<f.gm.extra.order.length;i++){ready(f);f.b.hp=f.b.maxHp;kill(f,f.b,f.a,22000+i);assert.equal(f.a.ladderIndex,i+1);}assert.equal(f.m.winner,'individual');assert.deepEqual(f.gm.winnerSides,[f.a.soloSide]);assert.equal(f.a.kills,f.gm.extra.order.length);assert.equal(f.c.damage(f.room,f.d,f.a,10000,99999),false);
});
test('Ladder confirmed DOT and summon-owner kills are credited; leaving players remain in standings',()=>{
 const f=fixture('kit_ladder');start(f);ready(f);f.a.hp=0;f.b.hp=1;f.b.status.poisoned=20000;f.b.poisonOwner=f.a.id;f.b.poisonTick=14000;f.c.heroes.before(f.room,15000);assert.equal(f.a.ladderIndex,1);assert.equal(f.a.hp,0);assert.equal(f.a.kills,1);
 ready(f);f.a.hp=40;f.b.hp=f.b.maxHp;kill(f,f.b,f.a,15001);assert.equal(f.a.ladderIndex,2);f.gm.extra.disconnect(f.room,f.a,15002);f.room.delete(f.a.id);assert.ok(f.gm.scoreboard().some(r=>r.side===f.a.soloSide&&r.ladderIndex===2&&r.connected===false));
});
test('Ladder late joins start at first kit without reshuffling or changing other players',()=>{const f=fixture('kit_ladder');start(f);ready(f);kill(f,f.b,f.a,15000);const order=[...f.gm.extra.order],p={...W.spawn(),id:'late',name:'Late',team:'red',hero:'archer',map:'castle',life:0,input:{},connected:true};f.c.init(p,4,16000);f.room.set(p.id,p);f.gm.join(f.room,p,16000);assert.equal(p.hero,order[0]);assert.equal(p.ladderIndex,0);assert.equal(f.a.ladderIndex,1);assert.deepEqual(f.gm.extra.order,order);});
test('Payload routes are supported and collision-free over full cart footprints on every available map',()=>{
 for(const id of Object.keys(require('../shared/maps').definitions)){
  const r=route(id);if(!r.available){assert.equal(id,'end');assert.match(r.reason,/continuous/);continue;}
  assert.ok(r.length>=35);assert.ok(r.points[0].x<0&&r.points.at(-1).x>0);
  const boxes=W.getMap(id).boxes;for(let i=0;i<r.points.length-1;i++)for(const t of [0,.25,.5,.75,1]){const a=r.points[i],b=r.points[i+1],p={x:a.x+(b.x-a.x)*t,y:0,z:a.z+(b.z-a.z)*t};assert.ok(!boxes.some(b=>b.solid&&Math.abs(p.x-b.x)<b.w/2+.6-1e-6&&Math.abs(p.z-b.z)<b.d/2+.6-1e-6&&b.y+b.h/2>1e-6&&b.y-b.h/2<.95-1e-6),id+' cart must not clip');const probe={...p,map:id};for(let n=0;n<4;n++)W.step(probe,{},1/60);assert.ok(Math.abs(probe.y)<.001,id+' supported route');}
 }
});
test('Payload movement, contesting, dead/disconnected exclusion and temporary wall collision are server controlled',()=>{
 const f=fixture('payload_escort',2);assert.equal(f.gm.validateStart(f.room),null);start(f);assert.equal(f.gm.endsAt,310000);assert.equal(f.m.snapshot().points.length,0);const cart=f.gm.extra.cart;assert.equal(cart.progress,0);Object.assign(f.a,{...cart,team:'red',hp:100});Object.assign(f.b,{x:25,z:0,y:.6,team:'blue',hp:100});f.gm.beforeTick(f.room,10250);assert.ok(cart.distance>0);assert.equal(cart.status,'MOVING');const old=cart.distance;Object.assign(f.b,{x:cart.x,y:0,z:cart.z});f.gm.beforeTick(f.room,10500);assert.equal(cart.distance,old);assert.equal(cart.status,'CONTESTED');f.b.hp=0;f.gm.beforeTick(f.room,10750);assert.ok(cart.distance>old);f.b.hp=100;f.b.connected=false;f.gm.beforeTick(f.room,11000);assert.equal(cart.status,'MOVING');f.a.hp=0;f.gm.beforeTick(f.room,11250);assert.equal(cart.status,'STOPPED');
 f.a.hp=100;f.c.heroes.effects.push({id:999,kind:'wall',x:cart.x,y:1,z:cart.z,w:2,h:2,d:2});const at=cart.distance;f.gm.beforeTick(f.room,11500);assert.equal(cart.distance,at);assert.equal(cart.status,'STOPPED');assert.deepEqual(f.m.scores,{red:0,blue:0});
});
test('Payload reaches its destination or awards defense at exactly five minutes; unsupported maps cannot start',()=>{
 const f=fixture('payload_escort',2);start(f);const cart=f.gm.extra.cart,penultimate=cart.path.at(-2);Object.assign(cart,penultimate,{distance:cart.length-.001});Object.assign(f.a,penultimate,{hp:100,team:'red'});Object.assign(f.b,{x:25,y:.6,z:0});f.gm.beforeTick(f.room,10250);assert.equal(cart.progress,100);assert.equal(f.m.winner,'red');assert.equal(f.c.matchOver,true);
 const timed=fixture('payload_escort',2);start(timed);timed.gm.beforeTick(timed.room,309999);assert.equal(timed.m.winner,null);assert.equal(timed.gm.canAct(310000),false);timed.gm.beforeTick(timed.room,310000);assert.equal(timed.m.winner,'blue');assert.equal(timed.gm.reason,'time');const end=fixture('payload_escort',2,'end');assert.match(end.gm.validateStart(end.room),/continuous/);
});
test('Juggernaut keeps kit, triples max HP, buffs all damage and resists knockback; hunters cannot hurt each other or allied summons',()=>{
 const f=fixture('juggernaut');start(f);ready(f);const boss=[...f.room.values()].find(p=>p.juggernaut),hunters=[...f.room.values()].filter(p=>!p.juggernaut),[a,b]=hunters;assert.equal(boss.hero,['knight','archer','paladin'][Number(boss.id.slice(1))]);assert.equal(boss.maxHp,H.heroes[boss.hero].health*3);assert.equal(boss.hp,boss.maxHp);assert.equal(f.m.snapshot().points.length,0);
 const hp=b.hp;assert.equal(f.c.damage(f.room,b,a,20,15000,{ability:true}),false);assert.equal(b.hp,hp);assert.ok(f.c.damage(f.room,b,boss,20,15000,{ability:true}));assert.equal(hp-b.hp,Math.round(30*(1-b.armor)));
 assert.ok(f.c.damage(f.room,boss,a,10,15001,{weapon:'sword'}));assert.equal(Math.hypot(boss.kx,boss.kz),2.5);assert.equal(boss.vy,1.35);
 assert.ok(f.c.heroes.units.spawn(f.room,a,['skeleton'],15002,10000));const unit=f.c.heroes.units.units[0];assert.equal(unit.team,a.team);assert.equal(f.c.damage(f.room,unit,b,20,15003,{ability:true}),false);assert.ok(f.c.damage(f.room,unit,boss,20,15003,{ability:true}));
});
test('Juggernaut role time, kill transfer and environmental reassignment happen exactly once',()=>{
 const f=fixture('juggernaut');start(f);ready(f);const boss=[...f.room.values()].find(p=>p.juggernaut),hunter=[...f.room.values()].find(p=>!p.juggernaut);f.gm.beforeTick(f.room,15000);assert.equal(boss.juggerTime,5000);kill(f,boss,hunter,16000);assert.equal(boss.juggerTime,6000);assert.equal(boss.juggernaut,false);assert.equal(boss.maxHp,H.heroes[boss.hero].health);assert.equal(boss.hp,0);assert.equal(hunter.juggernaut,true);assert.equal(hunter.hp,hunter.maxHp);assert.equal(hunter.juggerKills,1);assert.equal([...f.room.values()].filter(p=>p.juggernaut).length,1);assert.equal(f.c.damage(f.room,boss,hunter,10000,16001),false);assert.equal(hunter.juggerKills,1);
 f.gm.beforeTick(f.room,18000);assert.equal(hunter.juggerTime,2000);kill(f,hunter,null,19000);assert.equal(hunter.juggerTime,3000);assert.equal([...f.room.values()].filter(p=>p.juggernaut).length,1);assert.notEqual(f.gm.extra.boss,hunter.soloSide);
 f.c.tick(f.room,25000,1/60);assert.equal(hunter.hp,H.heroes[hunter.hero].health);assert.equal(hunter.juggernaut,false);
});
test('Juggernaut disconnect chooses another living player and stops awarding disconnected time',()=>{const f=fixture('juggernaut');start(f);ready(f);const p=[...f.room.values()].find(p=>p.juggernaut);f.gm.extra.accrue(f.room,15000);p.connected=false;f.gm.extra.disconnect(f.room,p,15000);assert.equal(p.juggerTime,5000);assert.notEqual(f.gm.extra.boss,p.soloSide);f.gm.beforeTick(f.room,20000);assert.equal(p.juggerTime,5000);assert.equal([...f.room.values()].filter(p=>p.juggernaut).length,1);});
test('Juggernaut seven-minute results rank by role time then boss kills and support shared victory; buffs clear at end',()=>{
 for(const tie of [false,true]){const f=fixture('juggernaut',2);start(f);ready(f);f.gm.extra.lastAt=430000;f.a.juggerTime=f.b.juggerTime=1000;f.a.juggerKills=2;f.b.juggerKills=tie?2:1;assert.equal(f.gm.canAct(430000),false);f.gm.beforeTick(f.room,430000);assert.equal(f.m.winner,'individual');assert.deepEqual(f.gm.winnerSides,tie?[f.a.soloSide,f.b.soloSide]:[f.a.soloSide]);assert.ok([...f.room.values()].every(p=>!p.juggernaut&&p.maxHp===H.heroes[p.hero].health));}
});
test('switching new modes back to lobby clears all role and progression state and restores team behavior',()=>{
 for(const mode of ['kit_ladder','payload_escort','juggernaut','upgrade_wars']){const f=fixture(mode);start(f);f.m.phase='lobby';f.m.reset();f.gm.lobby(f.room,20000);assert.equal(f.m.mode,mode);assert.equal(f.gm.endsAt,null);assert.equal(f.gm.extra.cart,null);assert.equal(f.gm.extra.boss,null);assert.deepEqual(f.gm.extra.order,[]);for(const p of f.room.values()){assert.equal(p.classLocked,false);assert.equal(p.juggernaut,undefined);assert.equal(p.ladderIndex,undefined);assert.equal(p.maxHp,H.heroes[p.hero].health);}f.m.mode='normal_ctf';f.gm.lobby(f.room,21000);assert.ok([...f.room.values()].every(p=>['red','blue'].includes(p.team)));assert.equal(f.m.snapshot().points.length,3);assert.deepEqual(f.gm.scoreboard(),[]);}
});
test('Ladder old projectile status effects cannot survive an immediate kit advance',()=>{
 const f=fixture('kit_ladder');start(f);ready(f);f.b.hp=1;const oldLife=f.a.life;f.c.heroes.impact(f.room,{heroKind:'ember',damage:100,life:oldLife,x:f.b.x,y:1,z:f.b.z,vx:0,vy:0,vz:-30},f.a,f.b,15000);assert.equal(f.a.ladderIndex,1);assert.equal(f.b.status.burning,undefined);assert.equal(f.b.burnOwner,undefined);assert.equal(f.a.ult,0);
});
test('a real summoned skeleton elimination advances its owner exactly once in Kit Ladder',()=>{
 const f=fixture('kit_ladder',2);start(f);ready(f);assert.ok(f.c.heroes.units.spawn(f.room,f.a,['skeleton'],15000,10000));const u=f.c.heroes.units.units[0];Object.assign(u,{x:f.b.x,y:f.b.y,z:f.b.z+1,nextAttack:0});f.b.hp=1;f.c.heroes.units.tick(f.room,15001,1/60);assert.equal(f.b.hp,0);assert.equal(f.a.kills,1);assert.equal(f.a.ladderIndex,1);assert.equal(f.c.heroes.units.units.length,0);
});
