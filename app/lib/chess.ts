export type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
export type Color = 'white' | 'black';
export type PromotionPiece = 'queen' | 'rook' | 'bishop' | 'knight';

export interface Piece {
  type: PieceType;
  color: Color;
}

export type Board = (Piece | null)[][];

export interface CastlingRights {
  white: { kingside: boolean; queenside: boolean };
  black: { kingside: boolean; queenside: boolean };
}

export interface ChessState {
  board: Board;
  currentPlayer: Color;
  castlingRights: CastlingRights;
  enPassantTarget: [number, number] | null;
  halfMoveClock: number;
  fullMoveNumber: number;
}

export interface Move {
  from: [number, number];
  to: [number, number];
  promotion?: PromotionPiece;
}

export function opponent(color: Color): Color {
  return color === 'white' ? 'black' : 'white';
}

export function createInitialState(): ChessState {
  const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
  const backRank: PieceType[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
  for (let c = 0; c < 8; c++) {
    board[0][c] = { type: backRank[c], color: 'black' };
    board[1][c] = { type: 'pawn', color: 'black' };
    board[6][c] = { type: 'pawn', color: 'white' };
    board[7][c] = { type: backRank[c], color: 'white' };
  }
  return {
    board,
    currentPlayer: 'white',
    castlingRights: {
      white: { kingside: true, queenside: true },
      black: { kingside: true, queenside: true },
    },
    enPassantTarget: null,
    halfMoveClock: 0,
    fullMoveNumber: 1,
  };
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

export function isAttackedBy(board: Board, r: number, c: number, byColor: Color): boolean {
  // Knights
  for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
    const nr = r + dr, nc = c + dc;
    if (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p && p.type === 'knight' && p.color === byColor) return true;
    }
  }
  // Diagonals (bishop / queen)
  for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
    let nr = r + dr, nc = c + dc;
    while (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p) { if (p.color === byColor && (p.type === 'bishop' || p.type === 'queen')) return true; break; }
      nr += dr; nc += dc;
    }
  }
  // Orthogonals (rook / queen)
  for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    let nr = r + dr, nc = c + dc;
    while (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p) { if (p.color === byColor && (p.type === 'rook' || p.type === 'queen')) return true; break; }
      nr += dr; nc += dc;
    }
  }
  // King
  for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
    const nr = r + dr, nc = c + dc;
    if (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p && p.type === 'king' && p.color === byColor) return true;
    }
  }
  // Pawns: a byColor pawn at (r + pawnDir, c±1) attacks (r, c)
  const pawnDir = byColor === 'white' ? 1 : -1;
  for (const dc of [-1, 1]) {
    const nr = r + pawnDir, nc = c + dc;
    if (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p && p.type === 'pawn' && p.color === byColor) return true;
    }
  }
  return false;
}

function findKing(board: Board, color: Color): [number, number] {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type === 'king' && p.color === color) return [r, c];
    }
  return [-1, -1];
}

export function isInCheck(state: ChessState, color: Color): boolean {
  const [kr, kc] = findKing(state.board, color);
  if (kr === -1) return false;
  return isAttackedBy(state.board, kr, kc, opponent(color));
}

function getPseudoLegalMoves(state: ChessState, color: Color): Move[] {
  const moves: Move[] = [];
  const board = state.board;

  const addPawnMove = (from: [number, number], to: [number, number], promRow: number) => {
    if (to[0] === promRow) {
      for (const p of ['queen', 'rook', 'bishop', 'knight'] as const)
        moves.push({ from, to, promotion: p });
    } else {
      moves.push({ from, to });
    }
  };

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece || piece.color !== color) continue;

      switch (piece.type) {
        case 'pawn': {
          const dir = color === 'white' ? -1 : 1;
          const startRow = color === 'white' ? 6 : 1;
          const promRow = color === 'white' ? 0 : 7;
          // Forward
          if (inBounds(r + dir, c) && !board[r + dir][c]) {
            addPawnMove([r, c], [r + dir, c], promRow);
            if (r === startRow && !board[r + 2 * dir][c])
              moves.push({ from: [r, c], to: [r + 2 * dir, c] });
          }
          // Diagonal captures + en passant
          for (const dc of [-1, 1]) {
            const nr = r + dir, nc = c + dc;
            if (!inBounds(nr, nc)) continue;
            const target = board[nr][nc];
            if (target && target.color !== color) {
              addPawnMove([r, c], [nr, nc], promRow);
            } else if (!target && state.enPassantTarget?.[0] === nr && state.enPassantTarget?.[1] === nc) {
              moves.push({ from: [r, c], to: [nr, nc] });
            }
          }
          break;
        }
        case 'knight': {
          for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
            const nr = r + dr, nc = c + dc;
            if (inBounds(nr, nc)) {
              const t = board[nr][nc];
              if (!t || t.color !== color) moves.push({ from: [r, c], to: [nr, nc] });
            }
          }
          break;
        }
        case 'bishop': {
          for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
            let nr = r + dr, nc = c + dc;
            while (inBounds(nr, nc)) {
              const t = board[nr][nc];
              if (t) { if (t.color !== color) moves.push({ from: [r, c], to: [nr, nc] }); break; }
              moves.push({ from: [r, c], to: [nr, nc] });
              nr += dr; nc += dc;
            }
          }
          break;
        }
        case 'rook': {
          for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
            let nr = r + dr, nc = c + dc;
            while (inBounds(nr, nc)) {
              const t = board[nr][nc];
              if (t) { if (t.color !== color) moves.push({ from: [r, c], to: [nr, nc] }); break; }
              moves.push({ from: [r, c], to: [nr, nc] });
              nr += dr; nc += dc;
            }
          }
          break;
        }
        case 'queen': {
          for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]) {
            let nr = r + dr, nc = c + dc;
            while (inBounds(nr, nc)) {
              const t = board[nr][nc];
              if (t) { if (t.color !== color) moves.push({ from: [r, c], to: [nr, nc] }); break; }
              moves.push({ from: [r, c], to: [nr, nc] });
              nr += dr; nc += dc;
            }
          }
          break;
        }
        case 'king': {
          for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
            const nr = r + dr, nc = c + dc;
            if (inBounds(nr, nc)) {
              const t = board[nr][nc];
              if (!t || t.color !== color) moves.push({ from: [r, c], to: [nr, nc] });
            }
          }
          // Castling
          const backRow = color === 'white' ? 7 : 0;
          if (r === backRow && c === 4) {
            const rights = state.castlingRights[color];
            if (rights.kingside && !board[backRow][5] && !board[backRow][6])
              moves.push({ from: [r, c], to: [backRow, 6] });
            if (rights.queenside && !board[backRow][3] && !board[backRow][2] && !board[backRow][1])
              moves.push({ from: [r, c], to: [backRow, 2] });
          }
          break;
        }
      }
    }
  }
  return moves;
}

export function applyMove(state: ChessState, move: Move): ChessState {
  const board = state.board.map(row => [...row]);
  const [fr, fc] = move.from;
  const [tr, tc] = move.to;
  const piece = board[fr][fc]!;
  const captured = board[tr][tc];

  let newEnPassantTarget: [number, number] | null = null;
  const newCR = {
    white: { ...state.castlingRights.white },
    black: { ...state.castlingRights.black },
  };

  // En passant capture
  let isEnPassant = false;
  if (piece.type === 'pawn' && !captured && state.enPassantTarget?.[0] === tr && state.enPassantTarget?.[1] === tc) {
    isEnPassant = true;
    board[piece.color === 'white' ? tr + 1 : tr - 1][tc] = null;
  }

  // Castling: move the rook
  if (piece.type === 'king' && Math.abs(tc - fc) === 2) {
    const backRow = piece.color === 'white' ? 7 : 0;
    if (tc === 6) { board[backRow][5] = board[backRow][7]; board[backRow][7] = null; }
    else          { board[backRow][3] = board[backRow][0]; board[backRow][0] = null; }
    newCR[piece.color].kingside = false;
    newCR[piece.color].queenside = false;
  }

  // Rook move loses castling right
  if (piece.type === 'rook') {
    if (piece.color === 'white') {
      if (fr === 7 && fc === 0) newCR.white.queenside = false;
      if (fr === 7 && fc === 7) newCR.white.kingside = false;
    } else {
      if (fr === 0 && fc === 0) newCR.black.queenside = false;
      if (fr === 0 && fc === 7) newCR.black.kingside = false;
    }
  }

  // Captured rook loses castling right
  if (captured?.type === 'rook') {
    if (tr === 7 && tc === 0) newCR.white.queenside = false;
    if (tr === 7 && tc === 7) newCR.white.kingside = false;
    if (tr === 0 && tc === 0) newCR.black.queenside = false;
    if (tr === 0 && tc === 7) newCR.black.kingside = false;
  }

  // Apply move (with optional promotion)
  board[tr][tc] = move.promotion ? { type: move.promotion, color: piece.color } : piece;
  board[fr][fc] = null;

  // En passant target: set when pawn advances 2 squares
  if (piece.type === 'pawn' && Math.abs(tr - fr) === 2)
    newEnPassantTarget = [(fr + tr) / 2, fc];

  const isCapture = captured !== null || isEnPassant;

  return {
    board,
    currentPlayer: opponent(state.currentPlayer),
    castlingRights: newCR,
    enPassantTarget: newEnPassantTarget,
    halfMoveClock: (piece.type === 'pawn' || isCapture) ? 0 : state.halfMoveClock + 1,
    fullMoveNumber: state.currentPlayer === 'black' ? state.fullMoveNumber + 1 : state.fullMoveNumber,
  };
}

export function getValidMoves(state: ChessState, color: Color): Move[] {
  const pseudo = getPseudoLegalMoves(state, color);
  const valid: Move[] = [];

  for (const move of pseudo) {
    const [fr, fc] = move.from;
    const [tr, tc] = move.to;
    const piece = state.board[fr][fc]!;

    // Castling: king can't be in check, can't pass through attacked square
    if (piece.type === 'king' && Math.abs(tc - fc) === 2) {
      if (isInCheck(state, color)) continue;
      const step = tc > fc ? 1 : -1;
      const passBoard = state.board.map(row => [...row]);
      passBoard[tr][fc + step] = piece;
      passBoard[fr][fc] = null;
      if (isAttackedBy(passBoard, tr, fc + step, opponent(color))) continue;
    }

    const newState = applyMove(state, move);
    if (!isInCheck(newState, color)) valid.push(move);
  }
  return valid;
}

export function isCheckmate(state: ChessState, color: Color): boolean {
  return isInCheck(state, color) && getValidMoves(state, color).length === 0;
}

export function isStalemate(state: ChessState, color: Color): boolean {
  return !isInCheck(state, color) && getValidMoves(state, color).length === 0;
}

export function isDraw(state: ChessState): boolean {
  if (state.halfMoveClock >= 100) return true;
  // Insufficient material
  const pieces: PieceType[] = [];
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      if (p) pieces.push(p.type);
    }
  if (pieces.length === 2) return true;
  if (pieces.length === 3 && pieces.some(t => t === 'bishop' || t === 'knight')) return true;
  return false;
}

export const PIECE_UNICODE: Record<PieceType, Record<Color, string>> = {
  king:   { white: '♔', black: '♚' },
  queen:  { white: '♕', black: '♛' },
  rook:   { white: '♖', black: '♜' },
  bishop: { white: '♗', black: '♝' },
  knight: { white: '♘', black: '♞' },
  pawn:   { white: '♙', black: '♟' },
};
