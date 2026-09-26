/* Shared-clock selection: joining or muting never reshuffles the ensemble. */
const BAND_INSTRUMENTS=INSTRUMENTS,BAND_SKIN_FOR=INSTRUMENT_WORLD,BAND_NOTES=INSTRUMENT_NOTES;
function bandEnsembleAt(ms,order){
 const slot=Math.floor(ms/BAND_PROGRAM_MS),deck=[...BAND_INSTRUMENTS];
 let seed=(Math.floor(slot/deck.length)^0x6d2b79f5)>>>0;
 const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};
 for(let i=deck.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
 return Object.fromEntries(order.map((id,i)=>{const instrument=deck[((slot*order.length+i)%deck.length+deck.length)%deck.length];return [id,{instrument,skin:BAND_SKIN_FOR[instrument]||instrument,label:instrument==='resonant'?'Resonant Table':PALETTES[instrument].label,notes:BAND_NOTES[instrument]}];}));
}
function bandBuildInstrument(instrument,id){
 const built=instrument==='resonant'?createResonantPalette():PALETTES[instrument].make();
 const map=id==='chess'?{pawn:'pawn',knight:'knight',bishop:'bishop',rook:'rook',queen:'queen',king:'king',alert:'knight'}:id==='mancala'?{main:'pawn',drone:'king'}:id==='backgammon'?{main:'bishop',drone:'king',chime:'queen'}:{main:id==='checkers'?'knight':id==='reversi'?'queen':'rook'};
 const used=new Set(Object.values(map));
 for(const [key,v] of Object.entries(built.voices))if(!used.has(key))v.dispose();
 return {voices:Object.fromEntries(Object.entries(map).map(([key,type])=>[key,built.voices[type]])),effects:built.effects()};
}
