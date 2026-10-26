(function (root) {
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
  const staticBounds=compile(boxes),spawnBounds={red:compile([enemySpawns.red]),blue:compile([enemySpawns.blue])},dynamicCache=new WeakMap();
  function dynamicBounds(solids){if(!solids?.length)return null;let cached=dynamicCache.get(solids);if(!cached){cached=compile(solids);dynamicCache.set(solids,cached);}return cached;}
  // Sweep against precompiled faces without allocating bounds/closures per block.
  function move(p,delta) {
    const moved={x:0,y:0,z:0},dynamic=dynamicBounds(p.solids),gate=spawnBounds[p.team];
    for(const axis of ['x','z','y']){
      let distance=delta[axis]||0;if(!distance)continue;
      const minX=p.x-radius,maxX=p.x+radius,minY=p.y,maxY=p.y+height,minZ=p.z-radius,maxZ=p.z+radius;
      const low=axis==='x'?minX:axis==='y'?minY:minZ,high=axis==='x'?maxX:axis==='y'?maxY:maxZ;
      for(let group=0;group<3;group++){
        const list=group===0?staticBounds:group===1?dynamic:gate;if(!list)continue;
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
  function spawn(index=0) { return {x:index%2?-25:25,y:.61,z:(Math.floor(index/2)%5-2)*1.4,vy:0,yaw:index%2?-Math.PI/2:Math.PI/2,pitch:0,grounded:false,jumpQueued:false}; }
  function step(p,input,dt) {
    p.yaw=Number.isFinite(input.yaw)?input.yaw:p.yaw;
    p.pitch=Math.max(-1.5,Math.min(1.5,Number.isFinite(input.pitch)?input.pitch:p.pitch));
    const f=(input.forward?1:0)-(input.back?1:0), s=(input.right?1:0)-(input.left?1:0);
    const norm=Math.hypot(f,s)||1, speed=(input.sprint?8:5)*(p.speedScale??1);
    const dx=((s*Math.cos(p.yaw)-f*Math.sin(p.yaw))/norm*speed+(p.kx||0))*dt;
    const dz=((-s*Math.sin(p.yaw)-f*Math.cos(p.yaw))/norm*speed+(p.kz||0))*dt;
    p.kx=(p.kx||0)*Math.exp(-8*dt);p.kz=(p.kz||0)*Math.exp(-8*dt);
    if((input.jump||p.jumpQueued) && p.grounded) {p.vy=8;p.grounded=false;}
    p.jumpQueued=false;
    p.vy=Math.max(-30,p.vy-23*dt);
    const dy=p.vy*dt,moved=move(p,{x:dx,y:dy,z:dz});
    p.grounded=dy<0&&Math.abs(moved.y-dy)>epsilon;
    if(Math.abs(moved.y-dy)>epsilon)p.vy=0;
    if(Math.abs(moved.x-dx)>epsilon)p.kx=0;
    if(Math.abs(moved.z-dz)>epsilon)p.kz=0;
    if(p.y < -20) Object.assign(p,spawn());
    return p;
  }
  const api={boxes,hazards,spawn,step,move,radius,height};
  if(typeof module!=='undefined') module.exports=api; else root.VoxelWorld=api;
})(globalThis);
