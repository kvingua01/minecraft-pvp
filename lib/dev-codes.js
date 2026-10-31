const H=require('../shared/heroes'),W=require('../shared/world');
// Kept on the server; unlocking authorizes kit changes in this room only.
const BOT_KIT_CODE='bobabcd1234';
function unlock(socket,code){if(!socket.data.room)return {error:'Join a room first.'};if(typeof code!=='string'||code!==BOT_KIT_CODE)return {error:'Incorrect developer code.'};socket.data.devRoom=socket.data.room;return {ok:true};}
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
module.exports={unlock,changeBotKit,changePlayerKit};
