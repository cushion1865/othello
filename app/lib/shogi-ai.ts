import { ShogiState, Move, Owner, PieceType, getValidMoves, applyMove, isInCheck } from './shogi';

export type Difficulty = 'easy' | 'normal' | 'hard';

const PIECE_VALUE: Record<PieceType, number> = {
  fu: 100, kyosha: 250, keima: 280, gin: 500, kin: 600,
  kaku: 800, hisha: 1000, ou: 10000,
  tokin: 300, narikyosha: 450, narikeima: 480, narigin: 600,
  uma: 1000, ryu: 1200,
};

// 手の優先スコア（高いほど先に探索 → アルファベータ枝刈りが効く）
function moveScore(state: ShogiState, move: Move): number {
  if (move.type === 'drop') return 10;
  const captured = state.board[move.to[0]][move.to[1]];
  const piece = state.board[move.from[0]][move.from[1]];
  let score = 0;
  if (captured) score += PIECE_VALUE[captured.type] * 2;
  if (move.promote && piece) score += 50;
  return score;
}

function sortMoves(state: ShogiState, moves: Move[]): Move[] {
  return [...moves].sort((a, b) => moveScore(state, b) - moveScore(state, a));
}

// 評価関数: 駒得のみ（getValidMoves を呼ばない — これが最大ボトルネックだった）
function evaluate(state: ShogiState, player: Owner): number {
  const opp = player === 'sente' ? 'gote' : 'sente';
  let score = 0;

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const p = state.board[r][c];
      if (!p) continue;
      score += p.owner === player ? PIECE_VALUE[p.type] : -PIECE_VALUE[p.type];
    }
  }

  for (const [pt, cnt] of Object.entries(state.hand[player])) {
    score += PIECE_VALUE[pt as PieceType] * (cnt ?? 0) * 0.8;
  }
  for (const [pt, cnt] of Object.entries(state.hand[opp])) {
    score -= PIECE_VALUE[pt as PieceType] * (cnt ?? 0) * 0.8;
  }

  if (isInCheck(state, opp)) score += 200;
  if (isInCheck(state, player)) score -= 200;

  return score;
}

const MAX_MOVES_PER_NODE = 40;

function alphaBeta(
  state: ShogiState,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  rootPlayer: Owner,
): number {
  const current = maximizing ? rootPlayer : (rootPlayer === 'sente' ? 'gote' : 'sente');
  const allMoves = getValidMoves(state, current);

  if (depth === 0 || allMoves.length === 0) {
    return evaluate(state, rootPlayer);
  }

  // 手順を優先度順にソートし、上位 MAX_MOVES_PER_NODE 手のみ探索
  const moves = sortMoves(state, allMoves).slice(0, MAX_MOVES_PER_NODE);

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
  const allMoves = getValidMoves(state, player);
  if (allMoves.length === 0) return null;

  if (difficulty === 'easy') {
    return allMoves[Math.floor(Math.random() * allMoves.length)];
  }

  // normal: depth 2 / hard: depth 3（手順ソート＋打ち切りで十分高速）
  const depth = difficulty === 'normal' ? 2 : 3;
  const moves = sortMoves(state, allMoves).slice(0, MAX_MOVES_PER_NODE);

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
