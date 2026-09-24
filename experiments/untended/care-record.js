
window.renderCareRecord=function(state,peek){
 const day=86400000,hours=Math.floor(state.droughtMs/3600000),status=document.getElementById('careStatus'),list=document.getElementById('careEvents'),scope=document.getElementById('careScope');
 list.replaceChildren();
 if(state.preview){status.textContent='An example of absence. No visit has been recorded.';scope.textContent='Preview only. This view does not tend the shared painting.';return;}
 status.textContent=peek?(hours<1?'Someone was here within the last hour.':hours+' hours since someone was here.'):(hours<1?'Someone kept it alive until you arrived.':hours+' hours of absence ended with your arrival.');
 scope.textContent=state.shared?'A shared record of anonymous arrivals and days without one. Arrivals within a minute share one mark. Tending prevents new scars; it cannot remove old ones.':'The shared record is unavailable. These are this browser’s visits only; they do not represent other people.';
 const events=state.events||[];
 if(!events.length){const li=document.createElement('li');li.textContent='Earlier arrivals were not recorded. The painting still remembers their absence.';list.append(li);}
 for(const event of events.slice().reverse()){
  const li=document.createElement('li');li.className=event.kind;const time=document.createElement('time');time.dateTime=new Date(event.at).toISOString();time.textContent=new Date(event.at).toLocaleDateString(undefined,{month:'short',day:'numeric'})+' · '+new Date(event.at).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});
  const text=document.createElement('span');text.textContent=event.kind==='absence'?(event.days===1?'A whole day passed without anyone.':'There were '+event.days+' whole days without anyone.')+' '+(event.scars===1?'One scar remains.':event.scars+' scars remain.'):'Someone arrived. The absence was interrupted.';li.append(time,text);list.append(li);
 }
};
