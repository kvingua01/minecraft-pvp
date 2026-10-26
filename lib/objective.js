// All match state is server-owned. Clients only receive snapshots.
const teams=['red','blue'];
class Objective {
  constructor(host){this.host=host;this.reset();}
  reset(){this.scores={red:0,blue:0};this.control=null;this.meter=0;this.contested=false;this.occupants={red:0,blue:0};this.winner=null;this.status='waiting';}
  chooseTeam(room,requested){
    const counts={red:0,blue:0};for(const p of room.values())counts[p.team]++;
    const team=teams.includes(requested)?requested:counts.red<=counts.blue?'red':'blue';
    return counts[team]<5?team:null;
  }
  tick(room,dt){
    if(!room.has(this.host))this.host=room.keys().next().value||null;
    if(this.winner)return;
    const present={red:0,blue:0};this.occupants={red:0,blue:0};
    for(const p of room.values()){
      if(!teams.includes(p.team)||p.connected===false)continue;present[p.team]++;
      if(p.hp>0&&p.y>=.19&&p.y<=.65&&p.x*p.x+p.z*p.z<=16)this.occupants[p.team]++;
    }
    this.contested=this.occupants.red>0&&this.occupants.blue>0;
    if(!present.red||!present.blue){this.status='waiting';return;}
    this.status=this.contested?'contested':'active';if(this.contested)return;
    const capturing=this.occupants.red?'red':this.occupants.blue?'blue':null;
    if(capturing){
      const sign=capturing==='red'?1:-1;
      this.meter=Math.max(-100,Math.min(100,this.meter+sign*20*dt));
      if(Math.abs(this.meter)<1e-7)this.meter=0;
      if(this.control==='red'&&this.meter<=0||this.control==='blue'&&this.meter>=0)this.control=null;
      if(this.meter>=100-1e-7){this.meter=100;this.control='red';}
      if(this.meter<=-100+1e-7){this.meter=-100;this.control='blue';}
    }
    if(this.control&&(!capturing||capturing===this.control)){
      this.scores[this.control]=Math.min(100,this.scores[this.control]+2*dt);
      if(this.scores[this.control]>=100-1e-7){this.scores[this.control]=100;this.winner=this.control;this.status='finished';}
    }
  }
  snapshot(){return {scores:{...this.scores},control:this.control,meter:this.meter,contested:this.contested,occupants:{...this.occupants},winner:this.winner,status:this.status,host:this.host};}
}
module.exports={Objective};
