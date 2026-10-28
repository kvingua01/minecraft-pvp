(function(root){
 const definitions={
  minecart_canyon:{name:'Minecart Canyon',description:'Abandoned mine, sandstone canyon bridges and a mining-town depot',sky:0xe2c895},
  nether_railway:{name:'Nether Railway',description:'Basalt ravine, fortress railway and a portal station',sky:0x492e39},
  castle_supply_run:{name:'Castle Supply Run',description:'Village supplies, a drawbridge, courtyard and royal storage vault',sky:0x91bfff},
  frozen_express:{name:'Frozen Express',description:'Mountain mine, ice bridges, snow cabins and a frozen station',sky:0xc4dce8},
  jungle_expedition:{name:'Jungle Expedition',description:'Jungle camp, river crossings, ancient temple and treasure vault',sky:0x9bc6ad}
 };
 const has=id=>typeof id==='string'&&Object.hasOwn(definitions,id);
 const specifications={
  minecart_canyon:{controls:[[-18,-16],[-6,-16],[-6,12],[8,12],[8,-12],[18,-12],[18,16]],stages:['Mine Entrance','Canyon Bridge','Mining Town','Train Depot'],checkpoints:[[-6,0],[8,-8]],floor:'sand',wall:'sandstone',bridge:'oak',roof:'roof'},
  nether_railway:{controls:[[-18,16],[-9,16],[-9,-16],[4,-16],[4,12],[18,12],[18,-14]],stages:['Nether Mine','Lava Bridge','Fortress Gate','Portal Station'],checkpoints:[[-9,0],[4,6]],floor:'netherbrick',wall:'basalt',bridge:'netherbrick',roof:'netherbrick'},
  castle_supply_run:{controls:[[-18,-18],[-8,-18],[-8,15],[6,15],[6,-10],[18,-10],[18,18]],stages:['Village Supply Depot','Drawbridge','Courtyard','Storage Room'],checkpoints:[[-8,0],[6,-6]],floor:'grass',wall:'cobble',bridge:'oak',roof:'roof'},
  frozen_express:{controls:[[-18,17],[-6,17],[-6,-17],[7,-17],[7,14],[19,14],[19,-16]],stages:['Mountain Mine','Ice Bridge','Snow Village','Frozen Station'],checkpoints:[[-6,0],[7,10]],floor:'snow',wall:'stone',bridge:'ice',roof:'snow'},
  jungle_expedition:{controls:[[-18,-16],[-5,-16],[-5,17],[8,17],[8,-13],[19,-13],[19,17]],stages:['Jungle Camp','River Crossing','Ancient Temple','Treasure Vault'],checkpoints:[[-5,0],[8,-8]],floor:'grass',wall:'cracked',bridge:'oak',roof:'leaves'}
 };
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
 function curved(controls){const source=controls.map(([x,z])=>({x,y:0,z})),coarse=[source[0]];
  for(let i=1;i<source.length-1;i++){const a=source[i-1],b=source[i],c=source[i+1],r=Math.min(2,distance(a,b)/3,distance(b,c)/3),u={x:b.x+(a.x-b.x)*r/distance(a,b),y:0,z:b.z+(a.z-b.z)*r/distance(a,b)},v={x:b.x+(c.x-b.x)*r/distance(b,c),y:0,z:b.z+(c.z-b.z)*r/distance(b,c)};coarse.push(u);for(let j=1;j<=6;j++){const t=j/6;coarse.push({x:(1-t)**2*u.x+2*(1-t)*t*b.x+t*t*v.x,y:0,z:(1-t)**2*u.z+2*(1-t)*t*b.z+t*t*v.z});}}
  coarse.push(source.at(-1));const points=[coarse[0]];for(let i=1;i<coarse.length;i++){const a=coarse[i-1],b=coarse[i],n=Math.ceil(distance(a,b));for(let j=1;j<=n;j++)points.push({x:a.x+(b.x-a.x)*j/n,y:0,z:a.z+(b.z-a.z)*j/n});}return points;
 }
 function build(id){if(!has(id))throw Error('Unknown payload map');const spec=specifications[id],boxes=[],hazards=[],ice=[],slow=[],points=curved(spec.controls),cumulative=[0];for(let i=1;i<points.length;i++)cumulative.push(cumulative[i-1]+distance(points[i-1],points[i]));
  const checkpoints=spec.checkpoints.map(([x,z],i)=>{let index=0;for(let j=1;j<points.length;j++)if(Math.hypot(points[j].x-x,points[j].z-z)<Math.hypot(points[index].x-x,points[index].z-z))index=j;return {id:'checkpoint-'+(i+1),name:spec.stages[i+1],index,distance:cumulative[index],...points[index]};});
  const nearRail=(x,z,margin)=>points.some(p=>Math.abs(p.x-x)<margin&&Math.abs(p.z-z)<margin);
  const raw=(x,y,z,w,h,d,tile,solid=true,rotationY=0)=>{if(w>0&&h>0&&d>0)boxes.push({x,y,z,w,h,d,tile,solid,rotationY,color:0x999999});};
  // Keep generous headroom along the complete route and both sanctuary exits.
  const add=(x,y,z,w,h,d,tile,solid=true)=>{if(solid&&y+h/2>0.001&&y-h/2<2.6){if(points.some(p=>Math.abs(p.x-x)<w/2+2.1&&Math.abs(p.z-z)<d/2+2.1))return;if(Math.abs(x)>21&&Math.abs(z)<6&&Math.abs(z)<d/2+4.3&&Math.abs(x)-w/2<29)return;}raw(x,y,z,w,h,d,tile,solid);};
  const slab=(x,y,z,w,d,tile)=>add(x,y-.15,z,w,.3,d,tile);
  const stairs=(x,z,top,tile,axis='z',sign=1)=>{const count=Math.round(top*2);for(let i=0;i<count;i++){const h=(i+1)*.5;add(x+(axis==='x'?sign*i*.7:0),h/2,z+(axis==='z'?sign*i*.7:0),axis==='x'?.7:2.8,h,axis==='z'?.7:2.8,tile);}slab(x+(axis==='x'?sign*count*.7:0),top,z+(axis==='z'?sign*count*.7:0),axis==='x'?3:2.8,axis==='z'?3:2.8,tile);};
  const lamp=(x,z,top=0,kind='lantern')=>{add(x,top+1.3,z,.18,2.6,.18,'fence');add(x,top+2.7,z,.5,.5,.5,kind,false);};
  const arch=(x,z,axis='x',tile=spec.wall,width=7)=>{for(const s of [-1,1])add(x+(axis==='x'?s*width/2:0),2,z+(axis==='z'?s*width/2:0),.65,4,.65,tile);add(x,4.2,z,axis==='x'?width+1:1,.7,axis==='z'?width+1:1,tile);};
  const hall=(x,z,w,d,wall,roof)=>{for(const s of [-1,1]){add(x+s*w/2,2,z,.5,4,d,wall);for(const dz of [-d/2,d/2]){add(x+s*(w/4+1),2,z+dz,w/2-2,4,.5,wall);add(x,3.5,z+dz,4,1,.5,wall);}}for(let i=0;i<3;i++)for(const s of [-1,1])add(x+s*(w/2-i*1.2),4.3+i*.6,z,2,.6,d+1,roof);add(x,6,z,1,.5,d+1,roof);for(const s of [-1,1]){add(x+s*(w/2+.02),2,z,.1,1.3,2,'glass',false);lamp(x+s*2.8,z-d/2-.7);} }; 
  const tower=(x,z,top=6,tile=spec.wall)=>{for(const s of [-1,1]){add(x+s*2.7,top/2,z,.6,top,6,tile);add(x+s*1.9,top/2,z+2.7,2.2,top,.6,tile);}slab(x,top,z,7,7,tile);for(const s of [-1,1])for(const t of [-1,0,1]){add(x+s*3,top+.5,z+t*2.5,.7,1,.7,tile);add(x+t*2.5,top+.5,z+s*3,.7,1,.7,tile);}stairs(x,z-8,top,tile,'z',1);};
  const tree=(x,z,pine=false)=>{add(x,2.7,z,.8,5.4,.8,'log');if(pine)for(let i=0;i<4;i++)add(x,3.5+i*.8,z,4.8-i,1.4,4.8-i,'leaves',false);else{add(x,5,z,5,2,5,'leaves',false);add(x,6.3,z,3,1,3,'leaves',false);}};
  // A carved channel, walkable banks and genuinely lowered ground below bridges.
  for(let x=-30;x<=30;x+=4)for(let z=-30;z<=30;z+=4){const channel=Math.abs(x)<20&&Math.abs(z)<4;raw(x,channel?-5:-3,z,4,channel?2:6,4,channel?(id==='nether_railway'?'basalt':spec.wall):spec.floor);}
  for(const s of [-1,1]){raw(s*25,.3,0,10,.6,12,spec.wall);raw(s*25,.62,0,6,.04,8,s<0?'roof':'ice',false);for(const z of [-6.2,6.2])raw(s*25,1.7,z,9,3.4,.4,spec.wall);raw(s*29.6,1.7,0,.4,3.4,12,spec.wall);for(const z of [-4.8,4.8])lamp(s*25,z,.6);}
  const crossings=spec.controls.slice(1).filter((p,i,a)=>i&&p[0]===a[i-1][0]&&p[1]*a[i-1][1]<0).map(p=>p[0]);
  for(const x of [...new Set([...crossings,-17,0])]){
   raw(x,-.3,0,5.8,.6,12,spec.bridge);for(const dx of [-2.5,2.5])for(const z of [-3,3])raw(x+dx,-2,z,.55,4,.55,id==='nether_railway'?'basalt':'log');
   for(const dx of [-2.8,2.8])for(const z of [-4,-2,0,2,4])add(x+dx,.8,z,.14,1.6,.14,'fence');
  }
  // Continuous bank catwalks connect the bridges without misleading one-grid gaps.
  for(const sign of [-1,1])raw(0,-.15,sign*3.2,42,.3,1.6,spec.bridge);
  // Steps give players who fall into the channel an ordinary walking route out.
  for(const [x,sign]of [[-13,1],[12,-1]]){for(let i=0;i<8;i++){const top=-3.5+i*.5;raw(x,(-4+top)/2,sign*(-2.4+i*.8),1.8,top+4,.8,spec.wall);}raw(x,-.15,sign*3.8,1.8,.3,.8,spec.wall);for(const bx of [...new Set([...crossings,-17,0])])if(Math.abs(bx-x)<=6)raw((x+bx)/2,-.15,sign*3.2,Math.abs(bx-x)+1.8,.3,1.2,spec.bridge);}
  if(id==='nether_railway'){raw(0,-3.96,0,40,.08,8,'lava',false);hazards.push({x:0,y:-4,z:0,w:40,d:8,height:.2});}
  if(id==='jungle_expedition'){raw(0,-3.96,0,40,.08,8,'water',false);}
  if(id==='frozen_express'){raw(0,-3.94,0,40,.12,8,'ice');for(const x of crossings)ice.push({x,y:0,z:0,w:5.8,d:12});}
  // Irregular perimeter cliffs conceal the foundation and provide theme silhouettes.
  for(const s of [-1,1]){raw(s*32,3,0,1,6,65,spec.wall);raw(0,3,s*32,65,6,1,spec.wall);for(const z of [-27,-15,15,27])for(let tier=0;tier<3;tier++)add(s*(29-tier*.9),2+tier*1.4,z,4-tier*.5,4+tier,6-tier,spec.wall);}
  const [start,end]=[points[0],points.at(-1)];
  if(id==='minecart_canyon'){
   // The mine is bored into sandstone: tall flanking rock, roof and timber supports.
   for(const z of [-21,-11])add(-17,3.5,z,15,7,3,'sandstone');add(-17,6.5,-16,15,2,12,'sandstone');for(const x of [-23,-18,-13])arch(x,-16,'z','log',7);
   hall(1,-7,6,6,'sandstone','roof');hall(14,-9,7,6,'sandstone','roof');hall(3,24,8,7,'sandstone','roof');hall(18,18,9,9,'oak','roof');hall(-22,-25,7,7,'oak','roof');
   for(const [x,z]of [[-14,16],[15,-22],[1,-25]]){tower(x,z,4,'sandstone');lamp(x+3,z);}
   for(const x of [-21,-18,-15]){add(x,.5,-23,1,1,1,'darkoak');add(x,.9,-24.4,1.2,.7,.8,'metal');}add(-12,4,-23,.5,7,.5,'log');add(-9,7.2,-23,6,.4,.4,'log');add(-6,5.5,-23,.1,3,.1,'metal');
   for(const z of [-8,8]){add(-24,2,z,4,4,4,'sandstone');add(-24,4,z,5,.4,5,'oak');}stairs(-24,10,4,'oak','z',1);
  }else if(id==='nether_railway'){
   for(const z of [11,21])add(-17,3.4,z,14,6.8,3,'basalt');add(-17,6.7,16,14,1.4,12,'basalt');for(const x of [-23,-18,-13])arch(x,16,'z','netherbrick',7);
   for(const [x,z]of [[-17,-24],[15,23],[0,24]])tower(x,z,6,'netherbrick');arch(4,5,'x','netherbrick',8);hall(18,-16,9,9,'netherbrick','netherbrick');
   for(const s of [-1,1]){add(s*27,4,s*22,1,8,1,'lava',false);hazards.push({x:s*27,y:0,z:s*22,w:1,d:1,height:8});for(const z of [-12,12]){add(s*24,.02,z,4,.04,5,'soulsand',false);slow.push({x:s*24,y:0,z,w:4,d:5});}lamp(s*20,24,0,'soulfire');}
   for(const x of [15,21])add(x,2.5,-18,.8,5,.8,'obsidian');add(18,5.1,-18,7,.8,1,'obsidian');add(18,2.6,-18,5,4.4,.15,'purpur',false);for(const z of [-24,-8,8,24])lamp(-2,z,0,'soulfire');
  }else if(id==='castle_supply_run'){
   hall(-18,-20,9,8,'oak','roof');hall(18,20,10,9,'cobble','roof');hall(-19,19,8,7,'oak','roof');
   for(const x of [-18,18])tower(x,25,6,'bricks');for(const x of [-20,0,20])tower(x,-26,5,'bricks');
   // Wide drawbridge gateway and a crenellated castle curtain wall.
   for(const x of [-26,-20,0,12,26]){add(x,2.5,7,3,5,1,'bricks');for(const dx of [-1,1])add(x+dx,5.4,7,.8,.8,1,'bricks');}arch(-8,6,'x','bricks',8);arch(6,-6,'x','bricks',8);raw(6,.01,-4,12,.02,12,'cobble',false);slab(0,4.5,26,30,3,'bricks');stairs(-12,20,4.5,'bricks','z',1);
   for(const [x,z]of [[-14,-8],[1,23],[25,-18]]){add(x,.6,z,2,1.2,1,'oak');add(x+1,1,z,1,2,.25,'log');lamp(x-2,z);}
   for(const s of [-1,1])add(18+s*6,3,20,2,6,12,'bricks');add(18,6,20,14,1,12,'bricks');for(const x of [15,21])add(x,.6,23,1.5,1.2,1.5,'gold');
  }else if(id==='frozen_express'){
   for(const z of [12,22])add(-18,4,z,15,8,3,'stone');add(-18,8,17,16,1.5,13,'snow');for(const x of [-23,-18,-13])arch(x,17,'z','ice',7);
   hall(-1,10,6,6,'oak','snow');hall(14,5,7,6,'oak','snow');hall(0,24,8,7,'oak','snow');hall(17,-18,12,10,'oak','snow');hall(-18,-25,7,7,'oak','snow');
   for(const [x,z]of [[-24,13],[-24,-15],[-14,-24],[1,-25],[25,21],[26,-26],[1,7],[14,25]])tree(x,z,true);
   for(const s of [-1,1]){add(s*27,4,s*19,1,8,4,'ice');for(let tier=0;tier<3;tier++)add(s*(24-tier),4+tier*1.5,-s*25,7-tier,8,7-tier,'snow');}
   slab(-18,3.5,-12,10,3,'oak');stairs(-23,-17,3.5,'oak','z',1);for(const z of [-24,-8,8,24])lamp(2,z);
  }else{
   hall(-18,-18,8,8,'oak','leaves');hall(19,19,11,11,'cracked','cracked');arch(8,-6,'x','cracked',8);for(const s of [-1,1]){add(8+s*5,3,-8,2,6,8,'cracked');add(8+s*5,6.5,-8,3,1,9,'cracked');}add(8,6.5,-8,12,1,10,'cracked');
   for(const [x,z]of [[-25,-20],[-24,16],[-16,24],[-12,-25],[0,-26],[1,25],[13,25],[26,-23],[26,18],[1,8]]){tree(x,z);if(z>12){slab(x,3,z,5,5,'oak');stairs(x,z-6,3,'oak','z',1);}for(const s of [-1,1])add(x+s*2,3,z,.12,4,.12,'leaves',false);}
   for(const s of [-1,1]){add(s*27,4,s*20,1,8,2,'water',false);add(s*27,7.5,s*20,4,.5,3,'cracked');}for(const x of [16,22])add(x,1,22,1.5,2,1.5,'gold');
   for(const z of [14,24])add(19,3,z,14,6,2,'cracked');add(19,6.3,19,15,1,12,'cracked');for(const z of [-24,24])lamp(-2,z);
  }
  // Cover never intrudes into the reserved escort lane; lower walls remain solid.
  for(const [x,z]of [[-14,-10],[-14,11],[1,-22],[1,22],[13,-24],[25,12],[-25,-12]]){add(x,.7,z,2.5,1.4,1.2,id==='jungle_expedition'?'cracked':spec.wall);lamp(x+1.8,z);}
  // Rails and sleepers use exactly the same points as the authoritative route.
  for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1],length=distance(a,b),yaw=Math.atan2(b.x-a.x,b.z-a.z),nx=Math.cos(yaw),nz=-Math.sin(yaw),x=(a.x+b.x)/2,z=(a.z+b.z)/2;for(const sign of [-1,1])raw(x+nx*.43*sign,.055,z+nz*.43*sign,.07,.07,length+.035,'metal',false,yaw);raw(x,.02,z,1.25,.04,.19,'darkoak',false,yaw);}
  for(const cp of checkpoints){const before=points[Math.max(0,cp.index-1)],after=points[Math.min(points.length-1,cp.index+1)],dx=after.x-before.x,dz=after.z-before.z,n=Math.hypot(dx,dz)||1;for(const s of [-1,1]){add(cp.x+dz/n*3*s,2,cp.z-dx/n*3*s,.55,4,.55,spec.wall);lamp(cp.x+dz/n*3*s,cp.z-dx/n*3*s,2,'sealantern');}}
  return {id,...definitions[id],boxes,hazards,ice,slow,bounded:true,navigationMinY:0,points:[{id:'A',name:spec.stages[0],...start,radius:3},{...checkpoints[0],id:'B',name:checkpoints[0].name,radius:3},{id:'C',name:spec.stages[3],...end,radius:3}],payloadRoute:{points,cumulative,length:cumulative.at(-1),checkpoints,stages:spec.stages},modeOnly:'payload_escort'};
 }
 const api={definitions,has,build};if(typeof module!=='undefined')module.exports=api;else root.PayloadArenaMaps=api;
})(globalThis);
