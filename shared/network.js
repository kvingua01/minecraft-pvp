(function(root){
 function pose(p){return {x:p.x,y:p.y,z:p.z,yaw:p.yaw,pitch:p.pitch};}
 function remember(history,p,time,reset=false){if(reset)history.length=0;if(history.length&&time<=history[history.length-1].time)return;history.push({time,pose:pose(p)});if(history.length>12)history.shift();}
 function sample(history,time){
  if(!history.length)return null;if(time<=history[0].time)return history[0].pose;
  for(let i=1;i<history.length;i++)if(time<=history[i].time){const a=history[i-1],b=history[i],t=(time-a.time)/(b.time-a.time),mix=(x,y)=>x+(y-x)*t;return {x:mix(a.pose.x,b.pose.x),y:mix(a.pose.y,b.pose.y),z:mix(a.pose.z,b.pose.z),pitch:mix(a.pose.pitch,b.pose.pitch),yaw:a.pose.yaw+Math.atan2(Math.sin(b.pose.yaw-a.pose.yaw),Math.cos(b.pose.yaw-a.pose.yaw))*t};}
  return history[history.length-1].pose;
 }
 class Quality {
  constructor(scale=1){this.mode='auto';this.scale=scale;this.mean=16.67;this.slow=0;this.fast=0;}
  set(mode){if(!['auto','0.75','1','1.5'].includes(mode))return;this.mode=mode;this.slow=this.fast=0;if(mode!=='auto')this.scale=Number(mode);else this.scale=Math.min(1,this.scale);}
  update(ms){if(this.mode!=='auto'||ms<=0||ms>250)return false;this.mean+=(ms-this.mean)*.05;this.slow=this.mean>28?this.slow+ms:0;this.fast=this.mean<18?this.fast+ms:0;const old=this.scale;
   if(this.slow>2000){this.scale=Math.max(.55,Math.round((this.scale-.15)*100)/100);this.slow=0;}
   if(this.fast>5000){this.scale=Math.min(1,Math.round((this.scale+.1)*100)/100);this.fast=0;}
   return old!==this.scale;
  }
 }
 const api={remember,sample,Quality};if(typeof module!=='undefined')module.exports=api;else root.ArenaNetwork=api;
})(globalThis);
