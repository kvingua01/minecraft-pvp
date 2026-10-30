// Seven additional kits use the existing authoritative combat, effect and summon systems.
const C=require('../shared/combat'),W=require('../shared/world');
const projectileKinds=new Set(['tnt','tnt-toss','trident','enchanted','witherbolt','skull','barrage-skull','blazefire','sticky','totem']);
const customUnits=new Set(['decoy','slime','vex','blazerod']);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
class ExtraKits{
 constructor(heroes){this.h=heroes;this.c=heroes.combat;}
 effect(p,kind,center,now,duration,options={}){const e={id:this.h.nextId++,extra:true,owner:p.id,life:p.life,team:p.team,kind,x:center.x,y:center.y,z:center.z,radius:1,expires:now+duration,nextTick:now,...options};this.h.effects.push(e);return e;}
 event(p,kind,center,radius=3){this.c.emit('hero',{type:'kit-burst',source:p.id,hero:p.hero,kind,...{x:center.x,y:center.y,z:center.z},radius});}
 projectile(p,kind,damage,now){if(!projectileKinds.has(kind))return false;if(kind==='trident')p.status.tridentOut=now+2500;const d=C.direction(p.yaw,p.pitch),speed=kind==='trident'?30:kind==='tnt-toss'||kind==='sticky'?16:30;
 this.c.projectiles.push({id:this.c.nextProjectile++,extra:true,owner:p.id,life:p.life,weapon:kind,heroKind:kind,x:p.x,y:p.y+1.5,z:p.z,vx:d.x*speed,vy:d.y*speed+(kind==='tnt-toss'||kind==='sticky'?4:0),vz:d.z*speed,damage,expires:now+(kind==='totem'?450:kind==='tnt-toss'?1000:kind==='trident'?1200:2200),fuseAt:now+1000});return true;}
 blast(room,p,center,radius,damage,now,options={}){radius=this.c.modes?.upgrade?.items.radius(p,radius)||radius;const life=p.life;for(const t of this.c.targets(room)){const n=dist({...t,y:t.y+.6},center);if(t.team===p.team||n>radius||this.c.protected(t,now)||!this.h.visible(center,{...t,y:t.y+.7}))continue;
 if(this.c.damage(room,t,p,damage*(1-.65*n/radius),now,{weapon:options.kind||'TNT',ability:!options.primary,primaryWeapon:options.primaryWeapon,ultimate:options.ultimate,noKnock:true,fire:options.fire})){if(p.life!==life)return;if(options.wither){t.status.withered=Math.max(t.status.withered||0,now+4000);t.witherOwner=p.id;t.witherTick=Math.max(t.witherTick||0,now+1000);}if(options.knock){const dx=t.x-center.x,dz=t.z-center.z,len=Math.hypot(dx,dz)||1;const scale=(options.primary?3:1)*(t.juggernaut?.5:1);t.kx=dx/len*8*scale;t.kz=dz/len*8*scale;t.vy=Math.max(t.vy,4*scale);t.grounded=false;t.motionSerial=(t.motionSerial||0)+1;}if(options.fire){t.status.burning=now+2000;if(this.c.modes?.extra.active)t.burnOwner=p.id;}}}
 this.event(p,options.kind||'tnt',center,radius);}
 impact(room,a,p,target,now){if(!a.extra)return false;const len=Math.hypot(a.vx,a.vy,a.vz)||1,center={x:a.x-a.vx/len*.12,y:a.y-a.vy/len*.12+.08,z:a.z-a.vz/len*.12};
 switch(a.heroKind){
 case 'barrage-tnt':this.blast(room,p,center,3.3,32,now,{knock:true,ultimate:true,kind:'tnt'});break;
 case 'tnt':this.blast(room,p,center,3,26,now,{primary:true,primaryWeapon:a.primaryWeapon,knock:true,kind:'tnt'});break;
 case 'tnt-toss':if(now>=a.fuseAt)this.blast(room,p,center,4,42,now,{knock:true,kind:'tnt'});else this.effect(p,'fused-tnt',center,now,a.fuseAt-now+400,{detonateAt:a.fuseAt,radius:4});break;
 case 'trident':if(target)this.c.damage(room,target,p,a.damage,now,{weapon:'trident',ability:false,origin:a});this.effect(p,'trident-return',center,now,1200);p.status.tridentOut=now+1200;break;
 case 'skull':case 'barrage-skull':this.blast(room,p,center,3,a.damage,now,{wither:true,ultimate:a.heroKind==='barrage-skull',kind:'wither'});break;
 case 'sticky':{const ground=this.ground(p,center.x,center.z,center.y+1);if(ground)this.effect(p,'sticky',ground,now,6000,{radius:3});this.event(p,'slime',center);break;}
 default:if(target){const hit=this.c.damage(room,target,p,a.damage,now,{weapon:a.heroKind,origin:a,fire:a.heroKind==='blazefire'});if(hit&&a.life===p.life&&a.heroKind==='blazefire'){target.status.burning=now+2000;if(this.c.modes?.extra.active)target.burnOwner=p.id;}}this.event(p,a.heroKind,center,1);
 }return true;}
 ground(p,x,z,top=p.y+3){if(Math.abs(x)>30||Math.abs(z)>30)return null;const o={x,y:top,z},fall=C.wallDistance(o,{x:0,y:-1,z:0},30,this.h.boxes());if(fall>=30)return null;const ground={x,y:top-fall+.06,z};if(C.inSpawn({...ground,mode:p.mode})||!this.h.visible({...p,y:p.y+1.5},{...ground,y:ground.y+.3}))return null;return ground;}
 valid(p){if(Math.abs(p.x)>30||Math.abs(p.z)>30||p.y<-1||p.y>20||C.inSpawn(p))return false;return !this.h.boxes().some(b=>b.solid&&Math.abs(p.x-b.x)<b.w/2+.32&&Math.abs(p.z-b.z)<b.d/2+.32&&p.y<b.y+b.h/2-.01&&p.y+1.8>b.y-b.h/2+.01);}
 fangs(p,now,center,circle){let count=0;const hitGroups=[[],[],[]],d=C.direction(p.yaw);for(let ring=0;ring<(circle?3:1);ring++)for(let i=0;i<8;i++){const radius=2+ring*2,angle=i*Math.PI/4,x=circle?center.x+Math.cos(angle)*radius:p.x+d.x*(i+1)*1.4,z=circle?center.z+Math.sin(angle)*radius:p.z+d.z*(i+1)*1.4,g=this.ground(p,x,z,circle?center.y+3:p.y+3);if(!g||this.h.effects.length>=200)continue;this.effect(p,'fang',g,now,1100+(circle?ring*450:i*90),{radius:.85,detonateAt:now+650+(circle?ring*450:i*90),ultimate:circle,hits:hitGroups[ring]});count++;}return count>0;}
 use(room,p,key,now,target){const d=C.direction(p.yaw),id=p.hero+':'+key;
 switch(id){
 case 'demolitionist:q':this.projectile(p,'tnt-toss',42,now);break;
 case 'demolitionist:e':p.vy=12;p.grounded=false;p.noFall=true;p.dash={x:d.x*9,z:d.z*9,until:now+450};this.event(p,'tnt',p);break;
 case 'demolitionist:r':case 'wither:r':if(!target||!this.ground(p,target.x,target.z,target.y+2))return false;this.effect(p,id==='wither:r'?'wither-barrage':'tnt-barrage',target,now,4500,{radius:5,detonateAt:now+1100,round:0,ultimate:true});break;
 case 'trident:q':if(p.status.tridentOut>now)return false;p.dash={x:d.x*19,z:d.z*19,until:now+550};p.status.riptide=now+550;p.riptideHits=[];this.effect(p,'riptide',p,now,550,{radius:1.8});break;
 case 'trident:e':if(p.hp>=p.maxHp)return false;this.h.heal(p,p,35,now);this.event(p,'water',p,2);break;
 case 'trident:r':this.effect(p,'wave',p,now,2000,{radius:3,dx:d.x,dz:d.z,hits:[]});break;
 case 'illusionist:q':if(this.h.units.units.some(u=>u.owner===p.id&&u.kind==='decoy'&&u.hp>0&&u.expires>now))return false;return this.h.units.spawn(room,p,['decoy'],now,8000);
 case 'illusionist:e':{const decoy=this.h.units.units.find(u=>u.owner===p.id&&u.kind==='decoy'&&u.hp>0&&u.expires>now);if(!decoy||!this.valid({...p,x:decoy.x,y:decoy.y,z:decoy.z})||!this.valid({...decoy,x:p.x,y:p.y,z:p.z})||!this.h.visible({...p,y:p.y+1},{...decoy,y:decoy.y+1}))return false;const old={x:p.x,y:p.y,z:p.z};Object.assign(p,{x:decoy.x,y:decoy.y,z:decoy.z,vy:0,kx:0,kz:0,fallPeak:decoy.y,noFall:true});Object.assign(decoy,old);this.event(p,'mirror',p);break;}
 case 'illusionist:r':if(!this.h.units.spawn(room,p,Array(4).fill('decoy'),now,8000))return false;for(const t of room.values())if(t.team!==p.team&&dist(p,t)<7&&this.h.visible({...p,y:p.y+1},{...t,y:t.y+1}))t.status.mirrored=now+1500;this.event(p,'mirror',p,7);break;
 case 'wither:q':this.projectile(p,'skull',27,now);break;
 case 'wither:e':p.status.soulFlight=now+4000;p.vy=2;p.grounded=false;p.noFall=true;this.effect(p,'soul-flight',p,now,4000,{radius:1});break;
 case 'blaze:q':this.effect(p,'fire-spin',p,now,5000,{radius:3});break;
 case 'blaze:e':p.status.flameRise=now+3000;p.noFall=true;p.grounded=false;p.trailTick=now;this.effect(p,'flame-rise',p,now,3000,{radius:1});break;
 case 'blaze:r':return this.h.units.spawn(room,p,Array(6).fill('blazerod'),now,8000);
 case 'slime:q':p.vy=13;p.grounded=false;p.noFall=true;p.extraBounce=1;break;
 case 'slime:e':this.projectile(p,'sticky',0,now);break;
 case 'slime:r':if(!this.h.units.spawn(room,p,Array(3).fill('slime'),now,10000))return false;p.status.slimeSplit=now+10000;this.effect(p,'slime-split',p,now,10000,{radius:1});break;
 case 'evoker:q':return this.fangs(p,now,p,false);
 case 'evoker:e':if(this.h.units.units.some(u=>u.owner===p.id&&u.kind==='vex'&&u.hp>0&&u.expires>now))return false;return this.h.units.spawn(room,p,['vex'],now,10000);
 case 'evoker:r':return !!target&&this.fangs(p,now,target,true);
 default:return false;
 }return true;}
 before(room,now){for(const a of this.c.projectiles)if(a.extra&&a.expires<=now){const p=room.get(a.owner);if(p&&p.hp>0&&p.life===a.life)this.impact(room,a,p,null,now);}this.c.projectiles=this.c.projectiles.filter(a=>!a.extra||a.expires>now&&room.get(a.owner)?.hp>0&&room.get(a.owner)?.life===a.life);
 for(const p of room.values()){p.flightLift=undefined;if(!p.status||p.hp<=0)continue;if(p.status.soulFlight>now)p.flightLift=p.y<.7?2:0;if(p.status.flameRise>now)p.flightLift=4;if(p.flightLift!==undefined){if(p.y>=18)p.flightLift=Math.min(0,p.flightLift);p.noFall=true;p.grounded=false;}
 if(p.status.withered>now&&now>=(p.witherTick||0)){p.witherTick=now+1000;const owner=room.get(p.witherOwner);if(owner)this.c.damage(room,p,owner,4,now,{weapon:'Wither',ability:true,noKnock:true,periodic:true});}
 if(p.status.flameRise>now&&now>=(p.trailTick||0)){p.trailTick=now+250;const g=this.ground(p,p.x,p.z,p.y+1);if(g)this.effect(p,'blaze-trail',g,now,2000,{radius:1.4});}
 }}
 after(room,now,dt){for(const p of room.values())if(p.hp>0){if(p.extraBounce&&p.grounded){p.extraBounce=0;p.vy=10;p.grounded=false;p.noFall=true;p.motionSerial=(p.motionSerial||0)+1;this.event(p,'slime',p);}if(p.status.riptide>now)for(const t of this.c.targets(room))if(t.team!==p.team&&!p.riptideHits.includes(t.id)&&dist(p,t)<2.4&&this.h.visible({...p,y:p.y+1},{...t,y:t.y+1})){if(this.c.damage(room,t,p,32,now,{weapon:'Riptide',ability:true}))p.riptideHits.push(t.id);}}
 for(const e of this.h.effects){if(!e.extra||e.expires<=now)continue;const p=room.get(e.owner);if(!p||p.hp<=0)continue;
 if(['fire-spin','soul-flight','flame-rise','riptide','slime-split'].includes(e.kind))Object.assign(e,{x:p.x,y:p.y,z:p.z});
 if(e.kind==='trident-return'){const to={x:p.x,y:p.y+1.4,z:p.z},n=dist(e,to);if(n<.6||now+dt*1000>=e.expires){p.status.tridentOut=0;e.expires=now;}else {const s=Math.min(1,32*dt/n);for(const a of ['x','y','z'])e[a]+=(to[a]-e[a])*s;}continue;}
 if(e.kind==='wave'){const probe={...p,solids:this.h.solids(),x:e.x,y:e.y,z:e.z},delta={x:e.dx*10*dt,z:e.dz*10*dt},m=W.move(probe,delta);if(Math.hypot(m.x-delta.x,m.z-delta.z)>.001||Math.abs(probe.x)>30||Math.abs(probe.z)>30){e.expires=now;continue;}e.x=probe.x;e.z=probe.z;for(const t of this.c.targets(room))if(t.team!==p.team&&!e.hits.includes(t.id)&&dist(e,t)<3&&this.h.visible({...e,y:e.y+1},{...t,y:t.y+1})){if(this.c.damage(room,t,p,38,now,{weapon:'Tidal Wave',ability:true,ultimate:true})){e.hits.push(t.id);t.kx=e.dx*13*(t.juggernaut?.5:1);t.kz=e.dz*13*(t.juggernaut?.5:1);t.motionSerial=(t.motionSerial||0)+1;}}continue;}
 if(e.kind==='fang'&&!e.fired&&now>=e.detonateAt){e.fired=true;const g=this.ground(p,e.x,e.z,e.y+1);if(g&&Math.abs(g.y-e.y)<.2)for(const t of this.c.targets(room))if(t.team!==p.team&&!e.hits.includes(t.id)&&dist(e,t)<1.6&&this.h.visible({...e,y:e.y+.3},{...t,y:t.y+.7})&&this.c.damage(room,t,p,24,now,{weapon:'Fangs',ability:true,ultimate:e.ultimate,noKnock:true}))e.hits.push(t.id);this.event(p,'fang',e,1);continue;}
 if(e.kind==='fused-tnt'&&!e.fired&&now>=e.detonateAt){e.fired=true;this.blast(room,p,e,4,42,now,{knock:true,kind:'tnt'});continue;}
 if(['tnt-barrage','wither-barrage'].includes(e.kind)&&now>=e.detonateAt&&e.round<5){const angle=e.round*2.4,center={x:e.x+Math.sin(angle)*2.3,y:e.y+.1,z:e.z+Math.cos(angle)*2.3};e.round++;e.detonateAt=now+550;{const g=this.ground(p,center.x,center.z,center.y+8);if(g)this.c.projectiles.push({id:this.c.nextProjectile++,extra:true,owner:p.id,life:p.life,weapon:e.kind==='tnt-barrage'?'barrage-tnt':'barrage-skull',heroKind:e.kind==='tnt-barrage'?'barrage-tnt':'barrage-skull',x:g.x,y:g.y+7,z:g.z,vx:0,vy:-18,vz:0,damage:24,expires:now+1500});}continue;}
 if(now<e.nextTick)continue;e.nextTick=now+500;
 if(e.kind==='fire-spin'||e.kind==='blaze-trail')this.h.area(room,p,e,e.radius,e.kind==='fire-spin'?7:5,0,now,{kind:e.kind,fire:true});
 if(e.kind==='sticky')this.h.area(room,p,e,e.radius,0,0,now,{slow:800});
 }
 }
 tickUnit(room,u,owner,now,dt){if(!customUnits.has(u.kind))return false;const h=this.h;
 if(u.kind==='decoy'){W.step(u,{forward:true,yaw:u.yaw},dt);if(Math.abs(u.x)>30||Math.abs(u.z)>30||u.y<-15)u.hp=0;return true;}
 const targets=this.c.targets(room).filter(t=>t.team!==u.team&&!this.c.protected(t,now)&&dist(u,t)<14&&h.visible({...u,y:u.y+.7},{...t,y:t.y+.8})).sort((a,b)=>dist(u,a)-dist(u,b)),target=targets[0];
 if(u.kind==='blazerod'){const angle=now*.0015+u.orbitIndex*Math.PI/3,desired={x:owner.x+Math.cos(angle)*1.4,y:owner.y+1.5+Math.sin(angle*2)*.15,z:owner.z+Math.sin(angle)*1.4};W.move(u,{x:desired.x-u.x,y:desired.y-u.y,z:desired.z-u.z});u.yaw=angle;if(target&&now>=u.nextAttack){u.nextAttack=now+1800;this.fireAt(owner,u,target,now,7);}return true;}
 if(u.kind==='slime'&&u.expires-now<800){const n=dist(u,owner)||1,s=Math.min(1,16*dt/n);W.move(u,{x:(owner.x-u.x)*s,y:(owner.y-u.y)*s,z:(owner.z-u.z)*s});return true;}
 const goal=target||owner,dx=goal.x-u.x,dz=goal.z-u.z,n=Math.hypot(dx,dz)||1;u.yaw=Math.atan2(-dx,-dz);
 if(u.kind==='vex'){const dy=goal.y+.7-u.y,len=Math.hypot(dx,dy,dz)||1;if(dist(u,goal)>1.4)W.move(u,{x:dx/len*4*dt,y:dy/len*4*dt,z:dz/len*4*dt});}
 else W.step(u,{forward:Math.hypot(dx,dz)>(target?1.3:3),yaw:u.yaw,jump:u.grounded&&Math.hypot(dx,dz)>2},dt);
 if(target&&dist(u,target)<2&&now>=u.nextAttack){u.nextAttack=now+950;this.c.damage(room,target,owner,u.kind==='vex'?9:8,now,{weapon:u.kind,ability:true,noKnock:true,ultimate:u.kind==='slime'});u.attackAt=now;}if(u.y<-15||Math.abs(u.x)>31||Math.abs(u.z)>31)u.hp=0;return true;
 }
 fireAt(owner,from,target,now,damage){const o={x:from.x,y:from.y+.25,z:from.z},d={x:target.x-o.x,y:target.y+(target.hitbox?.height??1.8)/2-o.y,z:target.z-o.z},n=Math.hypot(d.x,d.y,d.z)||1;this.c.projectiles.push({id:this.c.nextProjectile++,extra:true,owner:owner.id,life:owner.life,weapon:'blazefire',heroKind:'blazefire',x:o.x,y:o.y,z:o.z,vx:d.x/n*25,vy:d.y/n*25,vz:d.z/n*25,damage,expires:now+1500});}
}
module.exports={ExtraKits,customUnits};
