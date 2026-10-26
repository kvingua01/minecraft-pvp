(function(root){
 const definitions={castle:{name:'Castle Siege',description:'Battlements, tower and a sunken dungeon',sky:0x91bfff},sky:{name:'Sky Islands',description:'Floating islands, waterfalls and narrow crossings',sky:0x95cfff},lava:{name:'Lava Mines',description:'Mineshafts, rivers of lava and a forge',sky:0x372d30},frozen:{name:'Frozen Village',description:'Snow lodges, a frozen lake and ice fortress',sky:0xc5d9e7},jungle:{name:'Jungle Temple',description:'Canopy routes, mossy ruins and a hidden cave',sky:0x9dc9b4},desert:{name:'Desert Outpost',description:'Sandstone streets, market stalls and an oasis',sky:0xe4d5b3}};
 const has=id=>typeof id==='string'&&Object.hasOwn(definitions,id);
 function build(id,base=[]){id=has(id)?id:'castle';const boxes=[],hazards=[],ice=[],points=[{id:'A',x:0,y:.24,z:-18,radius:3.7},{id:'B',x:0,y:.24,z:0,radius:4},{id:'C',x:0,y:.24,z:18,radius:3.7}];
 const add=(x,y,z,w,h,d,tile,solid=true)=>boxes.push({x,y,z,w,h,d,tile,solid,color:0x999999});
 const platform=(x,y,z,w=8,d=8,tile='bricks')=>add(x,y-.12,z,w,.24,d,tile);
 function stairs(x,z,top,axis='z',sign=1,tile='bricks'){const n=Math.round(top/.5);for(let i=0;i<n;i++){const h=(i+1)*.5;add(x+(axis==='x'?sign*i*.7:0),h/2,z+(axis==='z'?sign*i*.7:0),axis==='x'?.7:3,h,axis==='z'?.7:3,tile);}add(x+(axis==='x'?sign*n*.7:0),top-.12,z+(axis==='z'?sign*n*.7:0),axis==='x'?2.5:3,.24,axis==='z'?2.5:3,tile);}
 function tree(x,z,pine=false){add(x,2,z,1,4,1,'log');if(pine){for(let i=0;i<4;i++)add(x,3+i,z,5-i,1.4,5-i,'leaves',false);}else{add(x,4.5,z,5,2.5,5,'leaves',false);add(x,6,z,3,1,3,'leaves',false);}}
 function house(x,z,tile='oak',roof='roof',w=7){platform(x,.0,z,w,w,'cobble');for(const side of [-1,1]){add(x+side*w/2,1.7,z,.4,3.4,w,tile);add(x+side*(w/4+1),1.7,z-w/2,w/2-1.5,3.4,.4,tile);add(x+side*w/2,2,z,.45,1,1.5,'glass',false);}add(x,3,z-w/2,2,.8,.4,'log');add(x,1.7,z+w/2,w,3.4,.4,tile);for(let i=0;i<4;i++)for(const side of [-1,1])add(x+side*(w/2-i*.8),3.5+i*.45,z,1.5,.5,w+1,roof);add(x,5.1,z,1,.4,w+1,roof);for(const side of [-1,1])add(x+side*1.6,2,z-w/2-.3,.18,.7,.18,'lantern',false);}
 function tower(x,z,y,tile='bricks'){platform(x,y,z,8,8,tile);for(const side of [-1,1])for(const a of [-3,0,3]){add(x+side*3.7,y+.4,z+a,.6,.8,.6,tile);if(a!==0)add(x+a,y+.4,z+side*3.7,.6,.8,.6,tile);}for(const side of [-1,1])add(x+side*3,y/2,z,1,y,6,tile);}
 if(id==='castle'){
 hazards.push({x:-10,y:0,z:20,radius:.95},{x:10,y:0,z:-20,radius:.95});
 boxes.push(...base.filter(b=>!(b.w===64&&b.d===64)&&!(b.x===0&&Math.abs(b.z)===19)));
 add(-18,-1,0,28,2,64,'grass');add(18,-1,0,28,2,64,'grass');add(0,-1,-10,8,2,44,'grass');add(0,-1,28,8,2,8,'grass');add(0,-4.1,18,8,.2,12,'cracked');
 for(let i=0;i<8;i++){const top=-.5*(i+1);if(top>-4)add(0,(-4+top)/2,12.25+i*.5,3,top+4,.5,'cracked');}
 for(const side of [-1,1]){add(side*3.8,-2,18,.4,4,12,'cracked');add(side*3.5,-1.6,20,.15,.7,.15,'torch',false);}
 tower(0,-18,3);stairs(0,-10,3,'z',-1);points[0].y=3;points[2].y=-4;points[0].name='Castle Tower';points[1].name='Central Courtyard';points[2].name='Underground Dungeon';
 }else if(id==='sky'){
 for(const [x,z,w,d]of [[-25,0,14,18],[25,0,14,18],[0,0,18,18],[0,-18,14,14],[0,18,14,14]]){add(x,-1,z,w,2,d,'grass');add(x,-3,z,w-3,2,d-3,'stone');add(x,-5,z,w-6,2,d-6,'stone');}
 for(const side of [-1,1]){platform(side*13,0,0,10,3,'oak');platform(0,0,side*10,3,6,'oak');tree(side*25,5);add(side*27,-6,4,1,12,1,'water',false);for(let n=-4;n<=4;n+=2){add(side*13+n,1,1.6,.12,1.8,.12,'fence');add(side*13+n,1,-1.6,.12,1.8,.12,'fence');}}
 for(const z of [-18,18]){platform(0,.24,z);for(const x of [-4,4])add(x,1.5,z+3,1,3,1,'cracked');}platform(0,.24,0);points[0].name='Northern Island';points[1].name='Main Central Island';points[2].name='Southern Island';
 }else{
 const floor=id==='frozen'?'snow':id==='desert'?'sand':id==='jungle'?'grass':'stone';add(0,-1,0,64,2,64,floor);
 for(const z of [-32,32])add(0,2,z,65,4,1,id==='desert'?'sandstone':'stone');for(const x of [-32,32])add(x,2,0,1,4,65,id==='desert'?'sandstone':'stone');
 if(id==='lava'){
 add(0,13,0,64,2,64,'obsidian');for(const side of [-1,1]){add(side*10,.03,0,4,.06,48,'lava',false);hazards.push({x:side*10,z:0,y:0,w:4,d:48,height:.15,damage:8});for(const z of [-18,0,18]){platform(side*10,.35,z,7,4,'oak');for(const n of [-3,3])add(side*10+n,2,z+1.7, .6,4,.6,'log');add(side*10,4,z,7,.6,4,'log');}}
 for(const z of [-18,18]){platform(0,.24,z,8,8,'obsidian');for(const x of [-3,3]){add(x,.6,z,1,1.2,2,'stone');add(x,1.3,z,.8,.3,1.6,'lava',false);}}platform(0,.24,0,8,8,'oak');for(let n=-26;n<28;n+=2){add(0,.03,n,2,.06,.2,'darkoak',false);for(const x of [-.6,.6])add(x,.08,n,.07,.07,2,'metal',false);}points[0].name='Abandoned Mineshaft';points[1].name='Lava Bridge';points[2].name='Underground Forge';
 }else if(id==='frozen'){
 add(0,.01,-18,16,.02,14,'ice',false);ice.push({x:0,z:-18,w:16,d:14});for(const side of [-1,1])for(const z of [-15,15]){house(side*17,z,'oak','snow');tree(side*10,z+7,true);}tower(0,18,2,'ice');stairs(0,10,2);platform(0,.24,0,8,8,'snow');points[0].y=0;points[2].y=2;points[0].name='Frozen Lake';points[1].name='Village Square';points[2].name='Ice Fortress';
 }else if(id==='jungle'){
 for(const x of [-27,-16,16,27])for(const z of [-24,-10,10,24])tree(x,z);tower(0,-18,3,'oak');stairs(0,-10,3,'z',-1,'oak');for(const side of [-1,1]){add(side*4,2.5,0,1,5,9,'cracked');add(side*4,3,18,1,6,9,'stone');add(side*4,2,18, .05,3,7,'leaves',false);add(side*12,1.5,-24,1,3,1,'log');add(side*12,2, -24,.7,4,.7,'water',false);}add(0,5.5,0,9,1,10,'cracked');add(0,6,18,9,1,10,'stone');platform(0,.24,0);platform(0,.24,18);points[0].y=3;points[0].name='Jungle Canopy';points[1].name='Ancient Temple';points[2].name='Hidden Cave';
 }else{
 for(const side of [-1,1])for(const z of [-18,0,18])house(side*17,z,'sandstone','sandstone');tower(0,-18,3,'sandstone');stairs(0,-10,3,'z',-1,'sandstone');for(const x of [-6,6]){add(x,.8,0,4,1.6,2,'darkoak');for(const dx of [-2,2])add(x+dx,2,0,.15,4,.15,'fence');add(x,4,0,5,.25,3,'roof');}add(0,.04,18,12,.08,10,'water',false);for(const side of [-1,1]){tree(side*7,20);add(side*8,.2,17,3,.4,3,'sandstone');}platform(0,.24,0,8,8,'sandstone');platform(0,.24,18,6,6,'sandstone');points[0].y=3;points[0].name='Watchtower';points[1].name='Marketplace';points[2].name='Oasis';
 }
 }
 for(const side of [-1,1]){platform(side*25,.6,0,10,12,id==='frozen'?'snow':id==='desert'?'sandstone':'bricks');add(side*25,.63,0,6,.05,8,side<0?'roof':'ice',false);}
 return {id,...definitions[id],boxes,hazards,ice,points};
 }
 const api={definitions,has,build};if(typeof module!=='undefined')module.exports=api;else root.ArenaMaps=api;
})(globalThis);
