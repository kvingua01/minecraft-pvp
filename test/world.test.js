const test=require('node:test');
const assert=require('node:assert/strict');
const W=require('../shared/world');
function simulate(p,input,ticks){for(let i=0;i<ticks;i++)W.step(p,input,1/60);return p;}
test('gravity lands on the floor; jumping returns to ground',()=>{
 const p={...W.spawn(),x:0,z:10,y:3};simulate(p,{},120);assert.ok(Math.abs(p.y)<.001);assert.ok(p.grounded);
 W.step(p,{jump:true},1/60);assert.ok(p.y>0);assert.ok(p.vy>0);simulate(p,{},120);assert.ok(Math.abs(p.y)<.001);
});
test('diagonal speed is normalized and sprint increases speed',()=>{
 const a={...W.spawn(),x:0,z:10,y:0},b={...a},c={...a};
 simulate(a,{forward:true,yaw:0},30);simulate(b,{forward:true,right:true,yaw:0},30);simulate(c,{forward:true,sprint:true,yaw:0},30);
 assert.ok(Math.abs(Math.hypot(a.x,a.z-10)-Math.hypot(b.x,b.z-10))<.001);assert.ok(c.z<a.z);
});
test('walls stop movement and roofs stop upward motion',()=>{
 const p={...W.spawn(),x:29,z:20,y:0};simulate(p,{right:true,yaw:0},180);assert.ok(p.x<=31.18+.001);
 const q={...W.spawn(),x:16,z:0,y:0,grounded:true};simulate(q,{jump:true},20);assert.ok(q.y+W.height<=3.5+.001);
});
test('map and spawns remain inside bounds with no spawn collision',()=>{
 for(let i=0;i<10;i++){const p=W.spawn(i);simulate(p,{},60);assert.ok(Math.abs(p.x)<=31);assert.ok(p.y>=0&&p.y<1);}
});
test('network corrections cannot push the player into a floor or wall',()=>{
 const p={...W.spawn(),x:31.18,z:10,y:0};
 for(let i=0;i<240;i++){
  // Delayed snapshots can point slightly below the floor or beyond a wall.
  W.move(p,{x:.01,y:-.005,z:0});
  W.step(p,{right:true,yaw:0},1/60);
  assert.ok(Math.abs(p.x-31.18)<1e-7);
  assert.equal(p.y,0);assert.equal(p.z,10);
 }
});
test('diagonal pressure slides along a wall without jitter or sideways teleportation',()=>{
 const p={...W.spawn(),x:31.18,y:0,z:10};
 for(let i=0;i<120;i++){
  W.step(p,{right:true,forward:true,yaw:0},1/60);
  W.move(p,{x:.02,y:-.001,z:.001});
  assert.ok(Math.abs(p.x-31.18)<1e-7);assert.equal(p.y,0);
 }
 assert.ok(p.z<4);assert.ok(p.z>0);
});
test('sweeps stop at the nearest wall even for a large displacement',()=>{
 const p={...W.spawn(),x:0,y:0,z:25};
 W.move(p,{x:100,y:0,z:0});assert.ok(Math.abs(p.x-31.18)<1e-7);
 W.move(p,{x:0,y:-100,z:0});assert.equal(p.y,0);
});

test('short jump taps survive until a physics step and are consumed once',()=>{
 const p={...W.spawn(),x:0,y:0,z:10,grounded:true,jumpQueued:true};W.step(p,{jump:false},1/60);assert.ok(p.vy>0);assert.equal(p.jumpQueued,false);simulate(p,{},120);assert.equal(p.y,0);assert.equal(p.vy,0);
});
