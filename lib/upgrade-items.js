const Catalog=require('../shared/upgrade-items'),H=require('../shared/heroes');
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
class UpgradeItems{
 constructor(uw){this.uw=uw;this.c=uw.c;}
 has(p,id){return this.uw.active&&!!p?.uw?.items.includes(id);}
 state(p,id){return (p.uw.states??={})[id]??=(({}));}
 stats(p,now=Date.now()){
  const stats={hp:0,speed:0,damage:0,jump:0,attack:0,received:0,healing:0,cooldown:0,fall:0,knock:0,ult:0,resist:0,blast:0,outKnock:0,slowDuration:0,reach:0};
  if(!this.uw.active||!p?.uw)return stats;
  for(const id of p.uw.items)if(id){for(const [k,v]of Object.entries(Catalog.items[id].stats))stats[k]+=v;}
  for(const [id,bonus]of [['emergency-armor',.2],['void-armor',.25]])if(this.has(p,id)&&this.state(p,id).until>now)stats.resist+=bonus;
  for(const id of ['second-wind','hunters-instinct'])if(this.has(p,id)&&this.state(p,id).until>now)stats.speed+=.15;
  if(this.has(p,'adrenaline-rush')&&this.state(p,'adrenaline-rush').until>now)stats.attack+=.2;
  if(this.has(p,'time-warp')&&this.state(p,'time-warp').until>now)stats.speed+=.2;
  stats.resist=Math.min(Catalog.rules.resistCap,stats.resist);stats.ult=Math.min(Catalog.rules.ultCap,stats.ult);return stats;
 }
 apply(p,full=false){if(!this.uw.active||!p.uw)return;const stats=this.stats(p);p.maxHp=H.heroes[p.hero].health+stats.hp;p.hp=full?p.maxHp:Math.min(p.hp,p.maxHp);p.itemJumpScale=Math.sqrt(1+stats.jump);p.itemChargeScale=1+stats.attack;p.speedScale=H.heroes[p.hero].speed*(1+stats.speed);p.attackSpeed=1+stats.attack;}
 transaction(p,action,data,now){if(!p?.uw||p.connected===false||!this.uw.shopping(now))return {error:'The armory is open only during the 45-second shopping phase.'};
  if(action==='move'){const {from,to}=data||{};if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=6||to>=6)return {error:'Choose two valid item slots.'};[p.uw.items[from],p.uw.items[to]]=[p.uw.items[to],p.uw.items[from]];return {ok:true};}
  const id=data?.id,item=typeof id==='string'&&Object.hasOwn(Catalog.items,id)?Catalog.items[id]:null;if(!item)return {error:'Choose an official armory item.'};
  const index=p.uw.items.indexOf(id);if(action==='buy'){if(index>=0)return {error:'You already own this item.'};if(!p.uw.items.includes(null))return {error:'All six item slots are occupied.'};if(p.uw.money<item.price)return {error:'Not enough money.'};p.uw.money-=item.price;p.uw.items[p.uw.items.indexOf(null)]=id;}
  else if(action==='sell'){if(index<0)return {error:'You do not own this item.'};p.uw.items[index]=null;p.uw.money+=item.price;if(p.uw.states)delete p.uw.states[id];for(const t of this.uw.room.values())if(t.uwSlow?.owner===p&&t.uwSlow.id===id)delete t.uwSlow;}
  else return {error:'Unknown shop action.'};this.apply(p);return {ok:true};
 }
 healSelf(p,amount){if(p.hp<=0)return;p.hp=Math.min(p.maxHp,p.hp+amount*(1+this.stats(p).received));}
 elimination(p,now,target,options={}){if(!p?.uw)return;
  if(this.has(p,'chain-reaction')&&target&&!options.item){for(const t of this.uw.room.values())if(t!==p&&t.team!==p.team&&t.hp>0&&t.connected!==false&&distance(t,target)<=4&&this.c.heroes.visible({...target,y:target.y+1},{...t,y:t.y+1}))this.c.damage(this.uw.room,t,p,20,now,{weapon:'Chain Reaction',item:true,ability:true,noKnock:true});this.c.heroes.specialized.effect(p,'item-chain',target,now,500,{radius:4,color:0xf9b967});}
  if(p.hp<=0)return;if(this.has(p,'adrenaline-rush'))this.state(p,'adrenaline-rush').until=now+4000;if(this.has(p,'vampire-fang'))this.healSelf(p,8);if(this.has(p,'second-wind')){this.healSelf(p,20);this.state(p,'second-wind').until=now+3000;}}
 modifyRaw(p,raw,now,options,target){if(!p?.uw)return raw;const stats=this.stats(p,now);if(options.primaryWeapon&&!options.item){let bonus=stats.damage;if(this.has(p,'executioners-blade')&&target&&target.hp<target.maxHp*.3)bonus+=.15;if(this.has(p,'overcharge')&&this.state(p,'overcharge').until>now)bonus+=.15;raw*=1+bonus;}if(!options.item&&this.has(p,'berserkers-fury')&&p.hp<p.maxHp*.4)raw*=1.2;return raw;}
 survive(p,now){if(!this.has(p,'phoenix-heart')||p.uw.phoenixUsed)return false;p.uw.phoenixUsed=true;p.hp=Math.min(20,p.maxHp);p.protectedUntil=Math.max(p.protectedUntil||0,now+1000);this.c.emit('upgrade',{type:'phoenix',target:p.id});this.c.heroes.specialized.effect(p,'item-phoenix',p,now,1000,{radius:1.5,color:0xffbb65,follow:true});return true;}
 taken(p,source,amount,before,now){if(!p?.uw)return;if(source&&source!==p&&source.team!==p.team&&amount>0)p.uw.lastEnemyDamage=now;if(amount<=0)return;
  if(this.has(p,'emergency-armor')&&p.hp>0&&before>=p.maxHp*.3&&p.hp<p.maxHp*.3){const s=this.state(p,'emergency-armor');if(now>=(s.next||0)){s.until=now+4000;s.next=now+30000;}}
  if(this.has(p,'void-armor')){const s=this.state(p,'void-armor');s.samples=(s.samples||[]).filter(e=>now-e.time<=2000);s.samples.push({time:now,amount});s.samples=s.samples.slice(-128);if(p.hp>0&&now>=(s.next||0)&&s.samples.reduce((n,e)=>n+e.amount,0)>=25){s.until=now+3000;s.next=now+20000;s.samples=[];}}
 }
 direct(room,target,source,amount,raw,now,options){if(!source?.uw||amount<=0||options.item||options.periodic||options.fall||target.isUnit)return;
  if(this.has(source,'gravity-core')){const s=this.state(source,'gravity-core');if(now>=(s.next||0)&&target.hp>0){s.next=now+6000;target.uwSlow={owner:source,id:'gravity-core',until:this.slowUntil(target,source,now,2000),factor:.85};}}
  if(this.has(source,'hunters-instinct')){const s=this.state(source,'hunters-instinct');if(now>=(s.next||0)){s.next=now+5000;s.until=now+2000;}}
  if(!options.primaryWeapon)return;
  const bonus=(t,damage)=>{if(t.hp>0)this.c.damage(room,t,source,damage,now,{weapon:'Item effect',item:true,ability:true,noKnock:true});};
  for(const [id,every]of [['thunder-stone',5],['frost-fang',4],['storm-bringer',4],['echo-strike',5]]){
   if(!this.has(source,id))continue;const s=this.state(source,id);s.hits=(s.hits||0)+1;if(s.hits%every!==0)continue;if(['thunder-stone','storm-bringer'].includes(id)){if(now<(s.next||0))continue;s.next=now+Catalog.rules.procMs;}
   if(id==='frost-fang'&&target.hp>0)target.uwSlow={owner:source,id,until:this.slowUntil(target,source,now,1500),factor:.8};
   if(id==='echo-strike')bonus(target,raw*.5);
   if(id==='thunder-stone'||id==='storm-bringer'){const nearby=[...room.values()].filter(t=>t!==source&&t.team!==source.team&&t.hp>0&&t.connected!==false&&(id!=='thunder-stone'||t!==target)&&distance(t,target)<=(id==='thunder-stone'?5:4)&&this.c.heroes.visible({...target,y:target.y+1},{...t,y:t.y+1}));for(const t of id==='thunder-stone'?nearby.slice(0,1):nearby)bonus(t,id==='thunder-stone'?8:12);this.c.emit('upgrade',{type:'lightning',source:source.id,x:target.x,y:target.y,z:target.z});this.c.heroes.specialized.effect(source,'item-lightning',target,now,350,{radius:2,color:0xaee8ff});}
  }
 }
 // New passives use actual HP damage and explicit source classification; item damage cannot re-enter.
 afterDamage(room,target,source,amount,now,options){
  if(!this.uw.active||!source?.uw||source===target||source.team===target.team||amount<=0||options.item||options.periodic||options.fall||target.isUnit)return;
  if(options.primaryWeapon&&this.has(source,'blood-pact'))this.healSelf(source,amount*.12);
  if(this.has(target,'reflective-shield')){const s=this.state(target,'reflective-shield');if(now>=(s.next||0)){s.next=now+1000;this.c.damage(room,source,target,Math.min(10,amount*.1),now,{weapon:'Reflective Shield',item:true,ability:true,noKnock:true});}}
 }
 healed(target,source,amount,now){if(amount<=0||target===source||target.team!==source.team||target.isUnit||target.connected===false||source.connected===false||!this.has(source,'combat-medic'))return;const s=this.state(source,'combat-medic');if(now>=(s.next||0)){s.next=now+5000;this.healSelf(source,5);}}
 ability(p,key,now){if(!this.uw.active||!p.uw)return;if(key==='r'){if(this.has(p,'overcharge'))this.state(p,'overcharge').until=now+6000;}else if(this.has(p,'time-warp')){const s=this.state(p,'time-warp');if(now>=(s.next||0)){s.next=now+10000;s.until=now+3000;}}}
 slowUntil(target,source,now,duration){return now+duration*(source&&source!==target&&source.team!==target.team?1-this.stats(target,now).slowDuration:1);}
 tick(p,now){if(!p.uw||p.hp<=0||p.connected===false)return;for(const [id,wait,hp]of [['vitality-seed',6000,1],['recovery-gem',5000,3]])if(this.has(p,id)){const s=this.state(p,id);if(now-(p.uw.lastEnemyDamage??now)<wait){s.next=(p.uw.lastEnemyDamage??now)+wait;continue;}if(now>=(s.next||0)){s.next=now+1000;this.healSelf(p,hp);}}}
 slow(p,now){const e=p.uwSlow;return e&&e.until>now&&this.has(e.owner,e.id)?e.factor:1;}
 radius(p,r){return r*(1+this.stats(p).blast);}
}
module.exports={UpgradeItems};
