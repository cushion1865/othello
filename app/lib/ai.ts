import {
  Board,
  Player,
  applyMove,
  getValidMoves,
  opponent,
  countStones,
} from "./othello";

// 角・辺のウェイトテーブル（位置評価）
const WEIGHT_TABLE: number[][] = [
  [120, -20, 20,  5,  5, 20, -20, 120],
  [-20, -40, -5, -5, -5, -5, -40, -20],
  [ 20,  -5, 15,  3,  3, 15,  -5,  20],
  [  5,  -5,  3,  3,  3,  3,  -5,   5],
  [  5,  -5,  3,  3,  3,  3,  -5,   5],
  [ 20,  -5, 15,  3,  3, 15,  -5,  20],
  [-20, -40, -5, -5, -5, -5, -40, -20],
  [120, -20, 20,  5,  5, 20, -20, 120],
];

function evaluate(board: Board, player: Player): number {
  const opp = opponent(player);
  let score = 0;

  // 位置評価
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === player) score += WEIGHT_TABLE[r][c];
      else if (board[r][c] === opp) score -= WEIGHT_TABLE[r][c];
    }
  }

  // 合法手数（機動性）
  const myMoves = getValidMoves(board, player).length;
  const oppMoves = getValidMoves(board, opp).length;
  if (myMoves + oppMoves > 0) {
    score += 10 * (myMoves - oppMoves);
  }

  // 石数（終盤のみ重視）
  const { black, white } = countStones(board);
  const total = black + white;
  if (total > 50) {
    const myCount = player === "black" ? black : white;
    const oppCount = player === "black" ? white : black;
    score += 5 * (myCount - oppCount);
  }

  return score;
}

function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  currentPlayer: Player,
  maximizingPlayer: Player
): number {
  const moves = getValidMoves(board, currentPlayer);

  if (depth === 0 || (moves.length === 0 && getValidMoves(board, opponent(currentPlayer)).length === 0)) {
    return evaluate(board, maximizingPlayer);
  }

  if (moves.length === 0) {
    // パス
    return minimax(board, depth - 1, alpha, beta, opponent(currentPlayer), maximizingPlayer);
  }

  if (currentPlayer === maximizingPlayer) {
    let maxEval = -Infinity;
    for (const [r, c] of moves) {
      const newBoard = applyMove(board, r, c, currentPlayer);
      const evalScore = minimax(newBoard, depth - 1, alpha, beta, opponent(currentPlayer), maximizingPlayer);
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const [r, c] of moves) {
      const newBoard = applyMove(board, r, c, currentPlayer);
      const evalScore = minimax(newBoard, depth - 1, alpha, beta, opponent(currentPlayer), maximizingPlayer);
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

export type Difficulty = "easy" | "normal" | "hard";

const DEPTH_MAP: Record<Difficulty, number> = {
  easy: 1,
  normal: 3,
  hard: 5,
};

export function getBestMove(
  board: Board,
  player: Player,
  difficulty: Difficulty = "normal"
): [number, number] | null {
  const moves = getValidMoves(board, player);
  if (moves.length === 0) return null;

  const depth = DEPTH_MAP[difficulty];

  // easy: ランダムに選ぶ
  if (difficulty === "easy") {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  let bestScore = -Infinity;
  let bestMove: [number, number] = moves[0];

  for (const [r, c] of moves) {
    const newBoard = applyMove(board, r, c, player);
    const score = minimax(newBoard, depth - 1, -Infinity, Infinity, opponent(player), player);
    if (score > bestScore) {
      bestScore = score;
      bestMove = [r, c];
    }
  }

  return bestMove;
}
