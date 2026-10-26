const W=require('../shared/world');
const {performance}=require('node:perf_hooks');
const players=Array.from({length:10},(_,i)=>({...W.spawn(i),x:i-5,y:0,z:10,solids:[]})),input={forward:true,right:true,yaw:.7,sprint:true};
for(let i=0;i<10000;i++)W.step(players[i%10],input,1/60);
const samples=[];
for(let run=0;run<5;run++){const start=performance.now();for(let i=0;i<30000;i++)W.step(players[i%10],input,1/60);samples.push(performance.now()-start);}
samples.sort((a,b)=>a-b);console.log(JSON.stringify({node:process.version,stepsPerSample:30000,players:10,medianMs:samples[2],samplesMs:samples},null,2));
