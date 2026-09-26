// Chess's impulse/filter-bank material model, on the station clock and audio bus.
function createResonantPalette(){
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
