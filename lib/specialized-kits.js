// Authoritative specialized-kit primitives. All positions, hits and HP changes stay server-side.
const H=require('../shared/heroes'),C=require('../shared/combat'),W=require('../shared/world');
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z),eye=p=>({x:p.x,y:p.y+1.2,z:p.z});
class SpecializedKits{
 constructor(h){this.h=h;this.c=h.combat;this.history=new Map();this.nextHistory=0;}
 isHealer(p){return !!H.heroes[p.hero]?.healer;}
 allied(a,b){return a!==b&&!!a.team&&a.team===b.team&&!['ffa','duel_1v1','kit_ladder'].includes(a.mode)&&a.connected!==false&&b.connected!==false&&b.hp>0&&!b.isUnit;}
 validOwner(room,e,now){const p=room.get(e.owner);return p&&p.connected!==false&&p.hp>0&&p.life===e.life&&(!e.expires||e.expires>now)?p:null;}
 effect(p,kind,center,now,ms,options={}){if(this.h.effects.length>=240)return null;const e={id:this.h.nextId++,specialized:true,owner:p.id,life:p.life,team:p.team,kind,x:center.x,y:center.y,z:center.z,radius:4,expires:now+ms,nextTick:now,...options};this.h.effects.push(e);return e;}
 heal(room,p,t,amount,now,ultimate=false){if(!t||!this.allied(p,t)||!this.h.visible(eye(p),eye(t)))return false;const hp=t.hp;this.h.heal(t,p,amount,now,ultimate);return t.hp>hp;}
 healingArea(room,p,center,radius,amount,now,ultimate=false){for(const t of room.values())if(this.allied(p,t)&&dist(center,t)<=radius&&this.h.visible({...center,y:center.y+.6},eye(t)))this.h.heal(t,p,amount,now,ultimate);}
 aimed(room,p,allied,now,range=18){const o={x:p.x,y:p.y+1.62,z:p.z},d=C.direction(p.yaw,p.pitch);let nearest=C.wallDistance(o,d,range,this.h.boxes()),hit=null;for(const t of this.c.targets(room))if(t.hp>0&&t.connected!==false&&t!==p&&(allied?this.allied(p,t):t.team!==p.team)&&!this.c.protected(t,now)){const n=C.playerDistance(o,d,t,nearest,.18);if(n!==null&&n<nearest){nearest=n;hit=t;}}return hit;}
 blast(room,p,center,radius,damage,now,options={}){const life=p.life;for(const t of this.c.targets(room)){if(t.team===p.team||t===p||dist(center,t)>radius||!this.h.visible({...center,y:center.y+.5},eye(t)))continue;if(damage>0)this.c.damage(room,t,p,damage*(options.falloff?1-.6*dist(center,t)/radius:1),now,{weapon:options.name||H.heroes[p.hero].name,ability:!options.primary,ultimate:!!options.ultimate,noKnock:true,fire:!!options.fire});if(p.life!==life)return;if(options.slow&&!this.c.protected(t,now))t.status.slow=Math.max(t.status.slow||0,now+1000);if(options.pull&&!this.c.protected(t,now)){const dx=center.x-t.x,dz=center.z-t.z,n=Math.hypot(dx,dz)||1;const probe={...t,solids:this.h.solids()};W.move(probe,{x:dx/n*Math.min(n,.45),z:dz/n*Math.min(n,.45)});if(this.h.visible(eye(t),eye(probe))){t.x=probe.x;t.z=probe.z;t.motionSerial=(t.motionSerial||0)+1;}}}
 }
 projectile(p,kind,now,options={}){if(this.c.projectiles.filter(a=>a.specialized&&a.owner===p.id).length>=24)return false;const yaw=p.yaw+(options.spread||0),d=C.direction(yaw,p.pitch),speed=options.speed||25;this.c.projectiles.push({id:this.c.nextProjectile++,specialized:true,owner:p.id,life:p.life,heroKind:'special:'+kind,weapon:kind,kind,x:p.x,y:p.y+1.5,z:p.z,vx:d.x*speed,vy:d.y*speed+(options.arc?6:0),vz:d.z*speed,expires:now+(kind==='boomerang'?1600:2200),created:now,damage:options.damage??20,heal:options.heal||0,radius:options.radius||0,ultimate:!!options.ultimate,cluster:!!options.cluster,returning:false,hits:[],...options});return true;}
 primary(room,p,now){const h=H.heroes[p.hero];if(!h?.specialized)return null;const weak=p.weapon===h.ranged&&h.healer;if(p.weapon!==h.weapon&&!weak)return false;
 if(p.hero==='boomeranghunter'&&this.c.projectiles.some(a=>a.owner===p.id&&a.kind==='boomerang'))return false;
 if(weak){if(now<(p.weakReady||0))return false;p.weakReady=now+700;this.projectile(p,p.hero+'bolt',now,{damage:8});return true;}
 switch(p.hero){
 case 'cleric':{const t=this.aimed(room,p,true,now);if(!t)return false;this.heal(room,p,t,4,now);this.effect(p,'healing-beam',p,now,300,{target:t.id,radius:.15,color:0xffe69a,tx:t.x,ty:t.y+1.2,tz:t.z});break;}
 case 'potionmaster':this.projectile(p,'healing-vial',now,{heal:18,damage:0,radius:3,arc:true});break;
 case 'timekeeper':case 'phoenixpriest':this.projectile(p,p.hero==='timekeeper'?'time-orb':'warm-feather',now,{heal:18,damage:0});break;
 case 'lifeguardian':return true;
 case 'boomeranghunter':this.projectile(p,'boomerang',now,{damage:18});break;
 case 'bombardier':this.projectile(p,'mortar-shell',now,{damage:27,radius:3,arc:true,speed:20});break;
 case 'fireworkraider':this.projectile(p,'firework',now,{damage:24,radius:2.5,speed:32});break;
 case 'portalstriker':this.projectile(p,'portal-sphere',now,{damage:24,radius:2.4});break;
 default:{const t=this.aimed(room,p,false,now,C.weapons[p.weapon].range);if(t)this.c.damage(room,t,p,C.weapons[p.weapon].damage,now,{weapon:p.weapon});if(p.hero==='chainreaper')this.effect(p,'chain-strike',p,now,300,{radius:5,tx:t?.x??p.x-Math.sin(p.yaw)*5,ty:t? t.y+1: p.y+1,tz:t?.z??p.z-Math.cos(p.yaw)*5,color:0xcbd1d7});}
 }return true;}
 move(p,now,kind){const d=C.direction(p.yaw,p.pitch);
 if(kind==='blink'){const probe={...p,solids:this.h.solids()},o={x:p.x,y:p.y+1,z:p.z},length=Math.min(6,C.wallDistance(o,C.direction(p.yaw),6,this.h.boxes())-.4);if(length<.3)return false;W.move(probe,{x:-Math.sin(p.yaw)*length,z:-Math.cos(p.yaw)*length});if(!this.h.extra.valid(probe))return false;Object.assign(p,{x:probe.x,z:probe.z,kx:0,kz:0});}
 else if(kind==='grapple'){const o={x:p.x,y:p.y+1.62,z:p.z},n=C.wallDistance(o,d,18,this.h.boxes());if(n<2||n>=18)return false;p.dash={x:d.x*15,z:d.z*15,until:now+Math.min(650,(n-1)/15*1000)};p.vy=Math.max(3,d.y*12);p.grounded=false;p.noFall=true;this.effect(p,'chain-strike',p,now,600,{radius:.2,tx:o.x+d.x*n,ty:o.y+d.y*n,tz:o.z+d.z*n});}
 else{p.dash={x:d.x*10,z:d.z*10,until:now+450};p.vy=kind==='recoil'?11:8;p.grounded=false;p.noFall=true;}
 this.effect(p,'mobility-'+kind,p,now,650,{radius:1.2,follow:true,color:kind==='rocket'?0xff8746:0x94d6ee});return true;}
 overhealth(room,p,now){for(const t of room.values())if(t===p||this.allied(p,t)){if(t.hp<=0||t.connected===false||dist(p,t)>7||!this.h.visible(eye(p),eye(t)))continue;if(t.overhealthUntil>now)continue;t.overhealth=Math.round(H.heroes.knight.health*.4);t.overhealthUntil=now+6000;t.overhealthOwner=p.id;t.overhealthLife=p.life;t.overhealthHero=p.hero;}this.effect(p,'overhealth',p,now,6000,{radius:7,color:0xefb66b});}
 use(room,p,key,now,target){const id=p.hero+':'+key,h=H.heroes[p.hero];if(!h?.specialized)return false;
 if(h.healer&&key==='e'){if(p.hp>=p.maxHp)return false;this.h.heal(p,p,30,now,false,true);this.effect(p,'self-renewal',p,now,650,{radius:1,color:0x7de8a2});return true;}
 if(h.healer&&key==='q'){
  if(p.hero==='lifeguardian'){p.status.lifeSurge=now+5000;this.effect(p,'life-surge',p,now,5000,{radius:5,follow:true,color:0x6eff92});return true;}
  if(p.hero==='potionmaster'){for(const spread of [-.06,.06])this.projectile(p,'healing-vial',now,{heal:18,radius:3,arc:true,damage:0,spread});return true;}
  const t=this.aimed(room,p,true,now);if(!t)return false;let amount=p.hero==='phoenixpriest'?(t.hp<t.maxHp*.4?42:24):32;
  if(p.hero==='timekeeper'){const samples=this.history.get(t.id)?.filter(s=>s.life===t.life&&s.time>=now-3000)||[];amount=Math.min(35,Math.max(t.hp,...samples.map(s=>s.hp))-t.hp);if(amount<=0)return false;}
  this.heal(room,p,t,amount,now);this.effect(p,'support-'+p.hero,t,now,650,{radius:1.5,color:0x9ff1ae});return true;
 }
 if(h.healer&&key==='r'){
  if(p.hero==='lifeguardian'){p.status.lifeBlessing=now+6000;return true;}
  if(p.hero==='phoenixpriest'){const targets=[...room.values()].filter(t=>this.allied(p,t)&&dist(p,t)<=8&&this.h.visible(eye(p),eye(t))).map(t=>({id:t.id,life:t.life}));if(!targets.length)return false;this.effect(p,'phoenix-blessing',p,now,6000,{radius:8,targets,color:0xffc673,ultimate:true});return true;}
  if(!target)return false;this.effect(p,p.hero==='cleric'?'sanctuary':p.hero==='potionmaster'?'potion-rain':'time-sanctuary',target,now,6000,{radius:6,color:0x8bf2be,ultimate:true});return true;
 }
 switch(id){
 case 'chainreaper:q':{const t=this.aimed(room,p,false,now,12);if(!t)return false;this.c.damage(room,t,p,24,now,{weapon:'Chain Pull',ability:true});const probe={...t,solids:this.h.solids()},n=dist(p,t)||1;W.move(probe,{x:(p.x-t.x)/n*Math.max(0,Math.min(4,n-1.5)),z:(p.z-t.z)/n*Math.max(0,Math.min(4,n-1.5))});if(this.h.visible(eye(t),eye(probe))){t.x=probe.x;t.z=probe.z;t.motionSerial=(t.motionSerial||0)+1;}this.effect(p,'chain-strike',p,now,500,{radius:1,tx:t.x,ty:t.y+1,tz:t.z});break;}
 case 'chainreaper:e':return this.move(p,now,'grapple');
 case 'chainreaper:r':this.effect(p,'death-cyclone',p,now,5000,{radius:4,follow:true,damage:9,ultimate:true,color:0xd4c4dc});break;
 case 'boomeranghunter:q':for(const spread of [-.25,0,.25])this.projectile(p,'boomerang',now,{damage:14,spread});break;
 case 'boomeranghunter:e':return this.move(p,now,'leap');
 case 'boomeranghunter:r':this.effect(p,'boomerang-storm',p,now,6000,{radius:4.5,follow:true,damage:8,ultimate:true,color:0xb6a0ff});break;
 case 'bombardier:q':this.projectile(p,'cluster-shell',now,{damage:16,radius:2,arc:true,cluster:true,speed:20,splitAt:now+450});break;
 case 'bombardier:e':return this.move(p,now,'recoil');
 case 'bombardier:r':case 'fireworkraider:r':if(!target)return false;this.effect(p,id==='bombardier:r'?'artillery-strike':'grand-finale',target,now,5500,{radius:5,round:0,nextTick:now+900,ultimate:true,color:id==='bombardier:r'?0xe8b383:0xf7a4ed});break;
 case 'fireworkraider:q':for(const spread of [-.32,-.16,0,.16,.32])this.projectile(p,'firework',now,{damage:9,radius:1.8,spread,speed:32});break;
 case 'fireworkraider:e':return this.move(p,now,'rocket');
 case 'portalstriker:q':if(!target)return false;this.effect(p,'rift-blast',target,now,2000,{radius:3,damage:8,color:0xbe8ced});break;
 case 'portalstriker:e':return this.move(p,now,'blink');
 case 'portalstriker:r':if(!target)return false;this.effect(p,'void-collapse',target,now,5000,{radius:5,damage:7,pull:true,ultimate:true,color:0x9e72d8});break;
 case 'lavaguardian:q':this.effect(p,'lava-slam',p,now,2500,{radius:4,damage:7,fire:true,color:0xff984f});break;
 case 'lavaguardian:e':case 'copperautomaton:e':this.overhealth(room,p,now);break;
 case 'lavaguardian:r':case 'obsidiansentinel:r':{const center=target||p;this.effect(p,id==='lavaguardian:r'?'volcanic-eruption':'blackstone-cataclysm',center,now,5000,{radius:5,damage:13,nextTick:now+900,ultimate:true,warningUntil:now+900,color:id==='lavaguardian:r'?0xff8040:0x9786aa});break;}
 case 'turtleknight:q':this.effect(p,'shell-spin',p,now,2000,{radius:3.5,follow:true,damage:9,color:0x78bf9c});break;
 case 'turtleknight:e':this.effect(p,'shell-dome',p,now,6000,{radius:4,follow:true,barrier:true,color:0x7fbfdc});break;
 case 'turtleknight:r':{const d=C.direction(p.yaw);this.effect(p,'tidal-crash',p,now,2200,{radius:3,hits:[],dx:d.x,dz:d.z,ultimate:true,color:0x7acfea});break;}
 case 'frostwarden:q':this.blast(room,p,p,4,25,now,{slow:true});this.effect(p,'frost-burst',p,now,700,{radius:4,color:0xa4e9ff});break;
 case 'frostwarden:e':case 'obsidiansentinel:e':{if(!this.h.wall(room,p,now,true))return false;const wall=this.h.effects.at(-1);Object.assign(wall,{specialized:true,barrier:true,expires:now+6000,color:p.hero==='frostwarden'?0x9fe5ff:0x685479});break;}
 case 'frostwarden:r':this.effect(p,'frozen-fortress',p,now,6000,{radius:6,damage:7,slow:true,ultimate:true,color:0xb0e4ff});break;
 case 'obsidiansentinel:q':this.blast(room,p,p,4,26,now);this.effect(p,'obsidian-spikes',p,now,750,{radius:4,color:0x74607f});break;
 case 'copperautomaton:q':this.blast(room,p,p,4,25,now);this.effect(p,'electric-pulse',p,now,700,{radius:4,color:0xffd781});break;
 case 'copperautomaton:r':this.effect(p,'thunder-reactor',p,now,6000,{radius:5,follow:true,damage:8,ultimate:true,color:0xffdb83});break;
 default:return false;
 }return true;}
 barrierDistance(room,a,owner,dir,length,now){let nearest=length;for(const e of this.h.effects){if(!e.barrier||e.kind!=='shell-dome'||e.team===owner.team||!this.validOwner(room,e,now))continue;const center={x:e.x,y:e.y+1,z:e.z},ox=a.x-center.x,oy=a.y-center.y,oz=a.z-center.z,b=ox*dir.x+oy*dir.y+oz*dir.z,c=ox*ox+oy*oy+oz*oz-e.radius*e.radius;if(c<=0)continue;const discriminant=b*b-c;if(discriminant<0)continue;const n=-b-Math.sqrt(discriminant);if(n>=0&&n<nearest)nearest=n;}return nearest;}
 splitCluster(a,p,now){const yaw=Math.atan2(-a.vx,-a.vz),pitch=Math.atan2(a.vy,Math.hypot(a.vx,a.vz));for(const spread of [-.3,0,.3]){if(this.projectile({...p,yaw,pitch},'cluster-fragment',now,{damage:12,radius:2,arc:true,spread,speed:14})){const child=this.c.projectiles.at(-1);Object.assign(child,{x:a.x,y:a.y+.1,z:a.z});}}this.effect(p,'cluster-split',a,now,300,{radius:1,color:0xffb177});}
 stepProjectile(room,a,p,now,dt){if(now>=a.expires)return false;
 if(a.kind==='boomerang'){if(now-a.created>=650&&!a.returning){a.returning=true;}if(a.returning){const target={x:p.x,y:p.y+1.2,z:p.z},n=dist(a,target);if(n<.7)return false;a.vx=(target.x-a.x)/n*28;a.vy=(target.y-a.y)/n*28;a.vz=(target.z-a.z)/n*28;}}
 if(a.cluster&&now>=a.splitAt){this.splitCluster(a,p,now);return false;}
 const delta={x:a.vx*dt,y:a.vy*dt,z:a.vz*dt},len=Math.hypot(delta.x,delta.y,delta.z);if(!len)return false;const dir={x:delta.x/len,y:delta.y/len,z:delta.z/len};const wall=C.wallDistance(a,dir,len,this.h.boxes()),barrier=this.barrierDistance(room,a,p,dir,len,now);let nearest=Math.min(wall,barrier),hit=null;
 for(const t of this.c.targets(room)){if(t===p||t.connected===false||t.hp<=0||a.hits.includes(a.kind==='boomerang'?t.id+(a.returning?':return':':out'):t.id)||(a.heal?!this.allied(p,t):t.team===p.team))continue;const n=C.playerDistance(a,dir,t,nearest);if(n!==null&&n<nearest){nearest=n;hit=t;}}
 if(hit||nearest<len){const center={x:a.x+dir.x*nearest-dir.x*.08,y:a.y+dir.y*nearest-dir.y*.08+.05,z:a.z+dir.z*nearest-dir.z*.08};if(barrier<=nearest+.001&&barrier<wall)return false;
  if(a.cluster){this.splitCluster({...a,...center},p,now);return false;}
  if(a.heal){if(a.radius)this.healingArea(room,p,center,a.radius,a.heal,now);else if(hit)this.heal(room,p,hit,a.heal,now);}
  else if(a.radius)this.blast(room,p,center,a.radius,a.damage,now,{primary:true,ultimate:a.ultimate,falloff:true});else if(hit)this.c.damage(room,hit,p,a.damage,now,{weapon:a.kind,ability:false,ultimate:a.ultimate,rangedWeapon:true,origin:a});
  this.effect(p,'impact-'+a.kind,center,now,400,{radius:a.radius||.7,color:a.heal?0x8bf5a9:a.kind==='firework'?0xff87dd:0xc8b4f5});
  if(a.kind==='boomerang'&&hit){a.hits.push(hit.id+(a.returning?':return':':out'));}else if(a.kind==='boomerang'&&!a.returning){a.returning=true;Object.assign(a,center);return true;}else return false;
 }
 a.x+=delta.x;a.y+=delta.y;a.z+=delta.z;if(a.arc)a.vy-=9*dt;return true;}
 before(room,now){for(const [id]of this.history)if(!room.has(id))this.history.delete(id);
 if(now>=this.nextHistory){this.nextHistory=now+250;for(const p of room.values()){const samples=(this.history.get(p.id)||[]).filter(s=>s.time>=now-3000&&s.life===p.life);if(p.hp>0&&p.connected!==false)samples.push({time:now,hp:p.hp,life:p.life});this.history.set(p.id,samples.slice(-13));}}
 for(const p of room.values()){if(p.overhealthUntil<=now||p.hp<=0||p.connected===false||p.overhealthOwner&&(!room.has(p.overhealthOwner)||room.get(p.overhealthOwner).life!==p.overhealthLife||room.get(p.overhealthOwner).hero!==p.overhealthHero||room.get(p.overhealthOwner).hp<=0||room.get(p.overhealthOwner).connected===false)){p.overhealth=0;p.overhealthUntil=0;p.overhealthOwner=null;}
 if(p.hero==='lifeguardian'&&p.hp>0&&p.connected!==false&&p.weapon==='lifeaura'&&(!p.itemSlots||require('./inventory').held(p)?.id==='lifeaura')&&!this.c.protected(p,now)&&!p.inventoryOpen){let e=this.h.effects.find(e=>e.owner===p.id&&e.kind==='life-aura'&&e.life===p.life);if(!e)e=this.effect(p,'life-aura',p,now,1000,{radius:5,follow:true,color:0x6ced8d});if(e){e.expires=now+600;e.radius=p.status.lifeBlessing>now?10:5;Object.assign(e,{x:p.x,y:p.y,z:p.z});}}}
 }
 after(room,now,dt){for(const e of this.h.effects)if(e.follow){const p=this.validOwner(room,e,now);if(p)Object.assign(e,{x:p.x,y:p.y,z:p.z});}const initial=this.c.projectiles.filter(a=>a.specialized),live=[];for(const a of initial){const p=this.validOwner(room,a,now);if(p&&this.stepProjectile(room,a,p,now,dt))live.push(a);}const added=this.c.projectiles.filter(a=>a.specialized&&!initial.includes(a));this.c.projectiles=this.c.projectiles.filter(a=>!a.specialized).concat(live,added);
 for(const e of this.h.effects){if(!e.specialized||e.kind==='wall')continue;const p=this.validOwner(room,e,now);if(!p)continue;if(e.follow)Object.assign(e,{x:p.x,y:p.y,z:p.z});
 if(e.kind==='healing-beam'){const t=room.get(e.target);if(!t||!this.allied(p,t)||dist(p,t)>18||!this.h.visible(eye(p),eye(t))){e.expires=now;continue;}Object.assign(e,{x:p.x,y:p.y,z:p.z,tx:t.x,ty:t.y+1.2,tz:t.z});}
 if(e.kind==='tidal-crash'){const probe={...p,x:e.x,y:e.y,z:e.z,solids:this.h.solids()},dx=e.dx*10*dt,dz=e.dz*10*dt;W.move(probe,{x:dx,z:dz});if(Math.hypot(probe.x-e.x-dx,probe.z-e.z-dz)>.01){e.expires=now;continue;}e.x=probe.x;e.z=probe.z;for(const t of this.c.targets(room))if(t.team!==p.team&&!e.hits.includes(t.id)&&dist(e,t)<3&&this.h.visible(eye(e),eye(t))&&this.c.damage(room,t,p,40,now,{weapon:'Tidal Crash',ability:true,ultimate:true}))e.hits.push(t.id);continue;}
 if(now<e.nextTick)continue;e.nextTick=now+500;
 if(e.kind==='life-aura'){if(p.weapon!=='lifeaura'||p.inventoryOpen||require('./inventory').held(p)?.id!=='lifeaura'||this.c.protected(p,now)){e.expires=now;continue;}const factor=(p.status.lifeSurge>now?2:1)*(p.status.lifeBlessing>now?2:1);this.healingArea(room,p,e,e.radius,4*factor,now,p.status.lifeBlessing>now);}
 else if(['sanctuary','potion-rain','time-sanctuary'].includes(e.kind)){this.healingArea(room,p,e,e.radius,8,now,true);if(e.kind==='time-sanctuary')this.blast(room,p,e,e.radius,0,now,{slow:true,ultimate:true});}
 else if(e.kind==='phoenix-blessing'){for(const ref of e.targets){const t=room.get(ref.id);if(t?.life===ref.life&&this.allied(p,t))this.h.heal(t,p,7,now,true);}}
 else if(['artillery-strike','grand-finale'].includes(e.kind)){if(e.round>=6)continue;const a=e.round++*2.4,origin={x:e.x+Math.sin(a)*2.5,y:e.y+7,z:e.z+Math.cos(a)*2.5};this.projectile(p,e.kind==='grand-finale'?'firework':'mortar-shell',now,{damage:24,radius:3,ultimate:true});Object.assign(this.c.projectiles.at(-1),origin,{vx:0,vy:-22,vz:0});}
 else if(e.damage)this.blast(room,p,e,e.radius,e.damage,now,e);
 }
 }
 cleanup(room,p){this.h.effects=this.h.effects.filter(e=>e.owner!==p.id);this.c.projectiles=this.c.projectiles.filter(e=>e.owner!==p.id);this.history.delete(p.id);for(const t of room.values())if(t.overhealthOwner===p.id){t.overhealth=0;t.overhealthUntil=0;t.overhealthOwner=null;}}
 clear(){this.history.clear();this.nextHistory=0;}
}
module.exports={SpecializedKits};
