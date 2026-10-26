import * as THREE from '/vendor/three.module.js';
const P=window.PotionRules;
export function createPotionView({scene,camera,cube,socket,getSelf,getInput,isLocked,serverNow,hand}){
 const $=s=>document.querySelector(s),bottle=new THREE.Group();camera.add(bottle);let model='',pending=null,noticeAt=0,inventoryStamp='';
 function message(text){$('#potion-message').textContent=text;$('#potion-note').textContent=text;noticeAt=performance.now();}
 function select(id){if(!socket.connected||!getSelf()){message('Reconnect before selecting potions.');return;}pending=id;socket.timeout(4000).emit('potion-select',id,(error,result)=>{if(error||result?.error){pending=null;message(result?.error||'Could not select potion. Try again.');}});}
 for(const [id,item]of Object.entries(P.items)){
  const chip=document.createElement('span');chip.dataset.potion=id;chip.title=item.description;chip.textContent=item.name;$('#potion-strip').append(chip);
  const button=document.createElement('button');button.type='button';button.dataset.potion=id;button.className='potion-choice';button.textContent=item.name;button.title=item.description;button.onclick=()=>select(id);$('#potion-options').append(button);
 }
 window.addEventListener('keydown',e=>{
  if(e.repeat||!isLocked())return;
  if(e.code==='KeyG'){e.preventDefault();const id=pending||getSelf().selectedPotion,index=P.keys.indexOf(id);select(P.keys[(index+(e.shiftKey?-1:1)+P.keys.length)%P.keys.length]);}
  if(e.code==='KeyF'){e.preventDefault();socket.emit('input',getInput());socket.timeout(4000).emit('potion-use',getSelf()?.heldItem?.kind==='potion'?{id:getSelf().heldItem.id}:{},(error,result)=>{if(error||result?.error)message(result?.error||'Potion request timed out.');});}
 });
 socket.on('potion',e=>{if(e.source===getSelf()?.id&&e.type==='use')message(P.items[e.kind].splash?'THROW · '+P.items[e.kind].name:'DRINKING · '+P.items[e.kind].name);});
 const fires=[];
 for(const hazard of window.VoxelWorld.hazards){const group=new THREE.Group();group.position.set(hazard.x,hazard.y,hazard.z);scene.add(group);cube(group,1.3,.12,1.3,0x63726c,0,.06,0);const flames=new THREE.Group();group.add(flames);cube(flames,.7,.65,.7,0xe88b52,0,.43,0);cube(flames,.4,.95,.4,0xf1c568,0,.58,0);fires.push(flames);}
 function buildBottle(id){if(model===id)return;model=id;bottle.clear();cube(bottle,.16,.25,.16,P.items[model].color,0,0,0);cube(bottle,.08,.13,.08,0xc4dfd8,0,.17,0);cube(bottle,.09,.05,.09,0xb18f61,0,.26,0);cube(bottle,.14,.25,.13,0xc99070,0,-.18,.05);}
 function frame(now){
  for(let i=0;i<fires.length;i++){fires[i].parent.visible=!getSelf()?.map||['legacy','castle'].includes(getSelf().map);fires[i].scale.y=.9+Math.sin(now*.009+i)*.12;}
  const p=getSelf();bottle.visible=false;$('#potion-hud').hidden=!p;$('#potion-message').style.opacity=now-noticeAt<2000?1:0;if(!p)return;
  if(pending===p.selectedPotion)pending=null;const id=pending||p.selectedPotion||'healing',item=P.items[id],time=serverNow(),remaining=Math.max(0,p.potionReady-time);
  $('#potion-selected').textContent=`${item.name.toUpperCase()} · ${p.inventory?.[id]||0} LEFT`;
  $('#potion-help').textContent=p.drinking?'DRINKING…':remaining?`READY IN ${(remaining/1000).toFixed(1)}s · G: cycle`:'F: '+(item.splash?'throw':'drink')+' · G: cycle';$('#potion-cooldown').value=1-remaining/P.cooldown;
  const stamp=id+':'+P.keys.map(key=>p.inventory?.[key]||0).join(',');
  if(stamp!==inventoryStamp){inventoryStamp=stamp;
   for(const node of document.querySelectorAll('[data-potion]')){const key=node.dataset.potion;node.classList.toggle('selected',key===id);if(node.tagName==='BUTTON'){node.setAttribute('aria-pressed',String(key===id));node.textContent=`${P.items[key].name} · ${p.inventory?.[key]||0}`;}else node.textContent=`${P.items[key].name} ${p.inventory?.[key]||0}`;}
  }
  if(p.hp>0&&p.heldItem?.kind==='potion'){buildBottle(p.heldItem.id);bottle.visible=true;hand.visible=false;bottle.position.set(.35,-.33,-.65);bottle.rotation.set(0,0,0);}
  const duration=P.items[p.potionKind]?.splash?400:P.drinkTime,age=time-p.potionAt;
  if(p.hp>0&&p.potionAt&&age>=0&&age<duration){
   buildBottle(p.potionKind);
   const t=age/duration;bottle.visible=true;hand.visible=false;const lift=Math.sin(t*Math.PI);bottle.position.set(.35-lift*.18,-.33+lift*.18,-.57);bottle.rotation.set(lift*.7,0,lift*-.45);
  }
 }
 function clear(){pending=null;inventoryStamp='';bottle.visible=false;$('#potion-hud').hidden=true;$('#potion-message').textContent='';$('#potion-note').textContent='';noticeAt=0;}
 return {frame,clear};
}
