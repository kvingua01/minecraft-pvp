const W=require('../shared/world'),C=require('../shared/combat'),H=require('../shared/heroes'),Nav=require('./bot-navigation');
class BalanceBots{
 constructor(combat,random=Math.random){this.combat=combat;this.random=random;this.kits=[];this.next=1;this.brains=new Map();this.abilities=new (require('./bot-abilities').BotAbilities)(combat);}
 chooseKit(){if(!this.kits.length)this.kits=Object.keys(H.heroes);return this.kits.splice(Math.floor(this.random()*this.kits.length),1)[0];}
 remove(room,bot){room.delete(bot.id);this.brains.delete(bot.id);this.combat.projectiles=this.combat.projectiles.filter(p=>p.owner!==bot.id);this.combat.heroes.effects=this.combat.heroes.effects.filter(e=>e.owner!==bot.id);this.combat.heroes.units.units=this.combat.heroes.units.units.filter(u=>u.owner!==bot.id);for(const h of this.combat.history)h.poses.delete(bot.id);}
 reserveSeat(room,team){const bot=[...room.values()].find(p=>p.isBot&&p.team===team);if(bot)this.remove(room,bot);}
 reconcile(room,match,now){if(!['normal_ctf','random_kit'].includes(match.mode||'normal_ctf')){for(const p of [...room.values()])if(p.isBot)this.remove(room,p);match.botCounts={red:0,blue:0};match.humanCounts={red:0,blue:0};return;}const humans={red:0,blue:0},seats={red:0,blue:0};for(const p of room.values())if(!p.isBot){seats[p.team]++;if(p.connected!==false)humans[p.team]++;}const desired={red:0,blue:0};if(match.balanceBots){if(humans.red<humans.blue)desired.red=humans.blue-humans.red;if(humans.blue<humans.red)desired.blue=humans.red-humans.blue;}
 for(const team of ['red','blue']){desired[team]=Math.min(desired[team],5-seats[team]);let existing=[...room.values()].filter(p=>p.isBot&&p.team===team);while(existing.length>desired[team])this.remove(room,existing.pop());while(existing.length<desired[team]){const used=new Set([...room.values()].map(p=>p.spawnIndex));let index=team==='red'?1:0;while(used.has(index))index+=2;const n=this.next++,hero=this.chooseKit(),bot={id:'bot-'+n,name:'Bot '+H.heroes[hero].name+' '+n,isBot:true,mode:match.mode||'normal_ctf',classLocked:match.mode==='random_kit'&&match.phase==='playing',hero,team,connected:true,map:match.mapId,life:0,input:{},lastInput:0,...W.spawn(index)};this.combat.init(bot,index,now);room.set(bot.id,bot);existing.push(bot);}}
 match.humanCounts=humans;match.botCounts={red:[...room.values()].filter(p=>p.isBot&&p.team==='red').length,blue:[...room.values()].filter(p=>p.isBot&&p.team==='blue').length};
 }
 tick(room,match,now){if(this.combat.inLobby||this.combat.matchOver||match.winner||![...room.values()].some(p=>!p.isBot&&p.connected!==false))return;
 for(const bot of room.values())if(bot.isBot){if(bot.hp<=0)continue;let brain=this.brains.get(bot.id);if(!brain||brain.life!==bot.life||brain.map!==bot.map){brain={life:bot.life,map:bot.map,nextThink:0,nextAbility:now+500,path:[],last:{x:bot.x,z:bot.z},stuck:0};this.brains.set(bot.id,brain);}
  const candidates=this.combat.targets(room).filter(p=>p.team!==bot.team&&!this.combat.protected(p,now)&&Math.hypot(p.x-bot.x,p.z-bot.z)<18).sort((a,b)=>Math.hypot(a.x-bot.x,a.z-bot.z)-Math.hypot(b.x-bot.x,b.z-bot.z));const enemy=candidates.find(p=>this.combat.heroes.visible({...bot,y:bot.y+1.4},{...p,y:p.y+1}));const distance=enemy?Math.hypot(enemy.x-bot.x,enemy.z-bot.z):Infinity;
  const point=[...match.points].sort((a,b)=>{const priority=p=>(p.control===bot.team?30:0)+Math.hypot(bot.x-p.x,bot.z-p.z)+Math.abs(bot.y-p.y);return priority(a)-priority(b);})[0],goal=enemy&&distance<10&&!C.inSpawn(bot)?enemy:point;if(!goal)continue;
  const kit=H.heroes[bot.hero],melee=C.weapons[kit.weapon].range?kit.weapon:kit.melee,ranged=C.weapons[kit.weapon].range?kit.ranged:kit.weapon;
  const ready=!this.combat.protected(bot,now),canMelee=ready&&enemy&&distance<C.weapons[melee].range-.2&&Math.abs(enemy.y-bot.y)<1.8,canShoot=ready&&enemy&&!canMelee&&distance<=16;
  if(now>=brain.nextThink){const travelled=Math.hypot(bot.x-brain.last.x,bot.z-brain.last.z);brain.stuck=brain.moving&&travelled<.08?brain.stuck+1:0;brain.last={x:bot.x,z:bot.z};brain.nextThink=now+700;brain.path=Nav.path(bot.map,bot,goal,bot.team,this.combat.heroes.solids());if(brain.stuck>1){brain.jumpUntil=now+350;brain.stuck=0;}}
  while(brain.path.length&&Math.hypot(bot.x-brain.path[0].x,bot.z-brain.path[0].z)<.26&&Math.abs(bot.y-brain.path[0].y)<.7)brain.path.shift();
  const waypoint=brain.path[0],onPoint=!enemy&&Math.hypot(bot.x-point.x,bot.z-point.z)<point.radius-1&&Math.abs(bot.y-point.y)<.5;
  let forward=!canMelee&&!canShoot&&!onPoint&&!!waypoint,yaw=bot.yaw,pitch=0;
  if(forward){yaw=Math.atan2(bot.x-waypoint.x,bot.z-waypoint.z);pitch=0;}if(enemy&&(canMelee||canShoot)){yaw=Math.atan2(bot.x-enemy.x,bot.z-enemy.z);const dy=enemy.y+(enemy.hitbox?.height??1.8)/2-(bot.y+1.62),flight=distance/50;pitch=Math.atan2(dy+(canShoot?4.5*flight*flight:0),Math.max(.01,distance));}
  bot.input={forward,yaw,pitch:Math.max(-1.5,Math.min(1.5,pitch)),jump:forward&&bot.grounded&&(waypoint.y-bot.y>.6||brain.jumpUntil>now),sprint:false};bot.lastInput=now;brain.moving=forward;
  if(this.abilities.tick(room,bot,brain,enemy,now))continue;
  if(enemy&&(canMelee||canShoot)){this.combat.select(bot,canMelee?melee:ranged);if(canShoot&&C.weapons[bot.weapon].charge){if(!bot.drawAt)this.combat.attack(room,bot,'draw',now);else if(now-bot.drawAt>=950)this.combat.attack(room,bot,'release',now);}else this.combat.attack(room,bot,'attack',now);}
  else if(bot.drawAt)this.combat.attack(room,bot,'cancel',now);
 }
 }
}
module.exports={BalanceBots};
