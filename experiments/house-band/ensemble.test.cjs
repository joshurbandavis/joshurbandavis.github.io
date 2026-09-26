const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const c=vm.createContext({});
for(const name of ['../_shared/chess-instruments.js','sound-programs.js','instrument-skins.js','ensemble.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,name),'utf8'),c);
vm.runInContext(`
 const order=['chess','checkers','reversi','connect4','mancala','backgammon'];
 const seen=new Set();
 for(let slot=0;slot<2000;slot++){
  const a=bandEnsembleAt(slot*BAND_PROGRAM_MS,order),b=bandEnsembleAt(slot*BAND_PROGRAM_MS+BAND_PROGRAM_MS-1,order);
  if(JSON.stringify(a)!==JSON.stringify(b))throw Error('Changes inside a rotation');
  if(new Set(Object.values(a).map(p=>p.instrument)).size!==6)throw Error('Duplicate instrument');
  if(new Set(Object.values(a).map(p=>p.skin)).size!==6)throw Error('Duplicate skin');
  for(const p of Object.values(a)){
   if(!BAND_SKINS[p.skin]||!p.notes||!p.label)throw Error('Missing presentation: '+p.instrument);
   seen.add(p.instrument);
  }
 }
 if(seen.size!==BAND_INSTRUMENTS.length)throw Error('Unreachable instrument');
`,c);
const skins=vm.runInContext('BAND_SKINS',c);
for(const skin of Object.values(skins))if(skin.image)assert(fs.existsSync(path.resolve(__dirname,skin.image)),skin.image);
console.log('PASS: 2,000 rotations, unique instruments/skins, stable clock assignments, full library coverage and artwork paths');
