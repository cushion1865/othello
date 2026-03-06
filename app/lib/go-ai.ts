import {
  GoState, Move, Color, BoardSize,
  applyMove, getGroup, getLiberties, isLegal, opponent, STAR_POINTS,
} from './go';

export type Difficulty = 'easy' | 'normal' | 'hard';

// Returns candidate move coordinates (only near existing stones + opening moves)
function getCandidates(state: GoState): [number, number][] {
  const { board, size } = state;
  const candidates = new Set<string>();
  const radius = 2;
  let hasStones = false;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!board[r][c]) continue;
      hasStones = true;
      for (let dr = -radius; dr <= radius; dr++) {
        for (let dc = -radius; dc <= radius; dc++) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < size && nc >= 0 && nc < size && !board[nr][nc])
            candidates.add(`${nr},${nc}`);
        }
      }
    }
  }

  // Opening: play star points and center
  if (!hasStones) {
    const center = Math.floor(size / 2);
    candidates.add(`${center},${center}`);
    for (const [r, c] of (STAR_POINTS[size] ?? [])) candidates.add(`${r},${c}`);
  }

  return [...candidates].map(k => k.split(',').map(Number) as [number, number]);
}

function adj(r: number, c: number, size: number): [number, number][] {
  const result: [number, number][] = [];
  if (r > 0) result.push([r - 1, c]);
  if (r < size - 1) result.push([r + 1, c]);
  if (c > 0) result.push([r, c - 1]);
  if (c < size - 1) result.push([r, c + 1]);
  return result;
}

// Heuristic score for placing at (r, c) for `player`
function scoreMove(state: GoState, r: number, c: number, player: Color): number {
  const newState = applyMove(state, { type: 'place', r, c });
  if (!newState) return -Infinity;

  const opp = opponent(player);
  let score = 0;

  // Captures (very high value)
  const captures = newState.captures[player] - state.captures[player];
  score += captures * 150;

  // Opponent groups in atari after our move
  for (const [nr, nc] of adj(r, c, state.size)) {
    if (newState.board[nr][nc] !== opp) continue;
    const group = getGroup(newState.board, nr, nc);
    const libs = getLiberties(newState.board, group);
    if (libs === 1) score += group.length * 40; // putting in atari
    if (libs === 0) score += group.length * 200; // captured (shouldn't happen, already counted above)
  }

  // Save own groups that were in atari before this move
  for (const [nr, nc] of adj(r, c, state.size)) {
    if (state.board[nr][nc] !== player) continue;
    const groupBefore = getGroup(state.board, nr, nc);
    const libsBefore = getLiberties(state.board, groupBefore);
    if (libsBefore === 1) {
      // This group was in atari; did we save it?
      const groupAfter = getGroup(newState.board, nr, nc);
      const libsAfter = getLiberties(newState.board, groupAfter);
      if (libsAfter > 1) score += groupAfter.length * 60;
    }
  }

  // Own group liberties (prefer moves that give our stones breathing room)
  const placedGroup = getGroup(newState.board, r, c);
  score += Math.min(getLiberties(newState.board, placedGroup), 4) * 8;

  // Star point / center bonus
  const starPoints = new Set((STAR_POINTS[state.size] ?? []).map(([sr, sc]) => `${sr},${sc}`));
  if (starPoints.has(`${r},${c}`)) score += 15;

  const center = (state.size - 1) / 2;
  const distFromCenter = Math.sqrt((r - center) ** 2 + (c - center) ** 2);
  score += Math.max(0, 10 - distFromCenter);

  // Random jitter for variation
  score += Math.random() * 5;

  return score;
}

// Hard AI: for each candidate move, simulate opponent's best response and pick the best net outcome
function scoreMoveHard(state: GoState, r: number, c: number, player: Color): number {
  const newState = applyMove(state, { type: 'place', r, c });
  if (!newState) return -Infinity;

  // Immediate score from this move
  const myScore = scoreMove(state, r, c, player);

  // Estimate opponent's best response (greedy 1-ply)
  const opp = opponent(player);
  const oppCandidates = getCandidates(newState);
  let oppBestScore = 0;
  for (const [or, oc] of oppCandidates.slice(0, 30)) { // limit for performance
    if (!isLegal(newState, or, oc)) continue;
    const oppScore = scoreMove(newState, or, oc, opp);
    if (oppScore > oppBestScore) oppBestScore = oppScore;
  }

  return myScore - oppBestScore * 0.5;
}

export function getBestMove(state: GoState, player: Color, difficulty: Difficulty): Move {
  const candidates = getCandidates(state);
  const legalMoves = candidates.filter(([r, c]) => isLegal(state, r, c));

  if (legalMoves.length === 0) return { type: 'pass' };

  if (difficulty === 'easy') {
    // Random, but prefer captures
    const shuffle = [...legalMoves].sort(() => Math.random() - 0.5);
    for (const [r, c] of shuffle) {
      const newState = applyMove(state, { type: 'place', r, c });
      if (newState && newState.captures[player] > state.captures[player]) return { type: 'place', r, c };
    }
    const [r, c] = shuffle[0];
    return { type: 'place', r, c };
  }

  // Normal / Hard: pick highest scored move
  const scoreFn = difficulty === 'hard' ? scoreMoveHard : scoreMove;

  // Limit candidates for performance on large boards
  const limit = state.size === 19 ? 40 : state.size === 13 ? 60 : legalMoves.length;
  const evalCandidates = legalMoves.slice(0, limit);

  let bestScore = -Infinity;
  let bestMove: Move = { type: 'pass' };

  for (const [r, c] of evalCandidates) {
    const score = scoreFn(state, r, c, player);
    if (score > bestScore) {
      bestScore = score;
      bestMove = { type: 'place', r, c };
    }
  }

  // Pass only if it's genuinely better (score is very low)
  if (bestScore < 5 && state.consecutivePasses === 0) return { type: 'pass' };

  return bestMove;
}
