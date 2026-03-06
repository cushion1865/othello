import { ChessState, Move, Color, PieceType, getValidMoves, applyMove, isInCheck } from './chess';

export type Difficulty = 'easy' | 'normal' | 'hard';

const PIECE_VALUE: Record<PieceType, number> = {
  pawn: 100, knight: 320, bishop: 330, rook: 500, queen: 900, king: 20000,
};

// Piece-square tables (white's perspective: row 0 = rank 8, row 7 = rank 1)
const PST: Record<PieceType, number[][]> = {
  pawn: [
    [ 0,  0,  0,  0,  0,  0,  0,  0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [ 5,  5, 10, 25, 25, 10,  5,  5],
    [ 0,  0,  0, 20, 20,  0,  0,  0],
    [ 5, -5,-10,  0,  0,-10, -5,  5],
    [ 5, 10, 10,-20,-20, 10, 10,  5],
    [ 0,  0,  0,  0,  0,  0,  0,  0],
  ],
  knight: [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50],
  ],
  bishop: [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5, 10, 10,  5,  0,-10],
    [-10,  5,  5, 10, 10,  5,  5,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10],
    [-10, 10, 10, 10, 10, 10, 10,-10],
    [-10,  5,  0,  0,  0,  0,  5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20],
  ],
  rook: [
    [ 0,  0,  0,  0,  0,  0,  0,  0],
    [ 5, 10, 10, 10, 10, 10, 10,  5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [ 0,  0,  0,  5,  5,  0,  0,  0],
  ],
  queen: [
    [-20,-10,-10, -5, -5,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5,  5,  5,  5,  0,-10],
    [ -5,  0,  5,  5,  5,  5,  0, -5],
    [  0,  0,  5,  5,  5,  5,  0, -5],
    [-10,  5,  5,  5,  5,  5,  0,-10],
    [-10,  0,  5,  0,  0,  0,  0,-10],
    [-20,-10,-10, -5, -5,-10,-10,-20],
  ],
  king: [
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [ 20, 20,  0,  0,  0,  0, 20, 20],
    [ 20, 30, 10,  0,  0, 10, 30, 20],
  ],
};

function getPST(type: PieceType, color: Color, r: number, c: number): number {
  return PST[type][color === 'white' ? r : 7 - r][c];
}

function evaluate(state: ChessState, player: Color): number {
  const opp = player === 'white' ? 'black' : 'white';
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      if (!p) continue;
      const v = PIECE_VALUE[p.type] + getPST(p.type, p.color, r, c);
      score += p.color === player ? v : -v;
    }
  }
  if (isInCheck(state, opp)) score += 30;
  if (isInCheck(state, player)) score -= 30;
  return score;
}

function moveScore(state: ChessState, move: Move): number {
  const captured = state.board[move.to[0]][move.to[1]];
  let score = 0;
  if (captured) score += PIECE_VALUE[captured.type] * 10;
  if (move.promotion) score += 800;
  return score;
}

function sortMoves(state: ChessState, moves: Move[]): Move[] {
  return [...moves].sort((a, b) => moveScore(state, b) - moveScore(state, a));
}

function alphaBeta(
  state: ChessState,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  rootPlayer: Color,
): number {
  const current: Color = maximizing ? rootPlayer : (rootPlayer === 'white' ? 'black' : 'white');
  const moves = getValidMoves(state, current);

  if (depth === 0 || moves.length === 0) return evaluate(state, rootPlayer);

  const sorted = sortMoves(state, moves);

  if (maximizing) {
    let best = -Infinity;
    for (const move of sorted) {
      best = Math.max(best, alphaBeta(applyMove(state, move), depth - 1, alpha, beta, false, rootPlayer));
      alpha = Math.max(alpha, best);
      if (alpha >= beta) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const move of sorted) {
      best = Math.min(best, alphaBeta(applyMove(state, move), depth - 1, alpha, beta, true, rootPlayer));
      beta = Math.min(beta, best);
      if (alpha >= beta) break;
    }
    return best;
  }
}

export function getBestMove(state: ChessState, player: Color, difficulty: Difficulty): Move | null {
  const moves = getValidMoves(state, player);
  if (moves.length === 0) return null;

  if (difficulty === 'easy') return moves[Math.floor(Math.random() * moves.length)];

  const depth = difficulty === 'normal' ? 3 : 4;
  const sorted = sortMoves(state, moves);

  let bestMove = sorted[0];
  let bestScore = -Infinity;

  for (const move of sorted) {
    const score = alphaBeta(applyMove(state, move), depth - 1, -Infinity, Infinity, false, player);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }
  return bestMove;
}
