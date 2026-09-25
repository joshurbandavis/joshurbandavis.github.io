const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(require('path').join(__dirname,'index.html'),'utf8');
const worker=html.match(/<script type="text\/plain" id="gygesAIWorkerSrc">([\s\S]*?)<\/script>/)[1];
const human=html.slice(html.indexOf('const SIZE = 6;'),html.indexOf('/* ---------------- board DOM'));
for(const [label,src] of [['computer',worker],['human',human]]){
 const c=vm.createContext({postMessage:()=>{},document:{getElementById:()=>null},setTimeout:()=>{}});vm.runInContext(src,c);
 vm.runInContext(`function empty(){return Array.from({length:6},()=>Array(6).fill(null));}`,c);
 const run=x=>JSON.parse(JSON.stringify(vm.runInContext(x,c)));
 assert(run(`(()=>{const b=empty();b[5][2]={height:2};return legalMovesFor(b,5,2,'red',new Set()).filter(m=>m.dest.r===4&&m.dest.c===3).length;})()`)===2,label+' turning paths');
 assert(run(`(()=>{const b=empty();b[5][2]={height:2};return legalMovesFor(b,5,2,'red',new Set()).some(m=>m.dest.r===5&&m.dest.c===2);})()`)===false,label+' no retraced edge');
 assert(run(`(()=>{const b=empty();b[5][2]={height:3};b[4][2]={height:1};b[5][1]={height:3};b[5][3]={height:3};b[4][1]={height:1};b[4][3]={height:1};b[5][0]={height:3};b[4][0]={height:1};b[5][4]={height:3};b[5][5]={height:3};b[4][4]={height:1};b[4][5]={height:1};return computeMovable(b,'red').row;})()`)===4,label+' blocked row fallback');
 assert(run(`(()=>{const b=empty();b[2][0]={height:1};return replacementSquares(b,'red').every(p=>p.r>=2);})()`),label+' replacement boundary');
 assert(run(`(()=>{const b=empty();b[0][2]={height:1};return legalMovesFor(b,0,2,'red',new Set()).some(m=>m.dest.goal==='north');})()`),label+' goal');
 if(label==='computer'){
 assert.deepEqual(run(`(()=>{const b=empty();b[5][2]={height:1};b[4][2]={height:2};const m=legalMovesFor(b,5,2,'red',new Set()).find(m=>m.dest.r===4&&m.dest.c===2);runChain(b,'red',5,2,m,(p,r,c,moves)=>({type:'bounce',move:moves.find(m=>m.dest.r===2&&m.dest.c===2)}));return [b[4][2].height,b[2][2].height];})()`),[2,1]);
 }else{
 vm.runInContext('render=()=>{};sweepOnce=()=>{};endTurn=()=>{};',c);
 assert.equal(run(`(()=>{board=empty();board[5][2]={height:2};currentPlayer='red';const routes=legalMovesFor(board,5,2,'red',new Set()).filter(m=>m.dest.r===4&&m.dest.c===3);return meaningfulRoutes(routes).length;})()`),1,'empty landing needs no choice');
 assert.equal(run(`(()=>{board[4][3]={height:2};const routes=legalMovesFor(board,5,2,'red',new Set()).filter(m=>m.dest.r===4&&m.dest.c===3);return meaningfulRoutes(routes).length;})()`),2,'occupied landing preserves distinct paths');

 assert.deepEqual(run(`(()=>{board=empty();board[5][2]={height:1};board[4][2]={height:2};const m=legalMovesFor(board,5,2,'red',new Set()).find(m=>m.dest.r===4&&m.dest.c===2);beginChain('red',5,2,m);chooseBounce(pendingOccupant.bounceMoves.find(m=>m.dest.r===2&&m.dest.c===2));return [board[4][2].height,board[2][2].height];})()`),[2,1]);
 }

 // Three consecutive bounces of different heights, then exact goal arrival.
 const scenario=`const b=empty();b[5][2]={height:1};b[4][2]={height:2};b[2][2]={height:3};b[0][3]={height:1};`;
 if(label==='computer'){
  assert(run(`(()=>{${scenario}const first=legalMovesFor(b,5,2,'red',new Set()).find(m=>m.dest.r===4&&m.dest.c===2);let stage=0;const result=runChain(b,'red',5,2,first,(p,r,c,moves)=>{const targets=[{r:2,c:2},{r:0,c:3},{goal:'north'}],t=targets[stage++];const move=moves.find(m=>t.goal?m.dest.goal===t.goal:m.dest.r===t.r&&m.dest.c===t.c);if(!move)throw Error('Missing bounce '+stage);return {type:'bounce',move};});return result.win&&stage===3&&b[4][2].height===2&&b[2][2].height===3&&b[0][3].height===1;})()`));
 }else{
  vm.runInContext('celebrateWin=()=>{};',c);
  assert(run(`(()=>{${scenario}board=b;gameOver=null;const first=legalMovesFor(board,5,2,'red',new Set()).find(m=>m.dest.r===4&&m.dest.c===2);beginChain('red',5,2,first);for(const t of [{r:2,c:2},{r:0,c:3},{goal:'north'}]){const move=pendingOccupant.bounceMoves.find(m=>t.goal?m.dest.goal===t.goal:m.dest.r===t.r&&m.dest.c===t.c);if(!move)throw Error('Missing bounce');chooseBounce(move);}return gameOver==='red'&&board[4][2].height===2&&board[2][2].height===3&&board[0][3].height===1;})()`));
 }
 console.log('PASS',label,'turning, distinct routes, edges, blocked rows, replacement limits, goals, bounce identity, three-bounce winning chain');
}
const rv=fs.readFileSync(require('path').join(__dirname,'../reversi-sequencer/index.html'),'utf8');for(const match of rv.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(match[1].trim())new vm.Script(match[1]);console.log('PASS Reversi syntax');
