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
