const W=require('../shared/world');
const RULES={shopMs:45000,roundGoal:150,wins:2,startMoney:1000,assistMs:10000,captureMs:1000};
class UpgradeWars{
 constructor(gm){this.gm=gm;this.c=gm.combat;this.room=null;this.phase='idle';this.round=0;this.wins={red:0,blue:0};this.shopEndsAt=0;this.lastResult=null;}
 get active(){return this.gm.id==='upgrade_wars';}
 canAct(){return this.phase==='combat'&&!this.gm.match.winner;}
 clear(){if(this.room)for(const p of this.room.values()){delete p.uw;p.roundLocked=false;p.classLocked=false;}this.room=null;this.phase='idle';this.round=0;this.wins={red:0,blue:0};this.lastResult=null;}
 join(room,p,now){this.room=room;if(!p.uw)p.uw={money:RULES.startMoney,items:Array(6).fill(null),ready:!!p.isBot,healed:0,prevented:0,contributors:new Map(),phoenixUsed:false};p.classLocked=true;for(const t of room.values())t.roundLocked=this.phase!=='combat';}
 start(room,now){this.room=room;this.round=0;this.wins={red:0,blue:0};for(const p of room.values())this.join(room,p,now);this.openShop(now);}
 openShop(now){this.round++;this.phase='shopping';this.shopEndsAt=now+RULES.shopMs;this.gm.match.reset();this.gm.match.status='shopping';this.gm.clean();this.c.matchOver=false;this.c.roundLocked=true;
 for(const p of this.room.values()){const stats={kills:p.kills,deaths:p.deaths,healingDone:p.healingDone,objectiveTime:p.objectiveTime};Object.assign(p,W.spawn(p.spawnIndex),{life:p.life+1,input:{},lastInput:0,pendingHero:p.hero});this.c.init(p,p.spawnIndex,now);Object.assign(p,stats);p.classLocked=true;p.roundLocked=true;p.uw.ready=!!p.isBot;p.uw.phoenixUsed=false;p.uw.contributors.clear();p.uw.capture={};}}
 shopping(now){return this.active&&this.phase==='shopping'&&now<this.shopEndsAt&&!this.gm.match.winner;}
 tick(room,now){if(this.phase==='shopping'&&now>=this.shopEndsAt){this.phase='combat';this.c.roundLocked=false;this.gm.match.status='active';for(const p of room.values()){p.roundLocked=false;p.input={};p.lastInput=0;p.protectedUntil=now+2000;}}}
 ready(p,value,now){if(!this.shopping(now)||typeof value!=='boolean')return {error:'Ready can only be changed during shopping.'};p.uw.ready=value;return {ok:true};}
 roundWon(room,team,now){if(!this.canAct())return;this.wins[team]++;this.lastResult={round:this.round,winner:team,scores:{...this.gm.match.scores}};this.c.emit('upgrade',{type:'round-result',...this.lastResult,wins:{...this.wins}});
 if(this.wins[team]>=RULES.wins){this.phase='finished';this.gm.match.winner=team;this.gm.match.status='finished';this.c.roundLocked=true;this.c.matchOver=true;this.gm.clean();for(const p of room.values()){p.roundLocked=true;p.uw=null;}return;}this.openShop(now);}
 snapshot(){return this.active?{upgradeWars:{phase:this.phase,round:this.round,wins:{...this.wins},shopEndsAt:this.shopEndsAt,lastResult:this.lastResult}}:{};}
}
module.exports={UpgradeWars,RULES};
