/* Shared by Chess and House Band: identical voices and effect chains. */
const PALETTES = {
  // orchestral (light): the most acoustic-leaning palette on purpose -- pizzicato pawns,
  // marcato knights, legato strings for the bishop, brassy rook/queen, a low string-pad
  // king. A faint chorus is the only processing, just enough to feel like a small ensemble.
  orchestral: { label:'Orchestral', make: () => ({
    voices: {
      pawn:   new Tone.PolySynth(Tone.Synth, {oscillator:{type:'triangle'}, envelope:{attack:0.003,decay:0.15,sustain:0.02,release:0.25}}),
      knight: new Tone.PolySynth(Tone.Synth, {oscillator:{type:'square'}, envelope:{attack:0.001,decay:0.08,sustain:0,release:0.1}}),
      bishop: new Tone.PolySynth(Tone.AMSynth, {harmonicity:1.5, oscillator:{type:'sine'}, envelope:{attack:0.3,decay:0.25,sustain:0.5,release:1.0}, modulation:{type:'sine'}, modulationEnvelope:{attack:0.35,decay:0.15,sustain:0.8,release:0.6}}),
      rook:   new Tone.PolySynth(Tone.FMSynth, {harmonicity:1, modulationIndex:3, envelope:{attack:0.015,decay:0.3,sustain:0.35,release:0.55}, modulationEnvelope:{attack:0.02,decay:0.2,sustain:0.15,release:0.3}}),
      queen:  new Tone.PolySynth(Tone.FMSynth, {harmonicity:4, modulationIndex:7, envelope:{attack:0.015,decay:0.45,sustain:0.35,release:1.1}, modulationEnvelope:{attack:0.03,decay:0.3,sustain:0.2,release:0.6}}),
      king:   new Tone.PolySynth(Tone.AMSynth, {harmonicity:0.5, oscillator:{type:'sine'}, envelope:{attack:0.45,decay:0.4,sustain:0.55,release:1.5}, modulation:{type:'sine'}, modulationEnvelope:{attack:0.5,decay:0.2,sustain:0.6,release:0.9}}),
    },
    effects: () => [new Tone.Chorus({frequency:0.9, delayTime:3, depth:0.3, wet:0.22}).start()],
  }) },
  // electronic (neon): crisp and synthetic across the board, with a shared ping-pong delay
  // and light chorus for that glassy, bouncy neon shimmer.
  electronic: { label:'Electronic', make: () => ({
    voices: {
      pawn:   new Tone.PolySynth(Tone.Synth, {oscillator:{type:'square'}, envelope:{attack:0.001,decay:0.07,sustain:0,release:0.08}}),
      knight: new Tone.PolySynth(Tone.FMSynth, {harmonicity:2, modulationIndex:10, envelope:{attack:0.001,decay:0.09,sustain:0,release:0.12}, modulationEnvelope:{attack:0.001,decay:0.05,sustain:0,release:0.08}}),
      bishop: new Tone.PolySynth(Tone.Synth, {oscillator:{type:'sawtooth'}, envelope:{attack:0.12,decay:0.2,sustain:0.35,release:0.55}}),
      rook:   new Tone.PolySynth(Tone.Synth, {oscillator:{type:'pulse', width:0.18}, envelope:{attack:0.004,decay:0.18,sustain:0.22,release:0.28}}),
      queen:  new Tone.PolySynth(Tone.FMSynth, {harmonicity:2.01, modulationIndex:12, envelope:{attack:0.01,decay:0.3,sustain:0.3,release:0.75}, modulationEnvelope:{attack:0.02,decay:0.2,sustain:0.2,release:0.4}}),
      king:   new Tone.PolySynth(Tone.Synth, {oscillator:{type:'sine'}, envelope:{attack:0.28,decay:0.3,sustain:0.6,release:1.15}}),
    },
    effects: () => [
      new Tone.Chorus({frequency:1.6, delayTime:2.2, depth:0.3, wet:0.22}).start(),
      new Tone.PingPongDelay({delayTime:'16n', feedback:0.22, wet:0.22}),
    ],
  }) },
  // percussive (dark/alien): tight, dry, mallet-and-drum hits -- no sustain to speak of.
  // A touch of drive plus a very short slapback keeps it punchy without turning muddy.
  percussive: { label:'Percussive', make: () => ({
    voices: {
      pawn:   new Tone.PolySynth(Tone.MembraneSynth, {pitchDecay:0.006, octaves:1.2, envelope:{attack:0.001,decay:0.1,sustain:0,release:0.07}}),
      knight: new Tone.PolySynth(Tone.Synth, {oscillator:{type:'square'}, envelope:{attack:0.001,decay:0.05,sustain:0,release:0.05}}),
      bishop: new Tone.PolySynth(Tone.Synth, {oscillator:{type:'sawtooth'}, envelope:{attack:0.008,decay:0.16,sustain:0.04,release:0.22}}),
      rook:   new Tone.PolySynth(Tone.MembraneSynth, {pitchDecay:0.02, octaves:2.2, envelope:{attack:0.001,decay:0.22,sustain:0.04,release:0.2}}),
      queen:  new Tone.PolySynth(Tone.Synth, {oscillator:{type:'pulse', width:0.12}, envelope:{attack:0.004,decay:0.26,sustain:0.12,release:0.4}}),
      king:   new Tone.PolySynth(Tone.MembraneSynth, {pitchDecay:0.045, octaves:3.2, envelope:{attack:0.004,decay:0.45,sustain:0.06,release:0.5}}),
    },
    effects: () => [
      new Tone.Distortion({distortion:0.12, wet:0.3}),
      new Tone.FeedbackDelay({delayTime:'16n', feedback:0.1, wet:0.12}),
    ],
  }) },
  // hardware-homage palettes, keyed to match the skin ids so picking a skin can auto-select one
  tr808: { label:'TR-808', make: () => ({
    voices: {
      pawn:   new Tone.PolySynth(Tone.Synth, {oscillator:{type:'square'}, envelope:{attack:0.001,decay:0.05,sustain:0,release:0.05}}),
      knight: new Tone.PolySynth(Tone.MembraneSynth, {pitchDecay:0.02, octaves:1.5, envelope:{attack:0.001,decay:0.12,sustain:0,release:0.1}}),
      bishop: new Tone.PolySynth(Tone.MembraneSynth, {pitchDecay:0.03, octaves:2, envelope:{attack:0.001,decay:0.2,sustain:0,release:0.15}}),
      rook:   new Tone.PolySynth(Tone.MembraneSynth, {pitchDecay:0.05, octaves:3, envelope:{attack:0.001,decay:0.3,sustain:0.05,release:0.25}}),
      queen:  new Tone.PolySynth(Tone.MembraneSynth, {pitchDecay:0.06, octaves:3.5, envelope:{attack:0.001,decay:0.4,sustain:0.08,release:0.35}}),
      king:   new Tone.PolySynth(Tone.MembraneSynth, {pitchDecay:0.08, octaves:4.5, envelope:{attack:0.002,decay:0.6,sustain:0.1,release:0.5}}),
    },
    effects: () => [
      new Tone.Distortion({distortion:0.2, wet:0.4}), // classic drum-machine saturation
      new Tone.FeedbackDelay({delayTime:'8n', feedback:0.18, wet:0.15}), // dub-style slap echo
    ],
  }) },
  tb303: { label:'TB-303', make: () => ({
    voices: {
      pawn:   new Tone.PolySynth(Tone.MonoSynth, {oscillator:{type:'sawtooth'}, filter:{Q:8,type:'lowpass',rolloff:-24}, envelope:{attack:0.004,decay:0.12,sustain:0.05,release:0.15}, filterEnvelope:{attack:0.002,decay:0.15,sustain:0,release:0.15,baseFrequency:200,octaves:3}}),
      knight: new Tone.PolySynth(Tone.MonoSynth, {oscillator:{type:'sawtooth'}, filter:{Q:10,type:'lowpass',rolloff:-24}, envelope:{attack:0.002,decay:0.1,sustain:0,release:0.12}, filterEnvelope:{attack:0.001,decay:0.12,sustain:0,release:0.1,baseFrequency:300,octaves:4}}),
      bishop: new Tone.PolySynth(Tone.MonoSynth, {oscillator:{type:'sawtooth'}, filter:{Q:9,type:'lowpass',rolloff:-24}, envelope:{attack:0.01,decay:0.25,sustain:0.15,release:0.3}, filterEnvelope:{attack:0.02,decay:0.3,sustain:0.1,release:0.3,baseFrequency:150,octaves:3.5}}),
      rook:   new Tone.PolySynth(Tone.MonoSynth, {oscillator:{type:'sawtooth'}, filter:{Q:12,type:'lowpass',rolloff:-24}, envelope:{attack:0.005,decay:0.2,sustain:0.2,release:0.25}, filterEnvelope:{attack:0.005,decay:0.2,sustain:0.1,release:0.25,baseFrequency:100,octaves:4.5}}),
      queen:  new Tone.PolySynth(Tone.MonoSynth, {oscillator:{type:'sawtooth'}, filter:{Q:14,type:'lowpass',rolloff:-24}, envelope:{attack:0.01,decay:0.35,sustain:0.25,release:0.4}, filterEnvelope:{attack:0.01,decay:0.4,sustain:0.15,release:0.4,baseFrequency:120,octaves:5}}),
      king:   new Tone.PolySynth(Tone.MonoSynth, {oscillator:{type:'sawtooth'}, filter:{Q:6,type:'lowpass',rolloff:-24}, envelope:{attack:0.03,decay:0.5,sustain:0.3,release:0.6}, filterEnvelope:{attack:0.05,decay:0.5,sustain:0.2,release:0.5,baseFrequency:80,octaves:3}}),
    },
    effects: () => [
      new Tone.Distortion({distortion:0.3, wet:0.35}), // driven into acid squelch
      new Tone.Phaser({frequency:0.6, octaves:3, baseFrequency:400, wet:0.18}),
    ],
  }) },
  modular: { label:'Modular', make: () => ({
    voices: {
      pawn:   new Tone.PolySynth(Tone.MonoSynth, {oscillator:{type:'triangle'}, filter:{Q:1,type:'lowpass',rolloff:-12}, envelope:{attack:0.01,decay:0.15,sustain:0.1,release:0.2}, filterEnvelope:{attack:0.02,decay:0.2,sustain:0.3,release:0.3,baseFrequency:400,octaves:2}}),
      knight: new Tone.PolySynth(Tone.MonoSynth, {oscillator:{type:'square'}, filter:{Q:2,type:'lowpass',rolloff:-12}, envelope:{attack:0.002,decay:0.1,sustain:0,release:0.12}, filterEnvelope:{attack:0.001,decay:0.15,sustain:0,release:0.15,baseFrequency:500,octaves:2.5}}),
      bishop: new Tone.PolySynth(Tone.AMSynth, {harmonicity:1, oscillator:{type:'sine'}, envelope:{attack:0.3,decay:0.3,sustain:0.5,release:0.9}, modulation:{type:'triangle'}, modulationEnvelope:{attack:0.4,decay:0.2,sustain:0.6,release:0.6}}),
      rook:   new Tone.PolySynth(Tone.MonoSynth, {oscillator:{type:'sawtooth'}, filter:{Q:1.5,type:'lowpass',rolloff:-24}, envelope:{attack:0.01,decay:0.3,sustain:0.4,release:0.5}, filterEnvelope:{attack:0.05,decay:0.3,sustain:0.4,release:0.4,baseFrequency:180,octaves:2.5}}),
      queen:  new Tone.PolySynth(Tone.MonoSynth, {oscillator:{type:'sawtooth'}, filter:{Q:2.5,type:'lowpass',rolloff:-24}, envelope:{attack:0.02,decay:0.4,sustain:0.5,release:0.9}, filterEnvelope:{attack:0.1,decay:0.4,sustain:0.5,release:0.7,baseFrequency:220,octaves:3.5}}),
      king:   new Tone.PolySynth(Tone.MonoSynth, {oscillator:{type:'sawtooth'}, filter:{Q:1,type:'lowpass',rolloff:-24}, envelope:{attack:0.3,decay:0.5,sustain:0.6,release:1.4}, filterEnvelope:{attack:0.5,decay:0.4,sustain:0.5,release:1.0,baseFrequency:100,octaves:2}}),
    },
    effects: () => [
      new Tone.Distortion({distortion:0.08, wet:0.25}), // faint analog warmth
      new Tone.Chorus({frequency:0.8, delayTime:3.5, depth:0.45, wet:0.35}).start(), // multi-osc thickness
    ],
  }) },
  op1: { label:'OP-1', make: () => ({
    voices: {
      pawn:   new Tone.PolySynth(Tone.Synth, {oscillator:{type:'square'}, envelope:{attack:0.001,decay:0.08,sustain:0,release:0.08}}),
      knight: new Tone.PolySynth(Tone.FMSynth, {harmonicity:3, modulationIndex:4, envelope:{attack:0.001,decay:0.1,sustain:0,release:0.1}, modulationEnvelope:{attack:0.001,decay:0.08,sustain:0,release:0.08}}),
      bishop: new Tone.PolySynth(Tone.Synth, {oscillator:{type:'triangle'}, envelope:{attack:0.05,decay:0.2,sustain:0.3,release:0.4}}),
      rook:   new Tone.PolySynth(Tone.FMSynth, {harmonicity:1.5, modulationIndex:2, envelope:{attack:0.005,decay:0.2,sustain:0.2,release:0.3}, modulationEnvelope:{attack:0.01,decay:0.15,sustain:0.1,release:0.2}}),
      queen:  new Tone.PolySynth(Tone.FMSynth, {harmonicity:2.5, modulationIndex:5, envelope:{attack:0.01,decay:0.3,sustain:0.25,release:0.5}, modulationEnvelope:{attack:0.02,decay:0.2,sustain:0.15,release:0.3}}),
      king:   new Tone.PolySynth(Tone.AMSynth, {harmonicity:2, oscillator:{type:'square'}, envelope:{attack:0.02,decay:0.3,sustain:0.4,release:0.6}, modulation:{type:'square'}, modulationEnvelope:{attack:0.03,decay:0.2,sustain:0.3,release:0.4}}),
    },
    effects: () => [
      new Tone.Vibrato({frequency:5.5, depth:0.12}), // lo-fi tape-ish wobble
      new Tone.PingPongDelay({delayTime:'16n', feedback:0.25, wet:0.25}), // playful bounce
    ],
  }) },
  // imaginative, non-hardware palettes -- same skin-id-keyed auto-link mechanism
  deepsea: { label:'Deep Sea', make: () => ({
    voices: {
      pawn:   new Tone.PolySynth(Tone.Synth, {oscillator:{type:'sine'}, envelope:{attack:0.05,decay:0.2,sustain:0.1,release:0.5}}),
      knight: new Tone.PolySynth(Tone.AMSynth, {harmonicity:2, oscillator:{type:'sine'}, envelope:{attack:0.01,decay:0.15,sustain:0,release:0.3}, modulation:{type:'sine'}, modulationEnvelope:{attack:0.05,decay:0.1,sustain:0,release:0.2}}),
      bishop: new Tone.PolySynth(Tone.AMSynth, {harmonicity:1.01, oscillator:{type:'sine'}, envelope:{attack:0.3,decay:0.3,sustain:0.4,release:1.2}, modulation:{type:'sine'}, modulationEnvelope:{attack:0.5,decay:0.3,sustain:0.5,release:1.0}}),
      rook:   new Tone.PolySynth(Tone.AMSynth, {harmonicity:0.5, oscillator:{type:'sine'}, envelope:{attack:0.1,decay:0.3,sustain:0.3,release:0.9}, modulation:{type:'triangle'}, modulationEnvelope:{attack:0.2,decay:0.2,sustain:0.3,release:0.6}}),
      queen:  new Tone.PolySynth(Tone.AMSynth, {harmonicity:1.02, oscillator:{type:'sine'}, envelope:{attack:0.2,decay:0.4,sustain:0.5,release:1.6}, modulation:{type:'sine'}, modulationEnvelope:{attack:0.4,decay:0.3,sustain:0.6,release:1.3}}),
      king:   new Tone.PolySynth(Tone.AMSynth, {harmonicity:0.99, oscillator:{type:'sine'}, envelope:{attack:0.5,decay:0.5,sustain:0.6,release:2.2}, modulation:{type:'sine'}, modulationEnvelope:{attack:0.8,decay:0.4,sustain:0.7,release:1.8}}),
    },
    effects: () => [
      new Tone.Chorus({frequency:0.5, delayTime:5, depth:0.5, wet:0.35}).start(),
      new Tone.FeedbackDelay({delayTime:'8n.', feedback:0.35, wet:0.3}), // vast, washy tail
    ],
  }) },
  glitch:{label:'Glitch',make:()=>({voices:Object.fromEntries(['pawn','knight','bishop','rook','queen','king'].map((type,i)=>[type,new Tone.PolySynth(Tone.FMSynth,{harmonicity:[7.13,11.7,3.31,1.41,8.17,.51][i],modulationIndex:18+i*3,oscillator:{type:'square'},envelope:{attack:.001,decay:.025+i*.007,sustain:0,release:.015},modulationEnvelope:{attack:.001,decay:.016,sustain:0,release:.008}})])),effects:()=>[new Tone.BitCrusher({bits:4,wet:.85}),new Tone.Filter({frequency:2400,type:'highpass',rolloff:-12}),new Tone.PingPongDelay({delayTime:.047,feedback:.18,wet:.16})]})},
  // was Tone.PluckSynth per piece (Karplus-Strong): it extends Instrument, not Monophonic,
  // and Tone.PolySynth's constructor asserts "voice instanceof Monophonic" synchronously --
  // wrapping it threw immediately on build, and since rebuildSynths() disposes the old
  // synths *before* that throw, every piece was left disposed and broken. MonoSynth with a
  // fast-closing filter gives a comparable soft, damp "wood knock" and is PolySynth-safe.
  fungal: { label:'Fungal', make: () => ({
    voices: {
      pawn:   new Tone.PolySynth(Tone.MonoSynth, {oscillator:{type:'triangle'}, filter:{Q:1,type:'lowpass',rolloff:-24}, envelope:{attack:0.004,decay:0.15,sustain:0,release:0.18}, filterEnvelope:{attack:0.005,decay:0.12,sustain:0,release:0.15,baseFrequency:350,octaves:1.2}}),
      knight: new Tone.PolySynth(Tone.MonoSynth, {oscillator:{type:'triangle'}, filter:{Q:1.3,type:'lowpass',rolloff:-24}, envelope:{attack:0.002,decay:0.1,sustain:0,release:0.12}, filterEnvelope:{attack:0.002,decay:0.08,sustain:0,release:0.1,baseFrequency:450,octaves:1.4}}),
      bishop: new Tone.PolySynth(Tone.MonoSynth, {oscillator:{type:'sine'}, filter:{Q:0.8,type:'lowpass',rolloff:-12}, envelope:{attack:0.01,decay:0.35,sustain:0.05,release:0.4}, filterEnvelope:{attack:0.02,decay:0.3,sustain:0.1,release:0.35,baseFrequency:550,octaves:1.6}}),
      rook:   new Tone.PolySynth(Tone.MonoSynth, {oscillator:{type:'triangle'}, filter:{Q:1,type:'lowpass',rolloff:-24}, envelope:{attack:0.006,decay:0.25,sustain:0,release:0.3}, filterEnvelope:{attack:0.01,decay:0.2,sustain:0,release:0.25,baseFrequency:200,octaves:1.3}}),
      queen:  new Tone.PolySynth(Tone.MonoSynth, {oscillator:{type:'sine'}, filter:{Q:0.9,type:'lowpass',rolloff:-12}, envelope:{attack:0.01,decay:0.45,sustain:0.08,release:0.5}, filterEnvelope:{attack:0.02,decay:0.4,sustain:0.1,release:0.45,baseFrequency:600,octaves:1.8}}),
      king:   new Tone.PolySynth(Tone.MonoSynth, {oscillator:{type:'sine'}, filter:{Q:0.7,type:'lowpass',rolloff:-12}, envelope:{attack:0.02,decay:0.5,sustain:0.1,release:0.6}, filterEnvelope:{attack:0.03,decay:0.45,sustain:0.15,release:0.55,baseFrequency:130,octaves:1.2}}),
    },
    effects: () => [
      new Tone.Tremolo({frequency:2.6, depth:0.55, wet:0.7}).start(), // spore-like pulsing
      new Tone.Chorus({frequency:0.7, delayTime:3, depth:0.3, wet:0.2}).start(), // murky thickness
    ],
  }) },
  // omen: a dark, distant bell across the whole board -- low harmonicity keeps every
  // voice inharmonic and gong-like rather than bright, escalating from a short pawn
  // chime to a slow, cavernous king toll, all sharing a slow chorus and a wide,
  // spaced-out echo so each one hangs in the air like it's rolling across a valley.
  omen: { label:'Omen', make: () => ({
    voices: {
      pawn:   new Tone.PolySynth(Tone.FMSynth, {harmonicity:2, modulationIndex:3, envelope:{attack:0.01,decay:0.3,sustain:0.05,release:0.6}, modulationEnvelope:{attack:0.05,decay:0.2,sustain:0,release:0.3}}),
      knight: new Tone.PolySynth(Tone.FMSynth, {harmonicity:1.8, modulationIndex:4, envelope:{attack:0.005,decay:0.25,sustain:0,release:0.5}, modulationEnvelope:{attack:0.02,decay:0.15,sustain:0,release:0.25}}),
      bishop: new Tone.PolySynth(Tone.FMSynth, {harmonicity:1.5, modulationIndex:5, envelope:{attack:0.05,decay:0.6,sustain:0.2,release:1.4}, modulationEnvelope:{attack:0.15,decay:0.4,sustain:0.1,release:0.8}}),
      rook:   new Tone.PolySynth(Tone.FMSynth, {harmonicity:1.2, modulationIndex:6, envelope:{attack:0.02,decay:0.8,sustain:0.2,release:1.8}, modulationEnvelope:{attack:0.3,decay:0.5,sustain:0.1,release:1.0}}),
      queen:  new Tone.PolySynth(Tone.FMSynth, {harmonicity:1.6, modulationIndex:7, envelope:{attack:0.03,decay:1.0,sustain:0.25,release:2.2}, modulationEnvelope:{attack:0.35,decay:0.6,sustain:0.15,release:1.2}}),
      king:   new Tone.PolySynth(Tone.FMSynth, {harmonicity:1.5, modulationIndex:6, envelope:{attack:0.05,decay:1.4,sustain:0.3,release:3.2}, modulationEnvelope:{attack:0.5,decay:0.9,sustain:0.15,release:1.8}}),
    },
    effects: () => [
      new Tone.Chorus({frequency:0.3, delayTime:6, depth:0.5, wet:0.35}).start(),
      new Tone.FeedbackDelay({delayTime:'4n.', feedback:0.4, wet:0.28}),
    ],
  }) },
  // macabre: a music box playing just slightly wrong across the board -- deep chorus
  // detunes every voice against itself for that toy-piano waver, and a touch of
  // vibrato keeps nothing ever quite landing in tune, like the mechanism is worn.
  macabre:{label:'Danse Macabre',make:()=>({voices:{
 pawn:new Tone.PolySynth(Tone.FMSynth,{harmonicity:3.5,modulationIndex:5,envelope:{attack:.001,decay:.12,sustain:0,release:.08},modulationEnvelope:{attack:.001,decay:.04,sustain:0,release:.04}}),
 knight:new Tone.PolySynth(Tone.MetalSynth,{harmonicity:3.1,modulationIndex:11,resonance:1800,octaves:1.1,envelope:{attack:.001,decay:.08,release:.04}}),
 bishop:new Tone.PolySynth(Tone.MonoSynth,{oscillator:{type:'fatsawtooth',count:2,spread:9},filter:{Q:.8,type:'lowpass'},envelope:{attack:.14,decay:.2,sustain:.35,release:.5},filterEnvelope:{attack:.12,decay:.3,sustain:.4,release:.4,baseFrequency:700,octaves:1.6}}),
 rook:new Tone.PolySynth(Tone.MonoSynth,{oscillator:{type:'triangle'},filter:{Q:3,type:'lowpass'},envelope:{attack:.008,decay:.18,sustain:.1,release:.2},filterEnvelope:{attack:.01,decay:.12,sustain:.1,release:.1,baseFrequency:160,octaves:2.4}}),
 queen:new Tone.PolySynth(Tone.AMSynth,{harmonicity:1.007,oscillator:{type:'sawtooth'},envelope:{attack:.09,decay:.25,sustain:.3,release:.65},modulation:{type:'sine'},modulationEnvelope:{attack:.1,decay:.2,sustain:.5,release:.4}}),
 king:new Tone.PolySynth(Tone.FMSynth,{harmonicity:1.414,modulationIndex:4,envelope:{attack:.005,decay:.7,sustain:0,release:1.3},modulationEnvelope:{attack:.001,decay:.25,sustain:0,release:.2}})
 },effects:()=>[new Tone.Vibrato({frequency:5.4,depth:.08}),new Tone.Filter({frequency:4800,type:'lowpass'}),new Tone.Chorus({frequency:.4,delayTime:2.5,depth:.18,wet:.12}).start()]})},
  // grimoire: a struck bowl over a held chant across the board -- low harmonicity AM
  // keeps every voice close to a single dark fundamental instead of a bright bell, a
  // slow tremolo gives the whole palette a chant-like pulse, and a slow phaser is the
  // only "movement" in the room.
  // grimoire: rebuilt around a filter-envelope swell instead of AM synthesis -- see
  // the single-voice games for the full rationale (it no longer shares Alien's or
  // Deep Sea's AMSynth-and-sine DNA).
  grimoire: { label:'Grimoire', make: () => ({
    voices: {
      pawn:   new Tone.PolySynth(Tone.MonoSynth, {oscillator:{type:'sine'}, filter:{Q:2,type:'lowpass',rolloff:-12}, envelope:{attack:0.01,decay:0.18,sustain:0.15,release:0.35}, filterEnvelope:{attack:0.15,decay:0.2,sustain:0.2,release:0.4,baseFrequency:250,octaves:2}}),
      knight: new Tone.PolySynth(Tone.MonoSynth, {oscillator:{type:'sine'}, filter:{Q:2.5,type:'lowpass',rolloff:-12}, envelope:{attack:0.005,decay:0.14,sustain:0.1,release:0.3}, filterEnvelope:{attack:0.1,decay:0.15,sustain:0.15,release:0.3,baseFrequency:320,octaves:2.2}}),
      bishop: new Tone.PolySynth(Tone.MonoSynth, {oscillator:{type:'sine'}, filter:{Q:2,type:'lowpass',rolloff:-12}, envelope:{attack:0.05,decay:0.5,sustain:0.4,release:1.3}, filterEnvelope:{attack:0.4,decay:0.5,sustain:0.4,release:1.1,baseFrequency:180,octaves:2.8}}),
      rook:   new Tone.PolySynth(Tone.MonoSynth, {oscillator:{type:'sine'}, filter:{Q:2.2,type:'lowpass',rolloff:-12}, envelope:{attack:0.02,decay:0.45,sustain:0.3,release:1.1}, filterEnvelope:{attack:0.3,decay:0.4,sustain:0.3,release:0.9,baseFrequency:150,octaves:3}}),
      queen:  new Tone.PolySynth(Tone.MonoSynth, {oscillator:{type:'sine'}, filter:{Q:2,type:'lowpass',rolloff:-12}, envelope:{attack:0.1,decay:0.6,sustain:0.45,release:1.7}, filterEnvelope:{attack:0.5,decay:0.55,sustain:0.45,release:1.4,baseFrequency:130,octaves:3.2}}),
      king:   new Tone.PolySynth(Tone.MonoSynth, {oscillator:{type:'sine'}, filter:{Q:1.8,type:'lowpass',rolloff:-12}, envelope:{attack:0.2,decay:0.9,sustain:0.5,release:2.5}, filterEnvelope:{attack:0.8,decay:0.8,sustain:0.5,release:2.2,baseFrequency:100,octaves:3.5}}),
    },
    effects: () => [
      new Tone.Tremolo({frequency:1.8, depth:0.4, wet:0.5}).start(),
      new Tone.Phaser({frequency:0.2, octaves:2.5, baseFrequency:200, wet:0.3}),
    ],
  }) },
  // clockwork: Tone.MetalSynth -- real inharmonic FM-cluster "metal" modeling, tuned
  // tight and short for a small brass gear-tick, escalating resonance/octaves/decay
  // per piece for weight, exactly like the other voice families in this set.
  clockwork: { label:'Clockwork', make: () => ({
    voices: {
      pawn:   new Tone.PolySynth(Tone.MetalSynth, {harmonicity:4.2, modulationIndex:12, resonance:3200, octaves:0.8, envelope:{attack:0.001,decay:0.12,release:0.08}}),
      knight: new Tone.PolySynth(Tone.MetalSynth, {harmonicity:5.1, modulationIndex:16, resonance:3600, octaves:0.9, envelope:{attack:0.001,decay:0.09,release:0.06}}),
      bishop: new Tone.PolySynth(Tone.MetalSynth, {harmonicity:3.8, modulationIndex:10, resonance:2600, octaves:1.1, envelope:{attack:0.001,decay:0.28,release:0.2}}),
      rook:   new Tone.PolySynth(Tone.MetalSynth, {harmonicity:3.5, modulationIndex:9, resonance:2200, octaves:1.3, envelope:{attack:0.001,decay:0.35,release:0.25}}),
      queen:  new Tone.PolySynth(Tone.MetalSynth, {harmonicity:4.0, modulationIndex:13, resonance:2000, octaves:1.5, envelope:{attack:0.001,decay:0.5,release:0.35}}),
      king:   new Tone.PolySynth(Tone.MetalSynth, {harmonicity:3.2, modulationIndex:8, resonance:1600, octaves:1.8, envelope:{attack:0.002,decay:0.7,release:0.5}}),
    },
    effects: () => [
      new Tone.PingPongDelay({delayTime:'32n', feedback:0.22, wet:0.22}),
    ],
  }) },
  // lux mathematica: a PWM oscillator -- the duty cycle itself sweeps for a precise,
  // reedy, faintly nasal tone, a different mechanism than any AM or FM voice here.
  luxmath: { label:'Lux Mathematica', make: () => ({
    voices: {
      pawn:   new Tone.PolySynth(Tone.Synth, {oscillator:{type:'pwm', modulationFrequency:0.5}, envelope:{attack:0.02,decay:0.15,sustain:0.2,release:0.3}}),
      knight: new Tone.PolySynth(Tone.Synth, {oscillator:{type:'pwm', modulationFrequency:0.7}, envelope:{attack:0.005,decay:0.1,sustain:0.1,release:0.2}}),
      bishop: new Tone.PolySynth(Tone.Synth, {oscillator:{type:'pwm', modulationFrequency:0.3}, envelope:{attack:0.08,decay:0.35,sustain:0.35,release:0.7}}),
      rook:   new Tone.PolySynth(Tone.Synth, {oscillator:{type:'pwm', modulationFrequency:0.25}, envelope:{attack:0.03,decay:0.3,sustain:0.3,release:0.55}}),
      queen:  new Tone.PolySynth(Tone.Synth, {oscillator:{type:'pwm', modulationFrequency:0.4}, envelope:{attack:0.1,decay:0.45,sustain:0.4,release:0.95}}),
      king:   new Tone.PolySynth(Tone.Synth, {oscillator:{type:'pwm', modulationFrequency:0.18}, envelope:{attack:0.18,decay:0.6,sustain:0.45,release:1.4}}),
    },
    effects: () => [
      new Tone.AutoFilter({frequency:0.4, baseFrequency:400, octaves:2.5, wet:0.35}).start(),
      new Tone.FeedbackDelay({delayTime:'8n', feedback:0.2, wet:0.18}),
    ],
  }) },
  // ouroboros: a FatOscillator -- a small detuned unison stack baked into the
  // oscillator itself for a thick, wide drone that breathes on its own, escalating
  // unison count/spread per piece for weight.
  ouroboros: { label:'Ouroboros', make: () => ({
    voices: {
      pawn:   new Tone.PolySynth(Tone.Synth, {oscillator:{type:'fatsawtooth', count:2, spread:15}, envelope:{attack:0.02,decay:0.2,sustain:0.25,release:0.4}}),
      knight: new Tone.PolySynth(Tone.Synth, {oscillator:{type:'fatsawtooth', count:2, spread:20}, envelope:{attack:0.005,decay:0.15,sustain:0.15,release:0.3}}),
      bishop: new Tone.PolySynth(Tone.Synth, {oscillator:{type:'fatsawtooth', count:3, spread:22}, envelope:{attack:0.1,decay:0.4,sustain:0.4,release:0.9}}),
      rook:   new Tone.PolySynth(Tone.Synth, {oscillator:{type:'fatsawtooth', count:3, spread:25}, envelope:{attack:0.05,decay:0.35,sustain:0.35,release:0.75}}),
      queen:  new Tone.PolySynth(Tone.Synth, {oscillator:{type:'fatsawtooth', count:3, spread:28}, envelope:{attack:0.15,decay:0.5,sustain:0.5,release:1.2}}),
      king:   new Tone.PolySynth(Tone.Synth, {oscillator:{type:'fatsawtooth', count:4, spread:32}, envelope:{attack:0.25,decay:0.7,sustain:0.55,release:1.8}}),
    },
    effects: () => [
      new Tone.Filter({frequency:1400, type:'lowpass', rolloff:-12}),
      new Tone.FeedbackDelay({delayTime:'4n.', feedback:0.35, wet:0.25}),
    ],
  }) },
  // basso continuo: a reese-style wobble bass -- see the single-voice games for the
  // full rationale. Escalates via portamento/decay/filter depth per piece (pawn is a
  // tight quick pluck, king a slow, deep, heavily-glided sub swell) under one shared
  // fast AutoFilter wobble, soft distortion and dub echo.
  bassocontinuo: { label:'Basso Continuo', make: () => ({
    voices: {
      pawn:   new Tone.PolySynth(Tone.MonoSynth, {oscillator:{type:'sawtooth'}, portamento:0.03, filter:{Q:5,type:'lowpass',rolloff:-24}, envelope:{attack:0.005,decay:0.15,sustain:0.4,release:0.25}, filterEnvelope:{attack:0.01,decay:0.15,sustain:0.3,release:0.2,baseFrequency:120,octaves:1.8}}),
      knight: new Tone.PolySynth(Tone.MonoSynth, {oscillator:{type:'sawtooth'}, portamento:0.02, filter:{Q:6,type:'lowpass',rolloff:-24}, envelope:{attack:0.002,decay:0.1,sustain:0.25,release:0.18}, filterEnvelope:{attack:0.005,decay:0.1,sustain:0.2,release:0.15,baseFrequency:140,octaves:2}}),
      bishop: new Tone.PolySynth(Tone.MonoSynth, {oscillator:{type:'sawtooth'}, portamento:0.06, filter:{Q:5,type:'lowpass',rolloff:-24}, envelope:{attack:0.02,decay:0.4,sustain:0.55,release:0.6}, filterEnvelope:{attack:0.05,decay:0.35,sustain:0.4,release:0.5,baseFrequency:90,octaves:2.2}}),
      rook:   new Tone.PolySynth(Tone.MonoSynth, {oscillator:{type:'sawtooth'}, portamento:0.04, filter:{Q:6,type:'lowpass',rolloff:-24}, envelope:{attack:0.01,decay:0.35,sustain:0.6,release:0.5}, filterEnvelope:{attack:0.02,decay:0.3,sustain:0.4,release:0.45,baseFrequency:75,octaves:2}}),
      queen:  new Tone.PolySynth(Tone.MonoSynth, {oscillator:{type:'sawtooth'}, portamento:0.08, filter:{Q:5,type:'lowpass',rolloff:-24}, envelope:{attack:0.03,decay:0.5,sustain:0.65,release:0.9}, filterEnvelope:{attack:0.08,decay:0.5,sustain:0.5,release:0.8,baseFrequency:65,octaves:2.4}}),
      king:   new Tone.PolySynth(Tone.MonoSynth, {oscillator:{type:'sawtooth'}, portamento:0.12, filter:{Q:4,type:'lowpass',rolloff:-24}, envelope:{attack:0.06,decay:0.8,sustain:0.7,release:1.4}, filterEnvelope:{attack:0.15,decay:0.8,sustain:0.55,release:1.2,baseFrequency:50,octaves:2.6}}),
    },
    effects: () => [
      new Tone.AutoFilter({frequency:5.5, baseFrequency:100, octaves:3, wet:0.85}).start(),
      new Tone.Distortion({distortion:0.25, wet:0.3}),
      new Tone.FeedbackDelay({delayTime:'8n.', feedback:0.45, wet:0.3}),
    ],
  }) },
  // timpano moderno: MembraneSynth's own pitch-drop for a real 808-style thump,
  // escalating pitchDecay/octaves/decay for weight, held with sustain instead of
  // decaying to silence like a drum hit, under soft saturation and a static filter.
  timpanomoderno: { label:'Timpano Moderno', make: () => ({
    voices: {
      pawn:   new Tone.PolySynth(Tone.MembraneSynth, {pitchDecay:0.02, octaves:0.5, envelope:{attack:0.001,decay:0.12,sustain:0.4,release:0.3}}),
      knight: new Tone.PolySynth(Tone.MembraneSynth, {pitchDecay:0.015, octaves:0.4, envelope:{attack:0.001,decay:0.08,sustain:0.3,release:0.2}}),
      bishop: new Tone.PolySynth(Tone.MembraneSynth, {pitchDecay:0.035, octaves:0.7, envelope:{attack:0.001,decay:0.3,sustain:0.55,release:0.6}}),
      rook:   new Tone.PolySynth(Tone.MembraneSynth, {pitchDecay:0.03, octaves:0.6, envelope:{attack:0.001,decay:0.25,sustain:0.5,release:0.5}}),
      queen:  new Tone.PolySynth(Tone.MembraneSynth, {pitchDecay:0.04, octaves:0.8, envelope:{attack:0.001,decay:0.4,sustain:0.6,release:0.8}}),
      king:   new Tone.PolySynth(Tone.MembraneSynth, {pitchDecay:0.05, octaves:1.0, envelope:{attack:0.002,decay:0.6,sustain:0.7,release:1.2}}),
    },
    effects: () => [
      new Tone.Distortion({distortion:0.32, wet:0.4}),
      new Tone.Filter({frequency:900, type:'lowpass', rolloff:-12}),
    ],
  }) },
  // tubo cochleato: a pristine sine sub built for speed, escalating decay/sustain
  // per piece but always short and tight, under a light chorus and a rolling
  // 32nd-note ping-pong.
  tubocochleato: { label:'Tubo Cochleato', make: () => ({
    voices: {
      pawn:   new Tone.PolySynth(Tone.Synth, {oscillator:{type:'sine'}, envelope:{attack:0.001,decay:0.06,sustain:0.1,release:0.08}}),
      knight: new Tone.PolySynth(Tone.Synth, {oscillator:{type:'sine'}, envelope:{attack:0.001,decay:0.04,sustain:0.05,release:0.06}}),
      bishop: new Tone.PolySynth(Tone.Synth, {oscillator:{type:'sine'}, envelope:{attack:0.005,decay:0.15,sustain:0.3,release:0.25}}),
      rook:   new Tone.PolySynth(Tone.Synth, {oscillator:{type:'sine'}, envelope:{attack:0.002,decay:0.12,sustain:0.25,release:0.2}}),
      queen:  new Tone.PolySynth(Tone.Synth, {oscillator:{type:'sine'}, envelope:{attack:0.008,decay:0.2,sustain:0.35,release:0.35}}),
      king:   new Tone.PolySynth(Tone.Synth, {oscillator:{type:'sine'}, envelope:{attack:0.015,decay:0.3,sustain:0.45,release:0.55}}),
    },
    effects: () => [
      new Tone.Chorus({frequency:2.5, delayTime:1.5, depth:0.3, wet:0.25}).start(),
      new Tone.PingPongDelay({delayTime:'32n', feedback:0.3, wet:0.22}),
    ],
  }) },
  // la lumiere: a round, warm triangle through a gentle filter swell, escalating
  // into a long, sunny hold for the king, under chorus, tape echo and a genuine
  // algorithmic reverb.
  // la lumiere: rebuilt off Tone.AutoWah, an envelope-follower rather than an LFO --
  // see the single-voice games for the full rationale (the old Chorus+FeedbackDelay
  // chain was almost exactly Omen's). Oscillator moved from triangle to sine.
  lalumiere: { label:'La Lumière', make: () => ({
    voices: {
      pawn:   new Tone.PolySynth(Tone.MonoSynth, {oscillator:{type:'sine'}, filter:{Q:0.6,type:'lowpass',rolloff:-12}, envelope:{attack:0.03,decay:0.15,sustain:0.4,release:0.5}, filterEnvelope:{attack:0.04,decay:0.15,sustain:0.3,release:0.4,baseFrequency:220,octaves:1.8}}),
      knight: new Tone.PolySynth(Tone.MonoSynth, {oscillator:{type:'sine'}, filter:{Q:0.6,type:'lowpass',rolloff:-12}, envelope:{attack:0.015,decay:0.1,sustain:0.3,release:0.35}, filterEnvelope:{attack:0.025,decay:0.1,sustain:0.2,release:0.3,baseFrequency:270,octaves:2}}),
      bishop: new Tone.PolySynth(Tone.MonoSynth, {oscillator:{type:'sine'}, filter:{Q:0.6,type:'lowpass',rolloff:-12}, envelope:{attack:0.07,decay:0.4,sustain:0.6,release:1.1}, filterEnvelope:{attack:0.1,decay:0.4,sustain:0.5,release:0.9,baseFrequency:160,octaves:2.2}}),
      rook:   new Tone.PolySynth(Tone.MonoSynth, {oscillator:{type:'sine'}, filter:{Q:0.6,type:'lowpass',rolloff:-12}, envelope:{attack:0.04,decay:0.3,sustain:0.55,release:0.9}, filterEnvelope:{attack:0.06,decay:0.3,sustain:0.45,release:0.7,baseFrequency:135,octaves:2}}),
      queen:  new Tone.PolySynth(Tone.MonoSynth, {oscillator:{type:'sine'}, filter:{Q:0.6,type:'lowpass',rolloff:-12}, envelope:{attack:0.09,decay:0.5,sustain:0.65,release:1.4}, filterEnvelope:{attack:0.12,decay:0.5,sustain:0.55,release:1.1,baseFrequency:115,octaves:2.4}}),
      king:   new Tone.PolySynth(Tone.MonoSynth, {oscillator:{type:'sine'}, filter:{Q:0.5,type:'lowpass',rolloff:-12}, envelope:{attack:0.18,decay:0.7,sustain:0.7,release:2.0}, filterEnvelope:{attack:0.24,decay:0.7,sustain:0.6,release:1.6,baseFrequency:90,octaves:2.6}}),
    },
    effects: () => [
      new Tone.AutoWah({baseFrequency:120, octaves:4, sensitivity:-8, Q:2, wet:0.6}),
      new Tone.PingPongDelay({delayTime:'2n.', feedback:0.32, wet:0.24}),
      new Tone.Reverb({decay:3.0, wet:0.3}),
    ],
  }) },
  // audacia: a detuned unison square, stabbed short and hard, escalating unison
  // count/spread per piece, under a shared bit-crush, drive and sparse echo.
  audacia: { label:'Audacia', make: () => ({
    voices: {
      pawn:   new Tone.PolySynth(Tone.Synth, {oscillator:{type:'fatsquare', count:2, spread:10}, envelope:{attack:0.001,decay:0.06,sustain:0.08,release:0.06}}),
      knight: new Tone.PolySynth(Tone.Synth, {oscillator:{type:'fatsquare', count:2, spread:8}, envelope:{attack:0.001,decay:0.04,sustain:0.05,release:0.04}}),
      bishop: new Tone.PolySynth(Tone.Synth, {oscillator:{type:'fatsquare', count:2, spread:14}, envelope:{attack:0.005,decay:0.18,sustain:0.25,release:0.3}}),
      rook:   new Tone.PolySynth(Tone.Synth, {oscillator:{type:'fatsquare', count:2, spread:12}, envelope:{attack:0.002,decay:0.14,sustain:0.2,release:0.22}}),
      queen:  new Tone.PolySynth(Tone.Synth, {oscillator:{type:'fatsquare', count:3, spread:16}, envelope:{attack:0.008,decay:0.25,sustain:0.35,release:0.4}}),
      king:   new Tone.PolySynth(Tone.Synth, {oscillator:{type:'fatsquare', count:3, spread:20}, envelope:{attack:0.02,decay:0.4,sustain:0.45,release:0.7}}),
    },
    effects: () => [
      new Tone.BitCrusher({bits:6, wet:0.35}),
      new Tone.Distortion({distortion:0.4, wet:0.35}),
      new Tone.PingPongDelay({delayTime:'16n', feedback:0.2, wet:0.18}),
    ],
  }) },
  orrery: { label:'Orrery', make: () => ({
    voices: {
      pawn:   new Tone.PolySynth(Tone.FMSynth, {harmonicity:3.5, modulationIndex:8, envelope:{attack:0.001,decay:0.15,sustain:0,release:0.2}, modulationEnvelope:{attack:0.001,decay:0.08,sustain:0,release:0.1}}),
      knight: new Tone.PolySynth(Tone.FMSynth, {harmonicity:4.5, modulationIndex:10, envelope:{attack:0.001,decay:0.1,sustain:0,release:0.15}, modulationEnvelope:{attack:0.001,decay:0.06,sustain:0,release:0.08}}),
      bishop: new Tone.PolySynth(Tone.FMSynth, {harmonicity:2.5, modulationIndex:6, envelope:{attack:0.005,decay:0.3,sustain:0.1,release:0.5}, modulationEnvelope:{attack:0.01,decay:0.2,sustain:0.05,release:0.3}}),
      rook:   new Tone.PolySynth(Tone.FMSynth, {harmonicity:3, modulationIndex:9, envelope:{attack:0.002,decay:0.25,sustain:0.08,release:0.4}, modulationEnvelope:{attack:0.005,decay:0.15,sustain:0,release:0.2}}),
      queen:  new Tone.PolySynth(Tone.FMSynth, {harmonicity:3.5, modulationIndex:11, envelope:{attack:0.005,decay:0.4,sustain:0.12,release:0.7}, modulationEnvelope:{attack:0.01,decay:0.25,sustain:0.05,release:0.35}}),
      king:   new Tone.PolySynth(Tone.FMSynth, {harmonicity:3, modulationIndex:7, envelope:{attack:0.01,decay:0.6,sustain:0.15,release:1.1}, modulationEnvelope:{attack:0.02,decay:0.4,sustain:0.1,release:0.6}}),
    },
    effects: () => [
      new Tone.Tremolo({frequency:6, depth:0.3, wet:0.4}).start(),
      new Tone.PingPongDelay({delayTime:'16n', feedback:0.3, wet:0.28}),
    ],
  }) },
  anatomy: { label:'Anatomy Theatre', make: () => ({
    voices: {
      pawn:   new Tone.PolySynth(Tone.MonoSynth, {oscillator:{type:'square'}, filter:{Q:3,type:'lowpass',rolloff:-24}, envelope:{attack:0.001,decay:0.08,sustain:0,release:0.06}, filterEnvelope:{attack:0.001,decay:0.05,sustain:0,release:0.04,baseFrequency:600,octaves:3}}),
      knight: new Tone.PolySynth(Tone.MonoSynth, {oscillator:{type:'square'}, filter:{Q:4,type:'lowpass',rolloff:-24}, envelope:{attack:0.001,decay:0.06,sustain:0,release:0.05}, filterEnvelope:{attack:0.001,decay:0.04,sustain:0,release:0.03,baseFrequency:750,octaves:3.5}}),
      bishop: new Tone.PolySynth(Tone.MonoSynth, {oscillator:{type:'square'}, filter:{Q:2,type:'lowpass',rolloff:-24}, envelope:{attack:0.001,decay:0.14,sustain:0,release:0.1}, filterEnvelope:{attack:0.001,decay:0.1,sustain:0,release:0.08,baseFrequency:500,octaves:3}}),
      rook:   new Tone.PolySynth(Tone.MonoSynth, {oscillator:{type:'square'}, filter:{Q:2.5,type:'lowpass',rolloff:-24}, envelope:{attack:0.001,decay:0.12,sustain:0,release:0.09}, filterEnvelope:{attack:0.001,decay:0.08,sustain:0,release:0.06,baseFrequency:400,octaves:3.5}}),
      queen:  new Tone.PolySynth(Tone.MonoSynth, {oscillator:{type:'square'}, filter:{Q:2,type:'lowpass',rolloff:-24}, envelope:{attack:0.001,decay:0.18,sustain:0,release:0.14}, filterEnvelope:{attack:0.001,decay:0.12,sustain:0,release:0.1,baseFrequency:350,octaves:4}}),
      king:   new Tone.PolySynth(Tone.MonoSynth, {oscillator:{type:'square'}, filter:{Q:1.5,type:'lowpass',rolloff:-24}, envelope:{attack:0.001,decay:0.22,sustain:0,release:0.18}, filterEnvelope:{attack:0.001,decay:0.16,sustain:0,release:0.12,baseFrequency:250,octaves:4.5}}),
    },
    effects: () => [
      new Tone.Distortion({distortion:0.08, wet:0.15}),
    ],
  }) },
  marbled: { label:'Marbled', make: () => ({
    voices: {
      pawn:   new Tone.PolySynth(Tone.MonoSynth, {oscillator:{type:'sawtooth'}, filter:{Q:1.2,type:'lowpass',rolloff:-24}, envelope:{attack:0.002,decay:0.25,sustain:0,release:0.3}, filterEnvelope:{attack:0.001,decay:0.15,sustain:0,release:0.2,baseFrequency:250,octaves:3}}),
      knight: new Tone.PolySynth(Tone.MonoSynth, {oscillator:{type:'sawtooth'}, filter:{Q:1.5,type:'lowpass',rolloff:-24}, envelope:{attack:0.001,decay:0.18,sustain:0,release:0.22}, filterEnvelope:{attack:0.001,decay:0.1,sustain:0,release:0.14,baseFrequency:320,octaves:3.5}}),
      bishop: new Tone.PolySynth(Tone.MonoSynth, {oscillator:{type:'sawtooth'}, filter:{Q:1,type:'lowpass',rolloff:-24}, envelope:{attack:0.01,decay:0.45,sustain:0.1,release:0.7}, filterEnvelope:{attack:0.02,decay:0.3,sustain:0.08,release:0.45,baseFrequency:200,octaves:3.5}}),
      rook:   new Tone.PolySynth(Tone.MonoSynth, {oscillator:{type:'sawtooth'}, filter:{Q:1.3,type:'lowpass',rolloff:-24}, envelope:{attack:0.005,decay:0.35,sustain:0.05,release:0.5}, filterEnvelope:{attack:0.01,decay:0.22,sustain:0.05,release:0.32,baseFrequency:160,octaves:4}}),
      queen:  new Tone.PolySynth(Tone.MonoSynth, {oscillator:{type:'sawtooth'}, filter:{Q:1.1,type:'lowpass',rolloff:-24}, envelope:{attack:0.02,decay:0.6,sustain:0.12,release:1.0}, filterEnvelope:{attack:0.03,decay:0.4,sustain:0.1,release:0.6,baseFrequency:180,octaves:3.8}}),
      king:   new Tone.PolySynth(Tone.MonoSynth, {oscillator:{type:'sawtooth'}, filter:{Q:0.9,type:'lowpass',rolloff:-24}, envelope:{attack:0.05,decay:0.9,sustain:0.18,release:1.6}, filterEnvelope:{attack:0.08,decay:0.6,sustain:0.15,release:1.0,baseFrequency:130,octaves:3.2}}),
    },
    effects: () => [
      new Tone.Chorus({frequency:1.8, delayTime:2.5, depth:0.35, wet:0.25}).start(),
      new Tone.FeedbackDelay({delayTime:'8n', feedback:0.15, wet:0.15}),
    ],
  }) },
};
const GYGES_PRESETS = {
  // ported verbatim from checker-sequencer's dark/light/neon/alien voices
  pluck: { label:'Pluck', build: () => {
    const synth = new Tone.PolySynth(Tone.MonoSynth, {
      oscillator:{type:'triangle'},
      envelope:{attack:0.002, decay:0.22, sustain:0, release:0.3},
      filter:{Q:1.5, type:'lowpass', rolloff:-24},
      filterEnvelope:{attack:0.001, decay:0.14, sustain:0, release:0.2, baseFrequency:180, octaves:4.5}
    });
    const chorus = new Tone.Chorus({frequency:2.4, delayTime:2, depth:0.3, wet:0.3}).start();
    const slap = new Tone.FeedbackDelay({delayTime:'16n', feedback:0.12, wet:0.16});
    return [synth, chorus, slap];
  }},
  blip: { label:'Blip', build: () => {
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator:{type:'triangle'},
      envelope:{attack:0.001, decay:0.09, sustain:0, release:0.12}
    });
    return [synth];
  }},
  bell: { label:'Bell', build: () => {
    const synth = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity:3.01, modulationIndex:10,
      envelope:{attack:0.003, decay:0.5, sustain:0.08, release:1.1},
      modulationEnvelope:{attack:0.008, decay:0.25, sustain:0, release:0.4}
    });
    const chorus = new Tone.Chorus({frequency:1.4, delayTime:3.2, depth:0.4, wet:0.32}).start();
    const echo = new Tone.FeedbackDelay({delayTime:'8n', feedback:0.22, wet:0.22});
    return [synth, chorus, echo];
  }},
  pad: { label:'Pad', build: () => {
    const synth = new Tone.PolySynth(Tone.AMSynth, {
      harmonicity:1.99, oscillator:{type:'sine'},
      envelope:{attack:0.5, decay:0.4, sustain:0.65, release:1.6},
      modulation:{type:'sine'}, modulationEnvelope:{attack:0.6, decay:0.2, sustain:1, release:0.8}
    });
    const vibrato = new Tone.Vibrato({frequency:3.2, depth:0.06});
    const chorus = new Tone.Chorus({frequency:0.6, delayTime:4.5, depth:0.55, wet:0.4}).start();
    const filter = new Tone.AutoFilter({frequency:0.18, baseFrequency:300, octaves:3.5, wet:0.5}).start();
    return [synth, vibrato, chorus, filter];
  }},
};
for(const key of ['pluck','blip','bell','pad'])PALETTES['gyges_'+key]={label:'Gygès · '+GYGES_PRESETS[key].label,make:()=>{
 const voices={},nodes=[];for(const type of ['pawn','knight','bishop','rook','queen','king']){const chain=GYGES_PRESETS[key].build();voices[type]=chain[0];for(let i=0;i<chain.length-1;i++)chain[i].connect(chain[i+1]);nodes.push(...chain.slice(1));}
 // The shared palette bus supplies the space; use the preset voice settings without parallel dry/effect routing.
 nodes.forEach(n=>n.dispose());Object.values(voices).forEach(v=>v.disconnect());
 return {voices,effects:()=>key==='bell'?[new Tone.FeedbackDelay({delayTime:'8n',feedback:.22,wet:.22})]:key==='pluck'?[new Tone.Chorus({frequency:2.4,delayTime:2,depth:.3,wet:.3}).start()]:key==='pad'?[new Tone.Chorus({frequency:.6,delayTime:4.5,depth:.55,wet:.4}).start()]:[]};
}};
