const test=require('node:test'),assert=require('node:assert/strict');
const {Objective}=require('../lib/objective');
const {Combat}=require('../lib/combat');
const W=require('../shared/world');
function fixture(){const red={id:'r',team:'red',hp:100,x:0,y:.24,z:0},blue={id:'b',team:'blue',hp:100,x:12,y:0,z:0},room=new Map([['r',red],['b',blue]]),match=new Objective('r');return {red,blue,room,match};}
function ticks(match,room,count){for(let i=0;i<count;i++)match.tick(room,1/60);}
test('only living players standing on the point capture it; a full capture takes ten seconds',()=>{
 const {red,room,match}=fixture();red.hp=0;ticks(match,room,360);assert.equal(match.meter,0);red.hp=100;red.y=5;ticks(match,room,60);assert.equal(match.meter,0);
 red.y=.24;red.x=3.9;red.z=3.9;ticks(match,room,60);assert.equal(match.meter,0);red.x=0;red.z=0;ticks(match,room,599);assert.equal(match.control,null);ticks(match,room,1);assert.equal(match.control,'red');assert.equal(match.meter,100);
});
test('opponents contest the objective and freeze capture and score',()=>{
 const {red,blue,room,match}=fixture();ticks(match,room,600);const score=match.scores.red;Object.assign(blue,{x:0,z:1,y:.24});ticks(match,room,180);
 assert.ok(match.contested);assert.equal(match.meter,100);assert.equal(match.scores.red,score);
 blue.hp=0;ticks(match,room,60);assert.equal(match.contested,false);assert.ok(match.scores.red>score);
});
test('enemy capture neutralizes the owner before claiming; abandoned capture does not invent progress',()=>{
 const {red,blue,room,match}=fixture();ticks(match,room,600);red.x=10;Object.assign(blue,{x:0,z:0,y:.24});const score=match.scores.red;
 ticks(match,room,601);assert.equal(match.control,null);assert.equal(match.scores.red,score);ticks(match,room,600);assert.equal(match.control,'blue');assert.equal(match.meter,-100);
 blue.x=10;const before=match.scores.blue;ticks(match,room,60);assert.ok(match.scores.blue>before);assert.equal(match.meter,-100);
});
test('score reaches exactly 300, declares one winner, and freezes until reset',()=>{
 const {red,room,match}=fixture();ticks(match,room,600);red.x=10;ticks(match,room,18000);assert.equal(match.winner,'red');assert.equal(match.scores.red,300);assert.equal(match.status,'finished');
 const state=match.snapshot();ticks(match,room,1000);assert.deepEqual(match.snapshot(),state);match.reset();assert.equal(match.winner,null);assert.equal(match.control,null);assert.deepEqual(match.scores,{red:0,blue:0});
});
test('waiting for both teams pauses progress; the host transfers on departure',()=>{
 const {room,match}=fixture();room.delete('b');ticks(match,room,600);assert.equal(match.meter,0);assert.equal(match.status,'waiting');room.delete('r');match.tick(room,1/60);assert.equal(match.host,null);
});
test('team choice balances new players and never exceeds five per team',()=>{
 const m=new Objective('r'),room=new Map();assert.equal(m.chooseTeam(room,'auto'),'red');
 for(let i=0;i<5;i++)room.set(i,{team:'red'});assert.equal(m.chooseTeam(room,'red'),null);assert.equal(m.chooseTeam(room,'auto'),'blue');
 for(let i=5;i<10;i++)room.set(i,{team:'blue'});assert.equal(m.chooseTeam(room,'blue'),null);
});
test('friendly melee and projectiles cannot damage allies, and finished matches reject combat',()=>{
 const engine=new Combat(()=>{}),a={id:'a',team:'red',...W.spawn(),x:0,y:0,z:10,input:{},life:0},b={id:'b',team:'red',...W.spawn(),x:0,y:0,z:7,input:{},life:0},room=new Map([['a',a],['b',b]]);
 engine.init(a,1,10000);engine.init(b,3,10000);a.protectedUntil=b.protectedUntil=0;a.yaw=0;
 engine.attack(room,a,'attack',10000);assert.equal(b.hp,100);engine.select(a,'crossbow');engine.attack(room,a,'attack',12000);for(let i=0;i<5;i++)engine.tick(room,12000+i*17,1/60);assert.equal(b.hp,100);
 b.team='blue';engine.matchOver=true;assert.equal(engine.attack(room,a,'attack',15000),false);assert.equal(engine.damage(room,b,a,100,15000),false);assert.equal(b.hp,100);
});
test('enemy spawn boundaries stop entry while your own room stays accessible',()=>{
 for(const team of ['red','blue']){
 const sign=team==='red'?1:-1,p={...W.spawn(),team,x:sign*20,y:.6,z:0};W.move(p,{x:sign*10,y:0,z:0});assert.ok(Math.abs(p.x-sign*21.68)<.001);
 p.x=-sign*20;W.move(p,{x:-sign*5,y:0,z:0});assert.equal(p.x,-sign*25);
 }
});

test('three points capture independently, teammates accelerate capture, and owned points stack income',()=>{const {room,match,red}=fixture();for(const point of match.points){point.control='red';point.meter=100;}red.x=10;match.tick(room,1);assert.equal(match.scores.red,3);match.reset();const a=match.points[0];Object.assign(red,{x:a.x,y:a.y,z:a.z});room.set('r2',{...red,id:'r2'});ticks(match,room,400);assert.equal(a.control,'red');assert.equal(match.points[1].control,null);assert.equal(match.points[2].control,null);});
