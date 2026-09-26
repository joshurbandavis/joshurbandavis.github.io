/* Shared-clock selection: joining or muting never reshuffles the ensemble. */
const BAND_INSTRUMENTS=Object.keys(PALETTES).concat('resonant');
const BAND_SKIN_FOR={orchestral:'light',electronic:'neon',percussive:'alien',omen:'comet'};
const BAND_NOTES={orchestral:'Plucked attacks, bowed tones and a low string bed.',electronic:'Bright square waves, glassy FM and bouncing echoes.',percussive:'Dry mallets, clipped pulses and low drum strikes.',tr808:'Pitch-falling drums with warm, heavy tails.',tb303:'Acid bass: resonant filters and sliding sawtooth tones.',modular:'Analog voices with slowly moving filters.',op1:'Small, bright digital tones and playful modulation.',deepsea:'Submerged tones with a drifting, luminous surface.',glitch:'Broken FM grains, crushed edges and short echoes.',fungal:'Soft, organic tones that swell and decay.',omen:'A warm, wavering voice with an uneasy shimmer.',macabre:'Bone-like percussion, bowed saws and tolling bells.',grimoire:'Dark resonances and an incantatory sustain.',clockwork:'Precise mechanical attacks and metallic motion.',luxmath:'Clear harmonic tones with geometric repetition.',ouroboros:'Circling tones with a winding, sustained tail.',bassocontinuo:'Gliding bass, filter wobble and dub echoes.',timpanomoderno:'Deep membrane thumps with a sustained body.',tubocochleato:'Fast sine tones and tightly rolling echoes.',lalumiere:'Warm sine voices through an expressive wah filter.',audacia:'Detuned square stabs, grit and sparse echoes.',orrery:'Metallic FM chimes, tremolo and orbital echoes.',anatomy:'Short filtered square waves with a dry, tactile edge.',marbled:'Flowing filtered saws with chorus and light echo.',gyges_pluck:'Gygès plucked voice with a soft chorus.',gyges_blip:'Gygès miniature pulses and quick decays.',gyges_bell:'Gygès glass bells with repeating echoes.',gyges_pad:'Gygès slowly opening, chorused tones.',resonant:'Wood, ceramic, string and bronze resonances.'};
function bandEnsembleAt(ms,order){
 const slot=Math.floor(ms/BAND_PROGRAM_MS),deck=[...BAND_INSTRUMENTS];
 let seed=(Math.floor(slot/deck.length)^0x6d2b79f5)>>>0;
 const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};
 for(let i=deck.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
 return Object.fromEntries(order.map((id,i)=>{const instrument=deck[((slot*order.length+i)%deck.length+deck.length)%deck.length];return [id,{instrument,skin:BAND_SKIN_FOR[instrument]||instrument,label:instrument==='resonant'?'Resonant Table':PALETTES[instrument].label,notes:BAND_NOTES[instrument]}];}));
}
function bandBuildInstrument(instrument,id){
 const built=instrument==='resonant'?bandResonantPalette():PALETTES[instrument].make();
 const map=id==='chess'?{pawn:'pawn',knight:'knight',bishop:'bishop',rook:'rook',queen:'queen',king:'king',alert:'knight'}:id==='mancala'?{main:'pawn',drone:'king'}:id==='backgammon'?{main:'bishop',drone:'king',chime:'queen'}:{main:id==='checkers'?'knight':id==='reversi'?'queen':'rook'};
 const used=new Set(Object.values(map));
 for(const [key,v] of Object.entries(built.voices))if(!used.has(key))v.dispose();
 return {voices:Object.fromEntries(Object.entries(map).map(([key,type])=>[key,built.voices[type]])),effects:built.effects()};
}
// Chess's impulse/filter-bank material model, on the station clock and audio bus.
function bandResonantPalette(){
 const materials={pawn:[[1,2.76,5.4],.22],knight:[[1,1.47,2.09,3.8],.42],bishop:[[1,2,3,4,5],1.6],rook:[[1,2.32,4.25],.7],queen:[[1,1.51,2.03,2.71,3.9],2.1],king:[[1,2,2.98],1.1]};
 return {effects:()=>[],voices:Object.fromEntries(Object.entries(materials).map(([type,[ratios,tail]])=>{
  const output=new Tone.Volume(0),ctx=Tone.getContext().rawContext,live=new Set();
  const voice={volume:output.volume,connect:n=>output.connect(n),dispose(){for(const cleanup of [...live])cleanup();output.dispose();},triggerAttackRelease(notes,duration,time,velocity=.4){
   for(const note of Array.isArray(notes)?notes:[notes]){
    const base=Tone.Frequency(note).toFrequency(),at=Math.max(time,ctx.currentTime+.001);
    const buffer=ctx.createBuffer(1,Math.floor(ctx.sampleRate*.025),ctx.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/(data.length*.14));
    const impulse=ctx.createBufferSource(),env=ctx.createGain(),nodes=[impulse,env];impulse.buffer=buffer;
    env.gain.setValueAtTime(.0001,at);env.gain.exponentialRampToValueAtTime(Math.max(.0002,velocity*1.15),at+.003);env.gain.exponentialRampToValueAtTime(.0001,at+tail+1);Tone.connect(env,output);
    ratios.forEach((ratio,i)=>{const filter=ctx.createBiquadFilter(),gain=ctx.createGain();filter.type='bandpass';filter.frequency.value=Math.min(ctx.sampleRate*.45,base*ratio);filter.Q.value=Math.min(400,base*ratio*tail*.7);gain.gain.value=5/(1+i*.6);impulse.connect(filter);filter.connect(gain);gain.connect(env);nodes.push(filter,gain);});
    let timer;const cleanup=()=>{clearTimeout(timer);nodes.forEach(n=>n.disconnect());live.delete(cleanup);};live.add(cleanup);impulse.start(at);timer=setTimeout(cleanup,(at-ctx.currentTime+tail+1.2)*1000);
   }
  }};return [type,voice];
 }))};
}
