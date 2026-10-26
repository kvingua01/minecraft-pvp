function fixedClock(start,{step=1000/60,maxSteps=5}={}){
 let previous=start,remaining=0;
 return {advance(now,tick){remaining+=Math.max(0,Math.min(now-previous,250));previous=now;let steps=0;while(remaining+1e-7>=step&&steps<maxSteps){remaining-=step;tick(step/1000);steps++;}if(steps===maxSteps&&remaining>=step)remaining%=step;return steps;}};
}
module.exports={fixedClock};
