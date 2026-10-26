export function createAudio({socket,getSelf,getPlayers,isActive}){
 const slider=document.querySelector('#volume');let context=null,master=null,voices=0,tones=0,lastTone=0,lastStep=0,walked=0,previous=null,owner=null,control=null,winner=null;
 function unlock(){if(Number(slider.value)===0)return;try{if(!context){context=new AudioContext();master=context.createGain();master.connect(context.destination);}if(context.state==='suspended')context.resume().catch(()=>{});master.gain.value=(Number(slider.value)/100)**2*.2;}catch{context=null;}}
 function tone(frequency,duration=.1,type='triangle',level=1,delay=0){
  if(!context||context.state!=='running'||!master||Number(slider.value)===0||voices>=12||level<=0)return;
  const osc=context.createOscillator(),gain=context.createGain(),start=context.currentTime+delay;osc.type=type;osc.frequency.setValueAtTime(frequency,start);osc.frequency.exponentialRampToValueAtTime(Math.max(30,frequency*.6),start+duration);gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.22*level,start+.008);gain.gain.exponentialRampToValueAtTime(.001,start+duration);osc.connect(gain);gain.connect(master);voices++;tones++;osc.start(start);osc.stop(start+duration+.02);osc.onended=()=>{voices--;osc.disconnect();gain.disconnect();};
 }
 function level(id){const self=getSelf(),p=getPlayers().find(p=>p.id===id);if(!self||!p)return 0;return id===self.id?1:Math.max(0,1-Math.hypot(p.x-self.x,p.y-self.y,p.z-self.z)/18)*.5;}
 window.addEventListener('pointerdown',unlock);window.addEventListener('keydown',unlock);for(const control of [slider,document.querySelector('#pause-volume')])control.addEventListener('input',()=>{slider.value=control.value;document.querySelector('#pause-volume').value=control.value;unlock();if(master)master.gain.value=(Number(slider.value)/100)**2*.2;tone(640,.07);});
 socket.on('combat',e=>{if(!getSelf())return;const volume=e.target===getSelf().id?1:level(e.source||e.target);if(!volume)return;
  if(e.type==='attack')tone(e.weapon==='bow'||e.weapon==='crossbow'?420:e.weapon==='mace'?90:e.weapon==='axe'?130:210,.11,'triangle',volume);

  if(e.type==='hit'&&performance.now()-lastTone>60){lastTone=performance.now();tone(e.target===getSelf().id?95:e.critical?1100:740,.09,'triangle',e.target===getSelf().id ? .8 : volume);}
  if(e.type==='kill'&&e.source===getSelf().id){tone(660,.12);tone(990,.15,'triangle',1,.12);}
 });
 socket.on('hero',e=>{if(!getSelf())return;if(e.type==='ability')tone(e.key==='r'?220:520,.2,'sine',level(e.source));if(e.type==='heal'&&e.target===getSelf().id&&performance.now()-lastTone>180){lastTone=performance.now();tone(880,.1,'sine',.6);}});
 socket.on('potion',e=>{if(!getSelf())return;const self=getSelf(),volume=e.type==='splash'?Math.max(0,1-Math.hypot(e.x-self.x,e.y-self.y,e.z-self.z)/18)*.7:level(e.source);tone(e.type==='splash'?330:e.type==='drink'?720:470,.15,'sine',volume);});
 function snapshot(state){if(!getSelf()||!state.match)return;const m=state.match;if(m.control&&m.control!==control){tone(m.control===getSelf().team?660:180,.2);tone(m.control===getSelf().team?880:140,.2,'triangle',1,.15);}control=m.control;if(m.winner&&m.winner!==winner){for(let i=0;i<3;i++)tone((m.winner===getSelf().team?440:220)*[1,1.25,1.5][i],.25,'sine',1,i*.18);}winner=m.winner;}
 function frame(now){const p=getSelf();if(!p||!isActive()||p.hp<=0){previous=null;return;}if(owner!==p.id){owner=p.id;previous=null;walked=0;}if(previous){const delta=Math.hypot(p.x-previous.x,p.z-previous.z);if(delta<.7&&p.grounded)walked+=delta;else walked=0;}previous={x:p.x,z:p.z};if(walked>1.5&&now-lastStep>160){walked=0;lastStep=now;tone(85,.045,'triangle',.22);}}
 function clear(){previous=null;walked=0;control=null;winner=null;}
 return {snapshot,frame,clear,diagnostics:()=>({state:context?.state||'unstarted',tones,volume:Number(slider.value)})};
}
