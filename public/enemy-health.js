import * as THREE from '/vendor/three.module.js';
export function createEnemyHealth(scene){
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;
 const context=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas);
 texture.magFilter=texture.minFilter=THREE.NearestFilter;texture.generateMipmaps=false;
 texture.colorSpace=THREE.SRGBColorSpace;
 const material=new THREE.SpriteMaterial({map:texture,depthTest:true,depthWrite:false,transparent:true});
 const sprite=new THREE.Sprite(material);sprite.scale.set(1.8,.45,1);sprite.visible=false;scene.add(sprite);
 let stamp='',hp=0,maxHp=0,label='';
 function update(player,self,position,now,inLobby){
  const enemy=self&&(['ffa','duel_1v1','kit_ladder'].includes(self.mode)||(self.mode==='juggernaut'?self.juggernaut!==player.juggernaut:self.team!==player.team));
  sprite.visible=!!enemy&&!inLobby&&player.hp>0&&player.connected!==false&&!(player.status?.vanish>now);
  sprite.position.set(position.x,position.y+2.3,position.z);
  hp=Math.max(0,player.hp||0);maxHp=Math.max(1,player.maxHp||100);label=Math.ceil(hp)+' / '+Math.ceil(maxHp);
  const bonus=player.overhealthUntil>now?Math.max(0,player.overhealth||0):0;if(bonus)label+=' +'+Math.ceil(bonus)+' HP';
  const next=hp+':'+maxHp+':'+bonus;if(next===stamp)return;stamp=next;
  context.clearRect(0,0,256,64);context.fillStyle='#151515';context.fillRect(2,2,252,60);
  context.fillStyle='#eeeecc';context.fillRect(4,4,248,56);context.fillStyle='#2c2424';context.fillRect(8,8,240,48);
  const ratio=Math.min(1,hp/maxHp);context.fillStyle=ratio>.5?'#65bd52':ratio>.25?'#e8bf43':'#d74b43';context.fillRect(8,8,Math.round(240*ratio),48);
  if(bonus){context.fillStyle='#f1c878';context.fillRect(8,51,Math.round(240*Math.min(1,bonus/Math.round(window.HeroRules.heroes.knight.health*.4))),5);}
  context.font=bonus?'bold 24px monospace':'bold 30px monospace';context.textAlign='center';context.textBaseline='middle';context.lineWidth=5;context.strokeStyle='#111111';context.strokeText(label,128,33);context.fillStyle='#ffffff';context.fillText(label,128,33);texture.needsUpdate=true;
 }
 return {update,diagnostics:()=>({visible:sprite.visible,hp,maxHp,label}),dispose(){scene.remove(sprite);texture.dispose();material.dispose();}};
}
