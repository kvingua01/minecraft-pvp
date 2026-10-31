const H=require('../shared/heroes'),W=require('../shared/world'),Maps=require('../shared/maps'),Inventory=require('./inventory');
// Kept on the server; unlocking authorizes all developer controls in this room only.
const DEV_CODE='bobabcd1234';
function unlock(socket,code){if(!socket.data.room)return {error:'Join a room first.'};if(typeof code!=='string'||code!==DEV_CODE)return {error:'Incorrect developer code.'};socket.data.devRoom=socket.data.room;return {ok:true};}
function changeKit(socket,room,match,combat,data,now=Date.now(),allowPlayers=false){
 if(!socket.data.room||socket.data.devRoom!==socket.data.room)return {error:'Enter the developer code first.'};
 const bot=typeof data?.id==='string'?room?.get(data.id):null;
 if(!bot||bot.connected===false||(!bot.isBot&&!allowPlayers)||!H.has(data?.hero))return {error:allowPlayers?'Choose a connected player in this room and a valid kit.':'Choose a bot in this room and a valid kit.'};
 if(match.winner)return {error:'Return to the lobby before changing kits.'};
 combat.heroes.specialized.cleanup(room,bot);combat.modes.extra.cleanOwner(room,bot);
 const boss=!!bot.juggernaut;bot.life++;Object.assign(bot,W.spawn(bot.spawnIndex),{pendingHero:data.hero,input:{},lastInput:0,drinking:null,deadUntil:0,nextAttack:now,protectedUntil:now+1000,fallPeak:.61,kx:0,kz:0});
 if(bot.uw){bot.uw.contributors.clear();bot.uw.capture={};}
 combat.heroes.spawn(bot,now);combat.potions.spawn(bot,now);if(match.mode==='duel_1v1')bot.duelKit=data.hero;
 if(boss)combat.modes.extra.assign(room,bot,now);
 for(const history of combat.history)history.poses.delete(bot.id);combat.bots.brains.delete(bot.id);
 combat.modes.notifyKit(bot);combat.modes.record(bot);return {ok:true};
}
function changeBotKit(...args){return changeKit(...args);}
function changePlayerKit(socket,room,match,combat,data,now=Date.now()){if(match.mode!=='upgrade_wars')return {error:'Human player kit changes are available only in Upgrade Wars.'};return changeKit(socket,room,match,combat,data,now,true);}
function setBotStrength(socket,match,combat,original){if(!socket.data.room||socket.data.devRoom!==socket.data.room)return {error:'Enter the developer code first.'};if(typeof original!=='boolean')return {error:'Choose normal or original bot strength.'};combat.bots.original=original;combat.bots.brains.clear();for(const bot of combat.modes.room?.values()||[])if(bot.isBot){bot.drawAt=0;bot.input={};}match.botDifficulty=original?'original':'normal';return {ok:true,botDifficulty:match.botDifficulty};}
function changeMap(socket,room,match,combat,id,now=Date.now()){
 if(!socket.data.room||socket.data.devRoom!==socket.data.room)return {error:'Enter the developer code first.'};
 if(!Maps.compatible(id,match.mode))return {error:'Choose a map compatible with this game mode.'};
 if(match.winner)return {error:'Return to the lobby before changing maps.'};
 const routes=require('./payload-routes'),r=match.mode==='payload_escort'?routes.route(id):null;
 if(r&&!r.available)return {error:r.reason};if(id===match.mapId)return {ok:true,map:id};
 const gm=combat.modes,cart=gm.extra.cart,scores={...match.scores},status=match.status;
 gm.clean();combat.healthPacks.clear();combat.bots.brains.clear();
 match.mapId=id;if(!Maps.payloadDefinitions[id])match.generalMap=id;match.locations=W.getMap(id).points;match.reset();match.scores=scores;match.status=status;combat.map=id;
 if(r&&cart){const progress=Math.max(0,Math.min(100,cart.progress)),distance=r.length*progress/100,checkpoints=(r.checkpoints||[]).map(cp=>({...cp,reachedAt:cp.distance<=distance?now:null}));gm.extra.cart={...routes.position(r,distance),distance,progress,status:'STOPPED',radius:3,contestRadius:3,path:r.points,length:r.length,route:r,checkpoints,checkpointIndex:checkpoints.filter(cp=>cp.reachedAt!==null).length};gm.extra.lastAt=now;}
 for(const p of room.values()){
  Inventory.close(p);Object.assign(p,W.spawn(p.spawnIndex),{map:id,life:p.life+1,motionSerial:(p.motionSerial||0)+1,input:{},lastInput:0,fallPeak:.61,noFall:true,voided:false,kx:0,kz:0,drawAt:0,blocking:false,drinking:null,status:{},dash:null,slam:null,combo:null,overhealth:0,overhealthUntil:0,overhealthOwner:null,flightLift:undefined,extraBounce:0,riptideHits:[],defenseOwners:{},resist:0,damageScale:1,attackSpeed:1,knockScale:1,speedScale:H.heroes[p.hero].speed});delete p.uwSlow;
  if(p.uw){p.uw.contributors.clear();p.uw.capture={};gm.upgrade.items.apply(p);}
 }
 if(gm.freeSpawn)for(const p of room.values())if(p.hp>0)gm.place(p,room,now);
 return {ok:true,map:id};
}
function setMoney(socket,room,match,data){
 if(!socket.data.room||socket.data.devRoom!==socket.data.room)return {error:'Enter the developer code first.'};
 if(match.mode!=='upgrade_wars'||match.winner)return {error:'Money can be changed only during an Upgrade Wars match.'};
 const p=typeof data?.id==='string'?room.get(data.id):null,amount=data?.amount;
 if(!p?.uw||p.connected===false)return {error:'Choose a connected player in this room with an active Upgrade Wars balance.'};
 if(typeof amount!=='number'||!Number.isFinite(amount)||amount<0||amount>1000000000||Math.abs(amount*100-Math.round(amount*100))>1e-6)return {error:'Enter an amount from $0 to $1,000,000,000 with at most two decimal places.'};
 p.uw.money=Math.round(amount*100)/100;return {ok:true,money:p.uw.money};
}
module.exports={unlock,changeBotKit,changePlayerKit,setBotStrength,changeMap,setMoney};
