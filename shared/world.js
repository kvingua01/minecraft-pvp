(function (root) {
  const Maps=typeof module!=='undefined'?require('./maps'):root.ArenaMaps;
  const mapCache=new Map();
  const boxes = [];
  function box(x,y,z,w,h,d,color,solid=true) { boxes.push({x,y,z,w,h,d,color,solid}); }
  box(0,-1,0,64,2,64,0x6e9f50);
  // Mirrored keeps, walkable terraces, and gates with a clear central passage.
  for (const side of [-1,1]) {
    box(side*25,0.3,0,10,.6,14,0x939b9a);
    for (const z of [-8,8]) {
      box(side*21,2,z,5,4,5,0x879493);
      box(side*21,4.3,z,5.5,.6,5.5,0xb4bfad);
      for (const dx of [-2,0,2]) box(side*21+dx,5,z,1,1,5,0x879493);
    }
    for (const z of [-13,13]) {
      box(side*9,1.5,z,7,3,3,0x98a6a0);
      box(side*9,3.3,z,7.4,.6,3.4,0xc3cbb5);
      // Stair route to elevated cover.
      for(let i=0;i<6;i++) box(side*(5+i*.6),.25*(i+1),z+side*3, .6,.5*(i+1),3,0x8b9993);
    }
    for (const z of [-4,4]) box(side*12,1,z,2,2,2,0xb39061);
    box(side*25,.66,0,6,.12,8,side<0?0xe57a68:0x68b7df,false);
    // Gate arch creates a short tunnel through the center route.
    for(const z of [-3,3]) box(side*16,1.75,z,2,3.5,2,0x82928d);
    box(side*16,4.1,0,2,1.2,8,0x9caaa0);
    for(const z of [-23,23]) {
      box(side*20,1.5,z,1,3,1,0x896546);
      box(side*20,4,z,5,3,5,0x497d4e,false);
    }
  }
  box(0,.12,0,8,.24,8,0xd5c7a1);
  for(const z of [-19,19]) box(0,.25,z,14,.5,4,0xa07b4e);
  for(const x of [-6,6]) for(const z of [-6,6]) box(x,1,z,2,2,2,0x8a9c91);
  for(const z of [-32,32]) box(0,2,z,65,4,1,0x687e76);
  for(const x of [-32,32]) box(x,2,0,1,4,65,0x687e76);
  // Constructed corner lodges: actual wall openings, roof steps and accessible interiors.
  function detail(x,y,z,w,h,d,tile,solid=true){boxes.push({x,y,z,w,h,d,color:0x999999,tile,solid});}
  for(const side of [-1,1])for(const sign of [-1,1]){
    const x=side*26,z=sign*23;
    detail(x,-.1,z,7,.2,7,'cobble');
    detail(x-3.3,1.7,z,.4,3.4,7,'oak');detail(x+3.3,1.7,z,.4,3.4,7,'oak');
    detail(x,1.7,z+sign*3.3,7,3.4,.4,'oak');
    for(const dx of [-2.3,2.3])detail(x+dx,1.7,z-sign*3.3,2.4,3.4,.4,'oak');
    detail(x,3,z-sign*3.3,2.2,.8,.4,'log');
    for(const dx of [-3.35,3.35])for(const dz of [-3.35,3.35])detail(x+dx,1.8,z+dz,.55,3.6,.55,'log');
    // Framed glass windows, shutters, door frame and a chimney.
    for(const dx of [-3.52,3.52]){detail(x+dx,2,z, .08,1.2,1.6,'glass',false);detail(x+dx,1.3,z,.15,.2,2,'darkoak',false);}
    for(let roof=0;roof<4;roof++)for(const dx of [-1,1])detail(x+dx*(3.5-roof*.8),3.5+roof*.45,z,1.5,.5,8,'roof');
    detail(x,5.05,z,.7,.5,8,'darkoak');detail(x+2,4.3,z+2,.8,3,.8,'cracked');
    detail(x-.85,1.5,z-sign*3.6,.12,1.1,.2,'door',false);
    for(const dx of [-1.6,1.6]){detail(x+dx,2.2,z-sign*3.65,.16,.7,.16,'torch',false);}
    for(const dx of [-4.3,4.3])for(let n=0;n<3;n++)detail(x+dx,.8,z+n-1,.12,1.6,.12,'fence');
  }
  // Roof details and windows on the existing keeps; main movement routes stay open.
  for(const side of [-1,1])for(const z of [-8,8]){
    for(const dz of [-1.8,0,1.8])detail(side*18.45,2.3,z+dz,.08,1.2,.65,'glass',false);
    for(const dz of [-2,2])detail(side*18.35,1.6,z+dz,.16,.7,.16,'lantern',false);
  }
  for(const z of [-19,19])for(const x of [-5,-3,-1,1,3,5])for(const dz of [-1,1]){
    detail(x,1,z+dz*1.8,.15,1.5,.15,'fence');detail(x,1.4,z+dz*1.8,2,.12,.12,'fence');
  }
  const hazards=[{x:-10,y:0,z:20,radius:.95},{x:10,y:0,z:-20,radius:.95}];
  const radius=.32, height=1.8;
  // Enemy spawn rooms are solid to players; allies can leave and return freely.
  const enemySpawns={red:{x:27,y:32,z:0,w:10,h:64,d:12,solid:true},blue:{x:-27,y:32,z:0,w:10,h:64,d:12,solid:true}};
  const epsilon=1e-7;
  function compile(list){return list.filter(b=>b.solid).map(b=>({minX:b.x-b.w/2,maxX:b.x+b.w/2,minY:b.y-b.h/2,maxY:b.y+b.h/2,minZ:b.z-b.d/2,maxZ:b.z+b.d/2}));}
  // Cache broad-phase cells and their query results; details outside a swept
  // player's neighborhood never enter the narrow-phase collision loop.
  const spatial=new WeakMap();
  function nearby(list,p,dx=0,dz=0){if(list.length<12)return list;let index=spatial.get(list);if(!index){const cells=new Map();for(const b of list)for(let x=Math.floor(b.minX/4);x<=Math.floor(b.maxX/4);x++)for(let z=Math.floor(b.minZ/4);z<=Math.floor(b.maxZ/4);z++){const key=x+','+z;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(b);}index={cells,queries:new Map()};spatial.set(list,index);}const x0=Math.floor((Math.min(p.x,p.x+dx)-radius)/4),x1=Math.floor((Math.max(p.x,p.x+dx)+radius)/4),z0=Math.floor((Math.min(p.z,p.z+dz)-radius)/4),z1=Math.floor((Math.max(p.z,p.z+dz)+radius)/4),key=[x0,x1,z0,z1].join(',');if(index.queries.has(key))return index.queries.get(key);const found=new Set();for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++)for(const b of index.cells.get(x+','+z)||[])found.add(b);const result=[...found];if(index.queries.size>4096)index.queries.clear();index.queries.set(key,result);return result;}
  const staticBounds=compile(boxes),spawnBounds={red:compile([enemySpawns.red]),blue:compile([enemySpawns.blue])},dynamicCache=new WeakMap();
  function dynamicBounds(solids){if(!solids?.length)return null;let cached=dynamicCache.get(solids);if(!cached){cached=compile(solids);dynamicCache.set(solids,cached);}return cached;}
  const boundsCache=new WeakMap();
  function getMap(id){if(!Maps.has(id))return {id:'legacy',boxes,hazards,ice:[]};if(!mapCache.has(id))mapCache.set(id,Maps.build(id,boxes));return mapCache.get(id);}
  function mapBounds(id){if(!Maps.has(id))return staticBounds;const data=getMap(id);if(!boundsCache.has(data.boxes))boundsCache.set(data.boxes,compile(data.boxes));return boundsCache.get(data.boxes);}
  // Sweep against precompiled faces without allocating bounds/closures per block.
  function move(p,delta) {
    const moved={x:0,y:0,z:0},dynamic=dynamicBounds(p.solids),gate=spawnBounds[p.team];
    for(const axis of ['x','z','y']){
      let distance=delta[axis]||0;if(!distance)continue;
      const minX=p.x-radius,maxX=p.x+radius,minY=p.y,maxY=p.y+height,minZ=p.z-radius,maxZ=p.z+radius;
      const low=axis==='x'?minX:axis==='y'?minY:minZ,high=axis==='x'?maxX:axis==='y'?maxY:maxZ;
      for(let group=0;group<3;group++){
        const source=group===0?mapBounds(p.map):group===1?dynamic:gate;if(!source)continue;const list=nearby(source,p,delta.x||0,delta.z||0);
        for(let i=0;i<list.length;i++){
          const b=list[i];
          if(axis!=='x'&&(maxX<=b.minX+epsilon||minX>=b.maxX-epsilon))continue;
          if(axis!=='y'&&(maxY<=b.minY+epsilon||minY>=b.maxY-epsilon))continue;
          if(axis!=='z'&&(maxZ<=b.minZ+epsilon||minZ>=b.maxZ-epsilon))continue;
          const near=axis==='x'?b.minX:axis==='y'?b.minY:b.minZ,far=axis==='x'?b.maxX:axis==='y'?b.maxY:b.maxZ;
          if(distance>0){const gap=near-high;if(gap>=-epsilon)distance=Math.min(distance,Math.max(0,gap));}
          else {const gap=far-low;if(gap<=epsilon)distance=Math.max(distance,Math.min(0,gap));}
        }
      }
      p[axis]+=distance;moved[axis]=distance;
    }
    return moved;
  }
  function recover(p){let changed=false;for(let pass=0;pass<8;pass++){let best=null;for(const source of [mapBounds(p.map),dynamicBounds(p.solids),spawnBounds[p.team]])if(source)for(const b of nearby(source,p)){if(p.x+radius<=b.minX+epsilon||p.x-radius>=b.maxX-epsilon||p.z+radius<=b.minZ+epsilon||p.z-radius>=b.maxZ-epsilon||p.y+height<=b.minY+epsilon||p.y>=b.maxY-epsilon)continue;if(source===spawnBounds[p.team]){const amount=p.team==='red'?b.minX-p.x-radius:b.maxX-p.x+radius;best={axis:'x',amount};continue;}for(const [axis,amount]of [['x',b.minX-p.x-radius],['x',b.maxX-p.x+radius],['z',b.minZ-p.z-radius],['z',b.maxZ-p.z+radius],['y',b.minY-p.y-height],['y',b.maxY-p.y]])if(!best||Math.abs(amount)<Math.abs(best.amount))best={axis,amount};}if(!best)break;p[best.axis]+=best.amount;if(best.axis==='y')p.vy=0;changed=true;}return changed;}
  function spawn(index=0) { return {x:index%2?-25:25,y:.61,z:(Math.floor(index/2)%5-2)*1.4,vy:0,yaw:index%2?-Math.PI/2:Math.PI/2,pitch:0,grounded:false,jumpQueued:false}; }
  function step(p,input,dt) {
    recover(p);
    p.yaw=Number.isFinite(input.yaw)?input.yaw:p.yaw;
    p.pitch=Math.max(-1.5,Math.min(1.5,Number.isFinite(input.pitch)?input.pitch:p.pitch));
    const f=(input.forward?1:0)-(input.back?1:0), s=(input.right?1:0)-(input.left?1:0);
    const data=getMap(p.map),terrainScale=(data.slow||[]).some(a=>p.y>=a.y-.1&&p.y<=a.y+.4&&Math.abs(p.x-a.x)<a.w/2&&Math.abs(p.z-a.z)<a.d/2)?.8:1;
    const norm=Math.hypot(f,s)||1, speed=(input.sprint?8:5)*(p.speedScale??1)*terrainScale;
    let dx=((s*Math.cos(p.yaw)-f*Math.sin(p.yaw))/norm*speed+(p.kx||0))*dt;
    let dz=((-s*Math.sin(p.yaw)-f*Math.cos(p.yaw))/norm*speed+(p.kz||0))*dt;
    const onIce=getMap(p.map).ice.some(a=>p.y<1.2&&Math.abs(p.x-a.x)<a.w/2&&Math.abs(p.z-a.z)<a.d/2);
    if(onIce){const alpha=1-Math.exp(-5*dt);p.iceVX=(p.iceVX||0)+(dx/dt-(p.iceVX||0))*alpha;p.iceVZ=(p.iceVZ||0)+(dz/dt-(p.iceVZ||0))*alpha;if(p.speedScale===0)p.iceVX=p.iceVZ=0;dx=p.iceVX*dt;dz=p.iceVZ*dt;}else p.iceVX=p.iceVZ=0;
    p.kx=(p.kx||0)*Math.exp(-(onIce?3:8)*dt);p.kz=(p.kz||0)*Math.exp(-(onIce?3:8)*dt);
    if((input.jump||p.jumpQueued) && p.grounded) {p.vy=8;p.grounded=false;}
    p.jumpQueued=false;
    // Only the new timed flight abilities set flightLift; normal movement is unchanged.
    if(p.flightLift!==undefined&&p.flightLift!==null){dx=Math.max(-30.6-p.x,Math.min(30.6-p.x,dx));dz=Math.max(-30.6-p.z,Math.min(30.6-p.z,dz));}
    p.vy=p.flightLift!==undefined&&p.flightLift!==null?p.flightLift:Math.max(-30,p.vy-23*dt);
    if(data.bounded){dx=Math.max(-30.6-p.x,Math.min(30.6-p.x,dx));dz=Math.max(-30.6-p.z,Math.min(30.6-p.z,dz));}
    const dy=p.vy*dt,moved=move(p,{x:dx,y:dy,z:dz});let stepped=false;
    // Minecraft-like half-block stepping, still swept against walls and ceilings.
    if(p.grounded&&(Math.abs(moved.x-dx)>epsilon||Math.abs(moved.z-dz)>epsilon)){
      const probe={...p},up=move(probe,{y:.51});if(up.y>.5){const horizontal=move(probe,{x:dx-moved.x,z:dz-moved.z});if(Math.hypot(horizontal.x,horizontal.z)>.001){const down=move(probe,{y:-.51});p.x=probe.x;p.y=probe.y;p.z=probe.z;stepped=down.y>-.51+epsilon;}}
    }
    p.grounded=stepped||dy<0&&Math.abs(moved.y-dy)>epsilon;
    if(Math.abs(moved.y-dy)>epsilon)p.vy=0;
    if(Math.abs(moved.x-dx)>epsilon)p.kx=0;
    if(Math.abs(moved.z-dz)>epsilon)p.kz=0;
    if(p.y < -20){if(p.map==='sky'||data.void)p.voided=true;else Object.assign(p,spawn(p.spawnIndex));}
    return p;
  }
  const api={boxes,hazards,getMap,spawn,step,move,recover,radius,height};
  if(typeof module!=='undefined') module.exports=api; else root.VoxelWorld=api;
})(globalThis);
