const C=require('../shared/combat'),W=require('../shared/world');
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
class BotAbilities{
 constructor(combat,aimEnemy=null){this.combat=combat;this.aimEnemy=aimEnemy;}
 aim(bot,target,ground=false){const dx=target.x-bot.x,dz=target.z-bot.z;return {yaw:Math.atan2(-dx,-dz),pitch:Math.max(-1.5,Math.min(1.5,Math.atan2(target.y+(ground ? .06 : (target.hitbox?.height??1.8)/2)-(bot.y+1.62),Math.max(.01,Math.hypot(dx,dz)))))};}
 safeDash(bot,target,length){const d=C.direction(this.aim(bot,target).yaw),boxes=this.combat.heroes.boxes();for(let step=.5;step<=length;step+=.5){const probe={...bot,solids:this.combat.heroes.solids()};W.move(probe,{x:d.x*step,z:d.z*step});if(Math.hypot(probe.x-bot.x-d.x*step,probe.z-bot.z-d.z*step)>.2)return false;const top={x:probe.x,y:bot.y+1,z:probe.z},fall=C.wallDistance(top,{x:0,y:-1,z:0},5,boxes);if(fall>=4||Math.abs(probe.x)>30||Math.abs(probe.z)>30)return false;const y=top.y-fall;if(W.getMap(bot.map).hazards.some(h=>Math.abs(probe.x-h.x)<(h.w||h.radius*2)/2+.35&&Math.abs(probe.z-h.z)<(h.d||h.radius*2)/2+.35&&y<h.y+(h.height||1.3)))return false;}return true;}
 grapple(bot,enemy){const away=this.aim(bot,enemy).yaw+Math.PI,h=this.combat.heroes;for(const turn of [0,.6,-.6]){const yaw=away+turn,pitch=.35,d=C.direction(yaw,pitch),o={x:bot.x,y:bot.y+1.62,z:bot.z},length=C.wallDistance(o,d,22,h.boxes());if(length<2||length>=22)continue;const target={x:o.x+d.x*(length-1),y:bot.y,z:o.z+d.z*(length-1)};if(this.safeDash(bot,target,Math.min(10,length-1)))return {yaw,pitch};}return null;}
 choices(room,bot,enemy,now){const h=this.combat.heroes,d=enemy?distance(bot,enemy):Infinity,health=bot.hp/bot.maxHp,own=this.combat.heroes.units.units.filter(u=>u.owner===bot.id&&u.hp>0&&u.expires>now),allies=[...room.values()].filter(p=>p.team===bot.team&&p.connected!==false&&p.hp>0&&distance(bot,p)<=12&&h.visible({...bot,y:bot.y+1},{...p,y:p.y+1})),hurt=allies.filter(p=>p.hp<p.maxHp*.85).sort((a,b)=>(b.maxHp-b.hp)-(a.maxHp-a.hp))[0],nearHurt=r=>hurt&&distance(bot,hurt)<=r;
 const result=[],add=(key,when,target=enemy,ground=false)=>{if(when)result.push({key,target,ground});},dash=(n)=>enemy&&this.safeDash(bot,enemy,n);
 const kit=require('../shared/heroes').heroes[bot.hero];if(kit.specialized){if(kit.healer){const ally=allies.find(t=>t!==bot&&t.hp<t.maxHp);add('e',health<.8,bot);add('r',!!ally,ally,true);add('q',!!ally,ally,false);}else{add('r',d<14,enemy,true);if(bot.hero==='chainreaper'){const aim=this.grapple(bot,enemy||bot);if(aim)result.push({key:'e',aim});}else add('e',kit.category==='Tanks'?d<12:d>3&&d<12&&dash(5),enemy,false);add('q',d<(kit.category==='Tanks'?5:16),enemy,['bombardier','portalstriker'].includes(bot.hero));}return result;}
 switch(bot.hero){
 case 'knight':add('r',d<8);add('e',d<8||nearHurt(8),bot);add('q',d>3&&d<12&&dash(8));break;
 case 'berserker':add('r',d<12);add('q',d<12);add('e',d>3&&d<9&&bot.grounded&&dash(5));break;
 case 'assassin':add('r',d<9);add('e',d<12&&health<.75,bot);add('q',d>3&&d<10&&dash(5));break;
 case 'archer':add('r',d<16,enemy,true);add('e',d<16);if(d<8&&health<.7){const aim=this.grapple(bot,enemy);if(aim)result.push({key:'q',aim});}break;
 case 'paladin':add('r',d<10&&nearHurt(10),bot);add('q',nearHurt(7),bot);add('e',!!hurt,hurt);break;
 case 'alchemist':add('r',!!hurt||d<16,hurt||enemy,true);add('q',!!hurt,hurt,true);add('e',d<16,enemy,true);break;
 case 'mace':add('r',d<6&&bot.grounded);add('e',d<4);add('q',d<8&&bot.grounded);break;
 case 'frost':add('r',d<16,enemy,true);add('e',d<9&&health<.7);add('q',d<16);break;
 case 'necromancer':add('r',d<16&&!own.some(u=>u.kind==='zombie'));add('e',d<12&&health<.85);add('q',d<16&&!own.some(u=>u.kind==='skeleton'));break;
 case 'engineer':add('r',d<16&&!own.some(u=>u.kind==='megaTurret'));add('e',!!hurt&&!own.some(u=>u.kind==='station'),hurt);add('q',d<16&&!own.some(u=>u.kind==='turret'));break;
 case 'pyromancer':add('r',d<16,enemy,true);add('q',d<16);add('e',d>3&&d<10&&dash(8));break;
 case 'samurai':add('r',d<4);add('e',d<3&&enemy&&C.weapons[enemy.weapon]?.range);add('q',d>2&&d<7&&dash(5));break;
 case 'druid':add('r',d<16&&!own.some(u=>u.kind==='guardian'));add('q',!!hurt,hurt,true);add('e',d<16,enemy,true);break;
 case 'plague':add('r',d<16,enemy,true);add('e',allies.some(p=>p.hp<p.maxHp*.8||['poisoned','burning','slow','slowPotion','root','afflicted'].some(k=>p.status?.[k]>now)),hurt||allies.find(p=>['poisoned','burning','slow','slowPotion','root','afflicted'].some(k=>p.status?.[k]>now))||bot);add('q',d<16);break;
 case 'demolitionist':add('r',d<16,enemy,true);add('e',d<7&&health<.75&&bot.grounded&&dash(4));add('q',d<14,enemy,true);break;
 case 'trident':add('e',health<.8,bot);add('r',d<12);add('q',d>3&&d<10&&!(bot.status.tridentOut>now)&&dash(10));break;
 case 'illusionist':{const decoy=own.find(u=>u.kind==='decoy');add('r',d<12);add('e',d<14&&health<.6&&decoy&&enemy&&distance(decoy,enemy)>d+1,decoy);add('q',d<16&&!decoy);break;}
 case 'wither':add('r',d<16,enemy,true);add('e',d<12&&health<.7&&bot.grounded,bot);add('q',d<16);break;
 case 'blaze':add('r',d<14&&!own.some(u=>u.kind==='blazerod'));add('q',d<4);add('e',d<9&&bot.grounded&&health<.8,bot);break;
 case 'slime':add('r',d<12&&!own.some(u=>u.kind==='slime'));add('e',d<14,enemy,true);add('q',d<8&&bot.grounded&&!bot.extraBounce);break;
 case 'evoker':add('r',d<16,enemy,true);add('e',d<16&&!own.some(u=>u.kind==='vex'));add('q',d<12);break;
 }
 return result;
 }
 tick(room,bot,brain,enemy,now){if(this.combat.inLobby||this.combat.matchOver||bot.connected===false||this.combat.protected(bot,now)||bot.inventoryOpen||bot.drinking||now<(brain.nextAbility||0)||bot.drawAt)return false;
 brain.nextAbility=now+400;const original={yaw:bot.yaw,pitch:bot.pitch,input:bot.input};for(const choice of this.choices(room,bot,enemy,now)){if(choice.key==='r'?bot.ult<100:now<bot.abilityReady[choice.key])continue;const aim=choice.aim||(choice.target?(choice.target===enemy&&this.aimEnemy?this.aimEnemy(bot,choice.target,choice.ground,brain,now):this.aim(bot,choice.target,choice.ground)):{yaw:bot.yaw,pitch:bot.pitch});if(!aim)continue;bot.yaw=aim.yaw;bot.pitch=aim.pitch;bot.input={...original.input,...aim};const result=this.combat.heroes.use(room,bot,choice.key,now);if(result.ok){brain.nextAbility=now+700;return true;}Object.assign(bot,original);}return false;
 }
}
module.exports={BotAbilities};
