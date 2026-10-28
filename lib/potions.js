const Inventory=require('./inventory');
const P=require('../shared/potions'),C=require('../shared/combat'),W=require('../shared/world');
class Potions {
 constructor(combat){this.combat=combat;}
 spawn(p,now){p.inventory=Object.fromEntries(P.keys.map(k=>[k,P.items[k].charges]));p.selectedPotion=P.has(p.selectedPotion)?p.selectedPotion:'healing';p.potionReady=now;p.drinking=null;p.potionAt=0;p.potionKind=null;p.regenTick=0;p.fireTick=0;Inventory.reset(p);}
 select(p,id){if(!P.has(id))return {error:'Choose one of the seven potions.'};p.selectedPotion=id;return {ok:true};}
 use(room,p,now){
  if(this.combat.modes?.canAct(now)===false)return {error:'Wait for the round countdown to finish.'};
  if(p.inventoryOpen||this.combat.inLobby)return {error:'Close your inventory and start the match before using a potion.'};
  if(p.connected===false||p.hp<=0||this.combat.matchOver)return {error:'Stay alive and connected to use a potion.'};
  const id=p.selectedPotion,item=P.items[id];
  if(!item||!p.inventory?.[id])return {error:'No charges left. Potions refill on respawn.'};
  if(now<p.potionReady||p.drinking)return {error:'Potions are cooling down.'};
  if(item.splash&&this.combat.protected(p,now))return {error:'Leave the spawn sanctuary before throwing a splash potion.'};
  if(id==='healing'&&p.hp>=p.maxHp)return {error:'Your health is already full.'};
  p.inventory[id]--;Inventory.consume(p,id);p.potionReady=now+P.cooldown;p.potionAt=now;p.potionKind=id;p.drawAt=0;p.blocking=false;p.status.vanish=0;
  p.nextAttack=Math.max(p.nextAttack,now+(item.splash?400:P.drinkTime));
  if(item.splash){
   if(Number.isFinite(p.input?.yaw))p.yaw=p.input.yaw;if(Number.isFinite(p.input?.pitch))p.pitch=p.input.pitch;
   const d=C.direction(p.yaw,p.pitch),speed=19;
   this.combat.projectiles.push({id:this.combat.nextProjectile++,owner:p.id,life:p.life,potionKind:id,weapon:item.name,x:p.x,y:p.y+1.45,z:p.z,vx:d.x*speed,vy:d.y*speed+2,vz:d.z*speed,damage:0,expires:now+3500});
  }else p.drinking={id,ends:now+P.drinkTime,life:p.life};
  this.combat.emit('potion',{type:'use',source:p.id,kind:id,x:p.x,y:p.y,z:p.z});return {ok:true};
 }
 impact(room,arrow,owner,now){
  if(this.combat.matchOver||owner.connected===false||this.combat.protected(owner,now))return;
  const life=owner.life,n=Math.hypot(arrow.vx,arrow.vy,arrow.vz)||1,center={x:arrow.x-arrow.vx/n*.08,y:arrow.y-arrow.vy/n*.08+.05,z:arrow.z-arrow.vz/n*.08};
  for(const t of room.values())if(t.team!==owner.team&&t.hp>0&&!this.combat.protected(t,now)&&Math.hypot(center.x-t.x,center.y-t.y,center.z-t.z)<=3.5&&this.combat.heroes.visible({...center,y:center.y+.5},{...t,y:t.y+1})){
   if(arrow.potionKind==='damage')this.combat.damage(room,t,owner,30,now,{weapon:'Damage splash',ability:true,noKnock:true,unblockable:true});
   else if(arrow.potionKind==='slowness')t.status.slowPotion=now+P.items.slowness.duration;
  }
  if(owner.life!==life)return;
  const h=this.combat.heroes;h.effects.push({id:h.nextId++,owner:owner.id,life:owner.life,team:owner.team,kind:'splash',potionKind:arrow.potionKind,...center,radius:3.5,expires:now+600});
  this.combat.emit('potion',{type:'splash',source:owner.id,kind:arrow.potionKind,...center});
 }
 before(room,now){
  for(const p of room.values()){
   if(!p.inventory||!p.status)continue;
   if(p.drinking){const drink=p.drinking;
    if(p.hp<=0||p.life!==drink.life||p.connected===false)p.drinking=null;
    else if(now>=drink.ends){
     p.drinking=null;
     if(drink.id==='healing')this.combat.heroes.heal(p,p,40,now);
     else p.status[drink.id]=now+P.items[drink.id].duration;
     if(drink.id==='regeneration')p.regenTick=now+1000;
     this.combat.emit('potion',{type:'drink',source:p.id,kind:drink.id,x:p.x,y:p.y,z:p.z});
    }
   }
   // Passive effects keep ticking on the reserved body during reconnection.
   if(p.hp<=0)continue;
   if(p.regenTick&&p.regenTick<=p.status.regeneration&&now>=p.regenTick){this.combat.heroes.heal(p,p,5,now);p.regenTick+=1000;}
   if(p.status.fireResistance>now){p.status.burning=0;continue;}
   const inFlame=W.getMap(p.map).hazards.some(h=>p.y<h.y+(h.height||1.3)&&p.y>=h.y-.2&&(h.w?Math.abs(p.x-h.x)<h.w/2&&Math.abs(p.z-h.z)<h.d/2:Math.hypot(p.x-h.x,p.z-h.z)<h.radius));
   if(inFlame){p.status.burning=now+3000;p.burnOwner=null;}
   if(p.status.burning>now&&now>=p.fireTick){p.fireTick=now+500;this.combat.damage(room,p,this.combat.modes?.extra.active?room.get(p.burnOwner)||null:null,5,now,{periodic:true,fire:true,unblockable:true,weapon:'Flames'});}
  }
 }
}
module.exports={Potions};
