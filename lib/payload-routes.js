const W=require('../shared/world'),C=require('../shared/combat');
const cache=new Map();
// Flat, fully supported cart lanes only. No map geometry is modified.
function route(map){
 if(cache.has(map))return cache.get(map);
 const data=W.getMap(map),boxes=data.boxes,radius=data.payloadRoute?1:.6;
 const valid=(x,z)=>Math.abs(x)<=29&&Math.abs(z)<=29&&!boxes.some(b=>b.solid&&x+radius>b.x-b.w/2+1e-6&&x-radius<b.x+b.w/2-1e-6&&z+radius>b.z-b.d/2+1e-6&&z-radius<b.z+b.d/2-1e-6&&.95>b.y-b.h/2+1e-6&&0<b.y+b.h/2-1e-6)&&!data.hazards.some(h=>h.y<1&&h.y+(h.height||1.3)>0&&(h.w?Math.abs(x-h.x)<h.w/2+radius&&Math.abs(z-h.z)<h.d/2+radius:Math.hypot(x-h.x,z-h.z)<h.radius+radius))&&[[0,0],[-radius,-radius],[-radius,radius],[radius,-radius],[radius,radius]].every(([dx,dz])=>C.wallDistance({x:x+dx,y:.1,z:z+dz},{x:0,y:-1,z:0},.12,boxes)<=.100001);
 if(data.payloadRoute){const r=data.payloadRoute;let safe=r.points.length>1;for(let i=0;i<r.points.length-1&&safe;i++){const a=r.points[i],b=r.points[i+1],steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.2));for(let j=0;j<=steps;j++){const t=j/steps;if(!valid(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t)){safe=false;break;}}}const result={...r,available:safe,reason:safe?'':'Custom track failed its ground, hazard or minecart-clearance check.'};cache.set(map,result);return result;}
 const nodes=new Map();for(let x=-29;x<=29;x++)for(let z=-29;z<=29;z++)if(valid(x,z))nodes.set(x+','+z,{x,y:0,z});
 const nearest=x=>[...nodes.values()].filter(n=>Math.abs(n.x-x)<=3&&Math.abs(n.z)<=7).sort((a,b)=>Math.hypot(a.x-x,a.z)-Math.hypot(b.x-x,b.z))[0];
 const start=nearest(-20),end=nearest(20),queue=start?[start]:[],seen=new Set(start?[start.x+','+start.z]:[]),previous=new Map();let found=false;
 for(let i=0;i<queue.length;i++){const p=queue[i];if(p===end){found=true;break;}for(const [dx,dz]of [[1,0],[0,1],[0,-1],[-1,0]]){const key=(p.x+dx)+','+(p.z+dz),n=nodes.get(key);if(!n||seen.has(key))continue;
 // Sample the complete swept footprint, not just graph endpoints.
 if(!valid(p.x+dx*.25,p.z+dz*.25)||!valid(p.x+dx*.5,p.z+dz*.5)||!valid(p.x+dx*.75,p.z+dz*.75))continue;
 seen.add(key);previous.set(n,p);queue.push(n);}}
 const points=[];if(found)for(let p=end;p;p=previous.get(p))points.push(p);points.reverse();
 const result=points.length>1?{available:true,points,length:points.length-1,reason:''}:{available:false,points:[],length:0,reason:'No continuous, level minecart lane with safe ground and wall clearance connects the two sides. Raised bridges, obstacles or void gaps make this map unavailable for Payload Escort.'};cache.set(map,result);return result;
}
function position(r,distance){
 if(!r.cumulative){const index=Math.min(r.points.length-2,Math.floor(distance)),t=distance-index,a=r.points[index],b=r.points[index+1];return {x:a.x+(b.x-a.x)*t,y:0,z:a.z+(b.z-a.z)*t};}
 const d=Math.max(0,Math.min(r.length,distance));let low=0,high=r.cumulative.length-1;while(low+1<high){const mid=(low+high)>>1;if(r.cumulative[mid]<=d)low=mid;else high=mid;}const a=r.points[low],b=r.points[high],t=(d-r.cumulative[low])/(r.cumulative[high]-r.cumulative[low]||1);return {x:a.x+(b.x-a.x)*t,y:0,z:a.z+(b.z-a.z)*t};
}
module.exports={route,position};
