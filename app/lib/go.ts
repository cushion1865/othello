export type Color = 'black' | 'white';
export type Cell = Color | null;
export type Board = Cell[][];
export type BoardSize = 9 | 13 | 19;

export interface GoState {
  board: Board;
  size: BoardSize;
  currentPlayer: Color;
  captures: { black: number; white: number }; // stones captured BY each color
  previousBoardStr: string | null; // for ko detection
  consecutivePasses: number;
  lastMove: [number, number] | null;
}

export type Move =
  | { type: 'place'; r: number; c: number }
  | { type: 'pass' };

export interface Score {
  blackTotal: number;
  whiteTotal: number;
  blackTerritory: number;
  whiteTerritory: number;
  blackStones: number;
  whiteStones: number;
  komi: number;
}

export const KOMI = 6.5;

export function opponent(color: Color): Color {
  return color === 'black' ? 'white' : 'black';
}

export function createInitialState(size: BoardSize): GoState {
  return {
    board: Array.from({ length: size }, () => Array(size).fill(null)),
    size,
    currentPlayer: 'black',
    captures: { black: 0, white: 0 },
    previousBoardStr: null,
    consecutivePasses: 0,
    lastMove: null,
  };
}

function adj(r: number, c: number, size: number): [number, number][] {
  const result: [number, number][] = [];
  if (r > 0) result.push([r - 1, c]);
  if (r < size - 1) result.push([r + 1, c]);
  if (c > 0) result.push([r, c - 1]);
  if (c < size - 1) result.push([r, c + 1]);
  return result;
}

export function getGroup(board: Board, r: number, c: number): [number, number][] {
  const color = board[r][c];
  if (!color) return [];
  const size = board.length;
  const visited = new Set<string>();
  const group: [number, number][] = [];
  const stack: [number, number][] = [[r, c]];

  while (stack.length > 0) {
    const [cr, cc] = stack.pop()!;
    const key = `${cr},${cc}`;
    if (visited.has(key)) continue;
    visited.add(key);
    group.push([cr, cc]);
    for (const [nr, nc] of adj(cr, cc, size)) {
      if (!visited.has(`${nr},${nc}`) && board[nr][nc] === color)
        stack.push([nr, nc]);
    }
  }
  return group;
}

export function getLiberties(board: Board, group: [number, number][]): number {
  const size = board.length;
  const libs = new Set<string>();
  for (const [r, c] of group) {
    for (const [nr, nc] of adj(r, c, size)) {
      if (!board[nr][nc]) libs.add(`${nr},${nc}`);
    }
  }
  return libs.size;
}

function boardToStr(board: Board): string {
  return board.map(row => row.map(c => c === 'black' ? 'B' : c === 'white' ? 'W' : '.').join('')).join('');
}

export function applyMove(state: GoState, move: Move): GoState | null {
  if (move.type === 'pass') {
    return {
      ...state,
      currentPlayer: opponent(state.currentPlayer),
      consecutivePasses: state.consecutivePasses + 1,
      previousBoardStr: boardToStr(state.board),
      lastMove: null,
    };
  }

  const { r, c } = move;
  if (state.board[r][c]) return null;

  const board = state.board.map(row => [...row]);
  const size = state.size;
  const color = state.currentPlayer;
  const opp = opponent(color);

  board[r][c] = color;

  // Capture opponent groups with 0 liberties
  let newCaptures = state.captures[color];
  for (const [nr, nc] of adj(r, c, size)) {
    if (board[nr][nc] !== opp) continue;
    const group = getGroup(board, nr, nc);
    if (getLiberties(board, group) === 0) {
      newCaptures += group.length;
      for (const [gr, gc] of group) board[gr][gc] = null;
    }
  }

  // Suicide check
  const placedGroup = getGroup(board, r, c);
  if (getLiberties(board, placedGroup) === 0) return null;

  // Ko check
  const newBoardStr = boardToStr(board);
  if (state.previousBoardStr === newBoardStr) return null;

  return {
    board,
    size,
    currentPlayer: opp,
    captures: { ...state.captures, [color]: newCaptures },
    previousBoardStr: boardToStr(state.board),
    consecutivePasses: 0,
    lastMove: [r, c],
  };
}

export function isLegal(state: GoState, r: number, c: number): boolean {
  if (state.board[r][c]) return false;
  return applyMove(state, { type: 'place', r, c }) !== null;
}

export function isGameOver(state: GoState): boolean {
  return state.consecutivePasses >= 2;
}

function calculateTerritory(board: Board): { black: number; white: number } {
  const size = board.length;
  const visited = new Set<string>();
  let black = 0, white = 0;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const key = `${r},${c}`;
      if (board[r][c] || visited.has(key)) continue;

      const emptyRegion: [number, number][] = [];
      const borders = new Set<Color>();
      const queue: [number, number][] = [[r, c]];
      visited.add(key);

      while (queue.length > 0) {
        const [cr, cc] = queue.shift()!;
        emptyRegion.push([cr, cc]);
        for (const [nr, nc] of adj(cr, cc, size)) {
          const nkey = `${nr},${nc}`;
          const cell = board[nr][nc];
          if (cell) {
            borders.add(cell);
          } else if (!visited.has(nkey)) {
            visited.add(nkey);
            queue.push([nr, nc]);
          }
        }
      }

      if (borders.size === 1) {
        const owner = [...borders][0];
        if (owner === 'black') black += emptyRegion.length;
        else white += emptyRegion.length;
      }
    }
  }
  return { black, white };
}

export function calculateScore(state: GoState): Score {
  const { board, size } = state;
  let blackStones = 0, whiteStones = 0;

  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++) {
      if (board[r][c] === 'black') blackStones++;
      else if (board[r][c] === 'white') whiteStones++;
    }

  const territory = calculateTerritory(board);
  const komi = KOMI;

  return {
    blackTerritory: territory.black,
    whiteTerritory: territory.white,
    blackStones,
    whiteStones,
    komi,
    blackTotal: blackStones + territory.black,
    whiteTotal: whiteStones + territory.white + komi,
  };
}

// Star points (hoshi) per board size
export const STAR_POINTS: Record<number, [number, number][]> = {
  9:  [[2,2],[2,6],[4,4],[6,2],[6,6]],
  13: [[3,3],[3,6],[3,9],[6,3],[6,6],[6,9],[9,3],[9,6],[9,9]],
  19: [[3,3],[3,9],[3,15],[9,3],[9,9],[9,15],[15,3],[15,9],[15,15]],
};
