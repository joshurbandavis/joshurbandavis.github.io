const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const read=f=>fs.readFileSync(path.join(__dirname,f),'utf8'),ctx=vm.createContext({});
for(const file of ['chess-instruments.js','resonant-instrument.js','instrument-worlds.js'])vm.runInContext(read(file),ctx);
const catalog=vm.runInContext('INSTRUMENTS.map(id=>({id,world:INSTRUMENT_WORLD[id]||id,label:instrumentLabel(id),gain:INSTRUMENT_LEVEL_DB[id],note:INSTRUMENT_NOTES[id]}))',ctx);
assert.equal(catalog.length,29);assert.equal(new Set(catalog.map(p=>p.world)).size,29);
for(const p of catalog){assert(p.label&&p.note&&Number.isFinite(p.gain),p.id);assert(read('instrument-worlds.css').includes('[data-skin="'+p.world+'"]'),p.world);}
for(const game of ['chess','gyges','checker','reversi','connectfour','mancala','backgammon']){
 const html=read('../'+game+'-sequencer/index.html');assert(html.includes('instrument-worlds.js'),game);assert(html.includes('populateInstrumentWorlds('),game);assert(!html.includes('const PRESETS ='),game);
 for(const script of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(script[1].trim())new vm.Script(script[1]);
}
const listening=read('../chess-sequencer/listening.js');assert(!listening.includes('settings.instrument=s.instrument'));assert(!listening.includes('instrumentSelect'));
console.log('PASS: 29 unique sound/world pairs, seven games share the catalog, missing skins covered, stale independent sound selections ignored');
