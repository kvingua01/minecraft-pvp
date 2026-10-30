(function(root){
 const rows=[
 ['iron-plating','Iron Plating',250,'green','Maximum HP +15.',{hp:15}],
 ['running-boots','Running Boots',300,'green','Movement speed +8%.',{speed:.08}],
 ['sharp-edge','Sharp Edge',400,'green','Primary weapon damage +8%.',{damage:.08}],
 ['feather-charm','Feather Charm',200,'green','Jump height +15%.',{jump:.15}],
 ['quick-gloves','Quick Gloves',350,'green','Primary attack speed +8%.',{attack:.08}],
 ['healing-band','Healing Band',250,'green','Healing received +10%.',{received:.1}],
 ['mana-crystal','Mana Crystal',350,'green','Q/E cooldowns reduced 7%; R unchanged.',{cooldown:.07}],
 ['sturdy-boots','Sturdy Boots',250,'green','Fall damage and incoming knockback reduced 8%.',{fall:.08,knock:.08}],
 ['vitality-seed','Vitality Seed',300,'green','Regenerate 1 HP/s after six seconds without enemy damage.',{}],
 ['battle-focus','Battle Focus',350,'green','Ultimate charge generation +8%.',{ult:.08}],
 ['guardian-plate','Guardian Plate',900,'blue','Maximum HP +30.',{hp:30}],
 ['vampire-fang','Vampire Fang',850,'blue','Restore 8 HP on an elimination.',{}],
 ['thunder-stone','Thunder Stone',1100,'blue','Every fifth damaging primary hit chains 8 lightning damage to one other visible enemy within 5 blocks. One-second internal cooldown.',{}],
 ['swift-striker','Swift Striker',1050,'blue','Movement speed +10%; primary attack speed +5%.',{speed:.1,attack:.05}],
 ['blast-core','Blast Core',950,'blue','Eligible explosive weapon/ability radius +20%; damage unchanged.',{blast:.2}],
 ['recovery-gem','Recovery Gem',1000,'blue','Regenerate 3 HP/s after five seconds without enemy damage.',{}],
 ['battle-battery','Battle Battery',1100,'blue','Ultimate charge generation +15%.',{ult:.15}],
 ['medics-emblem',"Medic’s Emblem",850,'blue','Healing dealt and received +15%.',{healing:.15,received:.15}],
 ['frost-fang','Frost Fang',1150,'blue','Every fourth damaging primary hit slows its target 20% for 1.5 seconds. DoT does not count.',{}],
 ['emergency-armor','Emergency Armor',1050,'blue','Crossing below 30% HP grants 20% resistance for four seconds. 30-second cooldown.',{}],
 ['titan-armor','Titan Armor',2700,'purple','Maximum HP +50; damage resistance +8%.',{hp:50,resist:.08}],
 ['phoenix-heart','Phoenix Heart',3000,'purple','Once per round, survive lethal damage at 20 HP with one second of protection.',{}],
 ['storm-bringer','Storm Bringer',2900,'purple','Every fourth damaging primary hit deals 12 lightning damage to visible enemies within 4 blocks. One-second internal cooldown.',{}],
 ['berserkers-fury',"Berserker’s Fury",2100,'purple','Deal 20% more player damage while below 40% HP. Item damage is not amplified.',{}],
 ['echo-strike','Echo Strike',2500,'purple','Every fifth primary hit repeats 50% of its damage without triggering other weapon items.',{}],
 ['gravity-core','Gravity Core',2400,'purple','Direct damage slows an enemy 15% for two seconds. Six-second cooldown.',{}],
 ['second-wind','Second Wind',2300,'purple','Eliminations restore 20 HP and grant +15% movement speed for three seconds.',{}],
 ['ultimate-engine','Ultimate Engine',2800,'purple','Ultimate charge generation +25% (combined item bonus capped at 35%).',{ult:.25}],
 ['void-armor','Void Armor',2600,'purple','Taking 25 HP damage within two seconds grants 25% resistance for three seconds. 20-second cooldown.',{}],
 ['hunters-instinct',"Hunter’s Instinct",2200,'purple','Direct damage grants +15% movement speed for two seconds. Five-second cooldown.',{}]
 ];
 const items=Object.fromEntries(rows.map(([id,name,price,rarity,description,stats],index)=>[id,{id,name,price,rarity,description,stats,icon:index}]));
 const rules={shopMs:45000,roundGoal:150,wins:2,startMoney:1000,assistMs:10000,captureMs:1000,slots:6,resistCap:.3,ultCap:.35,procMs:1000};
 const api={items,ids:Object.keys(items),rules};if(typeof module!=='undefined')module.exports=api;else root.UpgradeItems=api;
})(globalThis);
