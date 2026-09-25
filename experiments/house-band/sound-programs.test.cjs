const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const code=fs.readFileSync(path.join(__dirname,'sound-programs.js'),'utf8');const c=vm.createContext({});vm.runInContext(code,c);
assert.equal(vm.runInContext('bandProgramAt(0)',c),0);assert.equal(vm.runInContext('bandProgramAt(BAND_PROGRAM_MS-1)',c),0);assert.equal(vm.runInContext('bandProgramAt(BAND_PROGRAM_MS)',c),1);assert.equal(vm.runInContext('bandProgramAt(BAND_PROGRAM_MS*5)',c),0);
assert.equal(vm.runInContext('bandNotes(BAND_PROGRAMS[3],[["main","C4","8n",.4]],1).length',c),0);
assert.equal(vm.runInContext('bandNotes(BAND_PROGRAMS[3],[["main","C4","8n",.4]],0)[0][2]',c),'4n');
assert.equal(vm.runInContext('bandNotes(BAND_PROGRAMS[4],[["main","C4","8n",.4]],0)[0][2]',c),'32n');
console.log('PASS: rotation boundaries, wraparound, sparse and double articulations');
