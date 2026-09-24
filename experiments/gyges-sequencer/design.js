
const title=document.querySelector('h1');title.textContent='Gygès';const lede=document.querySelector('.lede');const rules=document.createElement('details');rules.className='rules';rules.innerHTML='<summary>How to play · shared rings, borrowed movement</summary>';rules.append(lede.cloneNode(true));document.querySelector('main').append(rules);lede.textContent='Nothing belongs to you. Move a ring. Borrow its momentum.';document.querySelector('.kicker').textContent='TWELVE RINGS / TWO SIDES / ONE INSTRUMENT';
document.getElementById('skinSelect').closest('.panel').classList.add('skin-panel');document.querySelector('.title-block').insertAdjacentHTML('beforeend','<div class="height-key"><span>Ⅰ · one step</span><span>Ⅱ · two steps</span><span>Ⅲ · three steps</span></div>');document.getElementById('startBtn').textContent='Enter with sound →';

const skinSelect=document.getElementById('skinSelect');
const surfaceChoices=[['sculpture','Sculpture','Bell'],['dark','Dark','Pluck'],['light','Paper','Blip'],['neon','Neon','Bell'],['alien','Alien','Pad']];
const skinPanel=skinSelect.closest('.panel');skinPanel.querySelector('h2').textContent='Surface / sound';
const swatches=document.createElement('div');swatches.className='surface-choices';swatches.setAttribute('role','group');swatches.setAttribute('aria-label','Surface and instrument');
surfaceChoices.forEach(([value,label,sound])=>{const b=document.createElement('button');b.type='button';b.className='surface-choice';b.dataset.surface=value;b.setAttribute('aria-label',label+' skin, '+sound+' instrument');b.innerHTML='<span class="surface-sample" aria-hidden="true"><i></i><i></i></span><span class="surface-name">'+label+'</span><span class="surface-sound">'+sound+'</span>';b.onclick=()=>{skinSelect.value=value;skinSelect.dispatchEvent(new Event('change',{bubbles:true}));};swatches.append(b);});
skinSelect.before(swatches);skinSelect.hidden=true;
function syncSurface(){swatches.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.surface===skinSelect.value)));}
skinSelect.addEventListener('change',syncSurface);syncSurface();
const audition=document.createElement('button');audition.type='button';audition.className='audition-surface';audition.textContent='♪ Hear this instrument';audition.onclick=()=>document.dispatchEvent(new Event('gyges:audition'));skinPanel.append(audition);
