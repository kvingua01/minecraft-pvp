const H=require('../shared/heroes'),Rules=require('../shared/modes'),{route}=require('./payload-routes');
const ids=new Set(['kit_ladder','payload_escort','juggernaut']);
class ExtendedModes{
 constructor(gm){this.gm=gm;this.c=gm.combat;this.clear();}
 get active(){return ids.has(this.gm.id);}
 clear(){if(this.room)for(const p of this.room.values()){this.unbuff(p);delete p.ladderIndex;delete p.ladderChangedAt;delete p.juggerTime;delete p.juggerKills;delete p.juggernaut;}this.order=[];this.cart=null;this.boss=null;this.lastAt=null;this.room=null;}
 unbuff(p){if(!p.juggernaut)return;p.juggernaut=false;p.maxHp=H.heroes[p.hero].health;p.hp=Math.min(p.hp,p.maxHp);}
 validate(room){if(this.gm.id==='payload_escort'&&!route(this.gm.match.mapId).available)return route(this.gm.match.mapId).reason;if(this.gm.id==='juggernaut'&&[...room.values()].filter(p=>p.connected!==false&&!p.isBot).length<2)return 'Juggernaut requires at least two connected players.';return null;}
 start(room,now){this.room=room;this.lastAt=now;const gm=this.gm;gm.match.status='active';
  if(gm.id==='kit_ladder'){
   this.order=Object.entries(H.heroes).filter(([,h])=>!h.disabled&&h.playable!==false&&h.weapon&&h.q&&h.e&&h.r).map(([id])=>id);
   for(let i=this.order.length-1;i>0;i--){const j=Math.floor(gm.random()*(i+1));[this.order[i],this.order[j]]=[this.order[j],this.order[i]];}
   for(const p of room.values()){p.ladderIndex=0;p.pendingHero=this.order[0];this.c.heroes.spawn(p,now);this.c.potions?.spawn(p,now);gm.place(p,room,now);gm.record(p);}
  }else if(gm.id==='payload_escort'){
   const r=route(gm.match.mapId);this.cart={...r.points[0],distance:0,progress:0,status:'STOPPED',radius:3,contestRadius:3,path:r.points,length:r.length};gm.endsAt=now+300000;
  }else {gm.endsAt=now+420000;for(const p of room.values()){p.juggerTime=0;p.juggerKills=0;gm.place(p,room,now);}this.assign(room,this.choose(room),now);}
 }
 choose(room,except){const pool=[...room.values()].filter(p=>p!==except&&p.connected!==false&&p.hp>0&&!p.isBot);return pool[Math.floor(this.gm.random()*pool.length)]||null;}
 factions(room){for(const p of room.values())p.team=p.juggernaut?'boss':'hunters';for(const u of this.c.heroes.units.units)u.team=room.get(u.owner)?.team||u.team;for(const e of this.c.heroes.effects)if(room.has(e.owner))e.team=room.get(e.owner).team;}
 assign(room,p,now){for(const t of room.values())this.unbuff(t);this.boss=p?.soloSide||null;if(p){p.juggernaut=true;p.maxHp=H.heroes[p.hero].health*3;p.hp=p.maxHp;this.c.emit('mode',{type:'juggernaut',target:p.id,name:p.name});}this.factions(room);for(const t of room.values())this.gm.record(t);}
 accrue(room,now){const stop=Math.min(now,this.gm.endsAt??now),elapsed=Math.max(0,stop-(this.lastAt??stop));const boss=[...room.values()].find(p=>p.soloSide===this.boss);if(boss&&boss.connected!==false&&boss.hp>0)boss.juggerTime=(boss.juggerTime||0)+elapsed;this.lastAt=stop;}
 cleanOwner(room,p){this.c.projectiles=this.c.projectiles.filter(e=>e.owner!==p.id);this.c.heroes.effects=this.c.heroes.effects.filter(e=>e.owner!==p.id);this.c.heroes.units.units=this.c.heroes.units.units.filter(e=>e.owner!==p.id);for(const t of room.values()){if(t.poisonOwner===p.id){t.status.poisoned=0;t.poisonOwner=null;}if(t.witherOwner===p.id){t.status.withered=0;t.witherOwner=null;}if(t.burnOwner===p.id){t.status.burning=0;t.burnOwner=null;}}}
 elimination(room,target,source,now){if(!this.active||this.gm.match.winner)return;
  if(this.gm.id==='kit_ladder'&&source&&source!==target&&room.get(source.id)===source&&source.connected!==false){
   source.ladderIndex++;this.gm.record(source);if(source.ladderIndex>=this.order.length){this.gm.finish([source.soloSide],'ladder');return;}
   const hp=source.hp;this.cleanOwner(room,source);source.life++;source.pendingHero=this.order[source.ladderIndex];this.c.heroes.spawn(source,now);source.hp=Math.min(hp,source.maxHp);source.nextAttack=now;source.drawAt=0;source.drinking=null;source.ladderChangedAt=now;this.c.potions?.spawn(source,now);source.motionSerial=(source.motionSerial||0)+1;this.gm.notifyKit(source);this.gm.record(source);
  }else if(this.gm.id==='juggernaut'&&target.soloSide===this.boss){
   // damage() records role time before marking the victim dead.
   const next=source&&source!==target&&source.connected!==false&&source.hp>0&&room.get(source.id)===source?source:this.choose(room,target);if(next===source)source.juggerKills=(source.juggerKills||0)+1;
   this.assign(room,next,now);
  }
 }
 disconnect(room,p,now){if(this.gm.id==='juggernaut'&&!this.gm.match.winner&&p.soloSide===this.boss){this.accrue(room,now);this.assign(room,this.choose(room,p),now);}this.gm.record({...p,connected:false});}
 beforeTick(room,now){if(!this.active)return;this.room=room;const gm=this.gm;
  if(gm.id==='juggernaut'){
   this.accrue(room,now);if(now>=gm.endsAt){for(const p of room.values())gm.record(p);const rows=gm.scoreboard(),best=rows[0];gm.finish(best?rows.filter(p=>p.juggerTime===best.juggerTime&&p.juggerKills===best.juggerKills).map(p=>p.side):[],'time');for(const p of room.values())this.unbuff(p);this.boss=null;return;}
   const current=[...room.values()].find(p=>p.soloSide===this.boss&&p.hp>0&&p.connected!==false);if(!current)this.assign(room,this.choose(room),now);else this.factions(room);
  }else if(gm.id==='payload_escort'){
   if(now>=gm.endsAt){this.finishTeam('blue','time');return;}
   const cart=this.cart;if(!cart)return;const elapsed=Math.min(.25,Math.max(0,(now-this.lastAt)/1000));this.lastAt=now;
   const nearby=team=>[...room.values()].filter(p=>p.connected!==false&&p.hp>0&&!p.isUnit&&p.team===team&&Math.abs(p.y-cart.y)<1.5&&Math.hypot(p.x-cart.x,p.z-cart.z)<=3&&this.c.heroes.visible({...cart,y:cart.y+.6},{...p,y:p.y+.8})).length;
   const attackers=nearby('red'),defenders=nearby('blue');cart.status=defenders?'CONTESTED':attackers?'MOVING':'STOPPED';
   if(cart.status==='MOVING'){
    const distance=Math.min(cart.length,cart.distance+elapsed*.55*(1+.2*Math.min(2,attackers-1))),index=Math.min(cart.path.length-2,Math.floor(distance)),fraction=distance-index,a=cart.path[index],b=cart.path[index+1];
    const next={x:a.x+(b.x-a.x)*fraction,y:0,z:a.z+(b.z-a.z)*fraction};
    // Temporary kit walls stop the objective too; they never move the route.
    const blocked=this.c.heroes.solids().some(w=>Math.abs(w.x-next.x)<w.w/2+.6&&Math.abs(w.z-next.z)<w.d/2+.6&&w.y-w.h/2<.95&&w.y+w.h/2>0);
    if(blocked)cart.status='STOPPED';else{Object.assign(cart,next,{distance,progress:distance/cart.length*100});if(distance>=cart.length)this.finishTeam('red','destination');}
   }
  }
 }
 finishTeam(team,reason){this.gm.match.winner=team;this.gm.match.status='finished';this.gm.reason=reason;this.c.matchOver=true;this.c.roundLocked=true;if(this.cart)this.cart.status='STOPPED';}
 afterTick(room){for(const p of room.values())this.gm.record(p);}
 beforeRespawn(p){if(this.gm.id==='kit_ladder')p.pendingHero=this.order[p.ladderIndex||0];}
 join(room,p,now){this.room=room;if(this.gm.id==='kit_ladder'){p.ladderIndex=0;p.pendingHero=this.order[0];this.c.heroes.spawn(p,now);this.c.potions?.spawn(p,now);this.gm.place(p,room,now);p.classLocked=true;}else if(this.gm.id==='juggernaut'){p.juggerTime=0;p.juggerKills=0;this.gm.place(p,room,now);this.factions(room);}this.gm.record(p);}
 snapshot(){if(!this.active)return {};const state={};if(this.gm.id==='kit_ladder')state.ladderOrder=[...this.order];if(this.gm.id==='payload_escort'){const r=route(this.gm.match.mapId);state.payloadAvailability={available:r.available,reason:r.reason};state.payloadUnavailableMaps={end:'Raised bridges and void gaps leave no continuous level minecart route.'};state.payload=this.cart?{x:this.cart.x,y:this.cart.y,z:this.cart.z,progress:this.cart.progress,status:this.cart.status,radius:3,path:this.cart.path.map(p=>({...p}))}:null;}if(this.gm.id==='juggernaut')state.juggernautSide=this.boss;return state;}
}
module.exports={ExtendedModes};
