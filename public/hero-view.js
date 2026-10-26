import * as THREE from '/vendor/three.module.js';
import {portrait} from '/skins.js';
const H=window.HeroRules;
export function createHeroView({scene,camera,cube,socket,getSelf,getInput,isLocked,serverNow}){
 const blockGeometry=new THREE.BoxGeometry(1,1,1),rainDummy=new THREE.Object3D();
 const $=s=>document.querySelector(s),effects=new Map(),flash=$('#ability-flash');let flashedAt=0,solidsKey='',cachedSolids=[];
 let queuedHero=null;
 function paintPicker(selector,value){
  const grid=$(selector+'-options');if($(selector).value===value&&grid.dataset.selected===value)return;
  $(selector).value=value;grid.dataset.selected=value;
  for(const button of $(selector+'-options').querySelectorAll('button'))button.setAttribute('aria-pressed',String(button.dataset.hero===value));
 }
 function describe(){const h=H.heroes[$('#hero').value];$('#hero-description').textContent=`${h.health} HP · ${Math.round(h.armor*100)}% armor · ${h.weapon}\nQ — ${h.q.name}: ${h.q.description}\nE — ${h.e.name}: ${h.e.description}\nR — ${h.r.name}: ${h.r.description}`;}
 function queueHero(id){
  if(!socket.connected||!getSelf()){$('#class-note').textContent='Reconnect before choosing your next hero.';return;}
  queuedHero=id;paintPicker('#next-hero',id);$('#class-note').textContent=`${H.heroes[id].name} selected for your next respawn.`;
  socket.timeout(4000).emit('hero-select',id,(error,result)=>{
   if(error||result?.error){queuedHero=null;$('#class-note').textContent=error?'Connection timed out. Please choose again.':result.error;}
  });
 }
 for(const selector of ['#hero','#next-hero']){
  const select=$(selector),grid=$(selector+'-options');
  for(const [id,h]of Object.entries(H.heroes)){
   const option=document.createElement('option');option.value=id;option.textContent=`${h.name} · ${h.role}`;select.append(option);
   const button=document.createElement('button');button.type='button';button.dataset.hero=id;button.className='hero-card';button.setAttribute('aria-pressed','false');
   const name=document.createElement('strong'),role=document.createElement('span'),stats=document.createElement('small');name.textContent=h.name;role.textContent=h.role;stats.textContent=`${h.health} HP · ${Math.round(h.armor*100)}% armor`;
   const preview=document.createElement('img');preview.src=portrait(id);preview.alt=h.name+' character';preview.className='hero-portrait';button.append(preview,name,role,stats);button.onclick=()=>{if(selector==='#hero'){paintPicker(selector,id);describe();}else queueHero(id);};grid.append(button);
  }
  paintPicker(selector,select.value);
 }
 $('#hero').onchange=()=>{paintPicker('#hero',$('#hero').value);describe();};describe();
 $('#next-hero').onchange=()=>queueHero($('#next-hero').value);
 window.addEventListener('keydown',e=>{if(e.repeat||!isLocked()||!['KeyQ','KeyE','KeyR'].includes(e.code))return;e.preventDefault();socket.emit('input',getInput());socket.timeout(4000).emit('ability',e.code.at(-1).toLowerCase(),(error,result)=>{if(error||result?.error){$('#ability-message').textContent=result?.error||'Connection timed out.';flashedAt=performance.now();}});});
 const dagger=new THREE.Group();camera.add(dagger);dagger.position.set(-.38,-.38,-.7);cube(dagger,.12,.32,.14,0xb98e71,0,0,0);cube(dagger,.08,.5,.04,0xd9e3e2,0,.37,0);dagger.rotation.z=.25;
 const burst=new THREE.Mesh(new THREE.RingGeometry(.2,1,24),new THREE.MeshBasicMaterial({color:0xb9ecfc,transparent:true,opacity:.3,side:THREE.DoubleSide,depthWrite:false}));burst.position.z=-.8;camera.add(burst);burst.visible=false;
 socket.on('hero',e=>{
  if(e.type==='heal'&&e.target===getSelf()?.id){flashedAt=performance.now();flash.style.background='#72f5c222';$('#ability-message').textContent=`+${Math.ceil(e.amount)} HEALTH`;}
  if(e.source===getSelf()?.id&&(e.type==='ability'||e.type==='slam')){flashedAt=performance.now();$('#ability-message').textContent=e.name||'GROUND SLAM';flash.style.background=e.hero==='frost'?'#83cfff22':'#d5e58a22';}
 });
 function build(e){const group=new THREE.Group();group.position.set(e.x,e.y,e.z);
  const color=e.kind==='wall'?e.color:['inferno','firetrail'].includes(e.kind)?0xf59a42:['plague','vines'].includes(e.kind)?0x78a63b:e.kind==='splash'?window.PotionRules.items[e.potionKind].color:e.kind==='poison'?0x94c661:e.kind==='blizzard'?0x9cdbff:e.kind==='storm'?0xe1bb8d:0x9ce4bd;
  if(e.kind==='wall'){
   const alongX=e.w>e.d,cols=Math.round(alongX?e.w:e.d),rows=Math.round(e.h),mesh=new THREE.InstancedMesh(blockGeometry,new THREE.MeshLambertMaterial({color}),cols*rows),dummy=new THREE.Object3D();
   mesh.userData.ownedMaterial=true;
   for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
    dummy.position.set(alongX?x-(cols-1)/2:0,y-(rows-1)/2,alongX?0:x-(cols-1)/2);dummy.scale.set(alongX?.96:e.w,.96,alongX?e.d:.96);dummy.updateMatrix();mesh.setMatrixAt(y*cols+x,dummy.matrix);
   }
   group.add(mesh);
  }
  else {
   const mat=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.5,side:THREE.DoubleSide,depthWrite:false});const ring=new THREE.Mesh(new THREE.RingGeometry(e.radius-.12,e.radius,40),mat);ring.rotation.x=-Math.PI/2;ring.position.y=.04;group.add(ring);
   const column=new THREE.Mesh(new THREE.CylinderGeometry(e.radius,e.radius,1.5,20,1,true),mat.clone());column.material.opacity=.07;column.position.y=.75;group.add(column);
   if(['storm','blizzard','inferno','plague','roots','firetrail','vines'].includes(e.kind)){const rain=new THREE.InstancedMesh(blockGeometry,new THREE.MeshLambertMaterial({color}),12);rain.userData.ownedMaterial=true;rain.userData.radius=e.radius;rain.instanceMatrix.setUsage(THREE.DynamicDrawUsage);group.userData.rain=rain;group.add(rain);}
  }
  scene.add(group);return {group,kind:e.kind};
 }
 function remove(effect){scene.remove(effect.group);effect.group.traverse(m=>{if(m.userData.ownedMaterial)m.material.dispose();if(m.isMesh&&m.geometry!==undefined&&!m.isInstancedMesh){if(m.geometry.type!=='BoxGeometry')m.geometry.dispose();if(['RingGeometry','CylinderGeometry'].includes(m.geometry.type))m.material.dispose();}});}
 function snapshot(state){const ids=new Set();for(const e of state.effects||[]){ids.add(e.id);let effect=effects.get(e.id);if(!effect){effect=build(e);effects.set(e.id,effect);}effect.group.position.set(e.x,e.y,e.z);}
  for(const [id,e]of effects)if(!ids.has(id)){remove(e);effects.delete(id);}
  const walls=(state.effects||[]).filter(e=>e.kind==='wall'),key=JSON.stringify(walls.map(e=>[e.id,e.x,e.y,e.z,e.w,e.h,e.d]));if(key!==solidsKey){solidsKey=key;cachedSolids=walls.map(e=>({...e,solid:true}));}const p=getSelf();if(p)p.solids=cachedSolids;
 }
 function frame(now){const p=getSelf();dagger.visible=!!p&&p.hp>0&&p.hero==='assassin'&&p.weapon==='sword';burst.visible=!!p&&now-flashedAt<450&&flashedAt>0;
  if(burst.visible){const t=(now-flashedAt)/450;burst.scale.setScalar(.2+t);burst.material.opacity=.35*(1-t);}flash.style.opacity=now-flashedAt<600?.8:0;$('#ability-message').style.opacity=now-flashedAt<1800?1:0;
  $('#hero-hud').hidden=!p;if(!p)return;const h=H.heroes[p.hero],time=serverNow();dagger.rotation.x=-Math.sin(Math.PI*Math.min(1,Math.max(0,(time-(p.attackAt||0))/450)))*.7;$('#hero-name').textContent=`${h.name.toUpperCase()} · ${h.role.toUpperCase()}`;
  for(const key of ['q','e']){const wait=Math.max(0,(p.abilityReady?.[key]||0)-time);$('#ability-'+key).textContent=`${key.toUpperCase()} · ${h[key].name} · ${wait?(wait/1000).toFixed(1)+'s':'READY'}`;}
  $('#ultimate').value=p.ult||0;$('#ability-r').textContent=`R · ${h.r.name} · ${Math.floor(p.ult||0)}%`;
  const active=Object.entries(p.status||{}).filter(([_,end])=>end>time).map(([name])=>({slowPotion:'SLOWED',fireResistance:'FIRE RESISTANCE',regeneration:'REGENERATION'}[name]||name.toUpperCase()));$('#hero-status').textContent=active.join(' · ');
  if(queuedHero===p.pendingHero)queuedHero=null;paintPicker('#next-hero',queuedHero||p.pendingHero||p.hero);
  for(const e of effects.values()){const rain=e.group.userData.rain;if(!rain)continue;for(let i=0;i<12;i++){rainDummy.position.set(Math.sin(i*2.4)*rain.userData.radius*.8,1+((now*.004+i*.5)%5),Math.cos(i*2.4)*rain.userData.radius*.8);rainDummy.scale.set(.05,e.kind==='storm'?.65:.15,.05);rainDummy.updateMatrix();rain.setMatrixAt(i,rainDummy.matrix);}rain.instanceMatrix.needsUpdate=true;}
 }
 function clear(){queuedHero=null;solidsKey='';cachedSolids=[];for(const e of effects.values())remove(e);effects.clear();dagger.visible=false;burst.visible=false;$('#hero-hud').hidden=true;$('#class-note').textContent='';flashedAt=0;}
 return {snapshot,frame,clear};
}
