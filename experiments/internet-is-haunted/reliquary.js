(function(){
 const $=id=>document.getElementById(id),number=id=>String(id).padStart(4,'0');
 let current=null,currentId=null,next=null,saving=false;
 const list=$('relic-list'),status=$('archive-status'),save=$('preserve-link');
 function entryLink(entry){
  const li=document.createElement('li'),a=document.createElement('a'),m=entry.memorial;a.href='#relic/'+entry.id;
  for(const [cls,text] of [['relic-number','NO. '+number(entry.id)],['relic-title',m.title||m.siteName||m.url],['relic-dates','Known captures · '+m.firstYear+'–'+m.lastYear],['relic-fragment',m.fragment||m.description||'No legible fragment survived.']]){const span=document.createElement('span');span.className=cls;span.textContent=text;a.append(span);}
  li.append(a);return li;
 }
 window.onMemorial=function(data){
  current=data;currentId=data.relicId||null;saving=false;save.disabled=false;
  save.hidden=!data.saveToken||!!currentId;
  $('accession').textContent=currentId?'preserved · no. '+number(currentId):'';
  $('preserve-note').textContent=currentId?'A fragment left by a previous visitor.':data.saveToken?'This memorial will be visible to other visitors.':data.saveUnavailable?'Preservation is temporarily unavailable. You can still read this memorial.':'';
  $('back-reliquary').hidden=!currentId;$('random-relic').hidden=!currentId;
  $('reset-memorial').hidden=!!currentId;
 };
 async function collection(more=false){
  showState('state-reliquary');$('archive-retry').hidden=true;$('more-relics').hidden=true;
  if(!more){list.replaceChildren();next=null;}status.textContent='opening the reliquary…';
  try{const data=await requestJSON('/api/reliquary'+(more&&next?'?before='+next:''));for(const entry of data.entries)list.append(entryLink(entry));next=data.next;$('more-relics').hidden=!next;status.textContent=list.children.length?'':'The shelves are empty. Find a link and leave its memorial here.';}
  catch(e){if(e.name==='AbortError')return;status.textContent='The reliquary is not answering right now. Your search can still begin outside it.';$('archive-retry').hidden=false;}
 }
 async function openEntry(id,random=false){
  showState('state-loading');const promise=requestJSON('/api/reliquary/'+(random?'random?exclude='+(currentId||0):id));startLoadingNarration();
  try{const data=await promise;if(random)history.replaceState(null,'','#relic/'+data.entry.id);render({...data.entry.memorial,relicId:data.entry.id});$('preserve-note').textContent='Preserved '+new Date(data.entry.savedAt).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'})+'. The recovered text is kept as it was found.';}
  catch(e){if(e.name==='AbortError')return;if(random&&current){render(current);$('preserve-note').textContent=e.status===404?'This is the only fragment in the reliquary so far.':'Another fragment could not be reached. This one is still here.';return;}showState('state-reliquary');list.replaceChildren();$('more-relics').hidden=true;status.textContent=random?'There is no other fragment to visit yet.':'This fragment could not be opened. It may be unavailable, or the reliquary may be resting.';$('archive-retry').hidden=false;}
  finally{if(!activeRequest)stopLoadingNarration();}
 }
 save.onclick=async()=>{
  if(saving||!current?.saveToken)return;saving=true;save.disabled=true;$('preserve-note').textContent='preserving this fragment…';
  try{const data=await requestJSON('/api/reliquary',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:current.saveToken})});history.replaceState(null,'','#relic/'+data.entry.id);render({...data.entry.memorial,relicId:data.entry.id});}
  catch(e){if(e.name!=='AbortError')$('preserve-note').textContent=e.code==='discovery_expired'?'This discovery has expired. Find the link again to preserve it.':'Could not confirm preservation. Please try again; a retry will not create a duplicate.';}
  finally{saving=false;save.disabled=false;}
 };
 function navigate(){cancelRequest();if(location.hash==='#reliquary')collection();else if(/^#relic\/\d+$/.test(location.hash))openEntry(location.hash.split('/')[1]);else reset();}
 $('more-relics').onclick=()=>collection(true);$('archive-retry').onclick=()=>{history.replaceState(null,'','#reliquary');collection();};$('archive-return').onclick=reset;$('random-relic').onclick=()=>openEntry(null,true);
 window.addEventListener('hashchange',navigate);if(location.hash)navigate();
})();
