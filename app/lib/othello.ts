export type Player = "black" | "white";
export type Cell = Player | null;
export type Board = Cell[][];

export const BOARD_SIZE = 8;

const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
] as const;

export function createInitialBoard(): Board {
  const board: Board = Array.from({ length: BOARD_SIZE }, () =>
    Array(BOARD_SIZE).fill(null)
  );
  const mid = BOARD_SIZE / 2;
  board[mid - 1][mid - 1] = "white";
  board[mid - 1][mid] = "black";
  board[mid][mid - 1] = "black";
  board[mid][mid] = "white";
  return board;
}

export function opponent(player: Player): Player {
  return player === "black" ? "white" : "black";
}

function isInBounds(r: number, c: number): boolean {
  return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
}

// ある方向にひっくり返せる石のリストを返す
function getFlippableInDirection(
  board: Board,
  row: number,
  col: number,
  dr: number,
  dc: number,
  player: Player
): [number, number][] {
  const opp = opponent(player);
  const flippable: [number, number][] = [];
  let r = row + dr;
  let c = col + dc;

  while (isInBounds(r, c) && board[r][c] === opp) {
    flippable.push([r, c]);
    r += dr;
    c += dc;
  }

  if (flippable.length > 0 && isInBounds(r, c) && board[r][c] === player) {
    return flippable;
  }
  return [];
}

// (row, col) に stone を置いたときにひっくり返る石を全方向で収集
export function getFlippable(
  board: Board,
  row: number,
  col: number,
  player: Player
): [number, number][] {
  if (board[row][col] !== null) return [];
  const flippable: [number, number][] = [];
  for (const [dr, dc] of DIRECTIONS) {
    flippable.push(...getFlippableInDirection(board, row, col, dr, dc, player));
  }
  return flippable;
}

export function isValidMove(
  board: Board,
  row: number,
  col: number,
  player: Player
): boolean {
  return getFlippable(board, row, col, player).length > 0;
}

export function getValidMoves(board: Board, player: Player): [number, number][] {
  const moves: [number, number][] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (isValidMove(board, r, c, player)) {
        moves.push([r, c]);
      }
    }
  }
  return moves;
}

export function applyMove(
  board: Board,
  row: number,
  col: number,
  player: Player
): Board {
  const flippable = getFlippable(board, row, col, player);
  if (flippable.length === 0) return board;

  const newBoard = board.map((r) => [...r]);
  newBoard[row][col] = player;
  for (const [r, c] of flippable) {
    newBoard[r][c] = player;
  }
  return newBoard;
}

export function countStones(board: Board): { black: number; white: number } {
  let black = 0;
  let white = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell === "black") black++;
      else if (cell === "white") white++;
    }
  }
  return { black, white };
}

export function isGameOver(board: Board): boolean {
  return (
    getValidMoves(board, "black").length === 0 &&
    getValidMoves(board, "white").length === 0
  );
}
