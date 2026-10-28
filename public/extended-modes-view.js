import * as THREE from '/vendor/three.module.js';
const ids=new Set(['kit_ladder','payload_escort','juggernaut']);
const time=ms=>{const s=Math.ceil(Math.max(0,ms)/1000);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};
export function createExtendedModesView({scene}){
 const $=s=>document.querySelector(s),cart=new THREE.Group(),material=new THREE.MeshLambertMaterial({color:0x899397}),wheel=new THREE.MeshLambertMaterial({color:0x3e4143});
 function box(w,h,d,x,y,z,mat=material){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);cart.add(m);}
 box(1.1,.16,1.1,0,.25,0);for(const x of [-.5,.5])box(.12,.5,1.1,x,.55,0);for(const z of [-.5,.5])box(1.1,.5,.12,0,.55,z);for(const x of [-.4,.4])for(const z of [-.35,.35])box(.22,.25,.25,x,.13,z,wheel);scene.add(cart);cart.visible=false;
 let match=null,players=[],self=null,lastLadder=null,flashUntil=0;
 const progress=document.createElement('progress');progress.id='mode-progress';progress.max=100;progress.hidden=true;$('#mode-match-info').append(progress);
 const bossHealth=document.createElement('div');bossHealth.id='boss-health';bossHealth.hidden=true;const label=document.createElement('span'),bar=document.createElement('progress');bar.max=100;bossHealth.append(label,bar);$('#mode-match-info').append(bossHealth);
 function update(data,list,p){match=data;players=list;self=p;const active=ids.has(data.mode);if(data.phase==='lobby')cart.userData.initialized=false;cart.visible=data.mode==='payload_escort'&&data.phase!=='lobby'&&!!data.modeState?.payload;progress.hidden=data.mode!=='payload_escort';bossHealth.hidden=data.mode!=='juggernaut';if(!active){lastLadder=null;flashUntil=0;return false;}
  const s=data.modeState||{},rows=s.scoreboard||[],leader=rows[0]?.name||'—';$('#mode-match-title').textContent=data.modeName.toUpperCase();$('#mode-scoreboard').textContent='';$('#my-team').className='';
  if(data.mode==='kit_ladder'){
   const order=s.ladderOrder||[],index=Math.min(p.ladderIndex||0,Math.max(0,order.length-1)),name=id=>window.HeroRules.heroes[id]?.name||'—';
   if(lastLadder!==null&&index>lastLadder)flashUntil=performance.now()+2200;lastLadder=index;
   $('#mode-scoreboard').textContent=`Current Kit: ${name(order[index])}\nProgress: ${Math.min((p.ladderIndex||0)+1,order.length)} / ${order.length}\nNext Kit: ${index+1<order.length?name(order[index+1]):'Final kit — earn a kill to win!'}`;
   $('#my-team').textContent='Leader: '+leader;
  }else if(data.mode==='payload_escort'){
   const payload=s.payload;progress.value=payload?.progress||0;$('#mode-scoreboard').textContent=`Payload Progress: ${Math.round(payload?.progress||0)}% · ${payload?.status||'STOPPED'}`;$('#my-team').textContent=p.team==='red'?'RED · ATTACKERS — escort the minecart':'BLUE · DEFENDERS — stop the minecart';
   if(payload&&!cart.userData.initialized){cart.position.set(payload.x,payload.y,payload.z);cart.userData.initialized=true;}
  }else{
   const boss=list.find(t=>t.soloSide===s.juggernautSide);$('#mode-scoreboard').textContent=`Current Juggernaut: ${boss?.name||'Choosing next player…'}\nYour Juggernaut Time: ${time(p.juggerTime||0)}\nLeader: ${leader}`;$('#my-team').textContent=p.juggernaut?'YOU ARE THE JUGGERNAUT':'HUNT THE JUGGERNAUT · Hunters cannot hurt each other';label.textContent=`${boss?.name||'Juggernaut'} · ${Math.ceil(boss?.hp||0)} / ${boss?.maxHp||0} HP`;bar.value=boss?100*boss.hp/boss.maxHp:0;
  }
  return true;
 }
 function frame(now,dt=.016){if(!match||!ids.has(match.mode))return;const state=match.modeState||{};$('#mode-timer').textContent=match.mode==='kit_ladder'?(performance.now()<flashUntil?'KIT ADVANCED! '+(window.HeroRules.heroes[self?.hero]?.name||''):'Earn one elimination with every kit'): 'Time Remaining: '+time((state.endsAt??now)-now);
  const p=state.payload;if(cart.visible&&p){const alpha=1-Math.exp(-14*dt),dx=p.x-cart.position.x,dz=p.z-cart.position.z;cart.position.lerp(new THREE.Vector3(p.x,p.y,p.z),alpha);if(Math.hypot(dx,dz)>.001)cart.rotation.y=Math.atan2(dx,dz);}
 }
 function results(){const s=match.modeState||{},rows=s.scoreboard||[];$('#result-score').textContent=match.mode==='kit_ladder'?'Every kit completed':match.mode==='payload_escort'?(match.winner==='red'?'Minecart delivered':'Defenders held until time expired'):'Seven-minute Juggernaut standings';if(match.mode!=='payload_escort')$('#result-players').textContent=rows.map((p,i)=>`${i+1}. ${p.name} · ${match.mode==='kit_ladder'?`${p.ladderIndex} / ${s.ladderOrder?.length||0} progression kills`:`${time(p.juggerTime)} as Juggernaut · ${p.juggerKills} boss eliminations`}`).join('\n');}
 return {active:id=>ids.has(id),update,frame,results,clear(){cart.visible=false;cart.userData.initialized=false;match=null;self=null;lastLadder=null;flashUntil=0;progress.hidden=true;bossHealth.hidden=true;},diagnostics:()=>({cartVisible:cart.visible,cartPosition:cart.position.toArray()})};
}
