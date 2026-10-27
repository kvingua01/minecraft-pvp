const W=require('../shared/world'),C=require('../shared/combat');
class Units{
 constructor(combat){this.combat=combat;this.units=[];this.next=1;}
 clear(){this.units=[];}
 spawn(room,p,kinds,now,lifetime){if(this.units.filter(u=>u.hp>0&&u.expires>now).length+kinds.length>40)return false;const boxes=this.combat.heroes.boxes(),spots=[];
 for(let i=0;i<24&&spots.length<kinds.length;i++){const angle=i*2.399,dist=1.8+Math.floor(i/8),candidate={x:p.x+Math.cos(angle)*dist,y:p.y+.1,z:p.z+Math.sin(angle)*dist};if(C.inSpawn(candidate)||Math.abs(candidate.x)>30||Math.abs(candidate.z)>30)continue;if(boxes.some(b=>b.solid&&Math.abs(b.x-candidate.x)<b.w/2+.4&&Math.abs(b.z-candidate.z)<b.d/2+.4&&candidate.y<b.y+b.h/2&&candidate.y+1.7>b.y-b.h/2))continue;spots.push(candidate);}
 if(spots.length<kinds.length)return false;
 kinds.forEach((kind,i)=>{const hp={skeleton:45,zombie:120,turret:85,megaTurret:170,station:75,guardian:240,decoy:30,slime:38,vex:35,blazerod:30}[kind];this.units.push({id:'unit-'+this.next++,isUnit:true,kind,hero:p.hero,hitbox:({slime:{radius:.35,height:.65},vex:{radius:.22,height:1.05},blazerod:{radius:.12,height:.75},guardian:{radius:.83,height:3.4},turret:{radius:.43,height:1.2},megaTurret:{radius:.43,height:1.2},station:{radius:.43,height:1.3}})[kind],orbitIndex:i,owner:p.id,ownerLife:p.life,team:p.team,...spots[i],hp,maxHp:hp,armor:kind==='guardian'?.2:0,status:{},protectedUntil:0,vy:0,grounded:false,fallPeak:p.y,life:0,expires:now+lifetime,nextAttack:now+400+(kind==='blazerod'?i*120:0),yaw:(kind==='decoy'?p.yaw:0)+(kind==='decoy'&&kinds.length>1?i*Math.PI/2:0),pitch:0,connected:true,speedScale:.65,kx:0,kz:0});});return true;
 }
 tick(room,now,dt){this.units=this.units.filter(u=>u.hp>0&&u.expires>now&&room.get(u.owner)?.life===u.ownerLife&&room.get(u.owner)?.connected!==false&&room.get(u.owner)?.hp>0);const h=this.combat.heroes;
 for(const u of this.units){const owner=room.get(u.owner);if(!owner||owner.hp<=0)continue;u.solids=h.solids();u.map=owner.map;
 if(h.extra.tickUnit(room,u,owner,now,dt))continue;
 if(u.kind==='station'){if(now>=u.nextAttack){u.nextAttack=now+500;h.allies(room,u,6,t=>h.heal(t,owner,5,now));}continue;}
 if(u.kind==='guardian')h.allies(room,u,5,t=>t.status.guardian=now+750);
 const turret=['turret','megaTurret'].includes(u.kind),range=turret?16:14;
 const targets=this.combat.targets(room).filter(t=>t.team!==u.team&&!this.combat.protected(t,now)&&Math.hypot(t.x-u.x,t.z-u.z)<range).sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z));
 const target=targets[0];
 if(target){const dx=target.x-u.x,dz=target.z-u.z,dist=Math.hypot(dx,dz);u.yaw=Math.atan2(-dx,-dz);
 if(!turret&&dist>1.7){const before={x:u.x,z:u.z};if(u.stuck>12){u.detour=u.yaw+(Number(u.id.split('-')[1])%2?1:-1)*Math.PI/2;u.detourUntil=now+600;u.stuck=0;}W.step(u,{forward:true,yaw:u.detourUntil>now?u.detour:u.yaw,jump:u.stuck>8},dt);u.stuck=Math.hypot(u.x-before.x,u.z-before.z)<.005?(u.stuck||0)+1:0;}else if(!turret)W.step(u,{},dt);
 if(now>=u.nextAttack&&(turret||dist<2.1)&&h.visible({...u,y:u.y+1},{...target,y:target.y+1})){u.nextAttack=now+(turret?u.kind==='megaTurret'?1000:850:900);if(turret){const o={x:u.x,y:u.y+1.1,z:u.z},d={x:target.x-o.x,y:target.y+(target.hitbox?.height??1.8)/2-o.y,z:target.z-o.z},n=Math.hypot(d.x,d.y,d.z)||1;this.combat.projectiles.push({id:this.combat.nextProjectile++,owner:owner.id,life:owner.life,weapon:u.kind,x:o.x,y:o.y,z:o.z,vx:d.x/n*32,vy:d.y/n*32,vz:d.z/n*32,damage:u.kind==='megaTurret'?30:13,heroKind:u.kind==='megaTurret'?'explosive':null,expires:now+2000});}else this.combat.damage(room,target,owner,u.kind==='guardian'?26:u.kind==='zombie'?15:8,now,{weapon:u.kind,ability:true,noKnock:true});u.attackAt=now;}
 }else if(!turret){const dx=owner.x-u.x,dz=owner.z-u.z,dist=Math.hypot(dx,dz);W.step(u,{forward:dist>4,yaw:Math.atan2(-dx,-dz),jump:u.stuck>15},dt);}
 if(u.y<-15)u.hp=0;
 }
 }
 snapshot(){return this.units.map(u=>({id:u.id,kind:u.kind,hero:u.hero,owner:u.owner,team:u.team,x:u.x,y:u.y,z:u.z,yaw:u.yaw,hp:u.hp,maxHp:u.maxHp,attackAt:u.attackAt}));}
}
module.exports={Units};
