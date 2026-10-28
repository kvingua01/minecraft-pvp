const test=require('node:test');
const assert=require('node:assert/strict');
const {Combat}=require('../lib/combat');
const C=require('../shared/combat'),W=require('../shared/world');
function setup(){const events=[],engine=new Combat((event,payload)=>events.push(payload)),room=new Map();
 function player(id,x,z){const p={id,name:id,...W.spawn(),x,y:0,z,life:0,input:{},lastInput:10000};engine.init(p,room.size,10000);p.protectedUntil=0;room.set(id,p);return p;}
 const a=player('attacker',0,10),b=player('defender',0,7);a.yaw=0;b.yaw=Math.PI;
 return {engine,events,room,a,b};}
test('melee validates aim, reach, armor, cooldown and weapon switching',()=>{
 const {engine,room,a,b}=setup();assert.ok(engine.attack(room,a,'attack',10000));assert.equal(b.hp,84);
 assert.equal(engine.attack(room,a,'attack',10001),false);assert.equal(b.hp,84);
 engine.select(a,'axe');assert.equal(engine.attack(room,a,'attack',10100),false);
 a.yaw=Math.PI;engine.attack(room,a,'attack',11000);assert.equal(b.hp,84);
 a.yaw=0;b.z=4;engine.attack(room,a,'attack',12000);assert.equal(b.hp,84);
});
test('removed shields cannot block damage, including forged stale blocking state',()=>{
 const {engine,room,a,b}=setup();engine.block(b,true,10000);assert.equal(b.blocking,false);assert.equal(b.canShield,false);
 b.blocking=true;engine.attack(room,a,'attack',10000);assert.equal(b.hp,84);
 engine.select(a,'axe');engine.attack(room,a,'attack',11000);assert.equal(b.hp,58);assert.equal(b.shieldUntil,0);
});
test('static cover blocks melee and arrows; projectiles hit the nearest player',()=>{
 const {engine,room,a,b}=setup();const behind={...b,id:'behind',z:4,input:{}};room.set(behind.id,behind);Object.assign(a,{x:13,z:3,yaw:-Math.PI/2});Object.assign(b,{x:16,z:3});
 engine.attack(room,a,'attack',10000);assert.equal(b.hp,100);
 engine.select(a,'crossbow');engine.attack(room,a,'attack',12000);for(let i=0;i<10;i++)engine.tick(room,12000+i*17,1/60);assert.equal(b.hp,100);assert.equal(engine.projectiles.length,0);
 Object.assign(a,{x:0,z:10,y:0,yaw:0});Object.assign(b,{x:0,z:7,y:0});engine.attack(room,a,'attack',15000);
 for(let i=0;i<5;i++)engine.tick(room,15000+i*17,1/60);assert.equal(b.hp,70);assert.equal(behind.hp,100);assert.equal(engine.projectiles.length,0);
});
test('bow requires server-timed draw; release and reload cannot be forged or spammed',()=>{
 const {engine,room,a,b}=setup();engine.select(a,'bow');assert.equal(engine.attack(room,a,'release',10000),false);
 engine.attack(room,a,'draw',10000);engine.attack(room,a,'draw',10999);engine.attack(room,a,'release',11000);assert.equal(engine.projectiles.length,1);assert.equal(engine.projectiles[0].damage,32);
 assert.equal(engine.attack(room,a,'draw',11001),true);engine.tick(room,11017,1/60);engine.tick(room,11034,1/60);engine.tick(room,11051,1/60);assert.equal(b.hp,74);
 engine.select(a,'crossbow');engine.attack(room,a,'attack',12000);assert.equal(engine.attack(room,a,'attack',12001),false);assert.equal(a.nextAttack,13800);
});
test('critical and falling mace attacks add damage; sprint increases knockback',()=>{
 const normal=setup();normal.engine.attack(normal.room,normal.a,'attack',10000);const knock=normal.b.kz;
 const sprint=setup();sprint.a.input.sprint=true;sprint.a.input.forward=true;sprint.engine.attack(sprint.room,sprint.a,'attack',10000);assert.ok(Math.abs(sprint.b.kz)>Math.abs(knock));
 const critical=setup();critical.a.vy=-2;critical.engine.attack(critical.room,critical.a,'attack',10000);assert.equal(critical.b.hp,76);
 const mace=setup();mace.a.fallPeak=5;mace.a.vy=-2;mace.engine.select(mace.a,'mace');mace.engine.attack(mace.room,mace.a,'attack',10000);assert.equal(mace.b.hp,26);
});
test('spawn protection, death, score, and delayed respawn are authoritative',()=>{
 const {engine,room,a,b,events}=setup();b.protectedUntil=11000;engine.attack(room,a,'attack',10000);assert.equal(b.hp,100);
 b.protectedUntil=0;b.x=25;b.z=0;engine.damage(room,b,a,1000,11000);assert.equal(b.hp,100);
 b.x=0;b.z=7;engine.damage(room,b,a,1000,12000);assert.equal(b.hp,0);assert.equal(b.deadUntil,18000);assert.equal(a.kills,1);assert.equal(b.deaths,1);
 assert.equal(engine.attack(room,b,'attack',13000),false);engine.tick(room,17999,1/60);assert.equal(b.hp,0);engine.tick(room,18000,1/60);assert.equal(b.hp,100);assert.equal(b.life,1);assert.equal(b.protectedUntil,20000);assert.ok(events.some(e=>e.type==='kill'));
});
test('fall damage and knockback run through colliding server physics',()=>{
 const {engine,room,a,b}=setup();Object.assign(b,{x:0,z:25,y:8,fallPeak:8,grounded:false});
 for(let i=0;i<200;i++)engine.tick(room,10000+i*17,1/60);assert.equal(b.hp,65);assert.equal(b.y,0);
 Object.assign(a,{x:30,z:20,y:0,kx:15});for(let i=0;i<100;i++)engine.tick(room,15000+i*17,1/60);assert.ok(a.x<=31.181);assert.ok(a.x>30);
});
test('rewind uses bounded authoritative history and cannot bypass cover',()=>{
 const {engine,room,a,b}=setup();engine.history=[{time:9900,poses:new Map([[a.id,{x:0,y:0,z:10,life:0}],[b.id,{x:0,y:0,z:7,life:0}]])}];b.x=2;
 engine.attack(room,a,'attack',10000,9900);assert.equal(b.hp,84);
 const other=setup();other.engine.history=[{time:9000,poses:new Map([[other.a.id,{x:0,y:0,z:10,life:0}],[other.b.id,{x:0,y:0,z:7,life:0}]])},{time:9900,poses:new Map([[other.a.id,{x:0,y:0,z:10,life:0}],[other.b.id,{x:5,y:0,z:7,life:0}]])}];other.b.x=5;
 other.engine.attack(other.room,other.a,'attack',10000,-100000);assert.equal(other.b.hp,100);
});
test('ranged weapon hits triple knockback without sprint amplification or melee changes',()=>{
 for(const weapon of ['bow','crossbow','trident','frost','enchanted','blazefire']){
  const {engine,room,a,b}=setup();a.input={forward:true,sprint:true};
  engine.damage(room,b,a,1,10000,{weapon,origin:{rangedWeapon:true}});
  assert.equal(Math.hypot(b.kx,b.kz),15,weapon);assert.equal(b.vy,8.1,weapon);
 }
 const {engine,room,a,b}=setup();engine.damage(room,b,a,1,10000,{weapon:'sword'});assert.equal(Math.hypot(b.kx,b.kz),5);assert.equal(b.vy,2.7);
});
