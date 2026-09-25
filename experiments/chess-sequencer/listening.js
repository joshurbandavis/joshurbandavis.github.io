/* Listening is independent of chess state: all performances use immutable snapshots. */
window.createChessListening = function(api) {
  const KEY='chess.listening.v1', MODES=['columns','whole','connections'];
  let saved={};try{saved=JSON.parse(localStorage.getItem(KEY))||{};}catch(e){}
  let skin='neon',settings,before=null,originBefore=null,timers=[],ctx,master,active=new Set();
  const materials={pawn:[[1,2.76,5.4],.22,330],knight:[[1,1.47,2.09,3.8],.42,260],bishop:[[1,2,3,4,5],1.6,196],rook:[[1,2.32,4.25],.7,130],queen:[[1,1.51,2.03,2.71,3.9],2.1,220],king:[[1,2,2.98],1.1,82]};
  const defaults=k=>({instrument:k==='resonant'?'resonant':api.palette(k),mode:k==='resonant'?'connections':'columns',sympathy:true,threat:k!=='resonant',trails:k==='resonant',compare:false,listen:false});
  const panel=document.createElement('section');panel.className='panel listening-panel';
  panel.innerHTML='<h2>Listening</h2><label>Sound engine <select id="instrumentSelect"></select></label><p class="listening-help">Sound only. Change Appearance above to switch the visual skin.</p><fieldset><legend>Play the position</legend><div class="listening-modes"><button data-mode="columns">Column sweep</button><button data-mode="whole">Whole board</button><button data-mode="connections">Connections</button></div></fieldset><div class="listening-toggles"></div><p class="listening-help">In Connections, sound follows pieces protected by the source. In the other modes, resonance adds a quiet response.</p><p id="listeningStatus" aria-live="polite">Move a piece or hear this position.</p><button id="listeningReset">Reset to skin defaults</button>';
  document.querySelector('.sidebar').prepend(panel);
  const select=panel.querySelector('select');
  for(const [key,label] of [['resonant','Resonant Table'],...api.instruments]){const o=document.createElement('option');o.value=key;o.textContent=label;select.append(o);}
  const toggles=[['sympathy','Sympathetic resonance'],['threat','Threat response'],['trails','Connection trails'],['compare','Before / after'],['listen','Listen to pieces']];
  for(const [key,label] of toggles){const b=document.createElement('button');b.type='button';b.dataset.setting=key;b.textContent=label;b.onclick=()=>{stop();settings[key]=!settings[key];persist();sync();};panel.querySelector('.listening-toggles').append(b);}
  const status=panel.querySelector('#listeningStatus');
  function persist(){saved[skin]={...settings};try{localStorage.setItem(KEY,JSON.stringify(saved));}catch(e){}}
  function sync(){select.value=settings.instrument;panel.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(settings.mode===b.dataset.mode)));panel.querySelectorAll('[data-setting]').forEach(b=>b.setAttribute('aria-pressed',String(settings[b.dataset.setting])));api.listenState(settings.listen);}
  function setSkin(k){stop();skin=k;const d=defaults(k),s=saved[k]||{};settings={...d};if([...select.options].some(o=>o.value===s.instrument))settings.instrument=s.instrument;if(MODES.includes(s.mode))settings.mode=s.mode;for(const [key] of toggles)if(typeof s[key]==='boolean')settings[key]=s[key];sync();}
  select.onchange=()=>{stop();settings.instrument=select.value;persist();api.instrumentChanged();};
  panel.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{stop();settings.mode=b.dataset.mode;persist();sync();});
  panel.querySelector('#listeningReset').onclick=()=>{delete saved[skin];setSkin(skin);persist();api.instrumentChanged();};
  function later(fn,ms){timers.push(setTimeout(fn,ms));}
  function stop(){timers.forEach(clearTimeout);timers=[];document.getElementById('resonancePaths')?.remove();api.clearAnimation();api.release();if(ctx)for(const gain of active){gain.gain.cancelScheduledValues(ctx.currentTime);gain.gain.setTargetAtTime(.0001,ctx.currentTime,.012);}active.clear();}
  function unlock(){if(!ctx){ctx=new (window.AudioContext||window.webkitAudioContext)();master=ctx.createGain();master.gain.value=2.1;const limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-16;limiter.ratio.value=6;master.connect(limiter);limiter.connect(ctx.destination);}ctx.resume();}
  function relation(b,r,c){let attackers=0,defenders=0;const p=b[r][c];for(let y=0;y<8;y++)for(let x=0;x<8;x++)if(b[y][x]&&(y!==r||x!==c)&&api.attacks(b,y,x).some(t=>t.r===r&&t.c===c)){if(b[y][x].color===p.color)defenders++;else attackers++;}return {attackers,defenders,blocked:['bishop','rook','queen'].includes(p.type)&&api.attacks(b,r,c).filter(t=>!b[t.r][t.c]).length<3};}
  function modal(p,r,c,rel,strength){if(!ctx)return;const [ratios,tail,pitch]=materials[p.type],base=pitch*Math.pow(2,(7-r)/12)*(p.color==='black'?1.12:1),decay=tail*(rel.blocked?.32:1)*(1+(settings.sympathy?Math.min(rel.defenders,3)*.13:0)),time=ctx.currentTime+.005;
    const buffer=ctx.createBuffer(1,Math.floor(ctx.sampleRate*.025),ctx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/(data.length*.14));
    const impulse=ctx.createBufferSource();impulse.buffer=buffer;const pan=ctx.createStereoPanner();pan.pan.value=(c/7-.5)*1.5;pan.connect(master);const env=ctx.createGain();env.gain.setValueAtTime(.0001,time);env.gain.exponentialRampToValueAtTime(strength*(rel.blocked?.22:.55),time+.003);env.gain.exponentialRampToValueAtTime(.0001,time+decay+1);env.connect(pan);active.add(env);const nodes=[];
    ratios.forEach((ratio,i)=>{const filter=ctx.createBiquadFilter();filter.type='bandpass';filter.frequency.value=base*ratio;filter.Q.value=Math.min(400,base*ratio*decay*.7);const gain=ctx.createGain();gain.gain.value=5/(1+i*.6);impulse.connect(filter);filter.connect(gain);gain.connect(env);nodes.push(filter,gain);});impulse.start(time);setTimeout(()=>{impulse.disconnect();nodes.forEach(n=>n.disconnect());active.delete(env);env.disconnect();pan.disconnect();},(decay+1.2)*1000);
  }
  function graph(b,origin){const nodes=[{...origin,depth:0}],links=[],seen=new Set([origin.r+','+origin.c]);for(let i=0;i<nodes.length;i++){const from=nodes[i],p=b[from.r][from.c];if(!p)continue;for(const t of api.attacks(b,from.r,from.c)){const q=b[t.r][t.c],key=t.r+','+t.c;if(!q||q.color!==p.color||seen.has(key))continue;seen.add(key);const to={...t,depth:from.depth+1};nodes.push(to);links.push({from,to});}}return {nodes,links};}
  function flash(r,c){api.flash(r,c);}
  function sound(b,r,c,strength){const p=b[r][c];if(!p)return;const rel=relation(b,r,c);if(settings.instrument==='resonant')modal(p,r,c,rel,strength);else api.note(p,r,rel,strength,settings,c);flash(r,c);if(settings.threat&&rel.attackers)later(()=>{if(settings.instrument==='resonant')modal(p,r+.45,c,{...rel,blocked:true},strength*.25);else api.tension(p,r,strength*.3);},90);}
  function trail(svg,from,to,delay){const ns='http://www.w3.org/2000/svg',line=document.createElementNS(ns,'line'),dot=document.createElementNS(ns,'circle'),x1=from.c*100+50,y1=from.r*100+50,x2=to.c*100+50,y2=to.r*100+50;Object.entries({x1,y1,x2,y2}).forEach(([k,v])=>line.setAttribute(k,v));dot.setAttribute('r',5);dot.setAttribute('cx',x1);dot.setAttribute('cy',y1);svg.append(line,dot);later(()=>{line.classList.add('lit');dot.classList.add('lit');for(const [attr,start,end] of [['cx',x1,x2],['cy',y1,y2]]){const anim=document.createElementNS(ns,'animate');anim.setAttribute('attributeName',attr);anim.setAttribute('from',start);anim.setAttribute('to',end);anim.setAttribute('dur','.32s');anim.setAttribute('fill','freeze');dot.append(anim);anim.beginElement();}later(()=>dot.remove(),350);},delay);}
  function perform(b,origin,label,offset){const g=graph(b,origin),step=api.step()*1000*(settings.instrument==='macabre'?1.35:1);let events=[],links=[];
    if(settings.mode==='connections'){events=(settings.sympathy?g.nodes:[{...origin,depth:0}]).map(p=>({...p,at:p.depth*320,level:1.5*Math.pow(.57,p.depth)}));if(settings.sympathy)links=g.links.map(l=>({...l,at:l.from.depth*320}));}
    else {for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(b[r][c])events.push({r,c,at:settings.mode==='columns'?c*step:(Math.abs(r-origin.r)+Math.abs(c-origin.c))*75,level:r===origin.r&&c===origin.c?1.25:.48});if(settings.sympathy){links=g.links.map(l=>({...l,at:650+l.from.depth*320}));for(const l of links)events.push({...l.to,at:l.at+320,level:.28*Math.pow(.6,l.to.depth)});}}
    const duration=Math.max(0,...events.map(e=>e.at))+2300;
    if(settings.mode==='columns'){for(let col=0;col<8;col++)later(()=>api.column(col),offset+col*step);later(()=>api.clearAnimation(),offset+8*step);}
    later(()=>{status.textContent=label+' · '+(settings.mode==='connections'?events.length+' connected voices':events.length+' sounding events');document.getElementById('resonancePaths')?.remove();if(settings.trails){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.id='resonancePaths';svg.setAttribute('viewBox','0 0 800 800');svg.setAttribute('aria-hidden','true');api.boardElement.append(svg);for(const l of links)trail(svg,l.from,l.to,l.at);later(()=>svg.remove(),duration);} },offset);
    for(const e of events){
      let at=e.at,level=e.level;
      if(settings.instrument==='macabre'){level*=e.c%3===0?1:.66;}
      if(settings.instrument==='glitch'){at+=((e.r*7+e.c*3)%5)*19;const count=2+(e.r+e.c)%3;for(let n=0;n<count;n++)later(()=>sound(b,e.r,e.c,e.level*Math.pow(.64,n)),offset+at+n*38);}
      else later(()=>sound(b,e.r,e.c,level),offset+at);
    }return duration*1.4;
  }
  function findOrigin(b,preferred){if(preferred&&b[preferred.r]?.[preferred.c])return preferred;for(let r=7;r>=0;r--)for(let c=0;c<8;c++)if(b[r][c]?.type==='king'&&b[r][c].color==='white')return {r,c};for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(b[r][c])return {r,c};}
  function play(b,origin,solo=false){b=JSON.parse(JSON.stringify(b));stop();const o=findOrigin(b,origin);if(!o)return;let offset=0;if(settings.compare&&before&&!solo)offset=perform(before,findOrigin(before,originBefore),'Before',0)+250;perform(b,o,offset?'After':solo?'Piece network':'Position',offset);}
  setSkin('neon');
  return {setSkin,unlock,stop,play,graph,get instrument(){return settings.instrument;},get listen(){return settings.listen;},capture(b,origin){before=JSON.parse(JSON.stringify(b));originBefore={...origin};},reset(){stop();before=null;status.textContent='Move a piece or hear this position.';}};
};
