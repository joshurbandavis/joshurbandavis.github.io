// The House Band's rules engines. Each block below is a verbatim copy of the
// computer-opponent worker source from the matching *-sequencer/index.html (only the
// worker's self.onmessage handler is dropped, and backgammon's Math.random noise is
// routed through a seeded generator), wrapped in its own scope so the six engines'
// shared function names (minimax, cloneBoard, opponent...) don't collide. If a
// sequencer's rules change, its copy here needs the same change.
// The one intentional deviation is a faster chess isSquareAttacked; see its comment.
// Loaded by station-worker.js via importScripts, and by test.js under Node.

var CHESS = (function(){
"use strict";
var SIZE = 8;
var KNIGHT_DELTAS = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
var KING_DELTAS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
var BISHOP_DIRS = [[-1,-1],[-1,1],[1,-1],[1,1]];
var ROOK_DIRS = [[-1,0],[1,0],[0,-1],[0,1]];
var QUEEN_DIRS = BISHOP_DIRS.concat(ROOK_DIRS);

function inBounds(r,c){ return r>=0 && r<SIZE && c>=0 && c<SIZE; }
function opponent(color){ return color==='white' ? 'black' : 'white'; }

function cloneBoard(b){
  return b.map(row => row.map(p => p ? {type:p.type, color:p.color, hasMoved:p.hasMoved} : null));
}

function attacksFrom(b,r,c){
  const piece = b[r][c]; if(!piece) return [];
  const res = [];
  if(piece.type==='pawn'){
    const dir = piece.color==='white' ? -1 : 1;
    for(const dc of [-1,1]){
      const nr=r+dir, nc=c+dc;
      if(inBounds(nr,nc)) res.push({r:nr,c:nc});
    }
  } else if(piece.type==='knight'){
    for(const [dr,dc] of KNIGHT_DELTAS){
      const nr=r+dr, nc=c+dc;
      if(inBounds(nr,nc)) res.push({r:nr,c:nc});
    }
  } else if(piece.type==='king'){
    for(const [dr,dc] of KING_DELTAS){
      const nr=r+dr, nc=c+dc;
      if(inBounds(nr,nc)) res.push({r:nr,c:nc});
    }
  } else {
    const dirs = piece.type==='bishop' ? BISHOP_DIRS : piece.type==='rook' ? ROOK_DIRS : QUEEN_DIRS;
    for(const [dr,dc] of dirs){
      let nr=r+dr, nc=c+dc;
      while(inBounds(nr,nc)){
        res.push({r:nr,c:nc});
        if(b[nr][nc]) break;
        nr+=dr; nc+=dc;
      }
    }
  }
  return res;
}

// The one deliberate change from the sequencer's copy: isSquareAttacked looks
// outward from the target square (knight hops, pawn diagonals, king steps, sliding
// rays) instead of generating every enemy piece's attack list and searching it. Same
// answer for every position -- test.js checks it against the original across whole
// games -- but several times faster, and chess search spends most of its time here.
// The station has to compute a set's moves quickly for a listener tuning in late.
function isSquareAttackedSlow(b,tr,tc,byColor){
  for(let r=0;r<SIZE;r++) for(let c=0;c<SIZE;c++){
    const p = b[r][c];
    if(p && p.color===byColor && attacksFrom(b,r,c).some(sq=>sq.r===tr && sq.c===tc)) return true;
  }
  return false;
}
function isSquareAttacked(b,tr,tc,byColor){
  const at = (r,c,type) => { const p = b[r][c]; return p && p.color===byColor && p.type===type; };
  for(const [dr,dc] of KNIGHT_DELTAS){
    const r=tr+dr, c=tc+dc;
    if(inBounds(r,c) && at(r,c,'knight')) return true;
  }
  for(const [dr,dc] of KING_DELTAS){
    const r=tr+dr, c=tc+dc;
    if(inBounds(r,c) && at(r,c,'king')) return true;
  }
  const pr = tr + (byColor==='white' ? 1 : -1); // a pawn attacks from one row "behind" the target
  for(const dc of [-1,1]){
    const c=tc+dc;
    if(inBounds(pr,c) && at(pr,c,'pawn')) return true;
  }
  for(const [dirs, type] of [[ROOK_DIRS,'rook'],[BISHOP_DIRS,'bishop']]){
    for(const [dr,dc] of dirs){
      let r=tr+dr, c=tc+dc;
      while(inBounds(r,c)){
        const p = b[r][c];
        if(p){
          if(p.color===byColor && (p.type===type || p.type==='queen')) return true;
          break;
        }
        r+=dr; c+=dc;
      }
    }
  }
  return false;
}

function findKing(b,color){
  for(let r=0;r<SIZE;r++) for(let c=0;c<SIZE;c++){
    const p = b[r][c];
    if(p && p.type==='king' && p.color===color) return {r,c};
  }
  return null;
}

function isInCheck(b,color){
  const k = findKing(b,color);
  if(!k) return false;
  return isSquareAttacked(b,k.r,k.c,opponent(color));
}

function pseudoMovesFor(b,r,c,epTarget){
  const piece = b[r][c]; if(!piece) return [];
  const res = [];
  const opp = opponent(piece.color);

  if(piece.type==='pawn'){
    const dir = piece.color==='white' ? -1 : 1;
    const startRow = piece.color==='white' ? 6 : 1;
    const lastRow = piece.color==='white' ? 0 : 7;
    const oneR = r+dir;
    if(inBounds(oneR,c) && b[oneR][c]===null){
      res.push({to:{r:oneR,c}, promotion: oneR===lastRow});
      const twoR = r+2*dir;
      if(!piece.hasMoved && r===startRow && b[twoR][c]===null){
        res.push({to:{r:twoR,c}, doubleStep:true});
      }
    }
    for(const dc of [-1,1]){
      const nr=oneR, nc=c+dc;
      if(!inBounds(nr,nc)) continue;
      const target = b[nr][nc];
      if(target && target.color===opp){
        res.push({to:{r:nr,c:nc}, capture:true, promotion: nr===lastRow});
      } else if(!target && epTarget && epTarget.r===nr && epTarget.c===nc){
        res.push({to:{r:nr,c:nc}, capture:true, enPassant:true});
      }
    }
  } else if(piece.type==='knight'){
    for(const [dr,dc] of KNIGHT_DELTAS){
      const nr=r+dr, nc=c+dc;
      if(!inBounds(nr,nc)) continue;
      const target = b[nr][nc];
      if(!target) res.push({to:{r:nr,c:nc}});
      else if(target.color===opp) res.push({to:{r:nr,c:nc}, capture:true});
    }
  } else if(piece.type==='king'){
    for(const [dr,dc] of KING_DELTAS){
      const nr=r+dr, nc=c+dc;
      if(!inBounds(nr,nc)) continue;
      const target = b[nr][nc];
      if(!target) res.push({to:{r:nr,c:nc}});
      else if(target.color===opp) res.push({to:{r:nr,c:nc}, capture:true});
    }
    if(!piece.hasMoved && !isSquareAttacked(b,r,c,opp)){
      const rookK = b[r][7];
      if(rookK && rookK.type==='rook' && rookK.color===piece.color && !rookK.hasMoved
         && b[r][5]===null && b[r][6]===null
         && !isSquareAttacked(b,r,5,opp) && !isSquareAttacked(b,r,6,opp)){
        res.push({to:{r,c:6}, castle:'king'});
      }
      const rookQ = b[r][0];
      if(rookQ && rookQ.type==='rook' && rookQ.color===piece.color && !rookQ.hasMoved
         && b[r][1]===null && b[r][2]===null && b[r][3]===null
         && !isSquareAttacked(b,r,3,opp) && !isSquareAttacked(b,r,2,opp)){
        res.push({to:{r,c:2}, castle:'queen'});
      }
    }
  } else {
    const dirs = piece.type==='bishop' ? BISHOP_DIRS : piece.type==='rook' ? ROOK_DIRS : QUEEN_DIRS;
    for(const [dr,dc] of dirs){
      let nr=r+dr, nc=c+dc;
      while(inBounds(nr,nc)){
        const target = b[nr][nc];
        if(!target){ res.push({to:{r:nr,c:nc}}); }
        else { if(target.color===opp) res.push({to:{r:nr,c:nc}, capture:true}); break; }
        nr+=dr; nc+=dc;
      }
    }
  }
  return res;
}

function makeMove(b,from,move,promoType){
  const piece = b[from.r][from.c];
  b[from.r][from.c] = null;

  if(move.enPassant){
    b[from.r][move.to.c] = null;
  }

  if(move.castle){
    const row = from.r;
    if(move.castle==='king'){
      const rook = b[row][7];
      b[row][7] = null; b[row][5] = rook;
      if(rook) rook.hasMoved = true;
    } else {
      const rook = b[row][0];
      b[row][0] = null; b[row][3] = rook;
      if(rook) rook.hasMoved = true;
    }
  }

  piece.hasMoved = true;
  if(move.promotion){
    b[move.to.r][move.to.c] = {type: promoType || 'queen', color: piece.color, hasMoved:true};
  } else {
    b[move.to.r][move.to.c] = piece;
  }
}

function legalMovesFor(b,r,c,epTarget){
  const piece = b[r][c]; if(!piece) return [];
  const pseudo = pseudoMovesFor(b,r,c,epTarget);
  const legal = [];
  for(const mv of pseudo){
    const test = cloneBoard(b);
    makeMove(test, {r,c}, mv, 'queen');
    if(!isInCheck(test, piece.color)) legal.push(mv);
  }
  return legal;
}

function computeAllLegal(b,color,epTarget){
  const pieces = [];
  for(let r=0;r<SIZE;r++) for(let c=0;c<SIZE;c++){
    const p = b[r][c];
    if(p && p.color===color){
      const moves = legalMovesFor(b,r,c,epTarget);
      if(moves.length) pieces.push({r,c,moves});
    }
  }
  return pieces;
}

function nextEnPassantTarget(from, move){
  return move.doubleStep ? {r:(from.r+move.to.r)/2, c:from.c} : null;
}

// Standard "simplified evaluation function" piece-square tables (the same widely-used
// public constants found in countless tutorial chess engines) -- tables are written
// from White's point of view and flipped for Black. They nudge the search toward
// normal-looking chess (knights toward the center, king tucked in early) on top of
// pure material counting, which alone plays a very flat, oddly passive game.
const PIECE_VALUES = { pawn:100, knight:320, bishop:330, rook:500, queen:900, king:0 };
const TABLES = {
  pawn: [
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0,
  ],
  knight: [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50,
  ],
  bishop: [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20,
  ],
  rook: [
      0,  0,  0,  0,  0,  0,  0,  0,
      5, 10, 10, 10, 10, 10, 10,  5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
      0,  0,  0,  5,  5,  0,  0,  0,
  ],
  queen: [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20,
  ],
  king: [
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20,
  ],
};
function evaluateBoard(b, aiColor){
  let score = 0;
  for(let r=0;r<SIZE;r++) for(let c=0;c<SIZE;c++){
    const p = b[r][c];
    if(!p) continue;
    const tableRow = p.color==='white' ? r : SIZE-1-r; // tables are drawn from White's side
    let val = PIECE_VALUES[p.type] + TABLES[p.type][tableRow*SIZE + c];
    score += (p.color===aiColor) ? val : -val;
  }
  return score;
}

function getAllMoves(b, color, epTarget){
  const movable = computeAllLegal(b, color, epTarget);
  const moves = [];
  for(const entry of movable){
    for(const mv of entry.moves){
      moves.push({ from:{r:entry.r, c:entry.c}, move:mv });
    }
  }
  // captures first -- a cheap move-ordering pass that meaningfully improves
  // alpha-beta pruning without needing a full MVV-LVA table
  moves.sort((a,b2) => (b2.move.capture?1:0) - (a.move.capture?1:0));
  return moves;
}

function minimax(b, color, epTarget, depth, alpha, beta, aiColor){
  const moves = getAllMoves(b, color, epTarget);
  if(moves.length===0){
    if(isInCheck(b, color)){
      // checkmate: the color to move has lost
      return { score: color===aiColor ? -100000 : 100000, move:null };
    }
    return { score: 0, move:null }; // stalemate is a draw
  }
  if(depth===0) return { score: evaluateBoard(b, aiColor), move:null };

  const opp = opponent(color);
  let bestMove = moves[0];
  if(color===aiColor){
    let best = -Infinity;
    for(const m of moves){
      const clone = cloneBoard(b);
      makeMove(clone, m.from, m.move, 'queen');
      const nextEp = nextEnPassantTarget(m.from, m.move);
      const result = minimax(clone, opp, nextEp, depth-1, alpha, beta, aiColor);
      if(result.score > best){ best = result.score; bestMove = m; }
      alpha = Math.max(alpha, best);
      if(alpha>=beta) break;
    }
    return {score:best, move:bestMove};
  } else {
    let best = Infinity;
    for(const m of moves){
      const clone = cloneBoard(b);
      makeMove(clone, m.from, m.move, 'queen');
      const nextEp = nextEnPassantTarget(m.from, m.move);
      const result = minimax(clone, opp, nextEp, depth-1, alpha, beta, aiColor);
      if(result.score < best){ best = result.score; bestMove = m; }
      beta = Math.min(beta, best);
      if(alpha>=beta) break;
    }
    return {score:best, move:bestMove};
  }
}


return { SIZE, opponent, cloneBoard, isInCheck, makeMove, getAllMoves, minimax, nextEnPassantTarget, PIECE_VALUES, isSquareAttacked, isSquareAttackedSlow, legalMovesFor, evaluateBoard };
})();

var CHECKERS = (function(){
"use strict";
var SIZE = 8;
function inBounds(r,c){ return r>=0 && r<SIZE && c>=0 && c<SIZE; }
function opponent(color){ return color==='red' ? 'black' : 'red'; }

function getCapturesFrom(b,r,c){
  const piece = b[r][c]; if(!piece) return [];
  const res = [];
  const dirsR = piece.king ? [-1,1] : (piece.color==='red' ? [-1] : [1]);
  for(const dr of dirsR) for(const dc of [-1,1]){
    const mr=r+dr, mc=c+dc, lr=r+2*dr, lc=c+2*dc;
    if(!inBounds(lr,lc)) continue;
    const mid = inBounds(mr,mc) ? b[mr][mc] : null;
    if(mid && mid.color===opponent(piece.color) && b[lr][lc]===null){
      res.push({to:{r:lr,c:lc}, captured:{r:mr,c:mc}});
    }
  }
  return res;
}
function getRegularMovesFrom(b,r,c){
  const piece = b[r][c]; if(!piece) return [];
  const dirsR = piece.king ? [-1,1] : (piece.color==='red' ? [-1] : [1]);
  const res = [];
  for(const dr of dirsR) for(const dc of [-1,1]){
    const nr=r+dr, nc=c+dc;
    if(inBounds(nr,nc) && b[nr][nc]===null) res.push({to:{r:nr,c:nc}});
  }
  return res;
}
function computeMovable(b,color){
  const withCaptures = [];
  const withMoves = [];
  for(let r=0;r<SIZE;r++) for(let c=0;c<SIZE;c++){
    const p = b[r][c];
    if(p && p.color===color){
      const caps = getCapturesFrom(b,r,c);
      if(caps.length){
        withCaptures.push({r,c,moves:caps.map(m=>({to:m.to,capture:m.captured}))});
      } else {
        const mv = getRegularMovesFrom(b,r,c);
        if(mv.length) withMoves.push({r,c,moves:mv.map(m=>({to:m.to,capture:null}))});
      }
    }
  }
  if(withCaptures.length) return {mustCapture:true, pieces:withCaptures};
  return {mustCapture:false, pieces:withMoves};
}

function cloneBoard(b){
  return b.map(row => row.map(p => p ? {color:p.color, king:p.king} : null));
}
// mutates b in place; mirrors the main thread's applyHopToBoard exactly (see
// checker-sequencer's own copy for the canonical version -- kept identical on
// purpose, see the file-level comment above about why this has to be duplicated)
function applyHopToBoard(b, fr, fc, move){
  const piece = b[fr][fc];
  b[fr][fc] = null;
  if(move.capture) b[move.capture.r][move.capture.c] = null;
  b[move.to.r][move.to.c] = piece;
  let crowned = false;
  if(!piece.king){
    if((piece.color==='red' && move.to.r===0) || (piece.color==='black' && move.to.r===SIZE-1)){
      piece.king = true; crowned = true;
    }
  }
  return crowned;
}

// A "turn" is one or more hops (a mandatory-capture chain counts as a single turn,
// same as the real game) -- the search tree branches on complete turns, not hops,
// so it alternates players correctly.
function getFullTurns(b, color){
  const mv = computeMovable(b, color);
  const turns = [];
  if(mv.mustCapture){
    for(const entry of mv.pieces) for(const move of entry.moves){
      extendChain(b, entry.r, entry.c, move, [{fr:entry.r,fc:entry.c,to:move.to,capture:move.capture}], turns);
    }
  } else {
    for(const entry of mv.pieces) for(const move of entry.moves){
      turns.push([{fr:entry.r,fc:entry.c,to:move.to,capture:move.capture}]);
    }
  }
  return turns;
}
function extendChain(b, fr, fc, move, stepsSoFar, turns){
  const clone = cloneBoard(b);
  const crowned = applyHopToBoard(clone, fr, fc, move);
  if(move.capture && !crowned){
    const further = getCapturesFrom(clone, move.to.r, move.to.c);
    if(further.length){
      for(const f of further){
        extendChain(clone, move.to.r, move.to.c, {to:f.to,capture:f.captured},
          stepsSoFar.concat([{fr:move.to.r,fc:move.to.c,to:f.to,capture:f.captured}]), turns);
      }
      return;
    }
  }
  turns.push(stepsSoFar);
}
function applyTurnToBoard(b, turn){
  for(const step of turn) applyHopToBoard(b, step.fr, step.fc, {to:step.to, capture:step.capture});
}

const MEN_VALUE = 100, KING_VALUE = 160;
function evaluateBoard(b, aiColor){
  let score = 0;
  for(let r=0;r<SIZE;r++) for(let c=0;c<SIZE;c++){
    const p = b[r][c];
    if(!p) continue;
    let val = p.king ? KING_VALUE : MEN_VALUE;
    if(!p.king){
      val += (p.color==='red' ? (SIZE-1-r) : r) * 4; // advancement toward promotion
    }
    if(c>=2 && c<=5) val += 3; // center-column control
    if(!p.king && ((p.color==='red' && r===7) || (p.color==='black' && r===0))) val += 6; // back-row guard
    score += (p.color===aiColor) ? val : -val;
  }
  return score;
}

function minimax(b, color, depth, alpha, beta, aiColor){
  const turns = getFullTurns(b, color);
  if(turns.length===0){
    // the color to move has no turns available, so that color loses
    return { score: color===aiColor ? -100000 : 100000, turn:null };
  }
  if(depth===0) return { score: evaluateBoard(b, aiColor), turn:null };

  const opp = opponent(color);
  let bestTurn = turns[0];
  if(color===aiColor){
    let best = -Infinity;
    for(const turn of turns){
      const clone = cloneBoard(b);
      applyTurnToBoard(clone, turn);
      const result = minimax(clone, opp, depth-1, alpha, beta, aiColor);
      if(result.score > best){ best = result.score; bestTurn = turn; }
      alpha = Math.max(alpha, best);
      if(alpha>=beta) break;
    }
    return {score:best, turn:bestTurn};
  } else {
    let best = Infinity;
    for(const turn of turns){
      const clone = cloneBoard(b);
      applyTurnToBoard(clone, turn);
      const result = minimax(clone, opp, depth-1, alpha, beta, aiColor);
      if(result.score < best){ best = result.score; bestTurn = turn; }
      beta = Math.min(beta, best);
      if(alpha>=beta) break;
    }
    return {score:best, turn:bestTurn};
  }
}


return { SIZE, opponent, cloneBoard, getFullTurns, applyTurnToBoard, minimax };
})();

var REVERSI = (function(){
"use strict";
var SIZE = 8;
var DIRS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
function inBounds(r,c){ return r>=0 && r<SIZE && c>=0 && c<SIZE; }
function opponent(color){ return color==='white' ? 'black' : 'white'; }

// The squares a placement at (r,c) would flip, in every outflanked direction at once
// (a legal Othello move can outflank several lines simultaneously) -- returns [] if
// (r,c) isn't a legal move for color.
function getFlipsForMove(b,r,c,color){
  if(b[r][c] !== null) return [];
  const opp = opponent(color);
  let flips = [];
  for(const [dr,dc] of DIRS){
    let nr=r+dr, nc=c+dc;
    const line = [];
    while(inBounds(nr,nc) && b[nr][nc] && b[nr][nc].color===opp){
      line.push({r:nr,c:nc});
      nr+=dr; nc+=dc;
    }
    if(line.length && inBounds(nr,nc) && b[nr][nc] && b[nr][nc].color===color){
      flips = flips.concat(line);
    }
  }
  return flips;
}

function computeMovable(b,color){
  const moves = [];
  for(let r=0;r<SIZE;r++) for(let c=0;c<SIZE;c++){
    if(b[r][c]!==null) continue;
    const flips = getFlipsForMove(b,r,c,color);
    if(flips.length) moves.push({r,c,flips});
  }
  return moves;
}

function cloneBoard(b){
  return b.map(row => row.map(p => p ? {color:p.color} : null));
}
// mutates b in place; mirrors the main thread's applyPlacementToBoard exactly (see
// reversi-sequencer's own copy for the canonical version -- kept identical on
// purpose, see the file-level comment above about why this has to be duplicated)
function applyPlacementToBoard(b, r, c, color, flips){
  b[r][c] = {color};
  for(const f of flips) b[f.r][f.c].color = color;
}

// Corners can never be flipped once taken, so they're worth far more than any other
// square; the squares diagonally/orthogonally adjacent to a corner are the classic
// "X/C-square" trap -- occupying one early often just hands the opponent the corner,
// so they get a standing penalty. Mobility (legal-move-count difference) matters more
// than raw disc count for most of the game -- restricting the opponent's options is
// usually stronger than grabbing discs -- so disc count is weighted lightly early and
// more heavily as the board fills up and the endgame count starts to matter directly.
const CORNERS = [[0,0],[0,7],[7,0],[7,7]];
const RISKY = [[0,1],[1,0],[1,1],[0,6],[1,7],[1,6],[6,0],[7,1],[6,1],[6,7],[7,6],[6,6]];

function evaluateBoard(b, aiColor){
  let discDiff = 0, cornerDiff = 0, riskyDiff = 0, empties = 0;
  for(let r=0;r<SIZE;r++) for(let c=0;c<SIZE;c++){
    const p = b[r][c];
    if(!p){ empties++; continue; }
    discDiff += (p.color===aiColor ? 1 : -1);
  }
  for(const [r,c] of CORNERS){
    const p = b[r][c];
    if(p) cornerDiff += (p.color===aiColor ? 1 : -1);
  }
  for(const [r,c] of RISKY){
    const p = b[r][c];
    if(p) riskyDiff += (p.color===aiColor ? -1 : 1);
  }
  const mobility = computeMovable(b, aiColor).length - computeMovable(b, opponent(aiColor)).length;
  const phase = (SIZE*SIZE - empties) / (SIZE*SIZE); // 0 = opening, 1 = board full
  return cornerDiff*800 + riskyDiff*40 + mobility*15 + discDiff*(8 + phase*50);
}

function minimax(b, color, depth, alpha, beta, aiColor){
  const moves = computeMovable(b, color);
  if(moves.length===0){
    const oppMoves = computeMovable(b, opponent(color));
    if(oppMoves.length===0){
      // neither side can move -- the game is over; score by final disc count
      let diff = 0;
      for(let r=0;r<SIZE;r++) for(let c=0;c<SIZE;c++){
        const p = b[r][c]; if(p) diff += (p.color===aiColor ? 1 : -1);
      }
      return { score: diff>0 ? 100000+diff : diff<0 ? -100000+diff : 0, move:null };
    }
    // this color has no move -- turn passes to the opponent without changing the board
    return minimax(b, opponent(color), depth, alpha, beta, aiColor);
  }
  if(depth===0) return { score: evaluateBoard(b, aiColor), move:null };

  const opp = opponent(color);
  let bestMove = moves[0];
  if(color===aiColor){
    let best = -Infinity;
    for(const m of moves){
      const clone = cloneBoard(b);
      applyPlacementToBoard(clone, m.r, m.c, color, m.flips);
      const result = minimax(clone, opp, depth-1, alpha, beta, aiColor);
      if(result.score > best){ best = result.score; bestMove = m; }
      alpha = Math.max(alpha, best);
      if(alpha>=beta) break;
    }
    return {score:best, move:bestMove};
  } else {
    let best = Infinity;
    for(const m of moves){
      const clone = cloneBoard(b);
      applyPlacementToBoard(clone, m.r, m.c, color, m.flips);
      const result = minimax(clone, opp, depth-1, alpha, beta, aiColor);
      if(result.score < best){ best = result.score; bestMove = m; }
      beta = Math.min(beta, best);
      if(alpha>=beta) break;
    }
    return {score:best, move:bestMove};
  }
}


return { SIZE, opponent, cloneBoard, computeMovable, applyPlacementToBoard, minimax };
})();

var CONNECT4 = (function(){
"use strict";
var COLS = 7, ROWS = 6;
function opponent(color){ return color==='red' ? 'black' : 'red'; }
function inBoundsC4(r,c){ return r>=0 && r<ROWS && c>=0 && c<COLS; }

function dropRowFor(b, col){
  for(let r=ROWS-1; r>=0; r--) if(b[r][col]===null) return r;
  return -1;
}
function computeMovable(b){
  const cols = [];
  for(let c=0;c<COLS;c++) if(dropRowFor(b,c)!==-1) cols.push(c);
  return cols;
}
function cloneBoard(b){
  return b.map(row => row.map(p => p ? {color:p.color} : null));
}
// mutates b in place, returns the row the disc landed on (gravity always fills the
// lowest empty cell) -- mirrors the main thread's applyDropToBoard exactly
function applyDropToBoard(b, col, color){
  const r = dropRowFor(b, col);
  if(r===-1) return -1;
  b[r][col] = {color};
  return r;
}

// checks the 4 line directions (horizontal, vertical, both diagonals) through the
// square that was JUST played -- a new move is the only thing that can complete a
// line, so this only ever needs to check outward from (r,c), never the whole board
function getWinningLine(b, r, c, color){
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for(const [dr,dc] of dirs){
    const line = [{r,c}];
    for(const sign of [1,-1]){
      let nr=r+dr*sign, nc=c+dc*sign;
      while(inBoundsC4(nr,nc) && b[nr][nc] && b[nr][nc].color===color){
        line.push({r:nr,c:nc}); nr+=dr*sign; nc+=dc*sign;
      }
    }
    if(line.length>=4) return line;
  }
  return null;
}

// The classic Connect Four window-scoring heuristic: score every possible 4-length
// line on the board by how many of each color occupy it (a mixed window is dead --
// neither side can complete it -- so it contributes nothing either way).
function scoreWindow(cells, aiColor){
  let ai=0, opp=0, empty=0;
  for(const cell of cells){
    if(!cell) empty++;
    else if(cell.color===aiColor) ai++;
    else opp++;
  }
  if(ai>0 && opp>0) return 0;
  if(ai===3 && empty===1) return 50;
  if(ai===2 && empty===2) return 10;
  if(opp===3 && empty===1) return -60; // slightly out-weight extending your own line --
  if(opp===2 && empty===2) return -10; // blocking a real threat matters a bit more
  return 0;
}
function evaluateBoard(b, aiColor){
  let score = 0;
  for(let r=0;r<ROWS;r++){ // center-column control: most winning lines pass through it
    const p = b[r][3];
    if(p) score += (p.color===aiColor ? 6 : -6);
  }
  for(let r=0;r<ROWS;r++) for(let c=0;c<=COLS-4;c++){
    score += scoreWindow([b[r][c],b[r][c+1],b[r][c+2],b[r][c+3]], aiColor);
  }
  for(let c=0;c<COLS;c++) for(let r=0;r<=ROWS-4;r++){
    score += scoreWindow([b[r][c],b[r+1][c],b[r+2][c],b[r+3][c]], aiColor);
  }
  for(let r=0;r<=ROWS-4;r++) for(let c=0;c<=COLS-4;c++){
    score += scoreWindow([b[r][c],b[r+1][c+1],b[r+2][c+2],b[r+3][c+3]], aiColor);
  }
  for(let r=0;r<=ROWS-4;r++) for(let c=3;c<COLS;c++){
    score += scoreWindow([b[r][c],b[r+1][c-1],b[r+2][c-2],b[r+3][c-3]], aiColor);
  }
  return score;
}

function minimax(b, color, depth, alpha, beta, aiColor){
  const cols = computeMovable(b);
  if(cols.length===0) return { score: 0, col: null }; // board full -- a draw
  if(depth===0) return { score: evaluateBoard(b, aiColor), col: null };

  // center-out move ordering: classic Connect Four trick, and it happens to line up
  // with which moves are usually strongest anyway, so it improves pruning a lot
  const ordered = [...cols].sort((a,b2) => Math.abs(a-3) - Math.abs(b2-3));
  const opp = opponent(color);
  let bestCol = ordered[0];

  if(color===aiColor){
    let best = -Infinity;
    for(const col of ordered){
      const clone = cloneBoard(b);
      const r = applyDropToBoard(clone, col, color);
      const winLine = getWinningLine(clone, r, col, color);
      const result = winLine ? { score: 100000 + depth } : minimax(clone, opp, depth-1, alpha, beta, aiColor);
      if(result.score > best){ best = result.score; bestCol = col; }
      alpha = Math.max(alpha, best);
      if(alpha>=beta) break;
    }
    return {score:best, col:bestCol};
  } else {
    let best = Infinity;
    for(const col of ordered){
      const clone = cloneBoard(b);
      const r = applyDropToBoard(clone, col, color);
      const winLine = getWinningLine(clone, r, col, color);
      const result = winLine ? { score: -100000 - depth } : minimax(clone, opp, depth-1, alpha, beta, aiColor);
      if(result.score < best){ best = result.score; bestCol = col; }
      beta = Math.min(beta, best);
      if(alpha>=beta) break;
    }
    return {score:best, col:bestCol};
  }
}


return { ROWS, COLS, opponent, cloneBoard, computeMovable, applyDropToBoard, getWinningLine, minimax };
})();

var MANCALA = (function(){
"use strict";
// pit layout: 0-5 = red's pits, 6 = red's store, 7-12 = black's pits, 13 = black's
// store. Sowing goes 0->1->...->5->6->7->...->12->13->0->... (counter-clockwise),
// skipping the CURRENT sower's opponent's store.
function opponent(color){ return color==='red' ? 'black' : 'red'; }
function ownSide(color){ return color==='red' ? [0,1,2,3,4,5] : [7,8,9,10,11,12]; }
function storeOf(color){ return color==='red' ? 6 : 13; }
function isSideEmpty(pits, side){ return side.every(i=>pits[i]===0); }

function sow(pits, startIdx, color){
  let seeds = pits[startIdx];
  pits[startIdx] = 0;
  let idx = startIdx;
  const skipIdx = color==='red' ? 13 : 6;
  while(seeds>0){
    idx = (idx+1) % 14;
    if(idx===skipIdx) continue;
    pits[idx]++;
    seeds--;
  }
  return idx;
}

function sweepRemaining(pits){
  const redTotal = [0,1,2,3,4,5].reduce((s,i)=>s+pits[i],0);
  const blackTotal = [7,8,9,10,11,12].reduce((s,i)=>s+pits[i],0);
  for(const i of [0,1,2,3,4,5]) pits[i]=0;
  for(const i of [7,8,9,10,11,12]) pits[i]=0;
  pits[6]+=redTotal; pits[13]+=blackTotal;
}

function isTerminal(pits){
  return isSideEmpty(pits,[0,1,2,3,4,5]) || isSideEmpty(pits,[7,8,9,10,11,12]);
}

// pure -- clones before mutating, so the search tree can branch freely. Returns the
// resulting pits, who moves next (null if the game just ended), and whether it ended.
function simulateMove(pits, color, pitIndex){
  const p = pits.slice();
  const lastIdx = sow(p, pitIndex, color);
  const store = storeOf(color);
  let extraTurn = false;
  if(lastIdx===store){
    extraTurn = true;
  } else if(ownSide(color).includes(lastIdx) && p[lastIdx]===1){
    const opp = 12 - lastIdx;
    if(p[opp] > 0){ p[store] += p[lastIdx] + p[opp]; p[lastIdx] = 0; p[opp] = 0; }
  }
  let terminal = false;
  if(isTerminal(p)){ sweepRemaining(p); terminal = true; }
  return { pits: p, nextPlayer: terminal ? null : (extraTurn ? color : opponent(color)), terminal };
}

function terminalScore(p, aiColor, depth){
  const diff = p[storeOf(aiColor)] - p[storeOf(opponent(aiColor))];
  if(diff>0) return 100000+depth;
  if(diff<0) return -100000-depth;
  return 0;
}

// Store difference dominates (it's the actual win condition), seeds still in play add
// a light material tiebreak, and a small "tempo" term rewards keeping seeds in the
// pits closest to your own store -- those are the ones most likely to reach it (or
// set up a capture) soonest.
function evaluateBoard(pits, aiColor){
  const oppColor = opponent(aiColor);
  const myStore = pits[storeOf(aiColor)], oppStore = pits[storeOf(oppColor)];
  let myInPlay=0, oppInPlay=0, tempo=0;
  for(const i of ownSide(oppColor)) oppInPlay += pits[i];
  const mySide = ownSide(aiColor);
  for(let k=0;k<mySide.length;k++){
    myInPlay += pits[mySide[k]];
    tempo += pits[mySide[k]] * (k+1) * 0.3; // k+1: nearer the store (later in sowing
                                             // order) counts for more
  }
  return (myStore-oppStore)*12 + (myInPlay-oppInPlay)*1 + tempo;
}

function minimax(pits, color, depth, alpha, beta, aiColor){
  if(isTerminal(pits)){
    const p = pits.slice(); sweepRemaining(p);
    return { score: terminalScore(p, aiColor, depth), move:null };
  }
  if(depth===0) return { score: evaluateBoard(pits, aiColor), move:null };

  const moves = ownSide(color).filter(i=>pits[i]>0);
  let bestMove = moves[0];
  if(color===aiColor){
    let best = -Infinity;
    for(const m of moves){
      const sim = simulateMove(pits, color, m);
      const result = sim.terminal ? { score: terminalScore(sim.pits, aiColor, depth) }
        : minimax(sim.pits, sim.nextPlayer, depth-1, alpha, beta, aiColor);
      if(result.score > best){ best = result.score; bestMove = m; }
      alpha = Math.max(alpha, best);
      if(alpha>=beta) break;
    }
    return {score:best, move:bestMove};
  } else {
    let best = Infinity;
    for(const m of moves){
      const sim = simulateMove(pits, color, m);
      const result = sim.terminal ? { score: terminalScore(sim.pits, aiColor, depth) }
        : minimax(sim.pits, sim.nextPlayer, depth-1, alpha, beta, aiColor);
      if(result.score < best){ best = result.score; bestMove = m; }
      beta = Math.min(beta, best);
      if(alpha>=beta) break;
    }
    return {score:best, move:bestMove};
  }
}


return { opponent, ownSide, storeOf, simulateMove, terminalScore, minimax };
})();

var BACKGAMMON = (function(){
"use strict";let rand = null; // seeded by the station, see setRandom
function setRandom(fn){ rand = fn; }

// points[0..23]: index i holds either null or {color,count}. Red's home is 0-5 and
// red moves toward index 0 (bearing off past -1); black's home is 18-23 and black
// moves toward index 23 (bearing off past 24). bar/off are {red:N, black:N}.
function opponent(color){ return color==='red' ? 'black' : 'red'; }
function direction(color){ return color==='red' ? -1 : 1; }
function homeRange(color){ return color==='red' ? [0,5] : [18,23]; }
function pointColor(state, idx){ return state.points[idx] ? state.points[idx].color : null; }
function pointCount(state, idx){ return state.points[idx] ? state.points[idx].count : 0; }

function cloneState(state){
  return {
    points: state.points.map(p => p ? {color:p.color, count:p.count} : null),
    bar: {red:state.bar.red, black:state.bar.black},
    off: {red:state.off.red, black:state.off.black},
  };
}

function canLand(state, idx, color){
  const p = state.points[idx];
  if(!p) return true;
  if(p.color===color) return true;
  return p.count===1; // a lone opposing checker (a "blot") can be hit
}

function canBearOffColor(state, color){
  if(state.bar[color] > 0) return false;
  const [a,b] = homeRange(color);
  for(let idx=0; idx<24; idx++){
    if(pointColor(state,idx)===color && (idx<a || idx>b)) return false;
  }
  return true;
}

// Standard bear-off legality: the exact point matching the die always works; an
// "overage" die (bigger than needed) may only bear off from a point if no checkers
// of that color sit on any higher point (i.e. this is the farthest-back checker left).
function isLegalBearOff(state, color, idx, die){
  if(color==='red'){
    const point = idx+1;
    if(point===die) return true;
    if(point<die){
      for(let j=idx+1; j<=5; j++) if(pointColor(state,j)==='red') return false;
      return true;
    }
    return false;
  } else {
    const point = 24-idx;
    if(point===die) return true;
    if(point<die){
      for(let j=idx-1; j>=18; j--) if(pointColor(state,j)==='black') return false;
      return true;
    }
    return false;
  }
}

function legalMovesForDie(state, color, die){
  const moves = [];
  if(state.bar[color] > 0){
    const idx = color==='red' ? 24-die : die-1;
    if(canLand(state, idx, color)) moves.push({from:'bar', to:idx});
    return moves; // bar checkers must enter before anything else can move
  }
  const canOff = canBearOffColor(state, color);
  for(let idx=0; idx<24; idx++){
    if(pointColor(state,idx)!==color) continue;
    const dest = idx + direction(color)*die;
    if(dest>=0 && dest<=23){
      if(canLand(state, dest, color)) moves.push({from:idx, to:dest});
    } else if(canOff && isLegalBearOff(state, color, idx, die)){
      moves.push({from:idx, to:'off'});
    }
  }
  return moves;
}

// mutates state in place; returns true if this move hit an opposing blot
function applyMoveToState(state, from, to, color){
  let hit = false;
  if(from==='bar'){ state.bar[color]--; }
  else {
    state.points[from].count--;
    if(state.points[from].count===0) state.points[from] = null;
  }
  if(to==='off'){ state.off[color]++; }
  else {
    const p = state.points[to];
    if(p && p.color!==color){ state.bar[p.color]++; state.points[to] = null; hit = true; }
    if(state.points[to]) state.points[to].count++;
    else state.points[to] = {color, count:1};
  }
  return hit;
}

// ---- AI: heuristic evaluation + a per-roll greedy planner ----
// Well-known single-shot hit probabilities out of 36, by pip distance (a standard
// backgammon reference table -- combined dice can hit at distances up to 24, but
// beyond 12 the odds are negligible for a heuristic and are treated as 0 here).
const HIT_PROB = {1:11/36,2:12/36,3:14/36,4:15/36,5:15/36,6:17/36,7:6/36,8:6/36,9:5/36,10:3/36,11:2/36,12:1/36};

function pipCount(state, color){
  let total = 0;
  for(let idx=0; idx<24; idx++){
    const p = state.points[idx];
    if(p && p.color===color) total += (color==='red' ? idx+1 : 24-idx) * p.count;
  }
  total += state.bar[color] * 25; // a bar checker is worth a full lap, pip-wise
  return total;
}
function pipsTraveled(color, idx){
  const remaining = color==='red' ? idx+1 : 24-idx;
  return 25 - remaining;
}
// Expected pip loss from exposure: for each of my blots, P(getting hit) times how
// many pips that checker has already traveled (what a hit would cost me), summed.
function blotExposure(state, color){
  const opp = opponent(color);
  let exposure = 0;
  for(let idx=0; idx<24; idx++){
    const p = state.points[idx];
    if(!(p && p.color===color && p.count===1)) continue;
    let risk = 0;
    for(let j=0; j<24; j++){
      const q = state.points[j];
      if(!(q && q.color===opp)) continue;
      const dist = opp==='red' ? (j-idx) : (idx-j);
      if(dist>=1 && dist<=12) risk += (HIT_PROB[dist] || 0);
    }
    risk = Math.min(risk, 1);
    exposure += risk * pipsTraveled(color, idx);
  }
  return exposure;
}
function homeBoardStrength(state, color){
  const [a,b] = homeRange(color);
  let made = 0;
  for(let idx=a; idx<=b; idx++){
    const p = state.points[idx];
    if(p && p.color===color && p.count>=2) made++;
  }
  return made;
}
function evaluateBoard(state, aiColor, w){
  const opp = opponent(aiColor);
  const pipDiff = pipCount(state, opp) - pipCount(state, aiColor); // positive when aiColor is ahead
  const myExposure = blotExposure(state, aiColor);
  const oppExposure = blotExposure(state, opp);
  const myHome = homeBoardStrength(state, aiColor);
  const oppHome = homeBoardStrength(state, opp);
  return pipDiff * w.pip
    - myExposure * w.blotPenalty
    + oppExposure * w.oppExposureWeight
    + (myHome - oppHome) * w.homeBoard
    - state.bar[aiColor] * w.barPenalty
    + state.bar[opp] * w.barPenalty * 0.6
    + state.off[aiColor] * 2;
}

// Greedy per-die planning for the CURRENT roll only: for each possible dice order,
// repeatedly pick the single best-scoring legal move for the next die, then compare
// the final positions across orderings. This is NOT a multi-ply search across future
// rolls -- doing that properly means expectiminimax over the 21 possible next rolls
// per node, a fundamentally heavier algorithm than the alpha-beta search the other
// sequencers use, since backgammon's branching includes chance nodes. A per-roll
// greedy plan is the standard scope for a casual bot, and it's what every difficulty
// here builds on -- they differ only in evaluation weights and, on easy, injected
// noise (see DIFFICULTY_WEIGHTS below).
function planTurn(state, color, diceValues, w){
  function greedySequence(order){
    let s = cloneState(state);
    const moves = [];
    for(const die of order){
      const legal = legalMovesForDie(s, color, die);
      if(legal.length===0) continue;
      let best = null, bestScore = -Infinity;
      for(const m of legal){
        const s2 = cloneState(s);
        applyMoveToState(s2, m.from, m.to, color);
        let score = evaluateBoard(s2, color, w);
        if(w.noise) score += (rand()-0.5) * w.noise;
        if(score > bestScore){ bestScore = score; best = m; }
      }
      applyMoveToState(s, best.from, best.to, color);
      moves.push(best);
    }
    return { state:s, moves, score: evaluateBoard(s, color, w) };
  }
  const orderings = (diceValues.length===2 && diceValues[0]!==diceValues[1])
    ? [diceValues, [diceValues[1], diceValues[0]]]
    : [diceValues];
  let best = null;
  for(const order of orderings){
    const result = greedySequence(order);
    if(!best || result.score > best.score) best = result;
  }
  return best.moves;
}


return { opponent, cloneState, applyMoveToState, planTurn, setRandom };
})();
