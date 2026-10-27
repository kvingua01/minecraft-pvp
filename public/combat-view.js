import * as THREE from '/vendor/three.module.js';
import {pixelTool} from '/pixel-items.js';
import {paintVitals} from '/hud-icons.js';
import {animateWeapon} from '/weapon-animation.js';
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

    }else if(key==='trident'){cube(group,.07,1.2,.07,0x438b8f,0,.3,0);cube(group,.42,.07,.08,0x9ce0dc,0,.83,0);for(const x of [-.18,0,.18])cube(group,.06,.3,.07,0x9ce0dc,x,.97,0);
    }else if(key==='slimefists'){for(const x of [-.23,.12])cube(group,.32,.32,.32,0x7bc15c,x,.25,0);
    }else if(key==='tntlauncher'){cube(group,.3,.3,.65,0x59575a,0,.16,0);cube(group,.25,.25,.25,0xc14d3e,0,.35,-.18);cube(group,.26,.08,.26,0xf1dcc4,0,.35,-.18);
    }else if(key==='blazerods'){for(const x of [-.16,0,.16])cube(group,.09,.7,.09,0xffbe48,x,.35,0);
    }else if(key==='bow'||key==='enchantedbow'){
      for(const side of [-1,1]){const limb=cube(group,.07,.42,.09,0xb98a4f,0,side*.23+.15,0);limb.rotation.z=side*-.3;}
      group.userData.string=cube(group,.02,.77,.02,0xebe1c3,.1,.15,0);group.userData.arrow=cube(group,.035,.035,.6,0xc7bea1,.08,.15,0);
    }else if(['staff','darkstaff','firestaff','naturestaff','witherstaff','totemstaff'].includes(key)){cube(group,.09,.9,.09,0x767e94,0,.22,0);cube(group,.25,.25,.25,({witherstaff:0x635a77,totemstaff:0x8db279,darkstaff:0x9b74ce,firestaff:0xf6a34c,naturestaff:0x8ecb65}[key]||0xa0e5f7),0,.75,0);
    }else if(key==='launcher'){cube(group,.25,.25,.55,0x799b88,0,.15,0);cube(group,.15,.24,.17,0xbcdf9a,0,.34,.05);
    }else {
      cube(group,.12,.16,.6,0x805e3c,0,.18,0);cube(group,.65,.08,.12,0xc6c7ac,0,.22,-.18);cube(group,.4,.025,.025,0xd7d7bd,0,.22,.05);if(key==='toxicbow')cube(group,.12,.2,.12,0x8cc667,.12,.32,0);
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
    if(e.button===0&&getSelf().hasItemSlots&&getSelf().heldItem?.kind!=='weapon'){const item=getSelf().heldItem;if(item?.kind==='potion'){socket.emit('input',getInput());socket.timeout(4000).emit('potion-use',{id:item.id},(error,result)=>{document.querySelector('#combat-note').textContent=error?'Potion request timed out.':result?.error||'POTION USED';windNoticeAt=performance.now();});}return;}
    if(e.button===0){if(C.weapons[getSelf().weapon].charge){drawHeld=true;action('draw');}else action('attack');}
  });
  window.addEventListener('mouseup',e=>{if(e.button===0&&drawHeld){action('release');drawHeld=false;}if(e.button===2){blocking=false;if(getSelf())socket.volatile.emit('input',getInput());}});
  window.addEventListener('blur',release);
  document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement){release();if(getSelf())socket.volatile.emit('input',{...getInput(),block:false});}});

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
        const color=a.kind==='wind'?0xe6fbff:['ember','fireball'].includes(a.kind)?0xf59a3c:['toxic','dart','nature'].includes(a.kind)?0x8cc965:a.kind==='enchanted'?0xb188d9:a.kind==='dark'?0xa87bd4:a.kind?.startsWith('flask:')?window.PotionRules.items[a.kind.slice(6)].color:a.kind==='ice'||a.kind==='frost'?0x9ee6ff:a.kind==='potion'?0xa9e5a1:a.kind==='explosive'?0xf4b273:0xe8d2a2;
        if(['tnt','tnt-toss','barrage-tnt'].includes(a.kind)){cube(m,.3,.3,.3,0xc74b39,0,0,0);cube(m,.31,.08,.31,0xeadbc6,0,0,0);cube(m,.03,.1,.03,0x332f2a,0,.2,0);}
        else if(a.kind==='trident'){cube(m,.05,.05,.9,0x62bcb8,0,0,0);cube(m,.4,.05,.06,0x9be5df,0,0,.4);for(const x of [-.17,0,.17])cube(m,.05,.05,.22,0x9be5df,x,0,.52);}
        else if(['skull','barrage-skull'].includes(a.kind)){cube(m,.28,.26,.25,0x45414f,0,0,0);for(const x of [-.07,.07])cube(m,.05,.04,.02,0xb7a1d7,x,.04,.13);}
        else if(['blazefire','witherbolt','sticky','totem'].includes(a.kind))cube(m,.2,.2,.2,({blazefire:0xffa736,witherbolt:0x675a7d,sticky:0x88cb5b,totem:0xb5ce88})[a.kind],0,0,0);
        else cube(m,size,size,flask ? .22 : .65,color,0,0,0);scene.add(m);arrows.set(a.id,m);
      }
      m.userData.projectileKind=a.kind;m.position.set(a.x,a.y,a.z);m.lookAt(a.x+a.vx,a.y+a.vy,a.z+a.vz);
    }
    for(const [id,m]of arrows)if(!seen.has(id)){scene.remove(m);arrows.delete(id);}
  }
  function clear(){for(const b of bursts){scene.remove(b.mesh);b.mesh.geometry.dispose();b.mesh.material.dispose();}bursts.clear();hotbarStamp='';clockSynced=false;release();for(const m of arrows.values())scene.remove(m);arrows.clear();feed.replaceChildren();document.querySelector('#death').hidden=true;document.querySelector('#damage').style.opacity=0;document.querySelector('#hit-marker').style.opacity=0;}
  function frame(now){
    for(const b of bursts){const age=(now-b.start)/500;b.mesh.scale.setScalar(1+age*3);b.mesh.material.opacity=Math.max(0,.8*(1-age));if(age>=1){scene.remove(b.mesh);b.mesh.geometry.dispose();b.mesh.material.dispose();bursts.delete(b);}}
    const p=getSelf();hand.visible=wind.visible=!!p;if(!p)return;
    const time=Date.now()+clockOffset,w=C.weapons[p.weapon];
    if(weapon!==p.weapon){weapon=p.weapon;buildWeapon(hand,weapon);}
    const duration=w.animationDuration||(['crossbow','toxicbow'].includes(weapon)?w.cooldown:Math.min(w.cooldown,800)),phase=Math.min(1,(now-swing)/duration);
    hand.position.set(.4,-.36,-.65);animateWeapon(hand,weapon,swing?phase:0);if(weapon==='trident'&&p.status?.riptide>time)hand.rotation.z=now*.04;
    if(p.drawAt&&w.charge){const charge=Math.min(1,(time-p.drawAt)/1000);hand.position.z=-.65+charge*.12;hand.rotation.y=-charge*.2;hand.userData.string.position.z=charge*.2;hand.userData.arrow.position.z=charge*.2;}else {if(hand.userData.string){hand.userData.string.position.z=0;hand.userData.arrow.position.z=0;}}
    wind.visible=p.hp>0;wind.rotation.y=now*.002;
    const throwAge=now-windThrownAt;wind.position.y=-.23-(throwAge<300?Math.sin(throwAge/300*Math.PI)*.16:0);
    wind.scale.setScalar(p.windReady>time?.9:1);
    if(windNoticeAt&&now-windNoticeAt>2400){document.querySelector('#combat-note').textContent='';windNoticeAt=0;}
    hand.visible=!(p.weapon==='trident'&&p.status?.tridentOut>time)&&p.hp>0&&(!p.hasItemSlots||p.heldItem?.kind==='weapon');
    paintVitals(p);
    document.querySelector('#health').max=p.maxHp||100;document.querySelector('#health').value=p.hp;document.querySelector('#health-label').textContent=`${Math.ceil(p.hp)} / ${p.maxHp||100}`;
    document.querySelector('#armor-label').textContent=`ARMOR ${Math.round(p.armor*100)}% · 4 PIECES`;
    const remaining=Math.max(0,p.nextAttack-time);document.querySelector('#attack-ready').value=w.cooldown?1-remaining/(w.cooldown/(p.attackSpeed||1)):1;
    document.querySelector('#weapon-status').textContent=p.hasItemSlots&&p.heldItem?.kind!=='weapon'?(p.heldItem?.kind==='potion'?window.PotionRules.items[p.heldItem.id].name.toUpperCase()+' · CLICK / F TO USE':'EMPTY HOTBAR SLOT'):p.drawAt?`DRAW ${Math.min(100,Math.round((time-p.drawAt)/10))}%`:remaining>0?(['crossbow','toxicbow'].includes(weapon)?'RELOADING ':'READY IN ')+(remaining/1000).toFixed(1)+'s':C.inSpawn(p)?'SPAWN SANCTUARY':p.protectedUntil>time?'SPAWN PROTECTION':'READY';

    document.querySelector('#shield-status').textContent=C.inSpawn(p)?'WIND CHARGE · LEAVE SPAWN TO THROW':p.windReady>time?`WIND CHARGE ${((p.windReady-time)/1000).toFixed(1)}s`:'RMB: WIND CHARGE · AIM AT YOUR FEET';
    document.querySelector('#damage').style.opacity=now-flash<400?1:0;document.querySelector('#hit-marker').style.opacity=now-hit<250?1:0;
    document.querySelector('#death').hidden=p.hp>0;document.querySelector('#respawn-time').textContent=`${Math.max(0,Math.ceil((p.deadUntil-time)/1000))}s`;
  }
  return {weaponPose:()=>({position:hand.position.toArray(),rotation:hand.rotation.toArray().slice(0,3),visible:hand.visible}),projectileKinds:()=>[...arrows.values()].map(m=>m.userData.projectileKind),syncClock:offset=>{if(Number.isFinite(offset)){clockOffset=clockSynced?clockOffset*.8+offset*.2:offset;clockSynced=true;}},cancelInput:release,hand,offhand:()=>({wind:wind.visible,shield:false}),buildWeapon,animateWeapon,snapshot,frame,clear,serverNow:()=>Date.now()+clockOffset,isBlocking:()=>false};
}
