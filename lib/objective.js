const teams=['red','blue'];
const defaultPoints=[{id:'A',name:'Castle Tower',x:0,y:.5,z:-18,radius:3.7},{id:'B',name:'Central Courtyard',x:0,y:.24,z:0,radius:4},{id:'C',name:'Dungeon Approach',x:0,y:.5,z:18,radius:3.7}];
class Objective{
 constructor(host){this.host=host;this.mode='normal_ctf';this.locations=defaultPoints;this.reset();}
 reset(){this.scores={red:0,blue:0};this.points=this.locations.map(p=>({...p,control:null,meter:0,contested:false,occupants:{red:0,blue:0}}));this.winner=null;this.status='waiting';}
 get meter(){return this.points[1].meter;}set meter(v){this.points[1].meter=v;}
 get control(){return this.points[1].control;}set control(v){this.points[1].control=v;}
 get contested(){return this.points.some(p=>p.contested);}get occupants(){return this.points[1].occupants;}
 inside(p,point){return p.hp>0&&p.connected!==false&&p.y>=point.y-.05&&p.y<=point.y+.5&&Math.hypot(p.x-point.x,p.z-point.z)<=point.radius;}
 chooseTeam(room,requested){const counts={red:0,blue:0};for(const p of room.values())if(!p.isBot)counts[p.team]++;const team=teams.includes(requested)?requested:counts.red<=counts.blue?'red':'blue';return counts[team]<5?team:null;}
 tick(room,dt){if(!room.has(this.host)||room.get(this.host)?.connected===false||room.get(this.host)?.isBot)this.host=[...room.values()].find(p=>!p.isBot&&p.connected!==false)?.id||null;if(this.winner)return;if(this.phase==='lobby'){this.status='lobby';return;}
 const present={red:0,blue:0};for(const p of room.values())if(p.connected!==false&&teams.includes(p.team))present[p.team]++;
 for(const point of this.points){point.occupants={red:0,blue:0};for(const p of room.values())if(teams.includes(p.team)&&this.inside(p,point))point.occupants[p.team]++;point.contested=!!(point.occupants.red&&point.occupants.blue);}
 if(!present.red||!present.blue){this.status='waiting';return;}this.status=this.contested?'contested':'active';
 for(const point of this.points){if(point.contested)continue;const capturing=point.occupants.red?'red':point.occupants.blue?'blue':null;if(capturing){const sign=capturing==='red'?1:-1,speed=10*Math.min(2,1+(point.occupants[capturing]-1)*.5),old=point.meter;let next=Math.max(-100,Math.min(100,old+sign*speed*dt));if(old*next<0)next=0;point.meter=Math.abs(next)<1e-7?0:next;
 if(point.control==='red'&&point.meter<=0||point.control==='blue'&&point.meter>=0)point.control=null;
 if(point.meter>=100-1e-7){point.meter=100;point.control='red';}if(point.meter<=-100+1e-7){point.meter=-100;point.control='blue';}
 }
 if(point.control&&(!capturing||capturing===point.control))this.scores[point.control]=Math.min(300,this.scores[point.control]+dt);
 for(const p of room.values())if(this.inside(p,point))p.objectiveTime=(p.objectiveTime||0)+dt;
 }
 for(const team of teams)if(this.scores[team]>=300-1e-7){this.scores[team]=300;this.winner=team;this.status='finished';break;}
 }
 snapshot(){return {mode:this.mode||'normal_ctf',modeName:require('../shared/modes').definitions[this.mode||'normal_ctf'].name,modeState:this.modes?.snapshot()||null,phase:this.winner?'results':this.phase||'playing',lobbyEnabled:!!this.lobbyEnabled,balanceBots:!!this.balanceBots,manualBotCount:this.manualBotCount||0,totalBotCount:this.totalBotCount||0,humanCounts:{...(this.humanCounts||{red:0,blue:0})},botCounts:{...(this.botCounts||{red:0,blue:0})},map:this.mapId,mapName:require('../shared/maps').definitions[this.mapId]?.name,scores:{...this.scores},points:!require('../shared/modes').definitions[this.mode].teams||this.mode==='payload_escort'?[]:this.points.map(p=>({...p,occupants:{...p.occupants}})),goal:300,control:this.control,meter:this.meter,contested:this.contested,occupants:{...this.occupants},winner:this.winner,status:this.status,host:this.host};}
}
module.exports={Objective,defaultPoints};
