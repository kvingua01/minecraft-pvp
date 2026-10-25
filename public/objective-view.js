import * as THREE from '/vendor/three.module.js';
const colors={red:0xec826f,blue:0x75bbeb,neutral:0xe8d6ac};
export function createObjectiveView({scene,socket,getSelf,clearKeys}){
  const material=new THREE.MeshBasicMaterial({color:colors.neutral,transparent:true,opacity:.7,depthWrite:false});
  const ring=new THREE.Mesh(new THREE.RingGeometry(3.65,3.95,48),material);ring.rotation.x=-Math.PI/2;ring.position.y=.255;scene.add(ring);
  const beacon=new THREE.Mesh(new THREE.BoxGeometry(.22,3,.22),new THREE.MeshLambertMaterial({color:colors.neutral}));beacon.position.set(0,1.74,0);scene.add(beacon);
  const flag=new THREE.Mesh(new THREE.BoxGeometry(1.4,.65,.08),new THREE.MeshLambertMaterial({color:colors.neutral}));flag.position.set(.65,2.7,0);scene.add(flag);
  for(const sign of [-1,1]){
    const barrier=new THREE.Mesh(new THREE.PlaneGeometry(12,3),new THREE.MeshBasicMaterial({color:sign<0?colors.red:colors.blue,side:THREE.DoubleSide,transparent:true,opacity:.13,depthWrite:false}));barrier.rotation.y=Math.PI/2;barrier.position.set(sign*22,1.5,0);scene.add(barrier);
  }
  let match=null,finished=false;
  const $=s=>document.querySelector(s);
  function update(data,players=[]){
    if(!data)return;match=data;const self=getSelf();if(!self)return;
    const color=colors[match.control||'neutral'];ring.material.color.setHex(color);beacon.material.color.setHex(color);flag.material.color.setHex(color);
    $('#objective-hud').hidden=false;
    for(const team of ['red','blue']){$('#'+team+'-score').textContent=Math.floor(match.scores[team])+'%';$('#'+team+'-bar').value=match.scores[team];}
    const progress=Math.round(Math.abs(match.meter));$('#capture-bar').value=progress;$('#capture-bar').className=match.meter>=0?'red':'blue';
    $('#point-status').textContent=match.status==='waiting'?'WAITING FOR BOTH TEAMS':match.winner?'MATCH COMPLETE':match.contested?'CONTESTED':match.control?match.control.toUpperCase()+' CONTROLS THE POINT':'CAPTURE THE POINT';
    $('#capture-status').textContent=`${match.meter>0?'RED':match.meter<0?'BLUE':'NEUTRAL'} ${progress}% · ON POINT ${match.occupants.red} R / ${match.occupants.blue} B`;
    $('#my-team').textContent=`${self.team.toUpperCase()} TEAM`;$('#my-team').className=self.team;
    if(match.winner){
      if(!finished){finished=true;clearKeys();document.exitPointerLock();}
      $('#results').hidden=false;$('#pause').hidden=true;$('#death').hidden=true;
      $('#result-title').textContent=match.winner===self.team?'VICTORY':'DEFEAT';$('#result-title').className=match.winner;
      $('#result-score').textContent=`RED ${Math.floor(match.scores.red)}% · BLUE ${Math.floor(match.scores.blue)}%`;
      $('#result-players').textContent=['red','blue'].map(team=>team.toUpperCase()+' TEAM\n'+players.filter(p=>p.team===team).map(p=>`${p.name} · ${p.kills} K / ${p.deaths} D`).join('\n')).join('\n\n');
      $('#restart').hidden=match.host!==self.id;$('#host-message').hidden=match.host===self.id;
    }else{
      $('#results').hidden=true;
      if(finished){finished=false;$('#pause').hidden=false;$('#pause-error').textContent='New match ready. Click resume to play.';}
    }
  }
  $('#restart').onclick=()=>{socket.timeout(5000).emit('restart',{},(error,result)=>{$('#results-error').textContent=error?'Server did not respond. Retry.':result?.error||'';});};
  $('#results-leave').onclick=()=>$('#leave').click();
  function clear(){match=null;finished=false;$('#objective-hud').hidden=true;$('#results').hidden=true;$('#results-error').textContent='';ring.material.color.setHex(colors.neutral);beacon.material.color.setHex(colors.neutral);flag.material.color.setHex(colors.neutral);}
  return {update,clear,get match(){return match;},get finished(){return finished;}};
}
