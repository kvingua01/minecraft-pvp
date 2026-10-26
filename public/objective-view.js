import * as THREE from '/vendor/three.module.js';
const colors={red:0xec826f,blue:0x75bbeb,neutral:0xe8d6ac};
export function createObjectiveView({scene,socket,getSelf,clearKeys}){
  const markers=new Map();
  function marker(p){const group=new THREE.Group(),material=new THREE.MeshBasicMaterial({color:colors.neutral,transparent:true,opacity:.75,depthWrite:false}),ring=new THREE.Mesh(new THREE.RingGeometry(p.radius-.2,p.radius,32),material);ring.rotation.x=-Math.PI/2;group.add(ring);const pole=new THREE.Mesh(new THREE.BoxGeometry(.15,3,.15),new THREE.MeshLambertMaterial({color:0x705b3c}));pole.position.y=1.5;group.add(pole);const flag=new THREE.Mesh(new THREE.BoxGeometry(1.4,.65,.08),new THREE.MeshLambertMaterial({color:colors.neutral}));flag.position.set(.65,2.6,0);group.add(flag);group.position.set(p.x,p.y+.02,p.z);scene.add(group);return {group,ring,flag};}
  for(const sign of [-1,1]){
    const barrier=new THREE.Mesh(new THREE.PlaneGeometry(12,3),new THREE.MeshBasicMaterial({color:sign<0?colors.red:colors.blue,side:THREE.DoubleSide,transparent:true,opacity:.13,depthWrite:false}));barrier.rotation.y=Math.PI/2;barrier.position.set(sign*22,1.5,0);scene.add(barrier);
  }
  let match=null,finished=false;
  const $=s=>document.querySelector(s);
  function update(data,players=[]){
    if(!data)return;match=data;const self=getSelf();if(!self)return;
    for(const p of match.points||[]){if(!markers.has(p.id))markers.set(p.id,marker(p));const m=markers.get(p.id),color=colors[p.control||'neutral'];m.group.position.set(p.x,p.y+.02,p.z);m.ring.material.color.setHex(color);m.flag.material.color.setHex(color);m.ring.material.opacity=p.contested?.35+Math.abs(Math.sin(Date.now()*.007))*.55:.75;}
    $('#points-strip').replaceChildren(...(match.points||[]).map(p=>{const el=document.createElement('div');el.className='point-card '+(p.control||'neutral')+(p.contested?' contested':'');el.textContent=`${p.id} · ${p.name} · ${p.contested?'CONTESTED':p.control?.toUpperCase()||'NEUTRAL'} ${Math.round(Math.abs(p.meter))}%`;return el;}));
    $('#objective-hud').hidden=false;
    for(const team of ['red','blue']){$('#'+team+'-score').textContent=Math.floor(match.scores[team])+' / 300';$('#'+team+'-bar').value=match.scores[team];}
    const progress=Math.round(Math.abs(match.meter));$('#capture-bar').value=progress;$('#capture-bar').className=match.meter>=0?'red':'blue';
    $('#point-status').textContent=match.status==='waiting'?'WAITING FOR BOTH TEAMS':match.winner?'MATCH COMPLETE':match.contested?'CONTESTED':match.control?match.control.toUpperCase()+' CONTROLS THE POINT':'CAPTURE THE POINT';
    $('#capture-status').textContent=`${match.meter>0?'RED':match.meter<0?'BLUE':'NEUTRAL'} ${progress}% · ON POINT ${match.occupants.red} R / ${match.occupants.blue} B`;
    $('#my-team').textContent=`${self.team.toUpperCase()} TEAM`;$('#my-team').className=self.team;
    if(match.winner){
      if(!finished){finished=true;clearKeys();document.exitPointerLock();}
      $('#results').hidden=false;$('#pause').hidden=true;$('#death').hidden=true;
      $('#result-title').textContent=match.winner===self.team?'VICTORY':'DEFEAT';$('#result-title').className=match.winner;
      $('#result-score').textContent=`RED ${Math.floor(match.scores.red)} · BLUE ${Math.floor(match.scores.blue)}`;
      $('#result-players').textContent=['red','blue'].map(team=>team.toUpperCase()+' TEAM\n'+players.filter(p=>p.team===team).map(p=>`${p.name} · ${p.kills} K / ${p.deaths} D`).join('\n')).join('\n\n');
      $('#restart').hidden=match.host!==self.id;$('#host-message').hidden=match.host===self.id;
    }else{
      $('#results').hidden=true;
      if(finished){finished=false;$('#pause').hidden=false;$('#pause-error').textContent='New match ready. Click resume to play.';}
    }
  }
  $('#restart').onclick=()=>{socket.timeout(5000).emit('restart',{},(error,result)=>{$('#results-error').textContent=error?'Server did not respond. Retry.':result?.error||'';});};
  $('#results-leave').onclick=()=>$('#leave').click();
  function clear(){match=null;finished=false;$('#objective-hud').hidden=true;$('#results').hidden=true;$('#results-error').textContent='';for(const m of markers.values()){scene.remove(m.group);m.group.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}markers.clear();}
  return {update,clear,get match(){return match;},get finished(){return finished;}};
}
