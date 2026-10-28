const test=require('node:test'),assert=require('node:assert/strict');
const {Combat}=require('../lib/combat'),{Heroes}=require('../lib/heroes'),H=require('../shared/heroes'),W=require('../shared/world');
function setup(hero='knight'){
 const events=[],combat=new Combat((_,e)=>events.push(e));combat.heroes=new Heroes(combat);const room=new Map();
 function player(id,team,x,z,cls='knight'){const p={id,name:id,team,hero:cls,life:0,...W.spawn(),x,y:0,z,yaw:0,pitch:0,input:{},lastInput:10000};combat.init(p,room.size,10000);p.protectedUntil=0;room.set(id,p);return p;}
 const a=player('a','red',0,10,hero),b=player('b','blue',0,7),ally=player('ally','red',2,10);return {combat,h:combat.heroes,room,a,b,ally,events};
}
test('all twenty-one heroes spawn with distinct, authoritative class stats and an empty ultimate',()=>{
 assert.equal(Object.keys(H.heroes).length,21);for(const [id,def]of Object.entries(H.heroes)){const {a}=setup(id);assert.equal(a.hp,def.health);assert.equal(a.weapon,def.weapon);assert.equal(a.armor,def.armor);assert.equal(a.ult,0);assert.ok(def.q.name&&def.e.name&&def.r.name);}
});
test('server rejects cooldown spam, invalid keys, unearned ultimates, death and spawn casts',()=>{
 const {h,room,a}=setup('berserker');assert.ok(h.use(room,a,'r',10000).error);assert.ok(h.use(room,a,'hack',10000).error);assert.ok(h.use(room,a,'q',10000).ok);assert.ok(h.use(room,a,'q',10001).error);a.hp=0;assert.ok(h.use(room,a,'e',11000).error);a.hp=130;a.x=25;a.z=0;assert.ok(h.use(room,a,'e',11000).error);
});
test('knight charges enemies, grants ally resistance, and protects nearby allies with a magical fortress',()=>{
 const {h,combat,room,a,b,ally}=setup();h.use(room,a,'q',10000);assert.ok(a.dash);b.z=9;h.before(room,10001);h.after(room,10001,1/60);assert.ok(b.hp<b.maxHp);assert.ok(Math.abs(b.kz)>=15);
 h.use(room,a,'e',10002);h.before(room,10003);assert.equal(ally.resist,.25);
 a.ult=100;b.x=10;assert.ok(h.use(room,a,'r',10004).ok);assert.ok(h.effects.some(e=>e.kind==='fortress'));assert.equal(a.ult,0);h.before(room,10005);assert.equal(ally.resist,.55);h.before(room,20000);assert.equal(h.effects.length,0);
});
test('occupied wall placement rejects without consuming the ultimate or trapping players',()=>{
 const {h,room,a}=setup('frost');const ready=a.abilityReady.e;assert.ok(h.use(room,a,'e',10000).error);assert.equal(a.abilityReady.e,ready);assert.equal(h.solids().length,0);
});
test('berserker rage accelerates attacks, leap slams on landing, and rampage buffs damage and speed',()=>{
 const {h,combat,room,a,b}=setup('berserker');h.use(room,a,'q',10000);h.before(room,10001);assert.equal(a.attackSpeed,1.5);combat.attack(room,a,'attack',10001);assert.ok(a.nextAttack-10001<950);
 h.use(room,a,'e',10002);assert.equal(a.vy,9);assert.ok(a.slam);a.grounded=true;b.z=8;h.after(room,10003,1/60);assert.equal(a.slam,null);assert.ok(b.hp<b.maxHp);
 a.ult=100;h.use(room,a,'r',10004);h.before(room,10005);assert.equal(a.damageScale,1.5);assert.ok(a.speedScale>1);assert.ok(a.knockScale>1);
});
test('assassin dash obeys movement direction, vanish expires on attacking, and shadow strike validates aim',()=>{
 const {h,combat,room,a,b}=setup('assassin');a.input={right:true};h.use(room,a,'q',10000);assert.ok(a.dash.x>0);assert.ok(Math.abs(a.dash.z)<1e-9);
 h.use(room,a,'e',10001);assert.ok(a.status.vanish>10001);combat.attack(room,a,'attack',10002);assert.equal(a.status.vanish,0);
 a.ult=100;a.yaw=Math.PI;assert.ok(h.use(room,a,'r',11000).error);assert.equal(a.ult,100);a.yaw=0;assert.ok(h.use(room,a,'r',11001).ok);assert.ok(b.hp<b.maxHp);assert.equal(a.ult,0);
});
test('archer grapple requires a block, explosive arrows deal splash damage, storm ticks and expires',()=>{
 const {h,combat,room,a,b}=setup('archer');assert.ok(h.use(room,a,'q',10000).error);a.pitch=-.5;assert.ok(h.use(room,a,'q',10001).ok);assert.ok(a.dash);
 a.pitch=0;h.use(room,a,'e',10002);assert.equal(combat.projectiles[0].heroKind,'explosive');h.impact(room,{...combat.projectiles[0],x:b.x,y:b.y+1,z:b.z},a,b,10003);assert.ok(b.hp<b.maxHp);
 a.ult=100;a.pitch=-.5;h.use(room,a,'r',11000);const storm=h.effects.find(e=>e.kind==='storm');Object.assign(b,{x:storm.x,y:storm.y,z:storm.z});const hp=b.hp;h.after(room,11001,1/60);assert.ok(b.hp<hp);h.before(room,17000);assert.equal(h.effects.length,0);
});
test('paladin healing aura restores only missing health and holy/divine protection reduce damage',()=>{
 const {h,room,a,ally}=setup('paladin');ally.hp-=40;h.use(room,a,'q',10000);h.after(room,10001,1/60);assert.ok(ally.hp>ally.maxHp-40);assert.ok(a.ult>0);
 h.use(room,a,'e',10002);h.before(room,10003);assert.equal(a.resist,.65);a.ult=100;h.use(room,a,'r',10004);h.before(room,10005);assert.ok(ally.resist>=.6);
});
test('alchemist splash heals, poison damages enemies, mega potion heals and buffs allies',()=>{
 const {h,room,a,b,ally}=setup('alchemist');a.pitch=-.5;const target=h.target(a);Object.assign(ally,target);ally.hp-=50;h.use(room,a,'q',10000);assert.equal(ally.hp,ally.maxHp-15);
 h.use(room,a,'e',10001);const poison=h.effects.find(e=>e.kind==='poison');Object.assign(b,{x:poison.x,y:poison.y,z:poison.z});const hp=b.hp;h.after(room,10002,1/60);assert.ok(b.hp<hp);
 a.ult=100;h.use(room,a,'r',11000);const mega=h.effects.find(e=>e.kind==='mega');Object.assign(ally,{x:mega.x,y:mega.y,z:mega.z});ally.hp-=30;const health=ally.hp;h.after(room,11001,1/60);h.before(room,11002);assert.ok(ally.hp>health);assert.ok(ally.speedScale>.9);assert.ok(ally.resist>=.2);
});
test('mace rocket jump and meteor are airborne; ground slam damages only on landing',()=>{
 const {h,room,a,b}=setup('mace');h.use(room,a,'q',10000);assert.equal(a.vy,13);assert.ok(a.noFall);h.use(room,a,'e',10001);assert.equal(a.vy,-24);assert.ok(a.slam);
 const hp=b.hp;a.grounded=false;h.after(room,10002,1/60);assert.equal(b.hp,hp);a.grounded=true;h.after(room,10003,1/60);assert.ok(b.hp<hp);assert.equal(a.slam,null);
 a.ult=100;h.use(room,a,'r',11000);assert.equal(a.vy,19);assert.equal(a.slam.damage,75);assert.ok(a.noFall);
});
test('frost bolt slows on a validated hit, ice wall blocks, blizzard damages and slows',()=>{
 const {h,combat,room,a,b}=setup('frost');h.use(room,a,'q',10000);const arrow=combat.projectiles[0];h.impact(room,arrow,a,b,10001);assert.ok(b.status.slow>10001);assert.ok(b.hp<b.maxHp);
 b.x=10;h.use(room,a,'e',10002);assert.equal(h.solids().length,1);h.before(room,18000);a.ult=100;a.pitch=-.5;h.use(room,a,'r',18001);const storm=h.effects.find(e=>e.kind==='blizzard');Object.assign(b,{x:storm.x,y:storm.y,z:storm.z});h.after(room,18002,1/60);h.before(room,18003);assert.ok(b.speedScale<.9);
});
test('damage and real ally healing earn charge, overhealing/self healing/ultimate damage do not; death clears charge',()=>{
 const {h,combat,room,a,b,ally}=setup('paladin');combat.damage(room,b,a,20,10000,{noKnock:true});assert.ok(a.ult>0);a.ult=0;h.heal(a,a,100,10001);h.heal(ally,a,100,10001);assert.equal(a.ult,0);ally.hp-=20;h.heal(ally,a,20,10001);assert.ok(a.ult>0);
 a.ult=0;combat.damage(room,b,a,20,10002,{ultimate:true});assert.equal(a.ult,0);a.ult=80;combat.damage(room,a,b,10000,10003);assert.equal(a.hp,0);assert.equal(a.ult,0);
});
test('respawn applies the pending hero and clears statuses, cooldowns, and ultimate',()=>{
 const {combat,room,a}=setup('knight');a.pendingHero='frost';a.hp=0;a.deadUntil=10001;a.ult=100;combat.tick(room,10002,1/60);assert.equal(a.hero,'frost');assert.equal(a.hp,105);assert.equal(a.weapon,'staff');assert.equal(a.ult,0);assert.deepEqual(a.status,{});
});

test('Holy Ward can select a real aimed teammate and reduces incoming damage',()=>{
 const {h,combat,room,a,b,ally}=setup('paladin');Object.assign(ally,{x:0,z:7});b.x=5;h.use(room,a,'e',10000);h.before(room,10001);assert.equal(ally.resist,.65);combat.damage(room,ally,b,100,10002,{noKnock:true});assert.equal(ally.hp,ally.maxHp-23);
});
test('removed equipment shields cannot stop ice bolts; protected enemies ignore slowing, expired lives remove temporary effects',()=>{
 const {h,combat,room,a,b}=setup('frost');b.yaw=Math.PI;combat.block(b,true,10000);h.projectile(a,'ice',22,10000);h.impact(room,combat.projectiles[0],a,b,10001);assert.equal(b.hp,b.maxHp-14);assert.ok(b.status.slow>10001);
 b.status.slow=undefined;b.blocking=false;b.protectedUntil=11000;h.impact(room,combat.projectiles[0],a,b,10002);assert.equal(b.status.slow,undefined);b.x=10;h.use(room,a,'e',10003);assert.equal(h.solids().length,1);a.life++;h.before(room,10004);assert.equal(h.solids().length,0);
});

test('potion and explosive splashes work when their projectile hits the ground',()=>{
 const {h,room,a,b,ally}=setup('alchemist');Object.assign(ally,{x:2,z:10});ally.hp-=30;
 const arrow={x:1,y:0,z:8,vx:0,vy:-10,vz:0,heroKind:'potion'};h.impact(room,arrow,a,null,10000);assert.equal(ally.hp,ally.maxHp-16);assert.equal(b.hp,b.maxHp-10);
 const before=b.hp;h.impact(room,{...arrow,heroKind:'explosive'},a,null,10001);assert.ok(b.hp<before);
});
test('every ranged primary projectile carries triple-knockback provenance while ability projectiles do not',()=>{
 const C=require('../shared/combat');
 for(const [weapon,def]of Object.entries(C.weapons).filter(([id,w])=>w.projectile||['staff','launcher'].includes(id))){
  const {combat,h,room,a}=setup();a.weapon=weapon;a.nextAttack=0;a.drawAt=def.charge?9000:0;
  assert.equal(combat.attack(room,a,def.charge?'release':'attack',10000),true,weapon);
  assert.equal(combat.projectiles.length,1,weapon);assert.equal(combat.projectiles[0].rangedWeapon,true,weapon);
  h.projectile(a,'frost',16,11000);assert.equal(combat.projectiles.at(-1).rangedWeapon,undefined);
 }
});
