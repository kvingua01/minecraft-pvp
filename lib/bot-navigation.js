const W=require('../shared/world'),C=require('../shared/combat');
const cache=new Map(),R=.33;
function overlaps(b,x,y,z){return b.solid&&x+R>b.x-b.w/2+1e-5&&x-R<b.x+b.w/2-1e-5&&z+R>b.z-b.d/2+1e-5&&z-R<b.z+b.d/2-1e-5&&y+1.8>b.y-b.h/2+1e-5&&y<b.y+b.h/2-1e-5;}
function graph(map){if(cache.has(map))return cache.get(map);const data=W.getMap(map),columns=new Map(),nodes=[];
 for(let x=-30;x<=30;x++)for(let z=-30;z<=30;z++){
  const floors=new Set();for(const b of data.boxes)if(b.solid&&b.w>=.4&&b.d>=.4&&Math.abs(x-b.x)<b.w/2+R-.01&&Math.abs(z-b.z)<b.d/2+R-.01){const y=b.y+b.h/2;if(y>=-8&&y<10)floors.add(Math.round(y*100)/100);}
  const values=[];for(const y of floors){if(data.boxes.some(b=>overlaps(b,x,y+.01,z)))continue;if(data.hazards.some(h=>y>=h.y-.2&&y<h.y+(h.height||1.3)&&(h.w?Math.abs(x-h.x)<h.w/2+R&&Math.abs(z-h.z)<h.d/2+R:Math.hypot(x-h.x,z-h.z)<h.radius+R)))continue;const n={id:nodes.length,x,y,z};nodes.push(n);values.push(n);}if(values.length)columns.set(x+','+z,values.sort((a,b)=>b.y-a.y));
 }
 const result={nodes,columns};cache.set(map,result);return result;
}
class Heap{constructor(){this.items=[];}push(value){const a=this.items;a.push(value);let i=a.length-1;while(i>0){const parent=(i-1)>>1;if(a[parent].score<=value.score)break;a[i]=a[parent];i=parent;}a[i]=value;}pop(){const a=this.items,first=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let child=i*2+1;if(child+1<a.length&&a[child+1].score<a[child].score)child++;if(last.score<=a[child].score)break;a[i]=a[child];i=child;}a[i]=last;}return first;}}
function path(map,start,goal,team,blockers=[]){const g=graph(map),allowed=n=>!(['red','blue'].includes(team)&&Math.abs(n.z)<6&&(team==='red'?n.x>21.5:n.x<-21.5))&&!blockers.some(b=>overlaps(b,n.x,n.y+.01,n.z));
 const nearest=p=>{let chosen=null,best=Infinity;for(const n of g.nodes){if(!allowed(n))continue;const value=Math.hypot(n.x-p.x,n.z-p.z)+Math.abs(n.y-p.y)*3;if(value<best){best=value;chosen=n;}}return chosen;};
 const from=nearest(start),to=nearest(goal);if(!from||!to)return [];
 const heuristic=n=>Math.abs(n.x-to.x)+Math.abs(n.z-to.z)+Math.abs(n.y-to.y),open=new Heap(),cost=new Map([[from.id,0]]),previous=new Map(),visited=new Set();open.push({node:from,score:heuristic(from)});let found=null;
 while(open.items.length&&visited.size<6500){const {node}=open.pop();if(visited.has(node.id))continue;visited.add(node.id);if(node.id===to.id){found=node;break;}
  for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const candidates=g.columns.get((node.x+dx)+','+(node.z+dz))||[];const next=candidates.find(n=>n.y<=node.y+1.25&&n.y>=node.y-4.5&&allowed(n));if(!next||visited.has(next.id))continue;const step=1+Math.abs(next.y-node.y)*.35,total=cost.get(node.id)+step;if(total>=(cost.get(next.id)??Infinity))continue;cost.set(next.id,total);previous.set(next.id,node);open.push({node:next,score:total+heuristic(next)});}
 }
 if(!found)return [];const result=[];for(let n=found;n&&n.id!==from.id;n=previous.get(n.id))result.push({x:n.x,y:n.y,z:n.z});return result.reverse();
}
module.exports={path,graph};
