const test=require('node:test'),assert=require('node:assert/strict'),W=require('../shared/world'),Maps=require('../shared/maps'),Extra=require('../shared/extra-maps');
test('glass walls, windows and tunnel roofs in expanded maps are solid',()=>{
 for(const id of Object.keys(Extra.definitions))for(const b of W.getMap(id).boxes.filter(b=>b.tile==='glass'))assert.equal(b.solid,true,id+' glass at '+[b.x,b.y,b.z]);
});
test('underwater glass tunnels stop walking, sprinting and high knockback from both sides',()=>{
 for(const x of [-12,12])for(const z of [-18,0,18])for(const sign of [-1,1]){
  const p={map:'underwater',x,y:0,z:z+sign*6};W.move(p,{z:-sign*12});assert.ok(Math.abs(p.z-(z+sign*(2+.06+W.radius)))<1e-7);
  const walker={...W.spawn(),map:'underwater',x,y:0,z:z+sign*6};for(let i=0;i<120;i++)W.step(walker,{forward:sign===1,back:sign===-1,sprint:true,yaw:0},1/60);
  assert.ok(sign*(walker.z-z)>=2+.06+W.radius-1e-7);
  const knock={map:'underwater',x,y:0,z:z+sign*6};W.move(knock,{z:-sign*100});assert.ok(sign*(knock.z-z)>=2+.06+W.radius-1e-7);
 }
});
test('glass tunnels retain open entrances and solid ceilings',()=>{
 const p={map:'underwater',x:-19,y:0,z:0};W.move(p,{x:14});assert.equal(p.x,-5);
 const q={map:'underwater',x:-12,y:0,z:0};W.move(q,{y:10});assert.ok(Math.abs(q.y+W.height-3.225)<1e-7);
});
for(const id of Object.keys(Maps.definitions))test(id+' solid wall faces cannot be crossed by a large sweep',()=>{
 const boxes=W.getMap(id).boxes.filter(b=>b.solid);let checked=0;
 function overlaps(p){return boxes.some(b=>p.x+W.radius>b.x-b.w/2+1e-6&&p.x-W.radius<b.x+b.w/2-1e-6&&p.y+W.height>b.y-b.h/2+1e-6&&p.y<b.y+b.h/2-1e-6&&p.z+W.radius>b.z-b.d/2+1e-6&&p.z-W.radius<b.z+b.d/2-1e-6);}
 for(const b of boxes.filter(b=>b.h>=1.8))for(const axis of ['x','z'])for(const sign of [-1,1]){
  const size=axis==='x'?b.w:b.d,edge=b[axis]+sign*size/2;
  const p={map:id,x:b.x,y:b.y-b.h/2,z:b.z};p[axis]=edge+sign*(W.radius+.02);if(overlaps(p))continue;
  W.move(p,{[axis]:-sign*100});assert.ok(sign*(p[axis]-edge)>=W.radius-1e-7,id+' '+axis+' wall '+JSON.stringify(b));checked++;
 }
 assert.ok(checked>0);
});
