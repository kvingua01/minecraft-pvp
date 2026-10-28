export function createSettings({camera,viewCamera}){
 const fields={sensitivity:4,volume:35,quality:'auto','show-stats':false,fov:78,'invert-look':false};
 let saved={};try{saved=JSON.parse(localStorage.getItem('blockward-settings'))||{};}catch{}
 const nodes=id=>[document.getElementById(id),document.getElementById('pause-'+(id==='show-stats'?'stats':id))].filter(Boolean);
 function applyFov(){camera.fov=viewCamera.fov=Number(document.getElementById('fov').value);camera.updateProjectionMatrix();viewCamera.updateProjectionMatrix();}
 function persist(){const values={};for(const id of Object.keys(fields)){const n=nodes(id)[0];values[id]=n.type==='checkbox'?n.checked:n.value;}try{localStorage.setItem('blockward-settings',JSON.stringify(values));}catch{}}
 for(const [id,fallback]of Object.entries(fields)){
  const controls=nodes(id),first=controls[0];let value=saved[id]??fallback;
  if(first.type==='range')value=Number.isFinite(Number(value))?Math.min(Number(first.max),Math.max(Number(first.min),Number(value))):fallback;
  if(first.tagName==='SELECT'&&![...first.options].some(o=>o.value===value))value=fallback;
  if(first.type==='checkbox')value=value===true;
  for(const node of controls){if(node.type==='checkbox')node.checked=value;else node.value=value;for(const event of ['input','change'])node.addEventListener(event,()=>{for(const peer of controls){if(node.type==='checkbox')peer.checked=node.checked;else peer.value=node.value;}applyFov();persist();});}
 }
 applyFov();return {diagnostics:()=>({fov:camera.fov,viewFov:viewCamera.fov,invert:document.getElementById('invert-look').checked}),lookDirection:()=>document.getElementById('invert-look').checked?-1:1};
}
