import * as THREE from '/vendor/three.module.js';
// Original 16px tiles. No downloaded textures, fonts or game assets.
export function createVoxelLook(){
 const textures=new Map(),materials=new Map();
 function texture(kind,color){
  const key=kind+':'+color;if(textures.has(key))return textures.get(key);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=16;const ctx=canvas.getContext('2d');let seed=Number(color)||37;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const rgb=[(color>>16)&255,(color>>8)&255,color&255];
  function pixel(x,y,shade,override){const c=override||rgb;ctx.fillStyle=`rgb(${c.map(v=>Math.max(0,Math.min(255,Math.round(v*shade)))).join(',')})`;ctx.fillRect(x,y,1,1);}
  for(let y=0;y<16;y++)for(let x=0;x<16;x++){
   let shade=.83+random()*.32;
   if(kind==='stone'){const row=Math.floor(y/8),seam=y%8===0||(x+(row%2)*8)%16===0;shade=seam?.53:shade;}
   if(kind==='cobble'){const row=Math.floor(y/5),seam=y%5===0||(x+(row%2)*3)%7===0;shade=seam?.55:shade;}
   if(kind==='planks'){if(y%4===0)shade=.57;else if(y%4===1)shade=1.12;if((x+Math.floor(y/4)*5)%16===0)shade*=.7;}
   if(kind==='log')shade=(x%5===0?.6:.8+random()*.3);
   if(kind==='leaves')shade=random()<.25?.6:shade;
   if(kind==='grass-side'){pixel(x,y,shade,y<3+(x%3===0?2:0)?[91,148,48]:[123,85,54]);continue;}
   pixel(x,y,shade);
  }
  const map=new THREE.CanvasTexture(canvas);map.magFilter=THREE.NearestFilter;map.minFilter=THREE.NearestMipmapNearestFilter;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.colorSpace=THREE.SRGBColorSpace;textures.set(key,map);return map;
 }
 function material(kind,color){const key=kind+':'+color;if(!materials.has(key))materials.set(key,new THREE.MeshLambertMaterial({map:texture(kind,color)}));return materials.get(key);}
 function classify(color){if([0x6e9f50].includes(color))return 'grass';if([0x497d4e].includes(color))return 'leaves';if([0xa07b4e,0xb39061].includes(color))return 'planks';if(color===0x896546)return 'log';if([0x879493,0x82928d,0x8b9993].includes(color))return 'cobble';return 'stone';}
 function addWorld(scene,boxes){
  const template=new THREE.BoxGeometry(1,1,1),groups=new Map();
  for(const b of boxes){const kind=classify(b.color);for(let face=0;face<6;face++){
   const tile=kind==='grass'?(face===2?'grass':face===3?'dirt':'grass-side'):kind,color=kind==='grass'?(face===2?0x6eaa3d:0x805b3a):b.color,key=tile+':'+color;
   if(!groups.has(key))groups.set(key,{positions:[],normals:[],uvs:[],material:material(tile,color)});const batch=groups.get(key),sx=face<2?b.d:b.w,sy=face===2||face===3?b.d:b.h;
   for(let i=face*6;i<face*6+6;i++){const index=template.index.getX(i),p=template.attributes.position,n=template.attributes.normal,uv=template.attributes.uv;batch.positions.push(p.getX(index)*b.w+b.x,p.getY(index)*b.h+b.y,p.getZ(index)*b.d+b.z);batch.normals.push(n.getX(index),n.getY(index),n.getZ(index));batch.uvs.push(uv.getX(index)*sx,uv.getY(index)*sy);}
  }}
  for(const b of groups.values()){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(b.positions,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(b.normals,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(b.uvs,2));scene.add(new THREE.Mesh(geo,b.material));}template.dispose();
  const clouds=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial({color:0xffffff}),18),dummy=new THREE.Object3D();
  for(let i=0;i<18;i++){dummy.position.set((i*29%130)-65,23+(i%3)*2,(i*47%130)-65);dummy.scale.set(8+i%4*3,.65,4+i%3*2);dummy.updateMatrix();clouds.setMatrixAt(i,dummy.matrix);}scene.add(clouds);
  const sun=new THREE.Mesh(new THREE.PlaneGeometry(8,8),new THREE.MeshBasicMaterial({color:0xfff4bc,fog:false}));sun.position.set(-45,55,-55);sun.lookAt(0,0,0);scene.add(sun);
 }
 return {addWorld,material:color=>material('pixel',color)};
}
