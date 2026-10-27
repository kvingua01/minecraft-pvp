(function(root){
 const definitions={
 nether:{name:'Nether Fortress',description:'Nether-brick battlements, lava crossings and a throne crypt',sky:0x4b303c},
 end:{name:'End City',description:'End-stone islands, purpur towers and void bridges',sky:0x292538},
 pirate:{name:'Pirate Cove',description:'Boardable ships, harbor docks and a lighthouse',sky:0x91cddd},
 mushroom:{name:'Mushroom Kingdom',description:'Giant mushroom platforms, houses and a mycelium cave',sky:0xb9c7c9},
 underwater:{name:'Underwater Ruins',description:'Air-filled ocean temples, glass tunnels and coral ruins',sky:0x588aab},
 volcano:{name:'Volcano Island',description:'Jungle outposts, crater paths and a lava cave',sky:0xbba394},
 haunted:{name:'Haunted Mansion',description:'A woodland mansion, graveyard and underground crypt',sky:0x788697},
 candy:{name:'Candy Land',description:'Candy castles, chocolate bridges and a giant cake tower',sky:0xc2d7f2},
 egypt:{name:'Ancient Egypt',description:'Stepped pyramids, a temple courtyard and a hidden tomb',sky:0xe6d2a5},
 steampunk:{name:'Steampunk City',description:'Copper factories, roof bridges and a clock tower',sky:0xb1bec2}
 };
 const has=id=>Object.hasOwn(definitions,id);
 function build(id){const boxes=[],hazards=[],slow=[],points=[{id:'A',x:0,y:3,z:-18,radius:3.7},{id:'B',x:0,y:.24,z:0,radius:4},{id:'C',x:0,y:3,z:18,radius:3.7}];
 const add=(x,y,z,w,h,d,tile,solid=true)=>{if(w>0&&h>0&&d>0)boxes.push({x,y,z,w,h,d,tile,solid,color:0x999999});};
 const slab=(x,y,z,w,d,tile)=>add(x,y-.12,z,w,.24,d,tile);
 const stairs=(x,z,top,axis,sign,tile)=>{for(let i=0;i<top*2;i++){const h=(i+1)*.5;add(x+(axis==='x'?sign*i*.7:0),h/2,z+(axis==='z'?sign*i*.7:0),axis==='x'?.7:3,h,axis==='z'?.7:3,tile);}slab(x+(axis==='x'?sign*top*1.4:0),top,z+(axis==='z'?sign*top*1.4:0),axis==='x'?2.8:3,axis==='z'?2.8:3,tile);};
 const elevated=(z,top,tile)=>{slab(0,top,z,8,8,tile);for(const s of [-1,1])add(s*3.8,top/2,z,.4,top,6,tile);stairs(0,z+8,top,'z',-1,tile);stairs(0,z-8,top,'z',1,tile);points[z<0?0:2].y=top;};
 const post=(x,y,z,tile='lantern')=>{add(x,y+1.3,z,.18,2.6,.18,'fence');add(x,y+2.6,z,.4,.5,.4,tile,false);};
 const tree=(x,z,palm=false)=>{add(x,2.2,z,.7,4.4,.7,'log');if(palm){add(x,4.6,z,7,.5,2,'leaves',false);add(x,4.8,z,2,.5,7,'leaves',false);}else {add(x,4.4,z,4,2.2,4,'leaves',false);add(x,5.6,z,2.5,.6,2.5,'leaves',false);}};
 const house=(x,z,wall,roof)=>{slab(x,0,z,6,6,'cobble');for(const s of [-1,1]){add(x+s*3,1.6,z,.35,3.2,6,wall);for(const dz of [-3,3])add(x+s*2.1,1.6,z+dz,2.1,3.2,.35,wall);add(x+s*3,1.8,z,.38,1.2,2,'glass',false);}for(const dz of [-3,3])add(x,2.8,z+dz,2.2,.8,.35,wall);for(let i=0;i<3;i++)for(const s of [-1,1])add(x+s*(2.8-i),3.3+i*.5,z,2,.5,7,roof);add(x,4.5,z,1,.4,7,roof);post(x-2,0,z-3.6);};
 const arch=(x,z,tile,height=4,width=7)=>{for(const s of [-1,1])add(x+s*width/2,height/2,z,.65,height,.65,tile);add(x,height+.1,z,width+1,.6,1,tile);};
 const village=(wall,roof)=>{for(const s of [-1,1])for(const z of [-18,18])house(s*18,z,wall,roof);};
 const underground=['nether','mushroom','volcano','haunted','egypt'].includes(id),isEnd=id==='end',floor={nether:'netherbrick',pirate:'sand',mushroom:'mycelium',underwater:'prismarine',volcano:'basalt',haunted:'grass',candy:'cookie',egypt:'sand',steampunk:'cobble'}[id];
 if(isEnd){for(const [x,z,w,d]of [[-25,0,14,18],[25,0,14,18],[0,0,18,18],[0,-18,16,16],[0,18,16,16]]){add(x,-1,z,w,2,d,'endstone');add(x,-3,z,w-4,2,d-4,'endstone');}for(const s of [-1,1]){for(const z of [-5,0,5])slab(s*13,.24,z,12,z===0?3:2,'purpur');for(const x of [-5,0,5])slab(x,.24,s*10,x===0?3:2,9,'purpur');}}
 else if(underground){add(-18.5,-1,0,27,2,64,floor);add(18.5,-1,0,27,2,64,floor);add(0,-1,-10,10,2,44,floor);add(0,-1,28,10,2,8,floor);add(0,-3.5,18,10,1,12,floor);for(let i=1;i<6;i++)for(const s of [-1,1]){const top=-i*.5;add(0,(-3+top)/2,s<0?11.65+i*.7:24.35-i*.7,3,3+top,.7,floor);}for(const s of [-1,1])add(s*5,-1.5,18,.3,3,12,floor);add(0,-.1,18,10,.3,4,floor);points[2].y=-3;}
 else add(0,-1,0,64,2,64,floor);
 // All spawns use the existing mirrored spawn coordinates and protected rooms.
 for(const s of [-1,1]){slab(s*25,.6,0,10,12,isEnd?'endstone':floor);add(s*25,.63,0,6,.05,8,s<0?'roof':'ice',false);for(const z of [-5,5])post(s*27,.6,z,isEnd?'endrod':'lantern');}
 // Side lanes remain clear around the objective structures and offer flank routes.
 if(!isEnd)for(const s of [-1,1])for(const z of [-10,10])add(s*12,.015,z,18,.03,2,id==='candy'?'frosting':id==='egypt'?'sandstone':'cobble',false);
 const lava=(x,z,w,d)=>{add(x,.02,z,w,.04,d,'lava',false);hazards.push({x,y:0,z,w,d,height:.12});};
 const bridge=(x,z,tile)=>{slab(x,.35,z,6,4,tile);for(const dz of [-2,2])for(const dx of [-2,0,2])add(x+dx,.8,z+dz,.12,1.2,.12,'fence');};
 if(id==='nether'){
 for(const s of [-1,1]){lava(s*10,0,3,44);for(const z of [-18,0,18])bridge(s*10,z,'netherbrick');for(const z of [-26,26]){arch(s*17,z,'netherbrick',5);add(s*18,3,z+2,1,6,1,'lava',false);hazards.push({x:s*18,y:0,z:z+2,w:1,d:1,height:6});}for(const z of [-7,7]){add(s*16,.015,z,7,.03,5,'soulsand',false);slow.push({x:s*16,y:0,z,w:7,d:5});}for(const z of [-18,18]){add(s*19,3,z,5,6,5,'netherbrick');slab(s*19,6,z,6,6,'netherbrick');for(const dz of [-2,2])add(s*19,4,z+dz,5.1,1,.15,'lava',false);}}
 elevated(-18,3,'netherbrick');arch(0,-18,'netherbrick',6);slab(0,.24,0,8,6,'netherbrick');for(const s of [-1,1]){add(s*3,-1.7,18,.8,2.6,3,'netherbrick');post(s*3,-3,18,'soulfire');}add(0,-2.5,19,2,1,1,'obsidian');add(0,-1.5,19.4,2,2,.5,'netherbrick');points[0].name='Fortress Tower';points[1].name='Lava Bridge';points[2].name='Nether Throne Room';
 }else if(id==='end'){
 elevated(-18,3,'purpur');elevated(18,3,'purpur');for(const z of [-18,18]){for(const s of [-1,1]){add(s*3,6,z,.7,6,.7,'purpur');post(s*3,3,z-3,'endrod');}slab(0,9,z,8,8,'purpur');for(const s of [-1,1])slab(s*6,3,z,5,3,'endstone');}arch(0,0,'obsidian',5);for(const s of [-1,1]){add(s*7,2,0,1,4,1,'endstone');post(s*7,0,-6,'endrod');}slab(0,.24,0,8,8,'endstone');points[0].name='End Tower';points[1].name='Central Gateway';points[2].name='Floating Temple';
 }else if(id==='pirate'){
 // The hull has a playable lower cabin, open entrances and an upper fighting deck.
 elevated(-18,2,'oak');add(0,.1,-18,8,.2,10,'darkoak');for(const s of [-1,1]){add(s*4,1,-18,.4,2,10,'darkoak');add(s*3.8,2.5,-18,.2,1,8,'fence');}add(0,5,-18,.35,6,.35,'log');add(1.7,6,-18,3.5,3,.12,'sail',false);add(-1.5,4,-20,2.8,2,.12,'sail',false);for(const s of [-1,1])slab(s*6,1,-18,4,3,'oak');for(const s of [-1,1]){add(s*11,.02,0,4,.04,48,'water',false);for(const z of [-18,0,18])bridge(s*11,z,'oak');tree(s*27,20,true);tree(s*27,-20,true);house(s*18,18,'oak','roof');house(s*18,-18,'oak','roof');}
 elevated(18,3,'cobble');for(const s of [-1,1])add(s*3.5,4.2,18,.6,2.4,5,'frosting');add(0,6.1,18,8,.4,8,'roof');add(0,5,18,1,1,1,'lantern',false);for(const z of [-7,7]){slab(0,.24,z,8,5,'oak');for(const x of [-3,3])post(x,0,z);}slab(0,.24,0,8,8,'oak');points[0].name='Pirate Ship';points[1].name='Harbor Docks';points[2].name='Lighthouse';
 }else if(id==='mushroom'){
 const mushroom=(x,z,big=false,brown=false)=>{const h=big?5:3.5,w=big?8:5;add(x,h/2,z,1.2,h,1.2,'mushroomstem');add(x,h,z,w,1,w,brown?'brownmushroom':'redmushroom');add(x,h+.7,z,w-2,.4,w-2,brown?'brownmushroom':'redmushroom');post(x+2,0,z,'glowshroom');};for(const s of [-1,1])for(const z of [-24,-10,10,24])mushroom(s*19,z,false,z>0);elevated(-18,3,'mushroomstem');add(0,2.7,-18,9,.6,9,'redmushroom');for(const s of [-1,1])add(s*3.5,3,-18,.5,.2,8,'frosting');for(const s of [-1,1])house(s*8,0,'mushroomstem','redmushroom');slab(0,.24,0,8,8,'mycelium');for(const s of [-1,1])post(s*3,-3,18,'glowshroom');add(0,-2.85,18,4,.3,4,'brownmushroom');points[2].y=-2.7;points[0].name='Giant Mushroom';points[1].name='Mushroom Village';points[2].name='Underground Mycelium Cave';
 }else if(id==='underwater'){
 for(const s of [-1,1]){add(s*29,5,0,1,10,60,'water',false);for(const z of [-24,-12,12,24]){for(let i=0;i<4;i++)add(s*(16+i*.8),.6+i*.25,z, .5,1.2+i*.5,.5,i%2?'coral':'coralpink',false);post(s*10,0,z,'sealantern');}for(const z of [-18,0,18]){for(const dz of [-2,2])add(s*12,1.6,z+dz,10,3.2,.12,'glass',false);add(s*12,3.3,z,10,.15,4,'glass',false);}}
 elevated(-18,2,'darkoak');for(const s of [-1,1])add(s*3.8,2.5,-18,.3,1,8,'darkoak');add(0,4,-18,.3,4,.3,'log');add(0,4.4,-18,5,1,.15,'sail',false);arch(0,0,'prismarine',4);for(const x of [-4,4])for(const z of [-4,4]){add(x,2.2,z,.65,4.4,.65,'prismarine');post(x,0,z,'sealantern');}slab(0,4.8,0,10,10,'prismarine');slab(0,.24,0,8,8,'prismarine');elevated(18,2,'prismarine');for(const s of [-1,1]){add(s*3,3,18,.5,2,.5,'coral');post(s*3,2,18,'sealantern');}add(0,10,0,62,.1,62,'water',false);points[0].name='Sunken Ship';points[1].name='Ocean Temple';points[2].name='Coral Fortress';
 }else if(id==='volcano'){
 for(const s of [-1,1]){for(const z of [-23,23]){tree(s*24,z,true);house(s*16,z,'oak','roof');}lava(s*11,2,2.5,24);for(const z of [-10,0,10])bridge(s*11,z,'oak');for(let i=0;i<4;i++)add(s*(6.5+i*.7),1.5-i*.3,0,1.4,3-i*.6,9+i,'basalt');}
 elevated(-18,3,'oak');for(const s of [-1,1])post(s*3,3,-18);elevated(0,3,'basalt');points[1].y=3;points[2].y=-3;slab(0,3,0,8,8,'basalt');for(const s of [-1,1]){add(s*3.5,3.1,0,.8,.2,6,'lava',false);hazards.push({x:s*3.5,y:3,z:0,w:.8,d:6,height:.15});post(s*3,-3,18,'torch');}stairs(-8,0,3,'x',1,'basalt');stairs(8,0,3,'x',-1,'basalt');points[0].name='Jungle Outpost';points[1].name='Volcano Crater';points[2].name='Lava Cave';
 }else if(id==='haunted'){
 // Two side wings, open front/back great-hall entrances and lit connecting halls.
 for(const s of [-1,1]){for(const z of [-24,24])tree(s*25,z);house(s*16,0,'darkoak','roof');add(s*6,2.4,0,.5,4.8,12,'darkoak');for(const z of [-6,6]){add(s*4.4,2.4,z,3.2,4.8,.4,'darkoak');post(s*2.7,0,z,'lantern');}for(const z of [-3,0,3]){add(s*5.5,1,z, .4,2,2,'bookshelf');add(s*8,1,z,1,2,1,'cobble');}for(const z of [-21,-17])for(const x of [s*7,s*11,s*15]){add(x,.15,z,1.5,.3,2,'cracked');add(x,.8,z+.8,.8,1.3,.3,'cracked');}}
 slab(0,5.4,0,14,14,'roof');for(const s of [-1,1])add(s*3,5.9,0,1,.8,12,'roof');elevated(-18,2,'cracked');post(-3,2,-18);post(3,2,-18);slab(0,.24,0,8,8,'darkoak');for(const s of [-1,1]){add(s*3,-2.5,18,1.5,1,4,'cracked');post(s*3,-3,19,'lantern');}points[0].name='Graveyard';points[1].name='Mansion Great Hall';points[2].name='Underground Crypt';
 }else if(id==='candy'){
 for(const s of [-1,1]){add(s*10,.015,0,3,.03,50,'chocolate',false);for(const z of [-18,0,18])bridge(s*10,z,'cookie');for(const z of [-25,-10,10,25]){for(let i=0;i<5;i++)add(s*22,.5+i,z,.6,1,.6,i%2?'frosting':'candyred');add(s*22,5.2,z+1, .6,.5,2.5,'candyred');add(s*16,2,z,2.5,2.5,2.5,'gumdrop');}house(s*17,18,'cake','frosting');house(s*17,-18,'cake','frosting');}
 elevated(-18,3,'candyred');for(const s of [-1,1]){add(s*4,5,-18,1.5,4,1.5,'candyred');slab(s*4,7,-18,2.5,2.5,'frosting');}elevated(18,3,'cake');add(0,2.7,18,8,.6,8,'frosting');for(const s of [-1,1])add(s*2,3.4,18,.6,.8,.6,'candyred');slab(0,.24,0,8,8,'cookie');points[0].name='Candy Castle';points[1].name='Chocolate Bridge';points[2].name='Giant Cake Tower';
 }else if(id==='egypt'){
 // A stepped pyramid with open north/south approaches and two side stairs.
 elevated(-18,4,'sandstone');for(let i=0;i<4;i++)for(const s of [-1,1]){const x=s*(6.5-i*.6);add(x,(i+1)*.5,-18,1.2,i+1,10-i*1.5,'sandstone');}stairs(-10,-18,4,'x',1,'sandstone');stairs(10,-18,4,'x',-1,'sandstone');village('sandstone','sandstone');for(const x of [-5,5])for(const z of [-4,4]){add(x,2.5,z,.9,5,.9,'sandstone');add(x,5.3,z,.6,.6,.6,'gold');}for(const z of [-5,5])arch(0,z,'sandstone',5,10);slab(0,.24,0,8,8,'sandstone');for(const s of [-1,1]){add(s*3,-2.5,18,1,1,4,'gold');post(s*3,-3,19,'torch');}add(0,-2.65,19,2,.7,1.5,'gold');points[0].name='Pyramid Summit';points[1].name='Temple Courtyard';points[2].name="Pharaoh's Tomb";
 }else if(id==='steampunk'){
 village('copper','metal');elevated(-18,4,'copper');for(const s of [-1,1]){add(s*3,6,-18,.6,4,.6,'copper');add(s*4.5,1,0,.35,2,10,'metal');for(const z of [-10,10]){slab(s*14,3,z,10,2,'metal');stairs(s*19,z-5,3,'z',1,'metal');}for(const z of [-18,18]){add(s*11,3.5,z,.4,7,.4,'copper');add(s*11,7,z,3,.4,3,'metal');post(s*10,0,z,'lantern');}for(let i=0;i<5;i++)add(s*(6+i),3,6,.7,.7,.7,'copper');}slab(0,8.5,-18,8,8,'copper');add(0,6,-21.9,2,2,.15,'clock',false);arch(0,0,'copper',5);slab(0,.24,0,8,8,'metal');elevated(18,2,'metal');for(const x of [-5,5])add(x,1.5,18,.35,3,10,'copper');slab(0,4.5,18,12,12,'copper');for(const x of [-2,2])add(x,.02,27,.1,.04,7,'metal',false);points[0].name='Clock Tower';points[1].name='Central Factory';points[2].name='Train Station';
 }
 // Facades and small voxel details share the same merged atlas mesh; none of
 // these require individual draw calls or animated collision bodies.
 if(id==='end')for(const z of [-18,18]){for(const s of [-1,1]){for(const dz of [-3,3])add(s*3.5,6,z+dz,.65,6,.65,'purpur');for(const y of [5.3,6.8,8.5]){add(s*3.55,y,z,.3,.3,7.4,'purpur');add(0,y,z+s*3.55,7.4,.3,.3,'purpur');}for(const dz of [-2,2])add(s*3.5,6,z+dz,.3,2,1.4,'glass',false);for(const dx of [-2,2])add(dx,6,z+s*3.5,1.3,2,.3,'glass',false);}for(const s of [-1,1])post(s*3,9,z,'endrod');}
 if(id==='nether')for(const s of [-1,1])for(const z of [-18,18])for(const dx of [-2,0,2])for(const dz of [-2,2])add(s*19+dx,6.5,z+dz,.7,1,.7,'netherbrick');
 if(id==='mushroom')for(const s of [-1,1]){slab(s*9.5,3,-18,11,2,'oak');add(s*16,1.4,-18,1.2,2.8,1.2,'mushroomstem');slab(s*16,3,-18,5,5,'redmushroom');for(const x of [5,8,11,14])for(const dz of [-1,1])add(s*x,3.4,-18+dz,.12,.8,.12,'fence');}
 if(id==='pirate')for(const s of [-1,1]){for(const dx of [-3,3])add(s*9+dx,1.5,26,.7,3,5,'basalt');add(s*9,3.3,26,7,.6,6,'basalt');post(s*9,0,25,'torch');}
 if(id==='egypt')for(let tier=0;tier<4;tier++){const r=8-tier*1.2,h=tier+1;for(const s of [-1,1])for(const t of [-1,1]){add(s*r,h/2,-18+t*(r/2+1),.9,h,r-2,'sandstone');add(t*(r/2+1),h/2,-18+s*r,r-2,h,.9,'sandstone');}}
 if(id==='steampunk'){for(const s of [-1,1]){add(s*5,2.2,0,.5,4.4,8,'copper');for(const z of [-3,3])add(s*5.3,3,z,.1,1.5,1.4,'glass',false);for(let i=0;i<8;i++){const a=i*Math.PI/4;add(s*5.4,2.5+Math.sin(a)*1.1,Math.cos(a)*1.1,.25,.4,.4,'metal');}add(s*5.4,2.5,0,.3,.5,.5,'metal');for(const dz of [-3,3])add(s*3.5,6,-18+dz,.6,4,.6,'copper');for(const y of [5,7,8])add(s*3.5,y,-18,.3,.3,7,'metal');}slab(0,5,0,11,10,'metal');}
 if(!isEnd)for(const s of [-1,1]){add(s*32,2,0,1,4,65,floor);add(0,2,s*32,65,4,1,floor);}
 return {id,...definitions[id],boxes,hazards,ice:[],slow,points,bounded:true,void:isEnd};
 }
 const api={definitions,has,build};if(typeof module!=='undefined')module.exports=api;else root.ExtraArenaMaps=api;
})(globalThis);
