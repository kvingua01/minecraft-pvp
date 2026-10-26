import * as THREE from '/vendor/three.module.js';
import {pixelTool,itemIcon} from '/pixel-items.js';
const C=window.CombatRules;
export function createCombatView({camera,scene,cube,socket,getSelf,getInput,isLocked}){
  const hand=new THREE.Group(),wind=new THREE.Group();camera.add(hand,wind);
  wind.position.set(-.34,-.23,-.72);
  const core=cube(wind,.25,.25,.25,0xe6fbff,0,0,0),band=cube(wind,.36,.065,.3,0x78cde8,0,0,0);
  const cap=cube(wind,.14,.065,.14,0xffffff,0,.16,0);band.rotation.y=.5;
  // Keep the offhand bright and unmistakable independently of world lighting.
  core.material=new THREE.MeshBasicMaterial({color:0xe6fbff});band.material=new THREE.MeshBasicMaterial({color:0x78cde8});cap.material=new THREE.MeshBasicMaterial({color:0xffffff});
  hand.position.set(.4,-.36,-.65);hand.scale.setScalar(.65);
  let hotbarStamp='',weapon='',blocking=false,clockOffset=0,clockSynced=false,swing=0,flash=0,hit=0,drawHeld=false,windNoticeAt=0,windThrownAt=0;
  const bursts=new Set(),arrows=new Map(),feed=document.querySelector('#kill-feed');
  function buildWeapon(group,key,remote=false){
    if(remote)group.traverse(m=>{if(m.userData.avatarMaterial)m.material.dispose();});group.clear();const scale=remote ? .8 : 1;group.userData.string=null;group.userData.arrow=null;
    if(!remote)cube(group,.16,.34,.18,0xc8916e,0,-.12,0);
    if(key.startsWith('flask:')){cube(group,.18,.25,.18,window.PotionRules.items[key.slice(6)].color,0,.18,0);cube(group,.08,.13,.08,0xc5dcd6,0,.36,0);cube(group,.09,.05,.09,0xb18f61,0,.45,0);
    }else if(['sword','axe','mace','katana','dagger','pickaxe'].includes(key)){
      pixelTool(group,key);
      /* Legacy tool silhouettes replaced by merged pixel geometry.

      cube(group,.1,.48,.1,0x70583c,0,.17,0);
      if(key==='sword'){cube(group,.34,.08,.09,0x715a38,0,.24,0);cube(group,.15,.56,.065,0xcbdde0,0,.56,0);cube(group,.07,.08,.065,0xf0f6f4,0,.88,0);cube(group,.035,.53,.07,0x718c96,-.075,.57,0);}
      if(key==='axe'){cube(group,.3,.24,.09,0xa8c6c5,.1,.55,0);cube(group,.12,.38,.09,0xe4e6d3,.3,.48,0);cube(group,.08,.16,.09,0x718c96,-.09,.58,0);}
      if(key==='mace'){cube(group,.38,.37,.32,0x819ba4,0,.56,0);cube(group,.45,.09,.4,0xcac6a1,0,.56,0);}
      */
    }else if(key==='bow'){
      for(const side of [-1,1]){const limb=cube(group,.07,.42,.09,0xb98a4f,0,side*.23+.15,0);limb.rotation.z=side*-.3;}
      group.userData.string=cube(group,.02,.77,.02,0xebe1c3,.1,.15,0);group.userData.arrow=cube(group,.035,.035,.6,0xc7bea1,.08,.15,0);
    }else if(['staff','darkstaff','firestaff','naturestaff'].includes(key)){cube(group,.09,.9,.09,0x767e94,0,.22,0);cube(group,.25,.25,.25,({darkstaff:0x9b74ce,firestaff:0xf6a34c,naturestaff:0x8ecb65}[key]||0xa0e5f7),0,.75,0);
    }else if(key==='launcher'){cube(group,.25,.25,.55,0x799b88,0,.15,0);cube(group,.15,.24,.17,0xbcdf9a,0,.34,.05);
    }else {
      cube(group,.12,.16,.6,0x805e3c,0,.18,0);cube(group,.65,.08,.12,0xc6c7ac,0,.22,-.18);cube(group,.4,.025,.025,0xd7d7bd,0,.22,.05);
    }
    if(remote)group.scale.setScalar(scale);
  }
  function action(kind){const p=getSelf();if(!p||p.hp<=0||!isLocked())return;socket.emit('input',getInput());socket.emit('action',{kind,time:Date.now()+clockOffset});}
  function throwWind(){
    const p=getSelf();if(!p||p.hp<=0||!isLocked())return;
    socket.emit('input',getInput());socket.timeout(3000).emit('wind-use',{},(error,result)=>{
      if(!getSelf()||getSelf().id!==p.id)return;
      const text=error?'Wind charge request timed out. Try again.':result?.error||'WIND CHARGE THROWN';
      document.querySelector('#combat-note').textContent=text;windNoticeAt=performance.now();
      if(result?.ok){p.windReady=result.readyAt;windThrownAt=performance.now();}
    });
  }
  function release(){if(drawHeld&&getSelf())socket.volatile.emit('action',{kind:'cancel'});drawHeld=false;blocking=false;}
  window.addEventListener('mousedown',e=>{
    if(!isLocked()||!getSelf()||getSelf().hp<=0)return;
    if(e.button===2){throwWind();return;}
    if(e.button===0){if(getSelf().weapon==='bow'){drawHeld=true;action('draw');}else action('attack');}
  });
  window.addEventListener('mouseup',e=>{if(e.button===0&&drawHeld){action('release');drawHeld=false;}if(e.button===2){blocking=false;if(getSelf())socket.volatile.emit('input',getInput());}});
  window.addEventListener('blur',release);
  document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement){release();if(getSelf())socket.volatile.emit('input',{...getInput(),block:false});}});
  window.addEventListener('keydown',e=>{if(!isLocked()||e.repeat)return;const index=Number(e.key)-1;if(index>=0&&index<9){drawHeld=false;blocking=false;socket.emit('equip',window.HeroRules.loadout(getSelf().hero)[index]);}});
  socket.on('combat',event=>{
    const p=getSelf();if(!p)return;
    if(event.type==='wind-burst'){const mesh=new THREE.Mesh(new THREE.RingGeometry(.65,1,12),new THREE.MeshBasicMaterial({color:0xd9faff,side:THREE.DoubleSide,transparent:true,opacity:.8,depthWrite:false}));mesh.rotation.x=-Math.PI/2;mesh.position.set(event.x,event.y+.08,event.z);scene.add(mesh);bursts.add({mesh,start:performance.now()});}
    if(event.type==='attack'&&event.source===p.id)swing=performance.now();
    if(event.type==='hit'&&event.target===p.id){flash=performance.now();document.querySelector('#damage').textContent=`−${event.amount}`;}
    if(event.type==='hit'&&event.source===p.id){hit=performance.now();document.querySelector('#hit-marker').textContent=event.critical?'✦':'×';}
    if(event.type==='kill'){
      const item=document.createElement('div');item.textContent=`${event.sourceName} → ${event.targetName} · ${event.weapon}`;feed.prepend(item);while(feed.children.length>5)feed.lastChild.remove();setTimeout(()=>item.remove(),7000);
    }
  });
  function snapshot(state){
    if(!clockSynced)clockOffset=state.serverTime-Date.now();const seen=new Set();
    for(const a of state.projectiles||[]){
      seen.add(a.id);let m=arrows.get(a.id);
      if(!m){
        m=new THREE.Group();const flask=a.kind==='wind'||a.kind==='potion'||a.kind?.startsWith('flask:'),size=flask ? .22 : .06;
        const color=a.kind==='wind'?0xe6fbff:['ember','fireball'].includes(a.kind)?0xf59a3c:['toxic','dart','nature'].includes(a.kind)?0x8cc965:a.kind==='dark'?0xa87bd4:a.kind?.startsWith('flask:')?window.PotionRules.items[a.kind.slice(6)].color:a.kind==='ice'||a.kind==='frost'?0x9ee6ff:a.kind==='potion'?0xa9e5a1:a.kind==='explosive'?0xf4b273:0xe8d2a2;
        cube(m,size,size,flask ? .22 : .65,color,0,0,0);scene.add(m);arrows.set(a.id,m);
      }
      m.position.set(a.x,a.y,a.z);m.lookAt(a.x+a.vx,a.y+a.vy,a.z+a.vz);
    }
    for(const [id,m]of arrows)if(!seen.has(id)){scene.remove(m);arrows.delete(id);}
  }
  function clear(){for(const b of bursts){scene.remove(b.mesh);b.mesh.geometry.dispose();b.mesh.material.dispose();}bursts.clear();hotbarStamp='';clockSynced=false;release();for(const m of arrows.values())scene.remove(m);arrows.clear();feed.replaceChildren();document.querySelector('#death').hidden=true;document.querySelector('#damage').style.opacity=0;document.querySelector('#hit-marker').style.opacity=0;}
  function animateWeapon(group,key,phase){
    const a=Math.sin(Math.PI*phase);
    group.rotation.set(0,0,-.22);
    if(['sword','katana','dagger'].includes(key)){group.rotation.z=-.22+a*1.4;group.rotation.x=-a*.6;}
    if(key==='axe'){group.rotation.z=-.22+a*.9;group.rotation.x=-a*1.1;}
    if(key==='mace'){group.rotation.x=-a*1.6;group.position.y-=a*.08;}
    if(key==='crossbow')group.rotation.x=-a*.55;
    if(['staff','darkstaff','firestaff','naturestaff'].includes(key)||key==='launcher')group.rotation.x=-a*.3;
  }
  function frame(now){
    for(const b of bursts){const age=(now-b.start)/500;b.mesh.scale.setScalar(1+age*3);b.mesh.material.opacity=Math.max(0,.8*(1-age));if(age>=1){scene.remove(b.mesh);b.mesh.geometry.dispose();b.mesh.material.dispose();bursts.delete(b);}}
    const p=getSelf();hand.visible=wind.visible=!!p;if(!p)return;
    const time=Date.now()+clockOffset,w=C.weapons[p.weapon];
    if(weapon!==p.weapon){weapon=p.weapon;buildWeapon(hand,weapon);}
    const duration=weapon==='crossbow'?w.cooldown:Math.min(w.cooldown,800),phase=Math.min(1,(now-swing)/duration);
    animateWeapon(hand,weapon,swing?phase:0);
    if(p.drawAt&&weapon==='bow'){const charge=Math.min(1,(time-p.drawAt)/1000);hand.position.z=-.65+charge*.12;hand.rotation.y=-charge*.2;hand.userData.string.position.z=charge*.2;hand.userData.arrow.position.z=charge*.2;}else {hand.position.z=-.65;if(hand.userData.string){hand.userData.string.position.z=0;hand.userData.arrow.position.z=0;}}
    wind.visible=p.hp>0;wind.rotation.y=now*.002;
    const throwAge=now-windThrownAt;wind.position.y=-.23-(throwAge<300?Math.sin(throwAge/300*Math.PI)*.16:0);
    wind.scale.setScalar(p.windReady>time?.9:1);
    if(windNoticeAt&&now-windNoticeAt>2400){document.querySelector('#combat-note').textContent='';windNoticeAt=0;}
    hand.visible=p.hp>0;
    const heartCount=Math.ceil((p.maxHp||100)/20),filled=Math.ceil(p.hp/20);document.querySelector('#hearts').textContent=Array.from({length:heartCount},(_,i)=>i<filled?'♥':'♡').join('');document.querySelector('#armor-icons').textContent='◆'.repeat(Math.round(p.armor*20));
    document.querySelector('#health').max=p.maxHp||100;document.querySelector('#health').value=p.hp;document.querySelector('#health-label').textContent=`${Math.ceil(p.hp)} / ${p.maxHp||100}`;
    document.querySelector('#armor-label').textContent=`ARMOR ${Math.round(p.armor*100)}% · 4 PIECES`;
    const remaining=Math.max(0,p.nextAttack-time);document.querySelector('#attack-ready').value=1-remaining/(w.cooldown/(p.attackSpeed||1));
    document.querySelector('#weapon-status').textContent=p.drawAt?`DRAW ${Math.min(100,Math.round((time-p.drawAt)/10))}%`:remaining>0?(weapon==='crossbow'?'RELOADING ':'READY IN ')+(remaining/1000).toFixed(1)+'s':C.inSpawn(p)?'SPAWN SANCTUARY':p.protectedUntil>time?'SPAWN PROTECTION':'READY';
    const stamp=p.hero+':'+weapon;if(stamp!==hotbarStamp){hotbarStamp=stamp;document.querySelectorAll('[data-weapon]').forEach((el,i)=>{el.dataset.weapon=window.HeroRules.loadout(p.hero)[i];el.replaceChildren();const image=document.createElement('img');image.src=itemIcon(el.dataset.weapon);image.alt='';el.append(image,document.createTextNode(`${i+1} ${C.weapons[el.dataset.weapon].name}`));el.classList.toggle('selected',el.dataset.weapon===weapon);});}
    document.querySelector('#shield-status').textContent=C.inSpawn(p)?'WIND CHARGE · LEAVE SPAWN TO THROW':p.windReady>time?`WIND CHARGE ${((p.windReady-time)/1000).toFixed(1)}s`:'RMB: WIND CHARGE · AIM AT YOUR FEET';
    document.querySelector('#damage').style.opacity=now-flash<400?1:0;document.querySelector('#hit-marker').style.opacity=now-hit<250?1:0;
    document.querySelector('#death').hidden=p.hp>0;document.querySelector('#respawn-time').textContent=`${Math.max(0,Math.ceil((p.deadUntil-time)/1000))}s`;
  }
  return {syncClock:offset=>{if(Number.isFinite(offset)){clockOffset=clockSynced?clockOffset*.8+offset*.2:offset;clockSynced=true;}},hand,offhand:()=>({wind:wind.visible,shield:false}),buildWeapon,animateWeapon,snapshot,frame,clear,serverNow:()=>Date.now()+clockOffset,isBlocking:()=>false};
}
