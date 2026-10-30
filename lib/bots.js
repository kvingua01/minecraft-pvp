const W=require('../shared/world'),C=require('../shared/combat'),H=require('../shared/heroes'),Nav=require('./bot-navigation');
class BalanceBots{
 constructor(combat,random=Math.random){this.combat=combat;this.random=random;this.kits=[];this.next=1;this.brains=new Map();this.abilities=new (require('./bot-abilities').BotAbilities)(combat);}
 chooseKit(){if(!this.kits.length)this.kits=Object.keys(H.heroes);return this.kits.splice(Math.floor(this.random()*this.kits.length),1)[0];}
 remove(room,bot){if(this.combat.modes?.match.phase==='playing'){if(bot.juggernaut)this.combat.modes.extra.accrue(room,Date.now());bot.connected=false;this.combat.modes.disconnected(room,bot);}room.delete(bot.id);this.brains.delete(bot.id);this.combat.projectiles=this.combat.projectiles.filter(p=>p.owner!==bot.id);this.combat.heroes.effects=this.combat.heroes.effects.filter(e=>e.owner!==bot.id);this.combat.heroes.units.units=this.combat.heroes.units.units.filter(u=>u.owner!==bot.id);for(const h of this.combat.history)h.poses.delete(bot.id);}
 create(room,match,team,now,manualBot=false){
 const used=new Set([...room.values()].map(p=>p.spawnIndex));let index=team==='red'?1:0;while(used.has(index))index+=2;
 const n=this.next++,hero=this.chooseKit(),bot={id:'bot-'+n,name:'Bot '+H.heroes[hero].name+' '+n,isBot:true,manualBot,duelReady:true,mode:match.mode||'normal_ctf',classLocked:match.mode==='random_kit'&&match.phase==='playing',hero,team,connected:true,map:match.mapId,life:0,input:{},lastInput:0,...W.spawn(index)};
 this.combat.init(bot,index,now);room.set(bot.id,bot);return bot;
 }
 add(room,match,requested,now){
 const limit=match.mode==='duel_1v1'?2:10;if(room.size>=limit)return {error:match.mode==='duel_1v1'?'Duels allow exactly two players, including bots.':'The room is full (10 players including bots).'};
 const teams=match.modes?match.modes.teams:!['ffa','duel_1v1','kit_ladder','juggernaut'].includes(match.mode);
 const counts={red:0,blue:0};for(const p of room.values())if(counts[p.team]!==undefined)counts[p.team]++;
 const team=teams&&['red','blue'].includes(requested)?requested:counts.red<=counts.blue?'red':'blue';if(teams&&counts[team]>=5)return {error:'That team is full. Choose the other team.'};
 const bot=this.create(room,match,team,now,true);match.modes?.join(room,bot,now);this.reconcile(room,match,now);return {ok:true,id:bot.id};
 }
 reserveSeat(room,team){const bots=[...room.values()].filter(p=>p.isBot).sort((a,b)=>Number(a.manualBot)-Number(b.manualBot)),fullTeam=[...room.values()].filter(p=>p.team===team).length>=5;const bot=bots.find(p=>p.team===team&&(!p.manualBot||fullTeam||room.size>=10))||(room.size>=10?bots[0]:null);if(bot)this.remove(room,bot);}
 reconcile(room,match,now){
 const capture=['normal_ctf','random_kit'].includes(match.mode||'normal_ctf'),teams=match.modes?match.modes.teams:!['ffa','duel_1v1','kit_ladder','juggernaut'].includes(match.mode);
 // Explicitly added bots survive balancing toggles and mode changes.
 for(const p of [...room.values()])if(p.isBot&&!p.manualBot&&!capture)this.remove(room,p);
 const limit=match.mode==='duel_1v1'?2:10;for(const p of [...room.values()].reverse())if(room.size>limit&&p.isBot)this.remove(room,p);
 const humans={red:0,blue:0},seats={red:0,blue:0},present={red:0,blue:0};for(const p of room.values())if(!p.isBot||p.manualBot){if(seats[p.team]!==undefined){seats[p.team]++;if(p.connected!==false){present[p.team]++;if(!p.isBot)humans[p.team]++;}}}
 const desired={red:0,blue:0};if(capture&&match.balanceBots){if(present.red<present.blue)desired.red=present.blue-present.red;if(present.blue<present.red)desired.blue=present.red-present.blue;}
 for(const team of ['red','blue']){desired[team]=Math.min(desired[team],Math.max(0,5-seats[team]));let existing=[...room.values()].filter(p=>p.isBot&&!p.manualBot&&p.team===team);while(existing.length>desired[team])this.remove(room,existing.pop());while(existing.length<desired[team]&&room.size<10)existing.push(this.create(room,match,team,now));}
 match.humanCounts=humans;match.botCounts={red:[...room.values()].filter(p=>p.isBot&&p.team==='red').length,blue:[...room.values()].filter(p=>p.isBot&&p.team==='blue').length};match.manualBotCount=[...room.values()].filter(p=>p.isBot&&p.manualBot).length;match.totalBotCount=[...room.values()].filter(p=>p.isBot).length;
 }
 tick(room,match,now){if(this.combat.inLobby||this.combat.matchOver||this.combat.modes?.canAct(now)===false||match.winner||![...room.values()].some(p=>!p.isBot&&p.connected!==false))return;
 for(const bot of room.values())if(bot.isBot){if(bot.hp<=0)continue;let brain=this.brains.get(bot.id);if(!brain||brain.life!==bot.life||brain.map!==bot.map){brain={life:bot.life,map:bot.map,nextThink:0,nextAbility:now+500,path:[],last:{x:bot.x,z:bot.z},stuck:0};this.brains.set(bot.id,brain);}
  const candidates=this.combat.targets(room).filter(p=>p.team!==bot.team&&!this.combat.protected(p,now)&&Math.hypot(p.x-bot.x,p.z-bot.z)<18).sort((a,b)=>Math.hypot(a.x-bot.x,a.z-bot.z)-Math.hypot(b.x-bot.x,b.z-bot.z));const enemy=candidates.find(p=>this.combat.heroes.visible({...bot,y:bot.y+1.4},{...p,y:p.y+1}));const distance=enemy?Math.hypot(enemy.x-bot.x,enemy.z-bot.z):Infinity;
  const point=this.combat.modes?.capture===false?(match.mode==='payload_escort'?{...match.modes.extra.cart,radius:3}:[...room.values()].filter(p=>p!==bot&&p.team!==bot.team&&p.hp>0&&p.connected!==false).sort((a,b)=>Math.hypot(bot.x-a.x,bot.z-a.z)-Math.hypot(bot.x-b.x,bot.z-b.z))[0]):[...match.points].sort((a,b)=>{const priority=p=>(p.control===bot.team?30:0)+Math.hypot(bot.x-p.x,bot.z-p.z)+Math.abs(bot.y-p.y);return priority(a)-priority(b);})[0],goal=match.mode==='payload_escort'?point:enemy&&distance<10&&!C.inSpawn(bot)?enemy:point;if(!goal)continue;
  const kit=H.heroes[bot.hero],melee=kit.specialized?kit.weapon:C.weapons[kit.weapon].range?kit.weapon:kit.melee,ranged=kit.specialized?(kit.ranged||kit.weapon):C.weapons[kit.weapon].range?kit.ranged:kit.weapon;
  const ready=!this.combat.protected(bot,now),canMelee=ready&&enemy&&distance<(C.weapons[melee]?.range||0)-.2&&Math.abs(enemy.y-bot.y)<1.8,canShoot=ready&&enemy&&!canMelee&&distance<=16&&(!kit.specialized||kit.healer||!C.weapons[kit.weapon].range);
  if(now>=brain.nextThink){const travelled=Math.hypot(bot.x-brain.last.x,bot.z-brain.last.z);brain.stuck=brain.moving&&travelled<.08?brain.stuck+1:0;brain.last={x:bot.x,z:bot.z};brain.nextThink=now+700;brain.path=Nav.path(bot.map,bot,goal,bot.team,this.combat.heroes.solids());if(brain.stuck>1){brain.jumpUntil=now+350;brain.stuck=0;}}
  while(brain.path.length&&Math.hypot(bot.x-brain.path[0].x,bot.z-brain.path[0].z)<.26&&Math.abs(bot.y-brain.path[0].y)<.7)brain.path.shift();
  const waypoint=brain.path[0],onPoint=!!point.radius&&Math.hypot(bot.x-point.x,bot.z-point.z)<point.radius-1&&Math.abs(bot.y-point.y)<.5&&(!enemy||match.mode==='payload_escort');
  let forward=!onPoint&&!!waypoint&&(match.mode==='payload_escort'||!canMelee&&!canShoot),yaw=bot.yaw,pitch=0;
  if(forward){yaw=Math.atan2(bot.x-waypoint.x,bot.z-waypoint.z);pitch=0;}if(enemy&&(canMelee||canShoot)&&!(forward&&match.mode==='payload_escort')){yaw=Math.atan2(bot.x-enemy.x,bot.z-enemy.z);const dy=enemy.y+(enemy.hitbox?.height??1.8)/2-(bot.y+1.62),flight=distance/50;pitch=Math.atan2(dy+(canShoot?4.5*flight*flight:0),Math.max(.01,distance));}
  bot.input={forward,yaw,pitch:Math.max(-1.5,Math.min(1.5,pitch)),jump:forward&&bot.grounded&&(waypoint.y-bot.y>.6||brain.jumpUntil>now),sprint:false};bot.lastInput=now;brain.moving=forward;
  if(this.abilities.tick(room,bot,brain,enemy,now))continue;
  if(kit.healer&&ready){const ally=[...room.values()].find(t=>this.combat.heroes.specialized.allied(bot,t)&&t.hp<t.maxHp&&Math.hypot(t.x-bot.x,t.z-bot.z)<14&&this.combat.heroes.visible({...bot,y:bot.y+1},{...t,y:t.y+1}));if(ally){const original=bot.input;this.combat.select(bot,kit.weapon);bot.input={...original,...this.abilities.aim(bot,ally)};this.combat.attack(room,bot,'attack',now);bot.input=original;continue;}}
  if(enemy&&(canMelee||canShoot)){const movement=bot.input;if(forward&&match.mode==='payload_escort'){bot.input={...movement,...this.abilities.aim(bot,enemy)};}this.combat.select(bot,canMelee?melee:ranged);if(canShoot&&C.weapons[bot.weapon].charge){if(!bot.drawAt)this.combat.attack(room,bot,'draw',now);else if(now-bot.drawAt>=950)this.combat.attack(room,bot,'release',now);}else this.combat.attack(room,bot,'attack',now);bot.input=movement;}
  else if(bot.drawAt)this.combat.attack(room,bot,'cancel',now);
 }
 }
}
module.exports={BalanceBots};
