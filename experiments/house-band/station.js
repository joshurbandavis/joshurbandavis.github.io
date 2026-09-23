// The House Band's schedule: which game is on the air at any moment, and every move
// of it, derived purely from the clock. The hour is six 10-minute sets (UTC-aligned,
// so :00 is chess everywhere with a whole-hour timezone), and each set is a run of
// back-to-back games between two engines, seeded by the set's index. Nothing here
// touches a server or Math.random: every listener computes the identical timeline
// independently, which is the whole trick -- everyone hears the same move at once.
//
// Needs engines.js loaded first (CHESS, CHECKERS, ...). Used by station-worker.js in
// the browser and by test.js under Node.

var STATION = (function(){
"use strict";

const SLOT_MS = 10 * 60 * 1000;
const STEP_MS = 300;          // one sweep column: an eighth note at 100bpm
const SWEEP_TAIL_MS = 900;    // breath between one sweep ending and the next move
const REPLAYS = 3;            // a finished board plays itself back this many times
const INTERMISSION_MS = 5000; // silence between games within a set

// ---- seeded randomness ----
function mulberry32(a){
  return function(){
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seedFor(slotIndex, gameNo){
  let h = 2166136261 ^ (slotIndex | 0);
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ gameNo ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

// Root-level move choice shared by the alpha-beta games: score every legal move with
// the engine's own minimax one ply down, add a little seeded noise, take the best.
// The engines are fully deterministic, so without the noise every game in every set
// would be the same game; this keeps them from repeating while leaving the noise
// small enough that clearly better moves still win out. Ties keep the engine's own
// move order, so the result is stable across browsers.
function pickBest(options, scoreOf, rng, noise){
  let best = null, bestScore = -Infinity;
  for(const opt of options){
    const s = scoreOf(opt) + rng() * noise;
    if(s > bestScore){ bestScore = s; best = opt; }
  }
  return best;
}

const FILES = 'abcdefgh';
function sq(r, c){ return FILES[c] + (8 - r); }

// ---- per-game adapters ----
// init(rng) -> state; step(state, rng) -> { text, done, result }, mutating state;
// snap(state) -> a plain, structured-clone-safe snapshot for drawing and sound.

const GAMES = {};

GAMES.chess = {
  label: 'chess', cols: 8, href: '../chess-sequencer/',
  players: ['white', 'black'],
  DEPTH: 2, NOISE: 25, MAX_PLIES: 160,
  init(){
    const BACK = ['rook','knight','bishop','queen','king','bishop','knight','rook'];
    const board = Array.from({length:8}, () => Array(8).fill(null));
    for(let c = 0; c < 8; c++){
      board[0][c] = {type:BACK[c], color:'black', hasMoved:false};
      board[1][c] = {type:'pawn', color:'black', hasMoved:false};
      board[6][c] = {type:'pawn', color:'white', hasMoved:false};
      board[7][c] = {type:BACK[c], color:'white', hasMoved:false};
    }
    return { board, color:'white', ep:null, ply:0, last:null, check:false };
  },
  step(st, rng){
    const E = CHESS, color = st.color, opp = E.opponent(color);
    const moves = E.getAllMoves(st.board, color, st.ep);
    const choice = pickBest(moves, m => {
      const b = E.cloneBoard(st.board);
      E.makeMove(b, m.from, m.move, 'queen');
      return chessReplyScore(b, opp, E.nextEnPassantTarget(m.from, m.move), color);
    }, rng, this.NOISE);
    const piece = st.board[choice.from.r][choice.from.c].type;
    E.makeMove(st.board, choice.from, choice.move, 'queen');
    st.ep = E.nextEnPassantTarget(choice.from, choice.move);
    st.ply++; st.color = opp;
    st.last = { from:choice.from, to:choice.move.to };
    st.check = E.isInCheck(st.board, opp);
    const replies = E.getAllMoves(st.board, opp, st.ep);
    let text = choice.move.castle ? `${color} castles ${choice.move.castle}side`
      : `${color} ${piece} ${sq(choice.from.r, choice.from.c)}${choice.move.capture ? '×' : '→'}${sq(choice.move.to.r, choice.move.to.c)}`;
    if(choice.move.promotion) text += ', promotes';
    if(replies.length === 0){
      if(st.check) return { text: text + ' · checkmate', done:true, result:`${color} wins by checkmate` };
      return { text: text + ' · stalemate', done:true, result:'drawn by stalemate' };
    }
    if(st.check) text += ' · check';
    if(onlyKings(st.board)) return { text, done:true, result:'drawn, only kings left' };
    if(st.ply >= this.MAX_PLIES){
      const m = material(st.board);
      return { text, done:true, result: m === 0 ? 'called a draw on time' : `called on time for ${m > 0 ? 'white' : 'black'}` };
    }
    return { text, done:false };
  },
  snap(st){
    return { board: st.board.map(row => row.map(p => p ? {type:p.type, color:p.color} : null)),
             last: st.last, check: st.check, toMove: st.color };
  },
};
// Exactly CHESS.minimax(b, opp, ep, 1, -Infinity, Infinity, me).score -- the engine's
// own depth-2 search seen from the root -- computed faster. The engine's depth-0 nodes
// build every legal move just to learn whether there are any (checkmate/stalemate);
// here that's an early-exit existence check. Same scores, so the same games: test.js
// compares against timelines computed through CHESS.minimax directly.
function chessReplyScore(b, opp, ep, me){
  const E = CHESS;
  const replies = E.getAllMoves(b, opp, ep);
  if(replies.length === 0) return E.isInCheck(b, opp) ? 100000 : 0;
  let best = Infinity;
  for(const m of replies){
    const g = E.cloneBoard(b);
    E.makeMove(g, m.from, m.move, 'queen');
    const s = chessHasMove(g, me, E.nextEnPassantTarget(m.from, m.move))
      ? E.evaluateBoard(g, me)
      : (E.isInCheck(g, me) ? -100000 : 0);
    if(s < best) best = s;
  }
  return best;
}
function chessHasMove(b, color, ep){
  for(let r = 0; r < 8; r++) for(let c = 0; c < 8; c++){
    const p = b[r][c];
    if(p && p.color === color && CHESS.legalMovesFor(b, r, c, ep).length) return true;
  }
  return false;
}
function onlyKings(b){
  for(const row of b) for(const p of row) if(p && p.type !== 'king') return false;
  return true;
}
function material(b){
  let m = 0;
  for(const row of b) for(const p of row) if(p) m += (p.color === 'white' ? 1 : -1) * CHESS.PIECE_VALUES[p.type];
  return m;
}

GAMES.checkers = {
  label: 'checkers', cols: 8, href: '../checker-sequencer/',
  players: ['red', 'black'],
  DEPTH: 4, NOISE: 12, MAX_PLIES: 150,
  init(){
    const board = Array.from({length:8}, () => Array(8).fill(null));
    for(let r = 0; r < 8; r++) for(let c = 0; c < 8; c++){
      if((r + c) % 2 !== 1) continue;
      if(r <= 2) board[r][c] = {color:'black', king:false};
      else if(r >= 5) board[r][c] = {color:'red', king:false};
    }
    return { board, color:'red', ply:0, last:null };
  },
  step(st, rng){
    const E = CHECKERS, color = st.color, opp = E.opponent(color);
    const turns = E.getFullTurns(st.board, color);
    if(turns.length === 0) return { text:`${color} has no move`, done:true, result:`${opp} wins, ${color} is shut out` };
    const turn = pickBest(turns, t => {
      const b = E.cloneBoard(st.board);
      E.applyTurnToBoard(b, t);
      return E.minimax(b, opp, this.DEPTH - 1, -Infinity, Infinity, color).score;
    }, rng, this.NOISE);
    const first = turn[0], lastHop = turn[turn.length - 1];
    const wasKing = st.board[first.fr][first.fc].king;
    E.applyTurnToBoard(st.board, turn);
    const crowned = !wasKing && st.board[lastHop.to.r][lastHop.to.c].king;
    st.ply++; st.color = opp;
    st.last = { path: [{r:first.fr, c:first.fc}].concat(turn.map(h => h.to)) };
    const caps = turn.filter(h => h.capture).length;
    let text = `${color} ${sq(first.fr, first.fc)}${caps ? '×' : '→'}${turn.map(h => sq(h.to.r, h.to.c)).join(caps ? '×' : '→')}`;
    if(caps > 1) text += ` · ${caps}-piece jump`;
    if(crowned) text += ' · crowned';
    if(E.getFullTurns(st.board, opp).length === 0) return { text, done:true, result:`${color} wins` };
    if(st.ply >= this.MAX_PLIES){
      const n = count(st.board, 'red') - count(st.board, 'black');
      return { text, done:true, result: n === 0 ? 'called a draw on time' : `called on time for ${n > 0 ? 'red' : 'black'}` };
    }
    return { text, done:false };
  },
  snap(st){
    return { board: st.board.map(row => row.map(p => p ? {color:p.color, king:p.king} : null)), last: st.last };
  },
};
function count(b, color){
  let n = 0;
  for(const row of b) for(const p of row) if(p && p.color === color) n++;
  return n;
}

GAMES.reversi = {
  label: 'reversi', cols: 8, href: '../reversi-sequencer/',
  players: ['black', 'white'],
  DEPTH: 3, NOISE: 30,
  init(){
    const board = Array.from({length:8}, () => Array(8).fill(null));
    board[3][3] = {color:'white'}; board[3][4] = {color:'black'};
    board[4][3] = {color:'black'}; board[4][4] = {color:'white'};
    return { board, color:'black', last:null };
  },
  step(st, rng){
    const E = REVERSI, color = st.color, opp = E.opponent(color);
    const moves = E.computeMovable(st.board, color);
    if(moves.length === 0){
      // the engine's own convention: a player with no legal placement just passes
      st.color = opp; st.last = null;
      return { text:`${color} has no move and passes`, done:false };
    }
    const m = pickBest(moves, mv => {
      const b = E.cloneBoard(st.board);
      E.applyPlacementToBoard(b, mv.r, mv.c, color, mv.flips);
      return E.minimax(b, opp, this.DEPTH - 1, -Infinity, Infinity, color).score;
    }, rng, this.NOISE);
    E.applyPlacementToBoard(st.board, m.r, m.c, color, m.flips);
    st.color = opp;
    st.last = { r:m.r, c:m.c, flips:m.flips.map(f => ({r:f.r, c:f.c})) };
    const text = `${color} ${sq(m.r, m.c)} · flips ${m.flips.length}`;
    if(E.computeMovable(st.board, opp).length === 0 && E.computeMovable(st.board, color).length === 0){
      const b = count(st.board, 'black'), w = count(st.board, 'white');
      return { text, done:true, result: b === w ? `drawn ${b}–${w}` : `${b > w ? 'black' : 'white'} wins ${Math.max(b, w)}–${Math.min(b, w)}` };
    }
    return { text, done:false };
  },
  snap(st){
    return { board: st.board.map(row => row.map(p => p ? {color:p.color} : null)), last: st.last };
  },
};

GAMES.connect4 = {
  label: 'connect four', cols: 7, href: '../connectfour-sequencer/',
  players: ['red', 'black'],
  DEPTH: 5, NOISE: 8,
  init(){
    return { board: Array.from({length:6}, () => Array(7).fill(null)), color:'red', last:null, line:null, n:0 };
  },
  step(st, rng){
    const E = CONNECT4, color = st.color, opp = E.opponent(color);
    const cols = E.computeMovable(st.board);
    // the very first drop is a free choice -- otherwise every game opens in the center
    const col = st.n === 0 ? cols[Math.floor(rng() * cols.length)] : pickBest(cols, c => {
      const b = E.cloneBoard(st.board);
      const r = E.applyDropToBoard(b, c, color);
      if(E.getWinningLine(b, r, c, color)) return 1e9;
      return E.minimax(b, opp, this.DEPTH - 1, -Infinity, Infinity, color).score;
    }, rng, this.NOISE);
    const r = E.applyDropToBoard(st.board, col, color);
    st.n++; st.color = opp;
    st.last = { r, c:col };
    const text = `${color} drops in column ${col + 1}`;
    const line = E.getWinningLine(st.board, r, col, color);
    if(line){ st.line = line; return { text: text + ' · four in a row', done:true, result:`${color} wins` }; }
    if(E.computeMovable(st.board).length === 0) return { text, done:true, result:'drawn, the board is full' };
    return { text, done:false };
  },
  snap(st){
    return { board: st.board.map(row => row.map(p => p ? {color:p.color} : null)), last: st.last, line: st.line };
  },
};

GAMES.mancala = {
  label: 'mancala', cols: 8, href: '../mancala-sequencer/',
  players: ['red', 'black'],
  DEPTH: 6, NOISE: 6, MAX_PLIES: 200,
  init(){
    const pits = Array(14).fill(4); pits[6] = 0; pits[13] = 0;
    return { pits, color:'red', trail:[], ply:0 };
  },
  step(st, rng){
    const E = MANCALA, color = st.color;
    const moves = E.ownSide(color).filter(i => st.pits[i] > 0);
    const pit = pickBest(moves, i => {
      const sim = E.simulateMove(st.pits, color, i);
      return sim.terminal ? E.terminalScore(sim.pits, color, this.DEPTH)
        : E.minimax(sim.pits, sim.nextPlayer, this.DEPTH - 1, -Infinity, Infinity, color).score;
    }, rng, this.NOISE);
    st.trail = sowTrail(st.pits, pit, color);
    const before = st.pits[E.storeOf(color)];
    const sim = E.simulateMove(st.pits, color, pit);
    st.pits = sim.pits; st.ply++;
    const n = st.trail.length;
    let text = `${color} sows ${n} seed${n === 1 ? '' : 's'} from pit ${color === 'red' ? pit + 1 : pit - 6}`;
    const banked = st.pits[E.storeOf(color)] - before;
    if(sim.terminal){
      const r = st.pits[6], b = st.pits[13];
      return { text, done:true, result: r === b ? `drawn ${r}–${b}` : `${r > b ? 'red' : 'black'} wins ${Math.max(r, b)}–${Math.min(r, b)}` };
    }
    if(sim.nextPlayer === color) text += ' · lands in the store, goes again';
    else if(banked > 1) text += ` · captures, banks ${banked}`;
    st.color = sim.nextPlayer;
    if(st.ply >= this.MAX_PLIES) return { text, done:true, result:'called on time' };
    return { text, done:false };
  },
  snap(st){ return { pits: st.pits.slice(), trail: st.trail.slice() }; },
};
// the pits a sow touches, in order -- mirrors MANCALA's own sow() (skips the
// opponent's store) without mutating anything
function sowTrail(pits, start, color){
  const skip = color === 'red' ? 13 : 6;
  const trail = [];
  let seeds = pits[start], idx = start;
  while(seeds > 0){
    idx = (idx + 1) % 14;
    if(idx === skip) continue;
    trail.push(idx); seeds--;
  }
  return trail;
}

GAMES.backgammon = {
  label: 'backgammon', cols: 13, href: '../backgammon-sequencer/',
  players: ['red', 'black'],
  // the sequencer's "medium" weights, plus a little noise so the planner's
  // greedy choices vary between games with the same dice
  WEIGHTS: { pip:1, blotPenalty:1, oppExposureWeight:0.3, homeBoard:5, barPenalty:12, noise:3 },
  MAX_TURNS: 160,
  init(){
    const points = Array(24).fill(null);
    points[23] = {color:'red', count:2};   points[12] = {color:'red', count:5};
    points[7]  = {color:'red', count:3};   points[5]  = {color:'red', count:5};
    points[0]  = {color:'black', count:2}; points[11] = {color:'black', count:5};
    points[16] = {color:'black', count:3}; points[18] = {color:'black', count:5};
    return { points, bar:{red:0, black:0}, off:{red:0, black:0}, color:'red', dice:[], moves:[], turns:0, bearOffs:0 };
  },
  step(st, rng){
    const E = BACKGAMMON, color = st.color;
    const d1 = 1 + Math.floor(rng() * 6), d2 = 1 + Math.floor(rng() * 6);
    const dice = d1 === d2 ? [d1, d1, d1, d1] : [d1, d2];
    E.setRandom(rng);
    const moves = E.planTurn({points:st.points, bar:st.bar, off:st.off}, color, dice, this.WEIGHTS);
    const offBefore = st.off[color];
    let hits = 0;
    for(const m of moves) if(E.applyMoveToState(st, m.from, m.to, color)) hits++;
    st.dice = [d1, d2]; st.moves = moves.map(m => ({from:m.from, to:m.to}));
    st.bearOffs = st.off[color] - offBefore;
    st.turns++;
    const pt = i => i === 'bar' ? 'bar' : i === 'off' ? 'off' : String(color === 'red' ? i + 1 : 24 - i);
    let text = `${color} rolls ${d1}–${d2}: ` + (moves.length ? moves.map(m => `${pt(m.from)}/${pt(m.to)}`).join(' ') : 'no move');
    if(hits) text += hits > 1 ? ` · ${hits} hits` : ' · hit';
    if(st.off[color] === 15){
      const opp = E.opponent(color);
      const kind = st.off[opp] > 0 ? 'wins' : 'wins a gammon';
      return { text, done:true, result:`${color} ${kind}` };
    }
    st.color = E.opponent(color);
    if(st.turns >= this.MAX_TURNS) return { text, done:true, result:'called on time' };
    return { text, done:false };
  },
  snap(st){
    return { points: st.points.map(p => p ? {color:p.color, count:p.count} : null),
             bar: {...st.bar}, off: {...st.off}, dice: st.dice.slice(), moves: st.moves.slice(),
             mover: st.color, bearOffs: st.bearOffs };
  },
};

const ORDER = ['chess', 'checkers', 'reversi', 'connect4', 'mancala', 'backgammon'];

function moveMs(game){ return game.cols * STEP_MS + SWEEP_TAIL_MS; }
function slotIndexAt(ms){ return Math.floor(ms / SLOT_MS); }
function gameIdForSlot(slotIndex){ return ORDER[((slotIndex % 6) + 6) % 6]; }

// The full timeline of one 10-minute set: every event (a new game's opening board, a
// move, a replay of a finished board) with its offset from the start of the set.
// onGame(events) is called as each game finishes computing, so a listener tuning in
// early in a set doesn't wait on games that haven't happened yet.
function buildSlot(slotIndex, onGame){
  const id = gameIdForSlot(slotIndex), game = GAMES[id];
  const interval = moveMs(game);
  const all = [];
  let t = 0, gameNo = 0;
  while(t < SLOT_MS){
    gameNo++;
    const rng = mulberry32(seedFor(slotIndex, gameNo));
    const st = game.init(rng);
    const events = [{ t, kind:'start', gameNo, move:0, text:'opening position', snap:game.snap(st) }];
    t += interval;
    let move = 0, res = null;
    while(t < SLOT_MS){
      res = game.step(st, rng);
      move++;
      events.push({ t, kind:'move', gameNo, move, text:res.text, result:res.done ? res.result : null, snap:game.snap(st) });
      t += interval;
      if(res.done) break;
    }
    if(res && res.done){
      const last = events[events.length - 1];
      for(let k = 0; k < REPLAYS && t < SLOT_MS; k++){
        events.push({ t, kind:'replay', gameNo, move, text:res.result, result:res.result, snap:last.snap });
        t += interval;
      }
      t += INTERMISSION_MS;
    }
    for(const e of events) all.push(e);
    if(onGame) onGame(events);
  }
  return all;
}

return { SLOT_MS, STEP_MS, SWEEP_TAIL_MS, GAMES, ORDER, moveMs, slotIndexAt, gameIdForSlot, buildSlot, chessReplyScore };
})();
