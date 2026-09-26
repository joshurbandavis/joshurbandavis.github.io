
const title=document.querySelector('h1');title.textContent='Gygès';const lede=document.querySelector('.lede');const rules=document.createElement('details');rules.className='rules';rules.innerHTML='<summary>How to play · shared rings, borrowed movement</summary>';rules.append(lede.cloneNode(true));document.querySelector('main').append(rules);lede.textContent='Nothing belongs to you. Move a ring. Borrow its momentum.';document.querySelector('.kicker').textContent='TWELVE RINGS / TWO SIDES / ONE INSTRUMENT';
document.getElementById('skinSelect').closest('.panel').classList.add('skin-panel');document.querySelector('.title-block').insertAdjacentHTML('beforeend','<div class="height-key"><span>Ⅰ · one step</span><span>Ⅱ · two steps</span><span>Ⅲ · three steps</span></div>');document.getElementById('startBtn').textContent='Enter with sound →';

const skinSelect=document.getElementById('skinSelect');
const skinPanel=skinSelect.closest('.panel');skinPanel.querySelector('h2').textContent='Instrument / world';
skinSelect.hidden=false;
const audition=document.createElement('button');audition.type='button';audition.className='audition-surface';audition.textContent='♪ Hear this instrument';audition.onclick=()=>document.dispatchEvent(new Event('gyges:audition'));skinPanel.append(audition);
