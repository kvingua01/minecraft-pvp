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
  const hazards=[{x:-10,y:0,z:20,radius:.95},{x:10,y:0,z:-20,radius:.95}];
  const radius=.32, height=1.8;
  // Enemy spawn rooms are solid to players; allies can leave and return freely.
  const enemySpawns={red:{x:27,y:32,z:0,w:10,h:64,d:12,solid:true},blue:{x:-27,y:32,z:0,w:10,h:64,d:12,solid:true}};
  const epsilon=1e-7;
  function bounds(p,axis) {
    return axis==='y'?[p.y,p.y+height]:[p[axis]-radius,p[axis]+radius];
  }
  // Sweep each axis against faces, keeping the other axes free to slide.
  // Never resolve a floor overlap by teleporting sideways to the floor's edge.
  function move(p,delta) {
    const moved={x:0,y:0,z:0},size={x:'w',y:'h',z:'d'};
    const solids=[...boxes,...(p.solids||[]),...(enemySpawns[p.team]?[enemySpawns[p.team]]:[])];
    for(const axis of ['x','z','y']) {
      let distance=delta[axis]||0;
      if(!distance)continue;
      const [low,high]=bounds(p,axis),other=['x','y','z'].filter(a=>a!==axis);
      for(const b of solids) {
        if(!b.solid)continue;
        if(!other.every(a=>{const [lo,hi]=bounds(p,a);return hi>b[a]-b[size[a]]/2+epsilon&&lo<b[a]+b[size[a]]/2-epsilon;}))continue;
        if(distance>0) {
          const gap=b[axis]-b[size[axis]]/2-high;
          if(gap>=-epsilon)distance=Math.min(distance,Math.max(0,gap));
        }else {
          const gap=b[axis]+b[size[axis]]/2-low;
          if(gap<=epsilon)distance=Math.max(distance,Math.min(0,gap));
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
    const norm=Math.hypot(f,s)||1, speed=(input.sprint?8:5)*(p.speedScale||1);
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
