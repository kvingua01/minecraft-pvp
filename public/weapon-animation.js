// Shared by first-person hands and remote avatars. Callers restore the resting
// position before each frame so translations never accumulate between attacks.
export function animateWeapon(group,key,phase){
 const a=Math.sin(Math.PI*Math.max(0,Math.min(1,phase)));
 group.rotation.set(0,0,-.22);
 if(['sword','katana','dagger'].includes(key)){group.rotation.z+=a*1.4;group.rotation.x=-a*.6;}
 else if(['axe','pickaxe'].includes(key)){group.rotation.z+=a*.9;group.rotation.x=-a*1.1;}
 else if(key==='mace'){group.rotation.x=-a*1.6;group.position.y-=a*.08;}
 else if(key==='trident'){group.rotation.x=-a*.75;group.rotation.y=-a*.2;group.position.z-=a*.32;}
 else if(key==='slimefists'){group.rotation.x=-a*.6;group.rotation.z+=a*.4;group.position.z-=a*.24;}
 else if(['bow','enchantedbow'].includes(key)){group.rotation.x=-a*.25;group.position.z+=a*.09;}
 else if(['crossbow','toxicbow','tntlauncher'].includes(key)){group.rotation.x=-a*.55;group.position.z+=a*.1;}
 else {group.rotation.x=-a*.3;group.position.z+=a*.06;}
}
