import * as THREE from '/vendor/three.module.js';
const cache=new Map(),colors={'#':0x344149,I:0xd7e7e7,H:0xf7ffff,B:0x96633b,G:0xc6a65e,P:0x819caf,R:0xc64c3d,S:0x7bc35d};
export function itemPixels(key){const grid=Array.from({length:16},()=>Array(16).fill('.')),put=(x,y,c)=>{if(x>=0&&x<16&&y>=0&&y<16)grid[y][x]=c;};
 const kit=Object.values(window.HeroRules.heroes).find(h=>h.specialized&&(h.weapon===key||h.ranged===key));
 if(kit){const box=(x,y,w,h,c)=>{for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)put(i,j,c);};
  if(kit.healer&&key===kit.ranged){box(6,5,5,5,'P');box(8,3,1,9,'H');box(4,7,9,1,'G');}
  else if(key==='lifeaura'){for(let i=0;i<20;i++){const a=i*Math.PI/10;put(Math.round(8+Math.cos(a)*6),Math.round(8+Math.sin(a)*6),'S');}box(7,5,2,6,'H');box(5,7,6,2,'H');}
  else if(['holystaff','clockstaff','featherwand'].includes(key)){box(7,6,2,10,'B');if(key==='holystaff'){box(7,0,2,9,'G');box(3,3,10,2,'H');}else if(key==='clockstaff'){for(let i=0;i<16;i++){const a=i*Math.PI/8;put(Math.round(8+Math.cos(a)*4),Math.round(4+Math.sin(a)*4),'G');}box(7,2,1,4,'H');box(8,4,3,1,'H');}else{for(let i=0;i<7;i++){put(5+i,8-i,'G');put(6+i,8-i,'H');}}}
  else if(key==='chainscythe'){for(let y=5;y<16;y++)put(5+(y%2),y,'I');for(let i=0;i<9;i++){put(4+i,Math.round(2+(i/3)**2),'P');put(4+i,Math.round(3+(i/3)**2),'H');}}
  else if(key==='boomerang'){for(let i=0;i<7;i++){box(7-i,3+i,2,2,'P');box(7+i,3+i,2,2,'G');}}
  else if(['potioncannon','mortar','fireworklauncher'].includes(key)){box(4,5,9,6,'#');box(5,6,7,4,key==='potioncannon'?'S':key==='mortar'?'P':'R');box(7,11,3,4,'B');if(key==='potioncannon')box(7,1,4,4,'S');if(key==='fireworklauncher'){box(5,1,2,4,'R');box(10,1,2,4,'G');}}
  else if(key==='moltenhammer'){box(7,5,2,11,'B');box(2,1,12,6,'#');box(3,2,10,4,'R');box(3,4,10,1,'G');}
  else{const c=key==='shellgauntlets'?'S':key==='coilarms'?'G':key==='obsidianclaws'?'#':'P';for(const x of [1,9]){box(x,5,6,7,c);box(x+1,4,4,2,'I');if(key==='obsidianclaws')for(const dx of [0,2,4])box(x+dx,1,1,4,'P');if(key==='coilarms')for(const y of [6,8,10])box(x,y,6,1,'P');}if(key==='portalgauntlet')box(6,6,4,4,'H');}
 }else if(key==='trident'){for(let y=4;y<16;y++)put(7,y,'P');for(let x=3;x<=11;x++)put(x,4,'I');for(const x of [3,7,11])for(let y=0;y<5;y++)put(x,y,'H');
 }else if(key==='tntlauncher'){for(let y=4;y<12;y++)for(let x=3;x<13;x++)put(x,y,y===7?'H':'R');for(let y=12;y<16;y++)put(7,y,'B');
 }else if(key==='slimefists'){for(let y=5;y<13;y++)for(let x=2;x<14;x++)put(x,y,x===2||x===13?'G':'S');
 }else if(key==='blazerods'){for(const x of [4,8,12])for(let y=3;y<14;y++)put(x,y,'G');
 }else if(['sword','katana','dagger'].includes(key)){
  const end=key==='dagger'?10:14;for(let i=5;i<end;i++){put(i,15-i,'#');put(i,16-i,'I');if(key!=='katana')put(i+1,16-i,'H');put(i+1,17-i,'#');}
  for(let i=1;i<6;i++){put(i,16-i,'B');put(i+1,16-i,'#');}for(let i=0;i<5;i++)put(4+i,9+i,'G');
 }else if(key==='axe'||key==='pickaxe'){
  for(let y=3;y<16;y++)put(6,y,'B');for(let x=3;x<13;x++)put(x,3,'#');for(let x=4;x<13;x++)put(x,4,'I');
  if(key==='axe')for(let y=5;y<9;y++)for(let x=8;x<13;x++)put(x,y,x===12?'H':'I');else {put(3,4,'I');put(2,5,'I');put(13,5,'I');put(13,6,'#');}
 }else if(key==='mace'){
  for(let y=6;y<16;y++){put(7,y,'B');put(8,y,'#');}for(let y=2;y<8;y++)for(let x=4;x<12;x++)put(x,y,x===4||x===11||y===2||y===7?'#':y===4?'G':'P');
 }else if(key==='bow'||key==='enchantedbow'){for(let y=1;y<15;y++){const x=Math.round(10-Math.sin(y/15*Math.PI)*5);put(x,y,'B');put(11,y,'H');}for(let x=4;x<14;x++)put(x,8,'G');
 }else if(key==='crossbow'||key==='toxicbow'){for(let y=4;y<15;y++)put(8,y,'B');for(let x=2;x<14;x++){put(x,5,'#');put(x,6,'I');}for(let x=3;x<13;x++)put(x,9,'H');
 }else {for(let y=3;y<16;y++)put(7,y,'B');for(let y=0;y<5;y++)for(let x=5;x<10;x++)put(x,y,x===5||x===9?'#':'P');}
 return grid;
}
export function pixelTool(group,key){if(!cache.has(key)){
 const template=new THREE.BoxGeometry(),batches=new Map(),pixels=itemPixels(key);
 for(let y=0;y<16;y++)for(let x=0;x<16;x++){const char=pixels[y][x];if(char==='.')continue;if(!batches.has(char))batches.set(char,{p:[],n:[]});const b=batches.get(char);for(let j=0;j<36;j++){const i=template.index.getX(j),p=template.attributes.position,n=template.attributes.normal;b.p.push((p.getX(i)+x-7.5)*.055,(p.getY(i)+15-y)*.055,p.getZ(i)*.055);b.n.push(n.getX(i),n.getY(i),n.getZ(i));}}
 const parts=[];for(const [char,b]of batches){const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(b.p,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(b.n,3));parts.push({geometry,material:new THREE.MeshLambertMaterial({color:colors[char]})});}cache.set(key,parts);template.dispose();
 }for(const part of cache.get(key))group.add(new THREE.Mesh(part.geometry,part.material));}
export function itemIcon(key){const canvas=document.createElement('canvas');canvas.width=canvas.height=16;const ctx=canvas.getContext('2d');const grid=itemPixels(key);for(let y=0;y<16;y++)for(let x=0;x<16;x++){const c=colors[grid[y][x]];if(c){ctx.fillStyle='#'+c.toString(16).padStart(6,'0');ctx.fillRect(x,y,1,1);}}return canvas.toDataURL();}

const potionIcons=new Map();export function potionIcon(id){if(potionIcons.has(id))return potionIcons.get(id);const canvas=document.createElement('canvas');canvas.width=canvas.height=16;const c=canvas.getContext('2d');c.fillStyle='#5d3927';c.fillRect(6,1,4,2);c.fillStyle='#d6f4ef';c.fillRect(6,3,4,3);c.fillRect(4,6,8,2);c.fillRect(3,8,10,6);c.fillRect(5,14,6,1);c.fillStyle='#'+window.PotionRules.items[id].color.toString(16).padStart(6,'0');c.fillRect(4,9,8,4);c.fillStyle='#ffffff';c.fillRect(5,7,2,3);const url=canvas.toDataURL();potionIcons.set(id,url);return url;}
