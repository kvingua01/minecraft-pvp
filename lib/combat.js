const W=require('../shared/world');
const C=require('../shared/combat');
class Combat {
  constructor(emit){this.emit=emit;this.projectiles=[];this.history=[];this.nextProjectile=1;}
  init(p,index,now){Object.assign(p,{spawnIndex:index,hp:C.maxHealth,armor:C.armor,weapon:'sword',blocking:false,shieldUntil:0,nextAttack:0,drawAt:0,attackAt:0,attackSerial:0,deadUntil:0,protectedUntil:now+2000,kills:0,deaths:0,kx:0,kz:0,fallPeak:p.y});}
  protected(p,now){return p.hp<=0||p.protectedUntil>now||C.inSpawn(p);}
  select(p,key){if(p.hp<=0||!C.slots.includes(key)||key===p.weapon)return; p.weapon=key;p.drawAt=0;p.blocking=false;/* Switching never resets cooldown. */}
  block(p,on,now){p.blocking=!!on&&p.hp>0&&p.shieldUntil<=now&&['sword','axe','mace'].includes(p.weapon);if(p.blocking)p.drawAt=0;}
  damage(room,target,source,raw,now,options={}){
    if(this.matchOver||this.protected(target,now)||target===source||source?.team&&source.team===target.team)return false;
    if(source&&this.protected(source,now))return false;
    if(!options.fall&&target.blocking&&target.shieldUntil<=now&&C.shieldFaces(target,options.origin||source)){
      if(options.weapon==='axe'){target.shieldUntil=now+3000;target.blocking=false;}
      this.emit('combat',{type:'block',target:target.id,source:source?.id,disabled:options.weapon==='axe'});return false;
    }
    const amount=Math.min(target.hp,Math.round(raw*(options.fall?1:1-target.armor)));
    target.hp=Math.max(0,target.hp-amount);target.drawAt=0;
    if(source){const dx=target.x-source.x,dz=target.z-source.z,n=Math.hypot(dx,dz)||1;const moving=source.input?.forward||source.input?.back||source.input?.left||source.input?.right;const sprinting=source.input?.sprint&&moving&&!['bow','crossbow'].includes(options.weapon);const power=sprinting?9:5;target.kx=dx/n*power;target.kz=dz/n*power;target.vy=Math.max(target.vy,2.7);target.grounded=false;}
    this.emit('combat',{type:'hit',source:source?.id,target:target.id,amount,critical:!!options.critical,weapon:options.weapon});
    if(!target.hp){target.deadUntil=now+C.respawnDelay;target.deaths++;target.blocking=false;target.input={};target.kx=target.kz=0;if(source)source.kills++;
      this.emit('combat',{type:'kill',source:source?.id,target:target.id,sourceName:source?.name||'Gravity',targetName:target.name,weapon:options.weapon||'fall'});
    }
    return true;
  }
  attack(room,p,kind,now,clientTime){
    if(kind==='cancel'){p.drawAt=0;p.blocking=false;return true;}
    if(this.matchOver||this.protected(p,now)||p.blocking||now<p.nextAttack)return false;
    const weapon=C.weapons[p.weapon];if(!weapon)return false;
    if(Number.isFinite(p.input?.yaw))p.yaw=p.input.yaw;
    if(Number.isFinite(p.input?.pitch))p.pitch=p.input.pitch;
    if(p.weapon==='bow'&&kind==='draw'){if(!p.drawAt)p.drawAt=now;return true;}
    if(p.weapon==='bow'&&kind!=='release')return false;
    if(p.weapon!=='bow'&&kind!=='attack')return false;
    let charge=1;
    if(p.weapon==='bow'){if(!p.drawAt)return false;charge=Math.min(1,(now-p.drawAt)/weapon.charge);p.drawAt=0;if(charge<.15)return false;}
    p.nextAttack=now+weapon.cooldown;p.attackAt=now;p.attackSerial++;
    const dir=C.direction(p.yaw,p.pitch),origin={x:p.x,y:p.y+1.62,z:p.z};
    this.emit('combat',{type:'attack',source:p.id,weapon:p.weapon,serial:p.attackSerial});
    if(['bow','crossbow'].includes(p.weapon)){
      const speed=p.weapon==='bow'?25+charge*30:65;
      this.projectiles.push({id:this.nextProjectile++,owner:p.id,weapon:p.weapon,x:origin.x,y:origin.y,z:origin.z,vx:dir.x*speed,vy:dir.y*speed,vz:dir.z*speed,damage:p.weapon==='bow'?8+24*charge:weapon.damage,expires:now+3500});return true;
    }
    // Bounded rewind: only authoritative pose history, at most 150ms old.
    const time=Number.isFinite(clientTime)?Math.max(now-150,Math.min(now,clientTime)):now;
    const past=[...this.history].reverse().find(h=>h.time<=time&&h.time>=now-150);
    const attackPose=past?.poses.get(p.id)||p;
    const from={x:attackPose.x,y:attackPose.y+1.62,z:attackPose.z};
    let nearest=C.wallDistance(from,dir,weapon.range,W.boxes),victim=null;
    for(const t of room.values())if(t!==p&&(!p.team||t.team!==p.team)&&!this.protected(t,now)){
      const pose=past?.poses.get(t.id)||t;
      // Never rewind a player across a death/respawn generation.
      const currentPose=pose.life===t.life?pose:t;
      const distance=C.playerDistance(from,dir,currentPose,nearest,.12);
      if(distance!==null&&distance<nearest){nearest=distance;victim=t;}
    }
    if(victim){const fall=Math.max(0,p.fallPeak-p.y),critical=!p.grounded&&p.vy<-1;
      let damage=weapon.damage*(critical?1.5:1);if(p.weapon==='mace')damage+=Math.min(60,fall*7);
      this.damage(room,victim,p,damage,now,{weapon:p.weapon,critical,origin:from});
    }
    return true;
  }
  tick(room,now,dt){
    if(this.matchOver)return;
    for(const p of room.values()){
      if(p.hp<=0){if(now>=p.deadUntil){Object.assign(p,W.spawn(p.spawnIndex),{hp:C.maxHealth,deadUntil:0,protectedUntil:now+2000,blocking:false,drawAt:0,kx:0,kz:0,fallPeak:.61});p.life++;this.emit('combat',{type:'respawn',target:p.id});}continue;}
      const before=p.y;const fallingPeak=Math.max(p.fallPeak,p.y);
      const input=now-p.lastInput<300?p.input:{};
      if(!input.block)p.blocking=false;
      this.block(p,input.block,now);
      const movement=p.blocking?{...input,sprint:false}:input;
      W.step(p,movement,dt);p.fallPeak=Math.max(fallingPeak,p.y);
      if(p.grounded){const fall=p.fallPeak-p.y;if(fall>3.5)this.damage(room,p,null,(fall-3)*7,now,{fall:true});p.fallPeak=p.y;}
      if(p.y>before&&p.grounded)p.fallPeak=p.y;
    }
    const live=[];
    for(const arrow of this.projectiles){
      const owner=room.get(arrow.owner);if(!owner||now>arrow.expires)continue;
      const displacement={x:arrow.vx*dt,y:arrow.vy*dt,z:arrow.vz*dt},length=Math.hypot(displacement.x,displacement.y,displacement.z);
      const dir={x:displacement.x/length,y:displacement.y/length,z:displacement.z/length};
      let nearest=C.wallDistance(arrow,dir,length,W.boxes),hit=null;
      for(const t of room.values())if(t!==owner&&(!owner.team||t.team!==owner.team)&&t.hp>0){const d=C.playerDistance(arrow,dir,t,nearest);if(d!==null&&d<nearest){nearest=d;hit=t;}}
      if(hit){this.damage(room,hit,owner,arrow.damage,now,{weapon:arrow.weapon,origin:arrow});continue;}
      if(nearest<length)continue;
      arrow.x+=displacement.x;arrow.y+=displacement.y;arrow.z+=displacement.z;arrow.vy-=9*dt;live.push(arrow);
    }
    this.projectiles=live;
    this.history.push({time:now,poses:new Map([...room.values()].map(p=>[p.id,{x:p.x,y:p.y,z:p.z,life:p.life}]))});
    while(this.history.length&&this.history[0].time<now-200)this.history.shift();
  }
  snapshot(){return this.projectiles.map(a=>({id:a.id,x:a.x,y:a.y,z:a.z,vx:a.vx,vy:a.vy,vz:a.vz}));}
}
module.exports={Combat};
