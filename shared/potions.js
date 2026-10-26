(function(root){
 const items={
  healing:{name:'Healing',description:'Restore 40 health.',charges:2,color:0xef847e},
  speed:{name:'Speed',description:'Move 25% faster for 8s.',charges:1,color:0x8ad8eb,duration:8000},
  strength:{name:'Strength',description:'Deal 25% more weapon damage for 8s.',charges:1,color:0xe8a36b,duration:8000},
  regeneration:{name:'Regeneration',description:'Restore 5 health each second for 8s.',charges:1,color:0xd79de1,duration:8000},
  slowness:{name:'Slowness splash',description:'Throw a flask that slows enemies for 5s.',charges:1,color:0x8b9eda,duration:5000,splash:true},
  damage:{name:'Damage splash',description:'Throw a flask for 30 area damage.',charges:1,color:0xc1a0dc,splash:true},
  fireResistance:{name:'Fire resistance',description:'Ignore flame and burning damage for 10s.',charges:1,color:0xf2c263,duration:10000}
 };
 const keys=Object.keys(items),has=id=>typeof id==='string'&&Object.hasOwn(items,id);
 const api={items,keys,has,cooldown:8000,drinkTime:650};if(typeof module!=='undefined')module.exports=api;else root.PotionRules=api;
})(globalThis);
