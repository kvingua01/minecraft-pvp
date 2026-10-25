import * as THREE from '/vendor/three.module.js';
const C=window.CombatRules;
export function createCombatView({camera,scene,cube,socket,getSelf,getInput,isLocked}){
  const hand=new THREE.Group(),shield=new THREE.Group();camera.add(hand,shield);
  hand.position.set(.4,-.36,-.65);hand.scale.setScalar(.65);shield.position.set(-.47,-.52,-.76);shield.scale.setScalar(.65);
  cube(shield,.52,.68,.12,0x697f8e,0,0,0);cube(shield,.36,.51,.14,0xba9c62,0,0,0);
  let weapon='',blocking=false,clockOffset=0,swing=0,flash=0,hit=0,drawHeld=false;
  const arrows=new Map(),feed=document.querySelector('#kill-feed');
  function buildWeapon(group,key,remote=false){
    if(remote)group.traverse(m=>{if(m.userData.avatarMaterial)m.material.dispose();});group.clear();const scale=remote ? .8 : 1;group.userData.string=null;group.userData.arrow=null;
    if(!remote)cube(group,.16,.34,.18,0xc8916e,0,-.12,0);
    if(['sword','axe','mace'].includes(key)){
      cube(group,.1,.48,.1,0x70583c,0,.17,0);
      if(key==='sword'){cube(group,.36,.055,.13,0xd6b66b,0,.24,0);cube(group,.12,.66,.055,0xd8e2d7,0,.59,0);}
      if(key==='axe'){cube(group,.36,.32,.09,0xa8c6c5,.1,.52,0);cube(group,.14,.26,.08,0xe4e6d3,.31,.52,0);}
      if(key==='mace'){cube(group,.38,.37,.32,0x819ba4,0,.56,0);cube(group,.45,.09,.4,0xcac6a1,0,.56,0);}
    }else if(key==='bow'){
      for(const side of [-1,1]){const limb=cube(group,.07,.42,.09,0xb98a4f,0,side*.23+.15,0);limb.rotation.z=side*-.3;}
      group.userData.string=cube(group,.02,.77,.02,0xebe1c3,.1,.15,0);group.userData.arrow=cube(group,.035,.035,.6,0xc7bea1,.08,.15,0);
    }else if(key==='staff'){cube(group,.09,.9,.09,0x767e94,0,.22,0);cube(group,.25,.25,.25,0xa0e5f7,0,.75,0);
    }else if(key==='launcher'){cube(group,.25,.25,.55,0x799b88,0,.15,0);cube(group,.15,.24,.17,0xbcdf9a,0,.34,.05);
    }else {
      cube(group,.12,.16,.6,0x805e3c,0,.18,0);cube(group,.65,.08,.12,0xc6c7ac,0,.22,-.18);cube(group,.4,.025,.025,0xd7d7bd,0,.22,.05);
    }
    if(remote)group.scale.setScalar(scale);
  }
  function action(kind){const p=getSelf();if(!p||p.hp<=0||!isLocked())return;socket.emit('input',getInput());socket.emit('action',{kind,time:Date.now()+clockOffset});}
  function release(){if(drawHeld&&getSelf())socket.emit('action',{kind:'cancel'});drawHeld=false;blocking=false;}
  window.addEventListener('mousedown',e=>{
    if(!isLocked()||!getSelf()||getSelf().hp<=0)return;
    if(e.button===2){blocking=true;socket.emit('input',getInput());}
    if(e.button===0){if(getSelf().weapon==='bow'){drawHeld=true;action('draw');}else action('attack');}
  });
  window.addEventListener('mouseup',e=>{if(e.button===0&&drawHeld){action('release');drawHeld=false;}if(e.button===2){blocking=false;if(getSelf())socket.emit('input',getInput());}});
  window.addEventListener('blur',release);
  document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement){release();if(getSelf())socket.emit('input',{...getInput(),block:false});}});
  window.addEventListener('keydown',e=>{if(!isLocked()||e.repeat)return;const index=Number(e.key)-1;if(index>=0&&index<5){drawHeld=false;blocking=false;socket.emit('equip',window.HeroRules.loadout(getSelf().hero)[index]);}});
  socket.on('combat',event=>{
    const p=getSelf();if(!p)return;
    if(event.type==='attack'&&event.source===p.id)swing=performance.now();
    if(event.type==='hit'&&event.target===p.id){flash=performance.now();document.querySelector('#damage').textContent=`−${event.amount}`;}
    if(event.type==='hit'&&event.source===p.id){hit=performance.now();document.querySelector('#hit-marker').textContent=event.critical?'✦':'×';}
    if(event.type==='block'&&(event.target===p.id||event.source===p.id)){document.querySelector('#combat-note').textContent=event.disabled?'SHIELD DISABLED':'BLOCKED';setTimeout(()=>document.querySelector('#combat-note').textContent='',1200);}
    if(event.type==='kill'){
      const item=document.createElement('div');item.textContent=`${event.sourceName} → ${event.targetName} · ${event.weapon}`;feed.prepend(item);while(feed.children.length>5)feed.lastChild.remove();setTimeout(()=>item.remove(),7000);
    }
  });
  function snapshot(state){
    clockOffset=state.serverTime-Date.now();const seen=new Set();
    for(const a of state.projectiles||[]){seen.add(a.id);let m=arrows.get(a.id);if(!m){m=new THREE.Group();cube(m,a.kind==='potion'?.22:.06,a.kind==='potion'?.22:.06,a.kind==='potion'?.22:.65,a.kind==='ice'||a.kind==='frost'?0x9ee6ff:a.kind==='potion'?0xa9e5a1:a.kind==='explosive'?0xf4b273:0xe8d2a2,0,0,0);scene.add(m);arrows.set(a.id,m);}m.position.set(a.x,a.y,a.z);m.lookAt(a.x+a.vx,a.y+a.vy,a.z+a.vz);}
    for(const [id,m]of arrows)if(!seen.has(id)){scene.remove(m);arrows.delete(id);}
  }
  function clear(){release();for(const m of arrows.values())scene.remove(m);arrows.clear();feed.replaceChildren();document.querySelector('#death').hidden=true;document.querySelector('#damage').style.opacity=0;document.querySelector('#hit-marker').style.opacity=0;}
  function animateWeapon(group,key,phase){
    const a=Math.sin(Math.PI*phase);
    group.rotation.set(0,0,-.22);
    if(key==='sword'){group.rotation.z=-.22+a*1.4;group.rotation.x=-a*.6;}
    if(key==='axe'){group.rotation.z=-.22+a*.9;group.rotation.x=-a*1.1;}
    if(key==='mace'){group.rotation.x=-a*1.6;group.position.y-=a*.08;}
    if(key==='crossbow')group.rotation.x=-a*.55;
    if(key==='staff'||key==='launcher')group.rotation.x=-a*.3;
  }
  function frame(now){
    const p=getSelf();hand.visible=shield.visible=!!p;if(!p)return;
    const time=Date.now()+clockOffset,w=C.weapons[p.weapon];
    if(weapon!==p.weapon){weapon=p.weapon;buildWeapon(hand,weapon);}
    const duration=weapon==='crossbow'?w.cooldown:Math.min(w.cooldown,800),phase=Math.min(1,(now-swing)/duration);
    animateWeapon(hand,weapon,swing?phase:0);
    if(p.drawAt&&weapon==='bow'){const charge=Math.min(1,(time-p.drawAt)/1000);hand.position.z=-.65+charge*.12;hand.rotation.y=-charge*.2;hand.userData.string.position.z=charge*.2;hand.userData.arrow.position.z=charge*.2;}else {hand.position.z=-.65;if(hand.userData.string){hand.userData.string.position.z=0;hand.userData.arrow.position.z=0;}}
    shield.visible=p.hp>0&&p.canShield!==false&&['sword','axe','mace'].includes(weapon);shield.position.y=p.blocking?-.13:-.52;shield.rotation.y=p.blocking?-.15:-.4;
    hand.visible=p.hp>0;
    document.querySelector('#health').max=p.maxHp||100;document.querySelector('#health').value=p.hp;document.querySelector('#health-label').textContent=`${Math.ceil(p.hp)} / ${p.maxHp||100}`;
    document.querySelector('#armor-label').textContent=`ARMOR ${Math.round(p.armor*100)}% · 4 PIECES`;
    const remaining=Math.max(0,p.nextAttack-time);document.querySelector('#attack-ready').value=1-remaining/(w.cooldown/(p.attackSpeed||1));
    document.querySelector('#weapon-status').textContent=p.drawAt?`DRAW ${Math.min(100,Math.round((time-p.drawAt)/10))}%`:remaining>0?(weapon==='crossbow'?'RELOADING ':'READY IN ')+(remaining/1000).toFixed(1)+'s':C.inSpawn(p)?'SPAWN SANCTUARY':p.protectedUntil>time?'SPAWN PROTECTION':'READY';
    document.querySelectorAll('[data-weapon]').forEach((el,i)=>{el.dataset.weapon=window.HeroRules.loadout(p.hero)[i];el.textContent=`${i+1} ${C.weapons[el.dataset.weapon].name}`;el.classList.toggle('selected',el.dataset.weapon===weapon);});
    document.querySelector('#shield-status').textContent=p.shieldUntil>time?`SHIELD DISABLED ${((p.shieldUntil-time)/1000).toFixed(1)}s`:p.blocking?'BLOCKING':shield.visible?'RMB: SHIELD':'RANGED WEAPON';
    document.querySelector('#damage').style.opacity=now-flash<400?1:0;document.querySelector('#hit-marker').style.opacity=now-hit<250?1:0;
    document.querySelector('#death').hidden=p.hp>0;document.querySelector('#respawn-time').textContent=`${Math.max(0,Math.ceil((p.deadUntil-time)/1000))}s`;
  }
  return {hand,buildWeapon,animateWeapon,snapshot,frame,clear,serverNow:()=>Date.now()+clockOffset,isBlocking:()=>blocking};
}
