import * as THREE from '/vendor/three.module.js';
const cache=new Map(),colors={'#':0x344149,I:0xd7e7e7,H:0xf7ffff,B:0x96633b,G:0xc6a65e,P:0x819caf};
export function itemPixels(key){const grid=Array.from({length:16},()=>Array(16).fill('.')),put=(x,y,c)=>{if(x>=0&&x<16&&y>=0&&y<16)grid[y][x]=c;};
 if(['sword','katana','dagger'].includes(key)){
  const end=key==='dagger'?10:14;for(let i=5;i<end;i++){put(i,15-i,'#');put(i,16-i,'I');if(key!=='katana')put(i+1,16-i,'H');put(i+1,17-i,'#');}
  for(let i=1;i<6;i++){put(i,16-i,'B');put(i+1,16-i,'#');}for(let i=0;i<5;i++)put(4+i,9+i,'G');
 }else if(key==='axe'||key==='pickaxe'){
  for(let y=3;y<16;y++)put(6,y,'B');for(let x=3;x<13;x++)put(x,3,'#');for(let x=4;x<13;x++)put(x,4,'I');
  if(key==='axe')for(let y=5;y<9;y++)for(let x=8;x<13;x++)put(x,y,x===12?'H':'I');else {put(3,4,'I');put(2,5,'I');put(13,5,'I');put(13,6,'#');}
 }else if(key==='mace'){
  for(let y=6;y<16;y++){put(7,y,'B');put(8,y,'#');}for(let y=2;y<8;y++)for(let x=4;x<12;x++)put(x,y,x===4||x===11||y===2||y===7?'#':y===4?'G':'P');
 }else if(key==='bow'){for(let y=1;y<15;y++){const x=Math.round(10-Math.sin(y/15*Math.PI)*5);put(x,y,'B');put(11,y,'H');}for(let x=4;x<14;x++)put(x,8,'G');
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
