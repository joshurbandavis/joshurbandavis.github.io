/* Clock-derived sound programs; game timelines and member selection remain unchanged. */
const BAND_PROGRAM_MS=4*60*1000;
const BAND_PROGRAMS=[
 {name:'Original ensemble',engine:'original',transpose:0,space:.3,echo:.12,pattern:'flow'},
 {name:'Glass pendulum',engine:'bell',transpose:0,space:.4,echo:.2,pattern:'sway'},
 {name:'Wooden mechanisms',engine:'pluck',transpose:-12,space:.14,echo:.08,pattern:'skip'},
 {name:'Velvet night',engine:'pad',transpose:-12,space:.48,echo:.18,pattern:'sparse'},
 {name:'Pocket circuits',engine:'blip',transpose:0,space:.09,echo:.24,pattern:'double'}
];
function bandProgramAt(ms,offset=0){return ((Math.floor(ms/BAND_PROGRAM_MS)+offset)%BAND_PROGRAMS.length+BAND_PROGRAMS.length)%BAND_PROGRAMS.length;}
function bandVoice(engine,low){
 if(engine==='bell')return new Tone.PolySynth(Tone.FMSynth,{harmonicity:3.01,modulationIndex:7,envelope:{attack:.003,decay:.5,sustain:.04,release:.9},modulationEnvelope:{attack:.008,decay:.22,sustain:0,release:.3}});
 if(engine==='pluck')return new Tone.PolySynth(Tone.MonoSynth,{oscillator:{type:'triangle'},filter:{Q:1.5,type:'lowpass',rolloff:-24},envelope:{attack:.002,decay:.22,sustain:0,release:.3},filterEnvelope:{attack:.001,decay:.14,sustain:0,release:.2,baseFrequency:low?100:180,octaves:4.5}});
 if(engine==='pad')return new Tone.PolySynth(Tone.AMSynth,{harmonicity:1.99,oscillator:{type:'sine'},envelope:{attack:.45,decay:.4,sustain:.5,release:1.4},modulation:{type:'sine'},modulationEnvelope:{attack:.5,decay:.2,sustain:.8,release:.8}});
 return new Tone.PolySynth(Tone.Synth,{oscillator:{type:'triangle'},envelope:{attack:.001,decay:.07,sustain:0,release:.1}});
}
function bandNotes(program,notes,col){
 if(program.pattern==='sparse'&&col%2)return [];
 return notes.map(([voice,note,dur,vel])=>[voice,note,program.pattern==='sparse'?'4n':program.pattern==='double'?'32n':dur,vel*(program.pattern==='sway'?(col%3===0?1:.6):program.pattern==='skip'?(col%2?.45:1):1)]);
}
