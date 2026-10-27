const Inventory=require('./inventory');
const W=require('../shared/world');
const C=require('../shared/combat');
class Combat {
  constructor(emit){this.emit=emit;this.projectiles=[];this.history=[];this.nextProjectile=1;}
  init(p,index,now){Object.assign(p,{spawnIndex:index,hp:C.maxHealth,maxHp:C.maxHealth,armor:C.armor,weapon:'sword',canShield:false,blocking:false,shieldUntil:0,nextAttack:0,drawAt:0,attackAt:0,attackSerial:0,deadUntil:0,protectedUntil:now+2000,kills:0,deaths:0,kx:0,kz:0,fallPeak:p.y,healingDone:0,objectiveTime:0});if(this.heroes)this.heroes.spawn(p,now);if(this.potions)this.potions.spawn(p,now);}
  targets(room){return [...room.values()].filter(p=>p.connected!==false).concat(this.heroes?.units?.units||[]);}
  protected(p,now){return p.hp<=0||p.protectedUntil>now||C.inSpawn(p);}
  select(p,key){if(p.hp<=0||!(this.heroes?require('../shared/heroes').loadout(p.hero):C.slots).includes(key)||key===p.weapon)return; if(p.itemSlots){const index=p.itemSlots.slice(0,9).findIndex(i=>i?.kind==='weapon'&&i.id===key);if(index<0)return;Inventory.select(p,index);}p.weapon=key;p.drawAt=0;p.blocking=false;/* Switching never resets cooldown. */}
  // Equipment shields are removed; old or forged block input has no effect.
  block(p){p.blocking=false;}
  windError(p,now){
    if(this.modes?.canAct(now)===false)return 'Wait until the round starts; the match may have ended.';
    if(p.inventoryOpen)return 'Close your inventory before throwing a wind charge.';
    if(p.connected===false)return 'Reconnect before throwing a wind charge.';
    if(this.inLobby)return 'The host must start the match first.';
    if(this.matchOver)return 'The match has ended.';
    if(p.hp<=0)return 'Wait until you respawn.';
    if(C.inSpawn(p))return 'Leave the spawn sanctuary to throw a wind charge.';
    if(p.protectedUntil>now)return 'Wait for spawn protection to end.';
    if(p.drinking)return 'Finish drinking before throwing a wind charge.';
    if(now<(p.windReady||0))return 'Wind charge is cooling down.';
    return null;
  }
  wind(p,now){
    if(this.windError(p,now))return false;
    const yaw=Number.isFinite(p.input?.yaw)?p.input.yaw:p.yaw,pitch=Number.isFinite(p.input?.pitch)?p.input.pitch:p.pitch,d=C.direction(yaw,pitch);
    p.windReady=now+3000;p.blocking=false;p.drawAt=0;
    this.projectiles.push({id:this.nextProjectile++,owner:p.id,life:p.life,weapon:'wind',x:p.x,y:p.y+1.3,z:p.z,vx:d.x*24,vy:d.y*24,vz:d.z*24,expires:now+2500,wind:true});
    this.emit('combat',{type:'wind-throw',source:p.id});return true;
  }
  windImpact(room,arrow,owner,now){
    const center={x:arrow.x-arrow.vx/24*.08,y:arrow.y-arrow.vy/24*.08+.08,z:arrow.z-arrow.vz/24*.08};
    if(owner.hp>0&&owner.life===arrow.life&&Math.hypot(owner.x-center.x,owner.y+.5-center.y,owner.z-center.z)<=4&&(!this.heroes||this.heroes.visible(center,{...owner,y:owner.y+.5}))){
      owner.vy=Math.max(owner.vy,14);owner.grounded=false;owner.noFall=true;owner.motionSerial=(owner.motionSerial||0)+1;
      const dx=owner.x-center.x,dz=owner.z-center.z,n=Math.hypot(dx,dz);if(n>.15){owner.kx=dx/n*5;owner.kz=dz/n*5;}
    }
    this.emit('combat',{type:'wind-burst',source:owner.id,...center});
  }
  damage(room,target,source,raw,now,options={}){
    if(this.modes?.canAct(now)===false)return false;
    if(options.fire&&target.status?.fireResistance>now)return false;
    if(this.inLobby||this.matchOver||(!options.void&&this.protected(target,now))||target===source||source?.team&&source.team===target.team)return false;
    if(source&&(target.connected===false||source.connected===false||this.protected(source,now)))return false;
    if(source&&target.status?.parry>now&&!options.ability&&!options.fall&&!!C.weapons[options.weapon]?.range){
      target.status.parry=0;this.emit('hero',{type:'parry',source:target.id,target:source.id});this.damage(room,source,target,25,now,{weapon:'Sword counter',ability:true,noKnock:true});return false;
    }
    if(source&&!options.ability&&!options.fall)raw*=source.damageScale||1;
    const amount=Math.min(target.hp,Math.round(raw*(options.fall?1:(1-target.armor)*(1-(target.resist||0)))));
    target.hp=Math.max(0,target.hp-amount);target.drawAt=0;if(target.status)target.status.vanish=0;
    if(source&&!options.noKnock){target.motionSerial=(target.motionSerial||0)+1;const dx=target.x-source.x,dz=target.z-source.z,n=Math.hypot(dx,dz)||1;const moving=source.input?.forward||source.input?.back||source.input?.left||source.input?.right;const sprinting=source.input?.sprint&&moving&&!['bow','crossbow'].includes(options.weapon);const power=sprinting?9:5;target.kx=dx/n*power*(source.knockScale||1);target.kz=dz/n*power*(source.knockScale||1);target.vy=Math.max(target.vy,2.7);target.grounded=false;}
    if(this.heroes&&source&&!options.ultimate)this.heroes.charge(source,amount*.15,now);
    this.emit('combat',{type:'hit',source:source?.id,target:target.id,amount,critical:!!options.critical,weapon:options.weapon});
    if(!target.hp&&target.isUnit){this.emit('hero',{type:'unit-destroyed',source:source?.id,target:target.id});return true;}
    if(!target.hp){target.status={};target.dash=null;target.slam=null;target.combo=null;target.extraBounce=0;target.flightLift=undefined;target.drinking=null;target.drawAt=0;target.deadUntil=now+C.respawnDelay;target.deaths++;target.ult=0;target.blocking=false;target.input={};target.jumpQueued=false;target.kx=target.kz=0;if(source)source.kills++;
      this.emit('combat',{type:'kill',source:source?.id,target:target.id,sourceName:source?.name||(options.fire?'Flames':'Gravity'),targetName:target.name,weapon:options.weapon||'fall'});
    }
    return true;
  }
  attack(room,p,kind,now,clientTime){
    if(kind==='wind')return this.wind(p,now);
    if(kind==='cancel'){p.drawAt=0;p.blocking=false;return true;}
    if(this.modes?.canAct(now)===false)return false;
    if(p.inventoryOpen||(p.itemSlots&&Inventory.held(p)?.kind!=='weapon')||this.inLobby||p.connected===false||this.matchOver||this.protected(p,now)||p.drinking||p.blocking||now<p.nextAttack)return false;
    const weapon=C.weapons[p.weapon];if(!weapon||p.weapon==='trident'&&p.status?.tridentOut>now)return false;
    if(Number.isFinite(p.input?.yaw))p.yaw=p.input.yaw;
    if(Number.isFinite(p.input?.pitch))p.pitch=p.input.pitch;
    if(weapon.charge&&kind==='draw'){if(!p.drawAt)p.drawAt=now;return true;}
    if(weapon.charge&&kind!=='release')return false;
    if(!weapon.charge&&kind!=='attack')return false;
    let charge=1;
    if(weapon.charge){if(!p.drawAt)return false;charge=Math.min(1,(now-p.drawAt)/weapon.charge);p.drawAt=0;if(charge<.15)return false;}
    p.nextAttack=now+weapon.cooldown/(p.attackSpeed||1);if(p.status)p.status.vanish=0;p.attackAt=now;p.attackSerial++;
    const dir=C.direction(p.yaw,p.pitch),origin={x:p.x,y:p.y+1.62,z:p.z};
    this.emit('combat',{type:'attack',source:p.id,weapon:p.weapon,serial:p.attackSerial});
    if(this.heroes&&(['launcher','staff'].includes(p.weapon)||weapon.projectile)){this.heroes.projectile(p,weapon.projectile||(p.weapon==='launcher'?'potion':'frost'),weapon.damage*(weapon.charge ? .25+.75*charge : 1),now);return true;}
    if(['bow','crossbow'].includes(p.weapon)){
      const speed=p.weapon==='bow'?25+charge*30:65;
      this.projectiles.push({id:this.nextProjectile++,owner:p.id,life:p.life,weapon:p.weapon,x:origin.x,y:origin.y,z:origin.z,vx:dir.x*speed,vy:dir.y*speed,vz:dir.z*speed,damage:p.weapon==='bow'?8+24*charge:weapon.damage,expires:now+3500});return true;
    }
    // Bounded rewind: only authoritative pose history, at most 150ms old.
    const time=Number.isFinite(clientTime)?Math.max(now-150,Math.min(now,clientTime)):now;
    const past=[...this.history].reverse().find(h=>h.time<=time&&h.time>=now-150);
    const remembered=past?.poses.get(p.id),attackPose=remembered?.life===p.life?remembered:p;
    const from={x:attackPose.x,y:attackPose.y+1.62,z:attackPose.z};
    let nearest=C.wallDistance(from,dir,weapon.range,(this.heroes?this.heroes.boxes():W.boxes)),victim=null;
    for(const t of this.targets(room))if(t!==p&&(!p.team||t.team!==p.team)&&!this.protected(t,now)){
      const pose=past?.poses.get(t.id)||t;
      // Never rewind a player across a death/respawn generation.
      const currentPose=pose.life===t.life?pose:t;
      const distance=C.playerDistance(from,dir,currentPose,nearest,.12);
      if(distance!==null&&distance<nearest){nearest=distance;victim=t;}
    }
    if(victim){const fall=Math.max(0,(attackPose.fallPeak??p.fallPeak)-attackPose.y),critical=!(attackPose.grounded??p.grounded)&&(attackPose.vy??p.vy)<-1;
      let damage=weapon.damage*(critical?1.5:1);if(p.weapon==='mace'&&critical)damage+=fall*weapon.fallDamagePerBlock;
      const hit=this.damage(room,victim,p,damage,now,{weapon:p.weapon,critical,origin:from});
      if(hit&&p.weapon==='mace'&&critical){p.noFall=true;p.fallPeak=p.y;}
    }
    return true;
  }
  tick(room,now,dt){
    if(this.matchOver||this.inLobby||this.modes?.canAct(now)===false)return;
    if(this.potions)this.potions.before(room,now);
    if(this.heroes)this.heroes.before(room,now);
    for(const p of room.values()){
      if(p.hp<=0){if(this.modes?.noRespawn)continue;if(now>=p.deadUntil){Object.assign(p,W.spawn(p.spawnIndex),{hp:C.maxHealth,deadUntil:0,protectedUntil:now+2000,blocking:false,drawAt:0,kx:0,kz:0,fallPeak:.61});p.life++;this.modes?.beforeRespawn(p,room,now);if(this.heroes)this.heroes.spawn(p,now);if(this.potions)this.potions.spawn(p,now);this.modes?.afterRespawn(p);this.emit('combat',{type:'respawn',target:p.id});}continue;}
      const before=p.y;const fallingPeak=Math.max(p.fallPeak,p.y);
      const input=!p.inventoryOpen&&now-p.lastInput<300?p.input:{};if(now-p.lastInput>=300)p.jumpQueued=false;
      if(!input.block)p.blocking=false;
      this.block(p,input.block,now);
      const movement=p.blocking?{...input,sprint:false}:input;
      W.step(p,movement,dt);if(p.voided){p.voided=false;this.damage(room,p,null,100000,now,{fall:true,void:true,weapon:'Void'});}p.fallPeak=Math.max(fallingPeak,p.y);
      if(p.grounded){const fall=p.fallPeak-p.y;if(fall>3.5&&!p.noFall)this.damage(room,p,null,(fall-3)*7,now,{fall:true});p.fallPeak=p.y;}
      if(p.y>before&&p.grounded)p.fallPeak=p.y;
    }
    const live=[];
    for(const arrow of this.projectiles){
      const owner=room.get(arrow.owner);if(!owner||owner.connected===false||owner.hp<=0||arrow.life!==undefined&&owner.life!==arrow.life||now>arrow.expires)continue;
      const displacement={x:arrow.vx*dt,y:arrow.vy*dt,z:arrow.vz*dt},length=Math.hypot(displacement.x,displacement.y,displacement.z);
      const dir={x:displacement.x/length,y:displacement.y/length,z:displacement.z/length};
      let nearest=C.wallDistance(arrow,dir,length,(this.heroes?this.heroes.boxes():W.boxes)),hit=null;
      for(const t of this.targets(room))if(t!==owner&&(!owner.team||t.team!==owner.team||['potion','nature'].includes(arrow.heroKind)||!!arrow.potionKind)&&t.hp>0){const d=C.playerDistance(arrow,dir,t,nearest);if(d!==null&&d<nearest){nearest=d;hit=t;}}
      if(hit||nearest<length){
        arrow.x+=dir.x*nearest;arrow.y+=dir.y*nearest;arrow.z+=dir.z*nearest;
        if(arrow.wind)this.windImpact(room,arrow,owner,now);
        else if(arrow.potionKind&&this.potions)this.potions.impact(room,arrow,owner,now);
        else if(arrow.heroKind&&this.heroes)this.heroes.impact(room,arrow,owner,hit,now);
        else if(hit)this.damage(room,hit,owner,arrow.damage,now,{weapon:arrow.weapon,origin:arrow});
        continue;
      }
      arrow.x+=displacement.x;arrow.y+=displacement.y;arrow.z+=displacement.z;arrow.vy-=9*dt;live.push(arrow);
    }
    this.projectiles=live;
    if(this.heroes)this.heroes.after(room,now,dt);
    this.history.push({time:now,poses:new Map([...room.values()].map(p=>[p.id,{x:p.x,y:p.y,z:p.z,life:p.life,vy:p.vy,grounded:p.grounded,fallPeak:p.fallPeak}]))});
    while(this.history.length&&this.history[0].time<now-200)this.history.shift();
  }
  snapshot(){return this.projectiles.map(a=>({id:a.id,x:a.x,y:a.y,z:a.z,vx:a.vx,vy:a.vy,vz:a.vz,kind:a.wind?'wind':a.potionKind?'flask:'+a.potionKind:a.heroKind}));}
}
module.exports={Combat};
