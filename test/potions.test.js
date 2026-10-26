const test=require('node:test'),assert=require('node:assert/strict');
const {Combat}=require('../lib/combat'),{Heroes}=require('../lib/heroes'),{Potions}=require('../lib/potions'),P=require('../shared/potions'),W=require('../shared/world');
function fixture(){const combat=new Combat(()=>{});combat.heroes=new Heroes(combat);combat.potions=new Potions(combat);const room=new Map();
 function player(id,team,x,z){const p={id,name:id,team,hero:'knight',life:0,connected:true,...W.spawn(),x,y:0,z,yaw:0,pitch:0,input:{},lastInput:10000};combat.init(p,room.size,10000);p.protectedUntil=0;room.set(id,p);return p;}
 const a=player('a','red',0,10),b=player('b','blue',0,7),ally=player('ally','red',2,8);return {combat,potions:combat.potions,room,a,b,ally};}
function drink(f,id,time=10000){f.potions.select(f.a,id);assert.ok(f.potions.use(f.room,f.a,time).ok);f.combat.tick(f.room,time+650,1/60);}
test('all seven potions have limited charges and invalid/cooling/full-health uses cannot consume them',()=>{
 const f=fixture();assert.equal(P.keys.length,7);assert.equal(f.a.inventory.healing,2);assert.ok(f.potions.select(f.a,'__proto__').error);assert.ok(f.potions.use(f.room,f.a,10000).error);assert.equal(f.a.inventory.healing,2);
 f.a.hp-=50;assert.ok(f.potions.use(f.room,f.a,10000).ok);assert.equal(f.a.inventory.healing,1);assert.ok(f.potions.use(f.room,f.a,10001).error);assert.equal(f.a.inventory.healing,1);assert.equal(f.combat.attack(f.room,f.a,'attack',10001),false);assert.ok(f.combat.heroes.use(f.room,f.a,'q',10001).error);
 f.combat.block(f.a,true,10002);assert.equal(f.a.blocking,false);f.combat.tick(f.room,10649,1/60);assert.equal(f.a.hp,130);f.combat.tick(f.room,10650,1/60);assert.equal(f.a.hp,170);assert.equal(f.a.ult,0);
});
test('death and disconnect interrupt drinking; respawn refills charges and removes buffs',()=>{
 const f=fixture();f.a.hp=100;f.potions.use(f.room,f.a,10000);f.a.connected=false;f.potions.before(f.room,10650);assert.equal(f.a.hp,100);assert.equal(f.a.drinking,null);assert.equal(f.a.inventory.healing,1);
 f.a.connected=true;f.a.hp=0;f.a.deadUntil=18001;f.a.status.strength=99999;f.combat.tick(f.room,18002,1/60);assert.equal(f.a.hp,180);assert.equal(f.a.inventory.healing,2);assert.equal(f.a.status.strength,undefined);
});
test('speed changes movement only while active; slowness uses the strongest slow',()=>{
 const f=fixture();drink(f,'speed');assert.equal(f.a.speedScale,.9*1.25);f.combat.heroes.before(f.room,20000);assert.equal(f.a.speedScale,.9);
 f.a.status.slowPotion=30000;f.combat.heroes.before(f.room,20001);assert.equal(f.a.speedScale,.9*.65);f.a.status.slow=30000;f.combat.heroes.before(f.room,20002);assert.equal(f.a.speedScale,.9*.55);
});
test('strength increases validated weapon damage without boosting hero spells',()=>{
 const f=fixture();drink(f,'strength');f.a.nextAttack=0;f.combat.attack(f.room,f.a,'attack',11000);assert.equal(f.b.hp,180-16);
 const hp=f.b.hp;f.combat.damage(f.room,f.b,f.a,20,11001,{ability:true,noKnock:true});assert.equal(f.b.hp,hp-13);
});
test('regeneration heals eight real ticks, stops at max health and grants no self-healing charge',()=>{
 const f=fixture();f.a.hp=100;drink(f,'regeneration');for(let i=1;i<=8;i++)f.potions.before(f.room,10650+i*1000+1);assert.equal(f.a.hp,140);f.potions.before(f.room,21000);assert.equal(f.a.hp,140);assert.equal(f.a.ult,0);
});
test('splash effects damage or slow enemies, respect cover, spare allies and protect spawn rooms',()=>{
 const f=fixture(),arrow={x:1,y:0,z:8,vx:0,vy:-1,vz:0,potionKind:'damage'};f.potions.impact(f.room,arrow,f.a,10000);assert.equal(f.b.hp,160);assert.equal(f.ally.hp,180);
 f.potions.impact(f.room,{...arrow,potionKind:'slowness'},f.a,10001);assert.equal(f.b.status.slowPotion,15001);assert.equal(f.ally.status.slowPotion,undefined);
 f.b.protectedUntil=20000;const hp=f.b.hp;f.potions.impact(f.room,arrow,f.a,10002);assert.equal(f.b.hp,hp);
 f.b.protectedUntil=0;Object.assign(f.a,{x:13,z:3});Object.assign(f.b,{x:18,z:3});f.potions.impact(f.room,{...arrow,x:14.9,y:1,z:3,vx:1,vy:0},f.a,10003);assert.equal(f.b.hp,hp);
});
test('hostile potions cannot be thrown from spawn or spammed and use the real projectile path',()=>{
 const f=fixture();f.potions.select(f.a,'damage');f.a.x=-25;f.a.z=0;assert.ok(f.potions.use(f.room,f.a,10000).error);assert.equal(f.a.inventory.damage,1);
 f.a.x=0;f.a.z=10;assert.ok(f.potions.use(f.room,f.a,10001).ok);assert.equal(f.a.inventory.damage,0);assert.equal(f.combat.projectiles[0].potionKind,'damage');assert.ok(f.potions.use(f.room,f.a,10002).error);
 for(let i=0;i<30;i++)f.combat.tick(f.room,10002+i*17,1/60);assert.ok(f.b.hp<180);assert.equal(f.combat.projectiles.length,0);
});
test('flames deal real damage, burn lingers, and fire resistance prevents both',()=>{
 const f=fixture(),fire=W.hazards[0];Object.assign(f.a,{x:fire.x,y:fire.y,z:fire.z});f.potions.before(f.room,10000);assert.ok(f.a.hp<180);const hp=f.a.hp;f.a.x+=3;f.potions.before(f.room,10500);assert.ok(f.a.hp<hp);
 f.a.status.fireResistance=20000;const protectedHp=f.a.hp;Object.assign(f.a,{x:fire.x,z:fire.z});f.potions.before(f.room,11000);assert.equal(f.a.hp,protectedHp);assert.equal(f.a.status.burning,0);
 f.potions.before(f.room,20001);assert.ok(f.a.hp<protectedHp);
});

test('splash effects cannot be applied by dead, disconnected or sanctuary-protected sources',()=>{
 const f=fixture(),arrow={x:1,y:0,z:8,vx:0,vy:-1,vz:0,potionKind:'slowness'};
 f.a.hp=0;f.potions.impact(f.room,arrow,f.a,10000);assert.equal(f.b.status.slowPotion,undefined);f.a.hp=180;f.a.connected=false;f.potions.impact(f.room,arrow,f.a,10001);assert.equal(f.b.status.slowPotion,undefined);f.a.connected=true;f.a.protectedUntil=20000;f.potions.impact(f.room,arrow,f.a,10002);assert.equal(f.b.status.slowPotion,undefined);
});

test('a reserved disconnected body still receives passive regeneration and fire damage',()=>{
 const f=fixture();f.a.hp=100;drink(f,'regeneration');f.a.connected=false;f.potions.before(f.room,11651);assert.equal(f.a.hp,105);f.a.status.regeneration=0;Object.assign(f.a,{x:W.hazards[0].x,z:W.hazards[0].z});f.potions.before(f.room,12000);assert.ok(f.a.hp<105);
});
