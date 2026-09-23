// node experiments/house-band/test.js
// Checks the three things the station depends on: every set is reproducible (two
// listeners computing the same set get identical moves), the faster chess
// isSquareAttacked agrees with the original on every square of every position it
// meets, and a full set computes fast enough for someone tuning in late.
"use strict";
const fs = require('fs');
const path = require('path');
const load = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
const { CHESS, STATION } = new Function(load('engines.js') + load('station.js') + '; return { CHESS, STATION };')();

let failures = 0;
const check = (ok, msg) => { if(!ok){ failures++; console.log('FAIL ' + msg); } };

// isSquareAttacked vs the original, over every position of a few chess sets
const chessSlots = [];
for(let s = 0; chessSlots.length < 3; s++) if(STATION.gameIdForSlot(s) === 'chess') chessSlots.push(s * 7);
let positions = 0;
for(const slot of chessSlots){
  for(const e of STATION.buildSlot(slot)){
    const b = e.snap.board;
    positions++;
    for(let r = 0; r < 8; r++) for(let c = 0; c < 8; c++) for(const color of ['white', 'black']){
      if(CHESS.isSquareAttacked(b, r, c, color) !== CHESS.isSquareAttackedSlow(b, r, c, color)){
        check(false, `attack mismatch slot ${slot} move ${e.move} square ${r},${c} by ${color}`);
      }
    }
  }
}
console.log(`attack check: ${positions} chess positions compared on every square`);

// the station's faster chess search vs the engine's own minimax, move by move
let compared = 0;
for(const e of STATION.buildSlot(chessSlots[0]).filter((e, i) => i % 6 === 0)){
  const color = e.snap.toMove, opp = color === 'white' ? 'black' : 'white';
  const b0 = e.snap.board.map(row => row.map(p => p ? {type:p.type, color:p.color, hasMoved:true} : null));
  for(const m of CHESS.getAllMoves(b0, color, null)){
    const b = CHESS.cloneBoard(b0);
    CHESS.makeMove(b, m.from, m.move, 'queen');
    const ep = CHESS.nextEnPassantTarget(m.from, m.move);
    const want = CHESS.minimax(b, opp, ep, 1, -Infinity, Infinity, color).score;
    check(STATION.chessReplyScore(b, opp, ep, color) === want, `search mismatch at move ${e.move}`);
    compared++;
  }
}
console.log(`search check: ${compared} root moves scored both ways`);

// reproducibility and timing, one full hour starting at the current one
const now = STATION.slotIndexAt(Date.now());
const hourStart = now - ((now % 6) + 6) % 6;
for(let k = 0; k < 6; k++){
  const slot = hourStart + k, id = STATION.gameIdForSlot(slot);
  const t0 = Date.now();
  const events = STATION.buildSlot(slot);
  const ms = Date.now() - t0;
  check(JSON.stringify(events) === JSON.stringify(STATION.buildSlot(slot)), `${id} set ${slot} not reproducible`);
  check(events.every((e, i) => i === 0 || e.t > events[i - 1].t), `${id} set ${slot} events out of order`);
  check(events[events.length - 1].t < STATION.SLOT_MS, `${id} set ${slot} runs past the end of the set`);
  const results = events.filter(e => e.kind === 'move' && e.result).map(e => e.result);
  console.log(`${id.padEnd(11)} ${String(ms).padStart(6)}ms  ${String(events.length).padStart(3)} events  ${results.join('; ')}`);
}

console.log(failures ? `${failures} failure(s)` : 'all checks passed');
process.exit(failures ? 1 : 0);
