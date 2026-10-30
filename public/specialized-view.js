import * as THREE from '/vendor/three.module.js';
const colors={holystaff:0xffdf85,potioncannon:0x82edb5,clockstaff:0x80dcf2,featherwand:0xffb25a,lifeaura:0x68e993,chainscythe:0xd0c4e1,boomerang:0xaf8cf3,mortar:0x7d878e,fireworklauncher:0xf488c9,portalgauntlet:0x9e78eb,moltenhammer:0xf28c43,shellgauntlets:0x66aa87,icegauntlets:0x9be1fa,obsidianclaws:0x796285,coilarms:0xd8a369};
export function buildSpecialWeapon(group,key,cube){const h=Object.values(window.HeroRules.heroes).find(h=>h.specialized&&(h.weapon===key||h.ranged===key));if(!h)return false;const color=colors[h.weapon];
 const block=(w,ht,d,x,y,z,c=color)=>cube(group,w,ht,d,c,x,y,z);
 if(h.healer&&key===h.ranged){block(.18,.22,.32,0,.22,0);for(let i=0;i<4;i++)block(.06,.06,.06,Math.cos(i*Math.PI/2)*.17,.36,Math.sin(i*Math.PI/2)*.17);}
 else if(['holystaff','clockstaff','featherwand'].includes(key)){block(.07,.9,.07,0,.25,0,0x997854);if(key==='holystaff'){block(.08,.38,.08,0,.8,0);block(.32,.08,.08,0,.8,0);}else if(key==='clockstaff'){for(let i=0;i<8;i++)block(.1,.1,.08,Math.cos(i*Math.PI/4)*.18,.78+Math.sin(i*Math.PI/4)*.18,0);block(.04,.16,.09,0,.84,0,0xf5e1b7);block(.13,.04,.09,.05,.76,0,0xf5e1b7);}else for(let i=0;i<5;i++)block(.12,.1,.05,i*.035,.6+i*.08,0);}
 else if(key==='lifeaura'){for(let i=0;i<10;i++){const a=i*Math.PI/5;block(.09,.09,.09,Math.cos(a)*.3,.25+Math.sin(a)*.3,0);}block(.13,.13,.13,0,.25,0);}
 else if(key==='chainscythe'){for(let i=0;i<8;i++)block(.045,.08,.07,Math.sin(i*.8)*.035,i*.09,0);for(let i=0;i<6;i++)block(.1,.08,.05,Math.sin(i*.3)*.38,.67+Math.cos(i*.3)*.18,0);}
 else if(key==='boomerang'){for(const side of [-1,1])for(let i=0;i<5;i++)block(.12,.1,.08,side*i*.08,.3+i*.06,0);}
 else if(['potioncannon','mortar','fireworklauncher'].includes(key)){block(.28,.28,.65,0,.2,0,0x56616c);block(.32,.32,.1,0,.2,-.33);block(.12,.25,.12,0,0,.1,0x9a7751);if(key==='potioncannon'){block(.2,.26,.2,0,.47,.1);block(.1,.08,.1,0,.64,.1,0xe6f4dc);}if(key==='fireworklauncher')for(const x of [-.08,.08])block(.08,.08,.28,x,.4,-.05,0xf2b16b);if(key==='mortar'){block(.45,.07,.35,0,.02,0);group.rotation.x=-.35;}}
 else if(key==='moltenhammer'){block(.08,.65,.08,0,.2,0,0x6c5445);block(.5,.3,.28,0,.64,0,0x665465);block(.52,.07,.29,0,.65,0);}
 else {for(const x of [-.22,.15]){block(.25,.28,.28,x,.22,0);block(.2,.12,.12,x,.36,0,0xb7c6c7);if(key==='obsidianclaws')for(const i of [-1,0,1])block(.04,.22,.04,x+i*.065,.37,-.12);if(key==='portalgauntlet')block(.14,.14,.08,x,.24,-.18,0xd0b4ff);if(key==='coilarms')for(let i=0;i<3;i++)block(.27,.035,.3,x,.13+i*.08,0,0x8bcbd7);if(key==='icegauntlets')block(.1,.18,.12,x,.42,-.08,0xd7fbff);}}
 return true;
}
export function buildSpecialEffect(e,group,cube){if(!e.specialized||e.kind==='wall')return;const color=e.color||0xbba4e0,parts=[];const block=(x,y,z,w=.16,h=.2,d=.16)=>{const m=cube(group,w,h,d,color,x,y,z);parts.push(m);return m;};
 if(['healing-beam','chain-strike'].includes(e.kind)){const beam=block(0,1.2,0,e.kind==='healing-beam'?.07:.045,.07,1);group.userData.specialBeam=beam;}
 else if(e.kind==='shell-dome'){const material=new THREE.MeshBasicMaterial({color,wireframe:true,transparent:true,opacity:.3,depthWrite:false});const dome=new THREE.Mesh(new THREE.SphereGeometry(e.radius,12,6),material);dome.position.y=1;group.add(dome);}
 else if(['death-cyclone','boomerang-storm'].includes(e.kind)){for(let i=0;i<6;i++){const a=i*Math.PI/3;const m=block(Math.cos(a)*e.radius,.9,Math.sin(a)*e.radius,.5,.07,.14);m.rotation.y=-a;}}
 else if(e.kind==='tidal-crash'){for(let i=-3;i<=3;i++)block(i*.7,.7,0,.65,1.3,.4);group.rotation.y=Math.atan2(e.dx,e.dz);}
 else {const count=['grand-finale','artillery-strike','potion-rain'].includes(e.kind)?12:8;for(let i=0;i<count;i++){const a=i*Math.PI*2/count,r=e.radius*.8;const m=block(Math.cos(a)*r,.12,Math.sin(a)*r);if(['obsidian-spikes','blackstone-cataclysm'].includes(e.kind))m.scale.set(.7,4,.7);if(e.kind==='thunder-reactor'||e.kind==='electric-pulse')m.scale.set(3,.3,.3);}}
 group.userData.specialParts=parts;group.userData.initialRadius=e.radius;
}
export function updateSpecialEffect(e,v,now,serverTime){if(!e.specialized||e.kind==='wall')return;const g=v.group,beam=g.userData.specialBeam;
 if(beam){const start=new THREE.Vector3(e.x,e.y+1.2,e.z),end=new THREE.Vector3(e.tx,e.ty,e.tz),length=start.distanceTo(end);beam.position.copy(end.clone().add(start).multiplyScalar(.5).sub(g.position));beam.scale.z=length;beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),end.sub(start).normalize());}
 if(['death-cyclone','boomerang-storm','shell-spin','life-aura','life-surge'].includes(e.kind))g.rotation.y=now*.002;
 if(e.radius!==g.userData.initialRadius&&!beam){const s=e.radius/g.userData.initialRadius;g.scale.set(s,1,s);}
 for(let i=0;i<(g.userData.specialParts||[]).length;i++){const m=g.userData.specialParts[i];if(e.warningUntil)m.scale.y=serverTime<e.warningUntil?.15:4;if(['potion-rain','grand-finale','artillery-strike'].includes(e.kind))m.position.y=.2+(3-((now*.003+i*.3)%3));else if(!beam)m.position.y=.18+Math.sin(now*.005+i)*.08;}
}
