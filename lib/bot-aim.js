const angle=x=>Math.atan2(Math.sin(x),Math.cos(x));
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));

// Per-bot perception and motor delays. Misses still use ordinary ray/projectile collision.
class BotAim {
 constructor(random=Math.random){this.random=random;}
 update(bot,brain,target,now){
  const dt=clamp((now-(brain.lastAimAt??now-1000/60))/1000,0,.05);
  brain.lastAimAt=now;
  if(!target){brain.targetId=null;brain.observed=null;brain.aimPose=null;brain.swing=null;return null;}
  if(brain.targetId!==target.id){
   brain.targetId=target.id;brain.reactAt=now+350+this.random()*250;
   brain.nextObservation=now;brain.observed={...this.pose(target)};brain.aimPose=null;
   brain.lookYaw=bot.yaw||0;brain.lookPitch=bot.pitch||0;brain.swing=null;
  }
  if(now>=brain.nextObservation){
   brain.aimPose=brain.observed;brain.observed=this.pose(target);
   brain.nextObservation=now+200+this.random()*150;
   brain.yawError=(this.random()*2-1)*.12;
   brain.pitchError=(this.random()*2-1)*.065;
  }
  if(now<brain.reactAt||!brain.aimPose)return null;
  const desired=brain.swing?.aim||this.direction(bot,brain.aimPose,false,brain);
  brain.lookYaw=angle(brain.lookYaw+clamp(angle(desired.yaw-brain.lookYaw),-2.8*dt,2.8*dt));
  brain.lookPitch=clamp(brain.lookPitch+clamp(desired.pitch-brain.lookPitch,-1.8*dt,1.8*dt),-1.5,1.5);
  return {yaw:brain.lookYaw,pitch:brain.lookPitch};
 }
 pose(target){return {x:target.x,y:target.y,z:target.z,height:target.hitbox?.height??1.8};}
 direction(bot,pose,ground,brain){
  const dx=pose.x-bot.x,dz=pose.z-bot.z,distance=Math.hypot(dx,dz);
  return {yaw:Math.atan2(-dx,-dz)+(brain.yawError||0),pitch:clamp(Math.atan2(pose.y+(ground?.06:pose.height/2)-(bot.y+1.62),Math.max(.01,distance))+(brain.pitchError||0),-1.5,1.5)};
 }
 ability(bot,target,ground,brain,now){
  if(brain.targetId!==target.id||now<brain.reactAt||!brain.aimPose)return null;
  // Ground-targeted spells use the same delayed observation, without snapping to a live player.
  if(ground){const aim=this.direction(bot,brain.aimPose,true,brain);return {yaw:brain.lookYaw,pitch:clamp(aim.pitch,brain.lookPitch-.2,brain.lookPitch+.2)};}
  return {yaw:brain.lookYaw,pitch:brain.lookPitch};
 }
 melee(bot,brain,now){
  if(!brain.swing){
   const miss=this.random()<.25,side=this.random()<.5?-1:1;
   brain.swing={at:now+220+this.random()*140,aim:{yaw:brain.lookYaw+(miss?side*(.55+this.random()*.3):0),pitch:brain.lookPitch}};
   return false;
  }
  return now>=brain.swing.at;
 }
 rest(brain,now,cooldown){brain.swing=null;brain.nextWeapon=now+cooldown+250+this.random()*250;}
}
module.exports={BotAim};
