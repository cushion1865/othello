import { ShogiState, Move, Owner, PieceType, getValidMoves, applyMove, isInCheck } from './shogi';

export type Difficulty = 'easy' | 'normal' | 'hard';

const PIECE_VALUE: Record<PieceType, number> = {
  fu: 100, kyosha: 250, keima: 280, gin: 500, kin: 600,
  kaku: 800, hisha: 1000, ou: 10000,
  tokin: 300, narikyosha: 450, narikeima: 480, narigin: 600,
  uma: 1000, ryu: 1200,
};

function evaluate(state: ShogiState, player: Owner): number {
  const opp = player === 'sente' ? 'gote' : 'sente';
  let score = 0;

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const p = state.board[r][c];
      if (!p) continue;
      const v = PIECE_VALUE[p.type];
      score += p.owner === player ? v : -v;
    }
  }

  // Hand pieces
  for (const [pt, cnt] of Object.entries(state.hand[player])) {
    score += PIECE_VALUE[pt as PieceType] * (cnt ?? 0) * 0.8;
  }
  for (const [pt, cnt] of Object.entries(state.hand[opp])) {
    score -= PIECE_VALUE[pt as PieceType] * (cnt ?? 0) * 0.8;
  }

  // Mobility bonus
  score += getValidMoves(state, player).length * 5;
  score -= getValidMoves(state, opp).length * 5;

  if (isInCheck(state, opp)) score += 150;
  if (isInCheck(state, player)) score -= 150;

  return score;
}

function alphaBeta(
  state: ShogiState,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  rootPlayer: Owner,
): number {
  const current = maximizing ? rootPlayer : (rootPlayer === 'sente' ? 'gote' : 'sente');
  const moves = getValidMoves(state, current);

  if (depth === 0 || moves.length === 0) {
    return evaluate(state, rootPlayer);
  }

  if (maximizing) {
    let best = -Infinity;
    for (const move of moves) {
      const next = applyMove(state, move);
      best = Math.max(best, alphaBeta(next, depth - 1, alpha, beta, false, rootPlayer));
      alpha = Math.max(alpha, best);
      if (alpha >= beta) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const move of moves) {
      const next = applyMove(state, move);
      best = Math.min(best, alphaBeta(next, depth - 1, alpha, beta, true, rootPlayer));
      beta = Math.min(beta, best);
      if (alpha >= beta) break;
    }
    return best;
  }
}

export function getBestMove(state: ShogiState, player: Owner, difficulty: Difficulty): Move | null {
  const moves = getValidMoves(state, player);
  if (moves.length === 0) return null;

  if (difficulty === 'easy') {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  const depth = difficulty === 'normal' ? 2 : 3;

  let bestMove = moves[0];
  let bestScore = -Infinity;

  for (const move of moves) {
    const next = applyMove(state, move);
    const score = alphaBeta(next, depth - 1, -Infinity, Infinity, false, player);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}
