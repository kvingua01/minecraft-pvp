export function createDevCodes({socket}){
 let unlocked=false,players=[],signature='';const panels=[];
 for(const parent of ['#lobby .panel','#pause .pause-controls','#upgrade-armory aside']){
  const host=document.querySelector(parent);if(!host)continue;const panel=document.createElement('details');panel.className='dev-codes';panel.innerHTML='<summary>Developer codes</summary><form class="dev-unlock"><label>Developer code<input type="password" name="code" autocomplete="off" maxlength="64" required></label><button type="submit">Unlock</button></form><form class="dev-kit" hidden><label>Bot<select name="bot"></select></label><label>Kit<select name="hero"></select></label><button type="submit">Apply kit · respawn bot</button><p>Changes this bot immediately. Automatic mode kit changes still apply.</p></form><p class="dev-message" role="status"></p>';
  host.append(panel);const unlock=panel.querySelector('.dev-unlock'),kit=panel.querySelector('.dev-kit'),message=panel.querySelector('.dev-message');
  for(const [id,h]of Object.entries(window.HeroRules.heroes)){const option=document.createElement('option');option.value=id;option.textContent=h.name+' · '+(h.category||'Normal Kits');kit.elements.hero.append(option);}
  function send(event,data,done){socket.timeout(4000).emit(event,data,(error,result)=>{message.textContent=error?'Connection timed out.':result?.error||'Bot kit changed.';if(!error&&result?.ok)done?.();});}
  unlock.onsubmit=e=>{e.preventDefault();send('dev-unlock',unlock.elements.code.value,()=>{unlocked=true;unlock.reset();for(const p of panels)p.querySelector('.dev-message').textContent='Developer controls unlocked.';paint();});};
  kit.elements.bot.onchange=()=>{const bot=players.find(p=>p.id===kit.elements.bot.value);if(bot)kit.elements.hero.value=bot.hero;};
  kit.onsubmit=e=>{e.preventDefault();send('dev-bot-kit',{id:kit.elements.bot.value,hero:kit.elements.hero.value});};panels.push(panel);
 }
 function paint(){for(const panel of panels){panel.querySelector('.dev-unlock').hidden=unlocked;const form=panel.querySelector('.dev-kit');form.hidden=!unlocked;const list=form.elements.bot,previous=list.value;list.replaceChildren();for(const bot of players.filter(p=>p.isBot)){const o=document.createElement('option');o.value=bot.id;o.textContent=bot.name;list.append(o);}if([...list.options].some(o=>o.value===previous))list.value=previous;else{const bot=players.find(p=>p.id===list.value);if(bot)form.elements.hero.value=bot.hero;}form.querySelector('button').disabled=!list.options.length;list.disabled=!list.options.length;}}
 socket.on('state',state=>{players=state.players;const next=JSON.stringify(players.filter(p=>p.isBot).map(p=>[p.id,p.name,p.hero]));if(next!==signature){signature=next;paint();}});
 function clear(){unlocked=false;players=[];signature='';for(const p of panels){p.open=false;p.querySelector('.dev-unlock').reset();p.querySelector('.dev-message').textContent='';}paint();}
 socket.on('disconnect',clear);return {clear};
}
