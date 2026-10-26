(function(root){
 const ability=(name,cooldown,description)=>({name,cooldown,description});
 const heroes={
  knight:{name:'Knight',role:'Tank',health:180,armor:.35,speed:.9,weapon:'sword',shield:true,q:ability('Shield Charge',8000,'Dash forward and knock enemies back.'),e:ability('Battle Cry',12000,'Nearby allies resist 25% damage for 5s.'),r:ability('Fortress',0,'Create an 8s solid defensive barrier.')},
  berserker:{name:'Berserker',role:'Damage',health:130,armor:.2,speed:1,weapon:'axe',q:ability('Rage',10000,'Attack 50% faster for 5s.'),e:ability('Leap',9000,'Leap forward and slam nearby enemies on landing.'),r:ability('Rampage',0,'Gain damage, speed, and knockback for 8s.')},
  assassin:{name:'Assassin',role:'Damage',health:95,armor:.1,speed:1.2,weapon:'sword',q:ability('Dash',6500,'Dash in your movement direction.'),e:ability('Vanish',12000,'Become nearly invisible for 4s; attacking reveals you.'),r:ability('Shadow Strike',0,'Strike an aimed enemy within 9 units for heavy damage.')},
  archer:{name:'Archer',role:'Ranged damage',health:110,armor:.12,speed:1.05,weapon:'bow',q:ability('Grappling Arrow',9000,'Aim at a block within 22 units to pull toward it.'),e:ability('Explosive Arrow',10000,'Fire an arrow that explodes on impact.'),r:ability('Arrow Storm',0,'Rain damaging arrows over the aimed area for 5s.')},
  paladin:{name:'Paladin',role:'Tank / support',health:160,armor:.3,speed:.9,weapon:'sword',shield:true,q:ability('Healing Aura',12000,'Heal nearby teammates for 5s.'),e:ability('Holy Shield',11000,'Protect an aimed ally, or yourself, for 4s.'),r:ability('Divine Protection',0,'Nearby allies resist 60% damage for 5s.')},
  alchemist:{name:'Alchemist',role:'Support',health:120,armor:.2,speed:1,weapon:'launcher',q:ability('Healing Splash',8000,'Heal allies in the aimed area.'),e:ability('Poison Cloud',11000,'Create a 6s damaging cloud.'),r:ability('Mega Potion',0,'Create a 7s healing, speed and resistance zone.')},
  mace:{name:'Mace Warrior',role:'Damage / tank',health:160,armor:.3,speed:.9,weapon:'mace',shield:true,q:ability('Rocket Jump',8000,'Launch upward without landing damage.'),e:ability('Ground Slam',9000,'Dive down and damage nearby enemies on landing.'),r:ability('Meteor Strike',0,'Launch high and land with a devastating shockwave.')},
  frost:{name:'Frost Mage',role:'Control',health:105,armor:.12,speed:1,weapon:'staff',q:ability('Ice Bolt',7000,'Fire a bolt that slows an enemy for 3s.'),e:ability('Ice Wall',12000,'Create a 7s solid wall of ice.'),r:ability('Blizzard',0,'Create a 6s damaging, slowing storm.')}
 };
 const has=id=>typeof id==='string'&&Object.hasOwn(heroes,id);
 const loadout=id=>{const primary=heroes[has(id)?id:'knight'].weapon;return [primary,...['sword','axe','mace','bow','crossbow'].filter(w=>w!==primary)].slice(0,5);};
 const api={heroes,has,loadout};if(typeof module!=='undefined')module.exports=api;else root.HeroRules=api;
})(globalThis);
