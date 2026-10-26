const Inventory=require('./inventory');
const H=require('../shared/heroes'),C=require('../shared/combat'),W=require('../shared/world');
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
class Heroes {
 constructor(combat){this.combat=combat;this.units=new (require('./units').Units)(combat);this.effects=[];this.nextId=1;}
 clear(){this.effects=[];this.units.clear();}
 spawn(p,now){
  p.hero=H.has(p.pendingHero)?p.pendingHero:H.has(p.hero)?p.hero:'knight';p.pendingHero=p.hero;
  const h=H.heroes[p.hero];Object.assign(p,{maxHp:h.health,hp:h.health,armor:h.armor,weapon:h.weapon,canShield:false,abilityReady:{q:now,e:now},ult:0,status:{},speedScale:h.speed,damageScale:1,attackSpeed:1,resist:0,knockScale:1,slam:null,dash:null,noFall:false,windReady:now,combo:null,poisonTick:0});Inventory.reset(p);
 }
 charge(p,amount,now){if(p.connected!==false&&p.hp>0&&!(p.status.ultimate>now))p.ult=Math.min(100,(p.ult||0)+amount);}
 solids(){const walls=this.effects.filter(e=>e.kind==='wall'),key=walls.map(e=>e.id).join(',');if(key!==this.solidsKey){this.solidsKey=key;this.cachedSolids=walls.map(e=>({...e,solid:true}));}return this.cachedSolids||[];}
 boxes(){return [...W.getMap(this.combat.map).boxes,...this.solids()];}
 visible(a,b){const length=distance(a,b);if(length<.01)return true;const d={x:(b.x-a.x)/length,y:(b.y-a.y)/length,z:(b.z-a.z)/length};return C.wallDistance(a,d,length,this.boxes())>=length-.01;}
 target(p,range=16){const dir=C.direction(p.yaw,p.pitch),o={x:p.x,y:p.y+1.62,z:p.z},length=C.wallDistance(o,dir,range,this.boxes());const x=o.x+dir.x*Math.max(0,length-.1),z=o.z+dir.z*Math.max(0,length-.1);if(Math.abs(x)>30||Math.abs(z)>30)return null;
  const top={x,y:Math.max(p.y+2,o.y+dir.y*length+.15),z},down={x:0,y:-1,z:0};const fall=C.wallDistance(top,down,40,this.boxes());return {x,y:top.y-fall+.05,z};
 }
 allies(room,p,radius,fn){for(const t of room.values())if(t.team===p.team&&t.hp>0&&distance(p,t)<=radius&&this.visible({...p,y:p.y+1},{...t,y:t.y+1}))fn(t);}
 heal(p,source,amount,now,ultimate=false){if(p.hp<=0)return;const gain=Math.min(amount*(p.status?.afflicted>now?.5:1),p.maxHp-p.hp);if(gain<=0)return;p.hp+=gain;source.healingDone=(source.healingDone||0)+gain;if(source!==p&&!ultimate)this.charge(source,gain*.15,now);this.combat.emit('hero',{type:'heal',source:source.id,target:p.id,amount:gain});}
 area(room,p,center,radius,damage,heal,now,options={}){
  for(const t of this.combat.targets(room))if(t.hp>0&&distance(center,t)<=radius&&this.visible({...center,y:center.y+.5},{...t,y:t.y+1})){
   if(t.team===p.team){if(heal)this.heal(t,p,heal,now,options.ultimate);if(options.buff){t.status.mega=now+1200;}}
   else {if(this.combat.protected(t,now))continue;if(damage)this.combat.damage(room,t,p,damage,now,{weapon:options.kind||'ability',ability:!options.weaponAttack,ultimate:options.ultimate,noKnock:true,unblockable:true,fire:options.fire});if(options.fire)t.status.burning=now+2500;if(options.afflicted)t.status.afflicted=now+1200;if(options.root)t.status.root=now+2000;if(options.slow)t.status.slow=Math.max(t.status.slow||0,now+options.slow);}
  }
 }
 projectile(p,kind,damage,now){const d=C.direction(p.yaw,p.pitch),speed=kind==='explosive'?40:32;this.combat.projectiles.push({id:this.combat.nextProjectile++,owner:p.id,weapon:kind,x:p.x,y:p.y+1.62,z:p.z,vx:d.x*speed,vy:d.y*speed,vz:d.z*speed,damage,expires:now+3000,heroKind:kind});}
 impact(room,arrow,owner,target,now){
  const length=Math.hypot(arrow.vx,arrow.vy,arrow.vz)||1;
  // Keep splash origins outside the struck surface so ground impacts retain line of sight.
  const center={x:arrow.x-arrow.vx/length*.08,y:arrow.y-arrow.vy/length*.08+.05,z:arrow.z-arrow.vz/length*.08};
  if(['explosive','fireball'].includes(arrow.heroKind))this.area(room,owner,center,3.5,arrow.heroKind==='fireball'?32:35,0,now,{kind:arrow.heroKind,fire:arrow.heroKind==='fireball'});
  else if(arrow.heroKind==='potion')this.area(room,owner,center,2.5,16,14,now,{kind:'Potion Launcher',weaponAttack:true});
  else if(target){
    if(arrow.heroKind==='nature'&&target.team===owner.team){this.heal(target,owner,10,now);return;}
    const dealt=this.combat.damage(room,target,owner,arrow.damage,now,{weapon:arrow.heroKind,ability:!['frost','dark','ember','nature','toxic'].includes(arrow.heroKind),origin:arrow,fire:arrow.heroKind==='ember'});
    if(dealt){if(['ice','frost'].includes(arrow.heroKind))target.status.slow=now+(arrow.heroKind==='ice'?3000:1000);if(['toxic','dart'].includes(arrow.heroKind)){target.status.poisoned=now+5000;target.poisonOwner=owner.id;target.poisonTick=now+1000;}if(arrow.heroKind==='ember')target.status.burning=now+2500;}
  }
 }
 wall(room,p,now,ice){
  const d=C.direction(p.yaw),x=p.x+d.x*3,z=p.z+d.z*3;
  const wall={kind:'wall',owner:p.id,life:p.life,team:p.team,x,y:p.y+1.5,z,w:Math.abs(d.x)>.7?.6:ice?5:8,h:ice?3:4,d:Math.abs(d.x)>.7?(ice?5:8):.6,expires:now+(ice?7000:8000),color:ice?0x99def7:0xe2c582};wall.y=p.y+wall.h/2;
  if(Math.abs(x)+wall.w/2>31||Math.abs(z)+wall.d/2>31)return false;
  const overlap=(a,b)=>Math.abs(a.x-b.x)<(a.w+b.w)/2-.01&&Math.abs(a.y-b.y)<(a.h+b.h)/2-.01&&Math.abs(a.z-b.z)<(a.d+b.d)/2-.01;
  if(this.boxes().some(b=>b.solid&&overlap(wall,b))||[...room.values()].some(t=>t.hp>0&&overlap(wall,{x:t.x,y:t.y+.9,z:t.z,w:.65,h:1.8,d:.65})))return false;
  this.effects.push({...wall,id:this.nextId++});return true;
 }
 aimed(room,p,range=12,allied=false){const d=C.direction(p.yaw,p.pitch),o={x:p.x,y:p.y+1.62,z:p.z};let nearest=C.wallDistance(o,d,range,this.boxes()),victim=null;for(const t of this.combat.targets(room))if(t!==p&&t.hp>0&&(allied?t.team===p.team:t.team!==p.team)&&!this.combat.protected(t,Date.now())){const hit=C.playerDistance(o,d,t,nearest,.25);if(hit!==null&&hit<nearest){nearest=hit;victim=t;}}return victim;}
 use(room,p,key,now){
  if(this.combat.inLobby)return {error:'The host must start the match first.'};
  if(p.inventoryOpen)return {error:'Close your inventory before using abilities.'};
  if(p.drinking)return {error:'Finish drinking before using an ability.'};
  if(!['q','e','r'].includes(key)||p.connected===false||this.combat.matchOver||this.combat.protected(p,now))return {error:'Leave spawn and stay alive to use abilities.'};
  if(key==='r'&&p.ult<100)return {error:'Earn 100% ultimate charge first.'};
  if(key!=='r'&&now<p.abilityReady[key])return {error:'Ability is cooling down.'};
  if(Number.isFinite(p.input?.yaw))p.yaw=p.input.yaw;if(Number.isFinite(p.input?.pitch))p.pitch=p.input.pitch;
  const id=p.hero+':'+key,d=C.direction(p.yaw),h=H.heroes[p.hero],target=this.target(p);let ok=true;
  const dash=(speed,ms,dir=d)=>{p.dash={x:dir.x*speed,z:dir.z*speed,until:now+ms};};
  const zone=(kind,seconds,radius,center=target)=>{if(!center){ok=false;return;}this.effects.push({id:this.nextId++,owner:p.id,life:p.life,team:p.team,kind,...center,radius,expires:now+seconds*1000,nextTick:now});};
  switch(id){
   case 'knight:q':dash(18,450);p.status.charge=now+450;p.chargeHits=[];break;
   case 'knight:e':this.allies(room,p,8,t=>t.status.resist=now+5000);break;
   case 'knight:r':this.wall(room,p,now,false);this.allies(room,p,8,t=>t.status.fortress=now+6000);this.effects.push({id:this.nextId++,kind:'fortress',owner:p.id,life:p.life,team:p.team,x:p.x,y:p.y,z:p.z,radius:8,expires:now+6000});break;
   case 'berserker:q':p.status.rage=now+5000;break;
   case 'berserker:e':dash(10,500);p.vy=9;p.grounded=false;p.noFall=true;p.slam={damage:35,radius:4};break;
   case 'berserker:r':p.status.rampage=now+8000;break;
   case 'assassin:q':{
    const input=p.input||{},f=(input.forward?1:0)-(input.back?1:0),s=(input.right?1:0)-(input.left?1:0),n=Math.hypot(f,s);
    dash(22,250,n?{x:(s*Math.cos(p.yaw)-f*Math.sin(p.yaw))/n,z:(-s*Math.sin(p.yaw)-f*Math.cos(p.yaw))/n}:d);break;}
   case 'assassin:e':p.status.vanish=now+4000;break;
   case 'assassin:r':{
    const dir=C.direction(p.yaw,p.pitch),o={x:p.x,y:p.y+1.62,z:p.z};let nearest=C.wallDistance(o,dir,9,this.boxes()),victim=null;
    for(const t of room.values())if(t.team!==p.team&&!this.combat.protected(t,now)){const hit=C.playerDistance(o,dir,t,nearest,.2);if(hit!==null&&hit<nearest){nearest=hit;victim=t;}}
    if(!victim){ok=false;break;}W.move(p,{x:d.x*Math.max(0,nearest-1),y:0,z:d.z*Math.max(0,nearest-1)});this.combat.damage(room,victim,p,80,now,{weapon:'Shadow Strike',ultimate:true,ability:true});break;}
   case 'archer:q':{
    const dir=C.direction(p.yaw,p.pitch),o={x:p.x,y:p.y+1.62,z:p.z},hit=C.wallDistance(o,dir,22,this.boxes());
    if(hit>=22||hit<2){ok=false;break;}dash(17,Math.min(900,(hit-1)/17*1000),dir);p.vy=Math.max(p.vy,dir.y*17+3);p.noFall=true;p.grounded=false;break;}
   case 'archer:e':this.projectile(p,'explosive',35,now);break;
   case 'archer:r':zone('storm',5,5);break;
   case 'paladin:q':zone('aura',5,7,{x:p.x,y:p.y,z:p.z});break;
   case 'paladin:e':{
    let ally=p,best=12;const dir=C.direction(p.yaw,p.pitch),o={x:p.x,y:p.y+1.62,z:p.z};
    for(const t of room.values())if(t!==p&&t.team===p.team&&t.hp>0){const hit=C.playerDistance(o,dir,t,best,.3);if(hit!==null&&this.visible(o,{...t,y:t.y+1})){best=hit;ally=t;}}ally.status.holy=now+4000;break;}
   case 'paladin:r':this.allies(room,p,10,t=>t.status.divine=now+5000);break;
   case 'alchemist:q':if(target){this.area(room,p,target,4,0,35,now);this.effects.push({id:this.nextId++,owner:p.id,life:p.life,kind:'heal',team:p.team,...target,radius:4,expires:now+600});}else ok=false;break;
   case 'alchemist:e':zone('poison',6,4);break;
   case 'alchemist:r':zone('mega',7,6);break;
   case 'mace:q':p.vy=13;p.grounded=false;p.noFall=true;break;
   case 'mace:e':if(p.grounded)this.area(room,p,p,4,30,0,now,{kind:'Ground Slam'});else {p.vy=-24;p.slam={damage:40,radius:4};p.noFall=true;}break;
   case 'mace:r':p.vy=19;p.grounded=false;p.noFall=true;p.slam={damage:75,radius:6,ultimate:true};break;
   case 'necromancer:q':ok=this.units.spawn(room,p,['skeleton','skeleton'],now,10000);break;
   case 'necromancer:e':{const victim=this.aimed(room,p,12);if(!victim){ok=false;break;}const hp=victim.hp;this.combat.damage(room,victim,p,32,now,{weapon:'Life Drain',ability:true});this.heal(p,p,(hp-victim.hp)*.5,now);break;}
   case 'necromancer:r':ok=this.units.spawn(room,p,[...Array(6).fill('skeleton'),'zombie'],now,12000);break;
   case 'engineer:q':ok=this.units.spawn(room,p,['turret'],now,12000);break;
   case 'engineer:e':ok=this.units.spawn(room,p,['station'],now,10000);break;
   case 'engineer:r':ok=this.units.spawn(room,p,['megaTurret'],now,12000);break;
   case 'pyromancer:q':this.projectile(p,'fireball',32,now);break;
   case 'pyromancer:e':dash(18,450);p.status.flameDash=now+650;p.trailTick=now;break;
   case 'pyromancer:r':zone('inferno',8,6);break;
   case 'samurai:q':dash(22,250);p.combo={left:1,next:now,damage:24,range:4};break;
   case 'samurai:e':p.status.parry=now+350;break;
   case 'samurai:r':p.combo={left:5,next:now,damage:22,range:4,ultimate:true};break;
   case 'druid:q':zone('roots',6,5);break;
   case 'druid:e':if(target){this.area(room,p,target,4,0,0,now,{root:true});zone('vines',2,4);}else ok=false;break;
   case 'druid:r':ok=this.units.spawn(room,p,['guardian'],now,12000);break;
   case 'plague:q':this.projectile(p,'dart',12,now);break;
   case 'plague:e':{const ally=this.aimed(room,p,12,true)||p;for(const bad of ['slow','slowPotion','root','poisoned','burning','afflicted'])ally.status[bad]=0;this.heal(ally,p,30,now);break;}
   case 'plague:r':zone('plague',8,6);break;
   case 'frost:q':this.projectile(p,'ice',22,now);break;
   case 'frost:e':ok=this.wall(room,p,now,true);break;
   case 'frost:r':zone('blizzard',6,6);break;
   default:ok=false;
  }
  if(!ok)return {error:'No valid target or clear space. Aim at nearby ground, a block, or an enemy.'};
  p.motionSerial=(p.motionSerial||0)+1;p.blocking=false;p.drawAt=0;p.status.vanish=id==='assassin:e'?now+4000:0;
  if(key==='r'){p.ult=0;p.status.ultimate=now+8000;}else p.abilityReady[key]=now+h[key].cooldown;
  p.attackAt=now;p.attackSerial++;this.combat.emit('combat',{type:'attack',source:p.id,weapon:p.weapon,serial:p.attackSerial});
  this.combat.emit('hero',{type:'ability',source:p.id,hero:p.hero,key,name:h[key].name,x:p.x,y:p.y,z:p.z});return {ok:true};
 }
 before(room,now){
  this.effects=this.effects.filter(e=>e.expires>now&&room.has(e.owner)&&room.get(e.owner).life===e.life);const solids=this.solids();
  for(const p of room.values()){
   p.solids=solids;if(!p.status)continue;const h=H.heroes[p.hero],s=p.status;
   p.speedScale=h.speed*(s.rampage>now?1.3:1)*(s.mega>now?1.15:1)*(s.speed>now?1.25:1)*Math.min(s.slow>now?.55:1,s.slowPotion>now?.65:1);
   p.attackSpeed=s.rage>now?1.5:1;p.damageScale=(s.rampage>now?1.5:s.rage>now?1.25:1)*(s.strength>now?1.25:1);p.knockScale=s.rampage>now?1.5:1;
   p.resist=Math.max(s.guardian>now?.25:0,s.fortress>now?.55:0,s.resist>now?.25:0,s.holy>now?.65:0,s.divine>now?.6:0,s.mega>now?.2:0);
   if(s.root>now){p.speedScale=0;p.kx=p.kz=0;}
   if(s.poisoned>now&&now>=p.poisonTick){p.poisonTick=now+1000;const owner=room.get(p.poisonOwner);if(owner)this.combat.damage(room,p,owner,5,now,{weapon:'Poison',ability:true,noKnock:true});}
   if(s.flameDash>now&&now>=p.trailTick){p.trailTick=now+180;this.effects.push({id:this.nextId++,kind:'firetrail',owner:p.id,life:p.life,team:p.team,x:p.x,y:p.y,z:p.z,radius:1.5,expires:now+2500,nextTick:now});}
   if(p.dash?.until>now&&p.hp>0){p.kx=p.dash.x;p.kz=p.dash.z;}else p.dash=null;
  }
 }
 after(room,now,dt){
  for(const p of room.values())if(p.connected!==false&&p.hp>0&&p.status){
   if(p.status.charge>now)for(const t of room.values())if(t.team!==p.team&&distance(p,t)<2&&this.visible({...p,y:p.y+1},{...t,y:t.y+1})&&!p.chargeHits.includes(t.id)){
    if(this.combat.damage(room,t,p,18,now,{weapon:'Charging Rush',ability:true})){t.kx=-Math.sin(p.yaw)*15;t.kz=-Math.cos(p.yaw)*15;p.chargeHits.push(t.id);}}
   if(p.grounded){if(p.slam){const slam=p.slam;p.slam=null;this.area(room,p,p,slam.radius,slam.damage,0,now,{kind:'Ground Slam',ultimate:slam.ultimate});this.combat.emit('hero',{type:'slam',source:p.id,x:p.x,y:p.y,z:p.z,radius:slam.radius});}p.noFall=false;}
  }
  this.units.tick(room,now,dt);
  for(const p of room.values())if(p.combo&&p.hp>0&&p.connected!==false&&now>=p.combo.next){const combo=p.combo,victim=this.aimed(room,p,combo.range);if(victim)this.combat.damage(room,victim,p,combo.damage,now,{weapon:'Blade strike',ability:true,ultimate:combo.ultimate});combo.next=now+150;if(--combo.left<=0)p.combo=null;}
  for(const e of this.effects){const owner=room.get(e.owner);if(!owner||owner.connected===false||owner.hp<=0||e.kind==='wall'||e.kind==='heal'||e.kind==='splash'||now<e.nextTick)continue;e.nextTick=now+500;
   if(e.kind==='aura')Object.assign(e,{x:owner.x,y:owner.y,z:owner.z});
   this.area(room,owner,e,e.radius,['poison','plague'].includes(e.kind)?4:['inferno','firetrail'].includes(e.kind)?6:e.kind==='storm'||e.kind==='blizzard'?5:0,e.kind==='aura'?4.5:['mega','roots'].includes(e.kind)?6:0,now,{kind:e.kind,slow:e.kind==='blizzard'?1000:0,buff:e.kind==='mega',fire:['inferno','firetrail'].includes(e.kind),afflicted:e.kind==='plague',ultimate:['storm','mega','blizzard'].includes(e.kind)});
  }
 }
 snapshot(){return this.effects.map(e=>({...e}));}
}
module.exports={Heroes};
