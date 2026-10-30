(function(root){
  const weapons={
    tntlauncher:{name:'TNT Launcher',damage:26,cooldown:1000,projectile:'tnt'},
    trident:{name:'Trident',damage:35,cooldown:650,projectile:'trident'},
    enchantedbow:{name:'Enchanted Bow',damage:23,cooldown:0,charge:1000,animationDuration:400,projectile:'enchanted'},
    witherstaff:{name:'Wither Staff',damage:18,cooldown:750,projectile:'witherbolt'},
    blazerods:{name:'Blaze Rods',damage:16,cooldown:700,projectile:'blazefire'},
    slimefists:{name:'Slime Fists',damage:21,cooldown:600,range:2.8},
    totemstaff:{name:'Totem Staff',damage:19,cooldown:650,projectile:'totem'},
    darkstaff:{name:'Dark Staff',damage:18,cooldown:700,projectile:'dark'},
    firestaff:{name:'Fire Staff',damage:16,cooldown:700,projectile:'ember'},
    naturestaff:{name:'Nature Staff',damage:15,cooldown:700,projectile:'nature'},
    toxicbow:{name:'Poison Crossbow',damage:25,cooldown:1800,projectile:'toxic'},
    katana:{name:'Katana',damage:17,cooldown:330,range:3.25},
    dagger:{name:'Daggers',damage:12,cooldown:220,range:2.4},
    pickaxe:{name:'Iron Pickaxe',damage:23,cooldown:750,range:3},
    sword:{name:'Sword',damage:20,cooldown:450,range:3.2},
    axe:{name:'Axe',damage:32,cooldown:950,range:3.1},
    mace:{name:'Mace',damage:28,fallDamagePerBlock:10,cooldown:1150,range:3.1},
    bow:{name:'Bow',damage:32,cooldown:0,charge:1000,animationDuration:400},
    crossbow:{name:'Crossbow',damage:38,cooldown:1800},
    launcher:{name:'Potion Launcher',damage:16,cooldown:750},
    staff:{name:'Frost Staff',damage:16,cooldown:650}
  };
  Object.assign(weapons,(typeof module!=='undefined'?require('./specialized'):root.SpecializedKits).weapons);
  const equipment={helmet:.04,chestplate:.08,leggings:.05,boots:.03};
  const slots=['sword','axe','mace','bow','crossbow','katana','dagger','pickaxe','staff'], maxHealth=100,armor=Object.values(equipment).reduce((a,b)=>a+b,0),respawnDelay=6000;
  function direction(yaw,pitch=0){return {x:-Math.sin(yaw)*Math.cos(pitch),y:Math.sin(pitch),z:-Math.cos(yaw)*Math.cos(pitch)};}
  // Slab intersection returns the distance along a normalized ray, including starting inside.
  function rayBox(origin,dir,min,max,limit=Infinity){
    let near=0,far=limit;
    for(const axis of ['x','y','z']){
      if(Math.abs(dir[axis])<1e-8){if(origin[axis]<min[axis]||origin[axis]>max[axis])return null;continue;}
      let a=(min[axis]-origin[axis])/dir[axis],b=(max[axis]-origin[axis])/dir[axis];
      if(a>b)[a,b]=[b,a];near=Math.max(near,a);far=Math.min(far,b);if(near>far)return null;
    }
    return near;
  }
  function wallDistance(origin,dir,limit,boxes){
    let nearest=limit;
    for(const b of boxes)if(b.solid){const distance=rayBox(origin,dir,{x:b.x-b.w/2,y:b.y-b.h/2,z:b.z-b.d/2},{x:b.x+b.w/2,y:b.y+b.h/2,z:b.z+b.d/2},nearest);if(distance!==null)nearest=distance;}
    return nearest;
  }
  function playerDistance(origin,dir,p,limit,padding=0){const radius=p.hitbox?.radius??.32,height=p.hitbox?.height??1.8;return rayBox(origin,dir,{x:p.x-radius-padding,y:p.y,z:p.z-radius-padding},{x:p.x+radius+padding,y:p.y+height,z:p.z+radius+padding},limit);}
  function inSpawn(p){if(['ffa','duel_1v1','kit_ladder','juggernaut'].includes(p.mode))return false;return Math.abs(p.x)>22&&Math.abs(p.z)<6;}

  const api={weapons,equipment,slots,maxHealth,armor,respawnDelay,direction,rayBox,wallDistance,playerDistance,inSpawn};
  if(typeof module!=='undefined')module.exports=api;else root.CombatRules=api;
})(globalThis);
