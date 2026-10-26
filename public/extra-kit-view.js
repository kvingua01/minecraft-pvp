import * as THREE from '/vendor/three.module.js';
// Additional kit visuals share the existing block models, particles and effect snapshots.
export function buildKitEffect(e,group,cube){if(!e.extra)return;const parts=[];
 const block=(w,h,d,color,x,y,z)=>{const m=cube(group,w,h,d,color,x,y,z);parts.push(m);return m;};
 if(e.kind==='fused-tnt'){block(.5,.5,.5,0xc54b3b,0,.3,0);block(.51,.13,.51,0xe3d7bd,0,.3,0);block(.04,.18,.04,0x38352f,0,.63,0);}
 else if(e.kind==='fang'){for(const side of [-1,1]){const jaw=block(.24,.7,.5,0xd9d2b5,side*.18,.35,0);jaw.rotation.z=side*.2;block(.1,.25,.12,0xf2eedb,side*.13,.8,-.15);}}
 else if(e.kind==='trident-return'){block(.07,.07,1,0x53a7a6,0,0,0);block(.4,.07,.07,0xa1e6df,0,0,.4);for(const x of [-.17,0,.17])block(.06,.06,.24,0xa1e6df,x,0,.53);}
 else if(e.kind==='wave'){for(let i=-3;i<=3;i++){block(.7,1.2,.6,0x499bc6,i*.75,.6,0);block(.7,.25,.65,0x9bdce1,i*.75,1.3,0);}group.rotation.y=Math.atan2(e.dx,e.dz);}
 else if(['tnt-barrage','wither-barrage'].includes(e.kind)){for(let i=0;i<8;i++){const a=i*Math.PI/4;block(.22,.08,.22,e.kind==='tnt-barrage'?0xe86643:0x89709d,Math.sin(a)*4,.12,Math.cos(a)*4);}}
 else if(['fire-spin','riptide','soul-flight','flame-rise','slime-split','blaze-trail','sticky'].includes(e.kind)){for(let i=0;i<8;i++){const a=i*Math.PI/4,color=e.kind==='riptide'?0x81cadd:e.kind==='soul-flight'?0x625773:['sticky','slime-split'].includes(e.kind)?0x86c65c:0xf4a238;block(.18,.28,.18,color,Math.sin(a)*e.radius,.3,Math.cos(a)*e.radius);}}
 group.userData.kitParts=parts;
}
export function updateKitEffect(e,visual,now,serverTime){if(!e.extra)return;const group=visual.group,parts=group.userData.kitParts||[];
 if(e.kind==='fang'){const active=serverTime>=e.detonateAt;for(const m of parts)m.visible=active;group.scale.y=active?Math.max(.05,Math.sin(Math.min(1,(serverTime-e.detonateAt)/400)*Math.PI)):1;}
 if(['fire-spin','riptide','soul-flight','flame-rise','slime-split'].includes(e.kind))group.rotation.y=now*.003;
 if(e.kind==='fused-tnt')group.scale.setScalar(1+Math.sin(now*.025)*.06);
 if(e.kind==='trident-return')group.rotation.y=now*.008;
}
