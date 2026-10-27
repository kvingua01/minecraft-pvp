import * as THREE from '/vendor/three.module.js';
// Original, deterministic 16x16 artwork. Atlas tiles have a one-pixel gutter.
const palette={netherbrick:0x4b2c35,soulsand:0x69534a,soulfire:0x67c9cc,endstone:0xd7d99f,purpur:0xab7ead,endrod:0xf0e5bb,sail:0xe7e1d1,mycelium:0x8d7f8e,mushroomstem:0xddd5bf,redmushroom:0xc83c3b,brownmushroom:0x927450,glowshroom:0x94d5c0,prismarine:0x568c80,coral:0x63b6ae,coralpink:0xd784a1,sealantern:0xb5e1d6,basalt:0x5b5b60,bookshelf:0x9d704e,chocolate:0x66412e,cookie:0xc19760,frosting:0xf0e4df,candyred:0xd95e70,gumdrop:0xa08cc5,cake:0xd5ab85,copper:0xb17951,gold:0xd2b45b,clock:0xe3d5ab,grass:0x6ca33e,dirt:0x805536,stone:0x949994,cobble:0x7f8985,bricks:0x969f99,cracked:0x89918c,oak:0xaf8248,darkoak:0x60442b,log:0x705034,leaves:0x437d38,sand:0xdcc58b,sandstone:0xcbb27c,snow:0xe7f2f3,ice:0x9dcddf,water:0x397ebd,lava:0xe76519,glass:0x9acbc9,obsidian:0x332b46,fence:0x956a3a,torch:0xeab452,lantern:0xf4c362,door:0x9b743e,roof:0x714530,metal:0xb3c1c6};
export function createVoxelLook(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const ctx=canvas.getContext('2d'),tiles=new Map(),items=new Map();let next=0;
 const atlas=new THREE.CanvasTexture(canvas);atlas.magFilter=atlas.minFilter=THREE.NearestFilter;atlas.generateMipmaps=false;atlas.colorSpace=THREE.SRGBColorSpace;
 function tile(kind,color=palette[kind]||0x999999){const key=kind+':'+color;if(tiles.has(key))return tiles.get(key);const i=next++,tx=i%28,ty=Math.floor(i/28);if(i>=784)throw Error('Atlas full');let seed=color+kind.length;
  const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},rgb=[color>>16&255,color>>8&255,color&255];
  const small=document.createElement('canvas');small.width=small.height=16;const c=small.getContext('2d');
  for(let y=0;y<16;y++)for(let x=0;x<16;x++){let shade=.82+rand()*.3,base=rgb;
   if(['bricks','stone','cracked','sandstone','netherbrick','purpur','prismarine','endstone'].includes(kind)){if(y%8===0||(x+Math.floor(y/8)*8)%16===0)shade=.57;if(kind==='cracked'&&(x+y*3)%17===0)shade=.4;}
   if(kind==='cobble'&&(y%5===0||(x+Math.floor(y/5)*3)%7===0))shade=.55;
   if(['oak','darkoak','fence','roof','door'].includes(kind)){if(y%4===0)shade=.6;if((x+Math.floor(y/4)*5)%16===0)shade*=.65;}
   if(kind==='log')shade=x%5===0?.55:.8+rand()*.3;
   if(kind==='leaves'&&rand()<.3)shade=.55;
   if(kind==='grass-side')base=y<3+(x%3===0?2:0)?[91,148,48]:[123,85,54];
   if(['ice','glass','water'].includes(kind)){if(x===0||y===0)shade=.65;else if((x+y)%12<2)shade=1.3;}
   if(kind==='lava')shade=.65+Math.sin(x*2+y)*.2+rand()*.5;
   if(kind==='redmushroom'&&(x*7+y*3)%19<4)base=[235,218,192];
   if(kind==='cookie'&&(x*3+y*5)%17<2)base=[82,51,31];
   if(kind==='candyred'&&(x+y)%9<3)base=[242,230,221];
   if(kind==='cake'&&y<4)base=[239,226,220];
   if(kind==='copper'&&(x*3+y*5)%13<3)base=[81,143,121];
   if(kind==='bookshelf'){if(y%8===0)base=[105,73,41];else base=[[137,58,49],[67,114,81],[71,88,137],[176,151,83]][Math.floor(x/3)%4];}
   if(['endrod','sealantern','glowshroom','soulfire'].includes(kind)&&(x+y)%4<2)shade=1.25;
   if(kind==='clock'&&(x===8||y===8))base=[70,57,40];
   if(kind==='obsidian')shade=(x+y)%7===0?1.6:shade;
   if(kind==='torch'||kind==='lantern')base=x>3&&x<12&&y>2&&y<13?[255,208,89]:[85,65,43];
   c.fillStyle=`rgb(${base.map(v=>Math.min(255,Math.round(v*shade))).join(',')})`;c.fillRect(x,y,1,1);
  }
  ctx.drawImage(small,tx*18+1,ty*18+1);ctx.drawImage(small,0,0,16,1,tx*18+1,ty*18,16,1);ctx.drawImage(small,0,15,16,1,tx*18+1,ty*18+17,16,1);
  const result={x:tx,y:ty,canvas:small};tiles.set(key,result);atlas.needsUpdate=true;return result;
 }
 for(const kind of Object.keys(palette))tile(kind);
 const worldMaterial=new THREE.MeshLambertMaterial({map:atlas});
 worldMaterial.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute vec2 tileId; varying vec2 vTileId; varying vec2 vTileUv;').replace('#include <uv_vertex>','#include <uv_vertex>\nvTileId=tileId;vTileUv=uv;');shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vTileId; varying vec2 vTileUv;').replace('#include <map_fragment>','diffuseColor *= texture2D(map, vec2((vTileId.x * 18.0 + 1.5 + fract(vTileUv.x) * 15.0) / 512.0, 1.0 - (vTileId.y * 18.0 + 1.5 + fract(vTileUv.y) * 15.0) / 512.0));');};
 worldMaterial.customProgramCacheKey=()=> 'original-block-atlas-v1';
 function classify(b){if(b.tile)return b.tile;const c=b.color;if(c===0x6e9f50)return 'grass';if(c===0x497d4e)return 'leaves';if([0xa07b4e,0xb39061].includes(c))return 'oak';if(c===0x896546)return 'log';if([0x879493,0x82928d,0x8b9993].includes(c))return 'cobble';return 'bricks';}
 function addWorld(scene,boxes){const template=new THREE.BoxGeometry(),pos=[],norm=[],uv=[],ids=[];for(const b of boxes){const kind=classify(b);for(let f=0;f<6;f++){const k=kind==='grass'?(f===2?'grass':f===3?'dirt':'grass-side'):kind,t=tile(k,b.tile?palette[k]:kind==='grass'?palette[k]||palette.dirt:b.color),sx=f<2?b.d:b.w,sy=f===2||f===3?b.d:b.h;
   for(let j=f*6;j<f*6+6;j++){const i=template.index.getX(j),p=template.attributes.position,n=template.attributes.normal,u=template.attributes.uv;pos.push(p.getX(i)*b.w+b.x,p.getY(i)*b.h+b.y,p.getZ(i)*b.d+b.z);norm.push(n.getX(i),n.getY(i),n.getZ(i));uv.push(u.getX(i)*sx,u.getY(i)*sy);ids.push(t.x,t.y);}
  }}
  const geo=new THREE.BufferGeometry();for(const [name,data,size]of [['position',pos,3],['normal',norm,3],['uv',uv,2],['tileId',ids,2]])geo.setAttribute(name,new THREE.Float32BufferAttribute(data,size));geo.computeBoundingSphere();const group=new THREE.Group();group.add(new THREE.Mesh(geo,worldMaterial));scene.add(group);template.dispose();return group;
 }
 function material(color){if(!items.has(color)){const t=tile('pixel',color),map=new THREE.CanvasTexture(t.canvas);map.magFilter=THREE.NearestFilter;map.minFilter=THREE.NearestMipmapNearestFilter;map.colorSpace=THREE.SRGBColorSpace;items.set(color,new THREE.MeshLambertMaterial({map}));}return items.get(color);}
 function sky(scene){const clouds=new THREE.InstancedMesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial({color:0xffffff}),18),d=new THREE.Object3D();for(let i=0;i<18;i++){d.position.set(i*29%130-65,24+i%3*2,i*47%130-65);d.scale.set(8+i%4*3,.65,4+i%3*2);d.updateMatrix();clouds.setMatrixAt(i,d.matrix);}scene.add(clouds);const sun=new THREE.Mesh(new THREE.PlaneGeometry(8,8),new THREE.MeshBasicMaterial({color:0xfff4bc,fog:false}));sun.position.set(-45,55,-55);sun.lookAt(0,0,0);scene.add(sun);}
 return {addWorld,sky,material,diagnostics:()=>({atlasSize:512,tileSize:16,tileCount:tiles.size})};
}
