export function createRuntime({renderer,socket,getSelf,isActive,syncClock}){
 const $=s=>document.querySelector(s),quality=new window.ArenaNetwork.Quality((navigator.hardwareConcurrency<=4||navigator.deviceMemory<=4)?.85:1);
 let fps=0,frames=0,frameWindow=performance.now(),lastStats=0,ping=null;
 function apply(){renderer.setPixelRatio(Math.min(devicePixelRatio,quality.scale));}
 function choose(mode){quality.set(mode);$('#quality').value=quality.mode;$('#pause-quality').value=quality.mode;apply();}
 $('#quality').onchange=()=>choose($('#quality').value);$('#pause-quality').onchange=()=>choose($('#pause-quality').value);
 for(const node of [$('#show-stats'),$('#pause-stats')])node.onchange=()=>{$('#show-stats').checked=node.checked;$('#pause-stats').checked=node.checked;$('#runtime-stats').hidden=!node.checked;};
 choose($('#quality').value);
 $('#runtime-stats').hidden=!$('#show-stats').checked;
 setInterval(()=>{
  if(!getSelf()||!socket.connected||document.hidden)return;const start=performance.now(),wall=Date.now();
  socket.timeout(2500).emit('ping-check',{},(error,data)=>{if(error||!data||!Number.isFinite(data.serverTime))return;const rtt=performance.now()-start;if(rtt>2500)return;ping=Math.round(rtt);syncClock(data.serverTime-(wall+Date.now())/2);});
 },2000);
 function frame(now,ms){if(isActive()&&quality.update(ms))apply();frames++;if(now-frameWindow>=1000){fps=Math.round(frames*1000/(now-frameWindow));frames=0;frameWindow=now;}if(now-lastStats>500){lastStats=now;$('#runtime-stats').textContent=`${fps} FPS · ${ping===null?'—':ping} ms · ${Math.round(renderer.getPixelRatio()*100)}% resolution`;}}
 return {frame,interpolationDelay:()=>ping===null?100:Math.min(200,Math.max(100,ping/2+50)),diagnostics:()=>({fps,ping,quality:quality.mode,pixelRatio:renderer.getPixelRatio()})};
}
