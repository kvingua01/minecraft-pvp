const Nav=require('./bot-navigation');
const locations=new Map();
function corners(map){if(locations.has(map))return locations.get(map);const nodes=Nav.graph(map).nodes.filter(n=>n.y>=-4&&n.y<=1&&Math.abs(n.x)<30&&Math.abs(n.z)<30),result=[];for(const [id,sx,sz]of [['nw',-1,-1],['ne',1,-1],['sw',-1,1],['se',1,1]]){const choices=nodes.filter(n=>n.x*sx>5&&n.z*sz>6.5).sort((a,b)=>Math.hypot(a.x-sx*28,a.z-sz*28)-Math.hypot(b.x-sx*28,b.z-sz*28));if(choices[0])result.push({id:'health-'+id,x:choices[0].x,y:choices[0].y,z:choices[0].z});}locations.set(map,result);return result;}
class HealthPacks{
 constructor(combat){this.combat=combat;this.clear();}
 clear(){this.packs=[];this.map=null;}
 enabled(match){return match.phase==='playing'&&!match.winner&&['normal_ctf','random_kit'].includes(match.mode||'normal_ctf');}
 reset(map){this.map=map;this.packs=corners(map).map(p=>({...p,readyAt:0}));}
 tick(room,match,now){if(!this.enabled(match)||this.combat.inLobby||this.combat.matchOver)return;if(this.map!==match.mapId)this.reset(match.mapId);for(const pack of this.packs){if(now<pack.readyAt)continue;const player=[...room.values()].filter(p=>p.connected!==false&&p.hp>0&&p.hp<p.maxHp&&!p.roundLocked&&Math.abs(p.y-pack.y)<.7&&Math.hypot(p.x-pack.x,p.z-pack.z)<=1&&this.combat.heroes.visible({...pack,y:pack.y+.4},{...p,y:p.y+.8})).sort((a,b)=>Math.hypot(a.x-pack.x,a.z-pack.z)-Math.hypot(b.x-pack.x,b.z-pack.z))[0];if(!player)continue;pack.readyAt=now+60000;this.combat.heroes.heal(player,player,25,now);this.combat.emit('health-pack',{type:'pickup',id:pack.id,target:player.id,readyAt:pack.readyAt,x:pack.x,y:pack.y,z:pack.z});}}
 snapshot(match){return this.enabled(match)?this.packs.map(p=>({...p})):[];}
}
module.exports={HealthPacks,corners};
