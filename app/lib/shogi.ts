export type PieceType =
  | 'fu' | 'kyosha' | 'keima' | 'gin' | 'kin' | 'kaku' | 'hisha' | 'ou'
  | 'tokin' | 'narikyosha' | 'narikeima' | 'narigin' | 'uma' | 'ryu';

export type UnpromotedType = 'fu' | 'kyosha' | 'keima' | 'gin' | 'kin' | 'kaku' | 'hisha' | 'ou';
export type Owner = 'sente' | 'gote';

export interface Piece {
  type: PieceType;
  owner: Owner;
}

export type Board = (Piece | null)[][];
export type Hand = Partial<Record<Exclude<UnpromotedType, 'ou'>, number>>;

export interface ShogiState {
  board: Board;
  hand: { sente: Hand; gote: Hand };
  currentPlayer: Owner;
}

export interface BoardMove {
  type: 'move';
  from: [number, number];
  to: [number, number];
  promote?: boolean;
}

export interface DropMove {
  type: 'drop';
  piece: Exclude<UnpromotedType, 'ou'>;
  to: [number, number];
}

export type Move = BoardMove | DropMove;

export function createInitialBoard(): Board {
  const b: Board = Array.from({ length: 9 }, () => Array(9).fill(null));

  // 後手（gote）上側 rows 0-2
  b[0][0] = { type: 'kyosha', owner: 'gote' };
  b[0][1] = { type: 'keima',  owner: 'gote' };
  b[0][2] = { type: 'gin',    owner: 'gote' };
  b[0][3] = { type: 'kin',    owner: 'gote' };
  b[0][4] = { type: 'ou',     owner: 'gote' };
  b[0][5] = { type: 'kin',    owner: 'gote' };
  b[0][6] = { type: 'gin',    owner: 'gote' };
  b[0][7] = { type: 'keima',  owner: 'gote' };
  b[0][8] = { type: 'kyosha', owner: 'gote' };
  b[1][1] = { type: 'hisha',  owner: 'gote' };
  b[1][7] = { type: 'kaku',   owner: 'gote' };
  for (let c = 0; c < 9; c++) b[2][c] = { type: 'fu', owner: 'gote' };

  // 先手（sente）下側 rows 6-8
  for (let c = 0; c < 9; c++) b[6][c] = { type: 'fu', owner: 'sente' };
  b[7][1] = { type: 'kaku',   owner: 'sente' };
  b[7][7] = { type: 'hisha',  owner: 'sente' };
  b[8][0] = { type: 'kyosha', owner: 'sente' };
  b[8][1] = { type: 'keima',  owner: 'sente' };
  b[8][2] = { type: 'gin',    owner: 'sente' };
  b[8][3] = { type: 'kin',    owner: 'sente' };
  b[8][4] = { type: 'ou',     owner: 'sente' };
  b[8][5] = { type: 'kin',    owner: 'sente' };
  b[8][6] = { type: 'gin',    owner: 'sente' };
  b[8][7] = { type: 'keima',  owner: 'sente' };
  b[8][8] = { type: 'kyosha', owner: 'sente' };

  return b;
}

export function createInitialState(): ShogiState {
  return {
    board: createInitialBoard(),
    hand: { sente: {}, gote: {} },
    currentPlayer: 'sente',
  };
}

export function opponent(player: Owner): Owner {
  return player === 'sente' ? 'gote' : 'sente';
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < 9 && c >= 0 && c < 9;
}

// 後手は盤面が180度反転（row=0が後手の相手陣）
function forward(player: Owner): number {
  return player === 'sente' ? -1 : 1;
}

function promotionZone(player: Owner, row: number): boolean {
  return player === 'sente' ? row <= 2 : row >= 6;
}

export function canPromote(piece: Piece, fromRow: number, toRow: number): boolean {
  const p = piece.type;
  if (['tokin','narikyosha','narikeima','narigin','uma','ryu','kin','ou'].includes(p)) return false;
  return promotionZone(piece.owner, fromRow) || promotionZone(piece.owner, toRow);
}

export function mustPromote(pieceType: PieceType, player: Owner, toRow: number): boolean {
  if (pieceType === 'fu' || pieceType === 'kyosha') {
    return player === 'sente' ? toRow === 0 : toRow === 8;
  }
  if (pieceType === 'keima') {
    return player === 'sente' ? toRow <= 1 : toRow >= 7;
  }
  return false;
}

function promoteType(t: PieceType): PieceType {
  const map: Partial<Record<PieceType, PieceType>> = {
    fu: 'tokin', kyosha: 'narikyosha', keima: 'narikeima',
    gin: 'narigin', kaku: 'uma', hisha: 'ryu',
  };
  return map[t] ?? t;
}

export function demoteType(t: PieceType): Exclude<UnpromotedType, 'ou'> {
  const map: Partial<Record<PieceType, Exclude<UnpromotedType, 'ou'>>> = {
    tokin: 'fu', narikyosha: 'kyosha', narikeima: 'keima',
    narigin: 'gin', uma: 'kaku', ryu: 'hisha',
  };
  return (map[t] ?? t) as Exclude<UnpromotedType, 'ou'>;
}

// 駒の生の移動先（盤面の範囲チェックなし、敵味方チェックなし）
function getRawMoves(piece: Piece, r: number, c: number, board: Board): [number, number][] {
  const { type, owner } = piece;
  const fwd = forward(owner);
  const results: [number, number][] = [];

  const addSlide = (dr: number, dc: number) => {
    let nr = r + dr, nc = c + dc;
    while (inBounds(nr, nc)) {
      results.push([nr, nc]);
      if (board[nr][nc] !== null) break;
      nr += dr; nc += dc;
    }
  };

  const addStep = (dr: number, dc: number) => {
    const nr = r + dr, nc = c + dc;
    if (inBounds(nr, nc)) results.push([nr, nc]);
  };

  switch (type) {
    case 'fu':
      addStep(fwd, 0);
      break;
    case 'kyosha':
      addSlide(fwd, 0);
      break;
    case 'keima':
      addStep(fwd * 2, 1);
      addStep(fwd * 2, -1);
      break;
    case 'gin':
      addStep(fwd, -1); addStep(fwd, 0); addStep(fwd, 1);
      addStep(-fwd, -1); addStep(-fwd, 1);
      break;
    case 'kin': case 'tokin': case 'narikyosha': case 'narikeima': case 'narigin':
      addStep(fwd, -1); addStep(fwd, 0); addStep(fwd, 1);
      addStep(0, -1); addStep(0, 1);
      addStep(-fwd, 0);
      break;
    case 'kaku':
      addSlide(-1, -1); addSlide(-1, 1); addSlide(1, -1); addSlide(1, 1);
      break;
    case 'hisha':
      addSlide(-1, 0); addSlide(1, 0); addSlide(0, -1); addSlide(0, 1);
      break;
    case 'ou':
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++)
          if (dr !== 0 || dc !== 0) addStep(dr, dc);
      break;
    case 'uma':
      addSlide(-1, -1); addSlide(-1, 1); addSlide(1, -1); addSlide(1, 1);
      addStep(-1, 0); addStep(1, 0); addStep(0, -1); addStep(0, 1);
      break;
    case 'ryu':
      addSlide(-1, 0); addSlide(1, 0); addSlide(0, -1); addSlide(0, 1);
      addStep(-1, -1); addStep(-1, 1); addStep(1, -1); addStep(1, 1);
      break;
  }

  return results;
}

function cloneBoard(board: Board): Board {
  return board.map(row => row.map(cell => cell ? { ...cell } : null));
}

function cloneState(state: ShogiState): ShogiState {
  return {
    board: cloneBoard(state.board),
    hand: {
      sente: { ...state.hand.sente },
      gote:  { ...state.hand.gote },
    },
    currentPlayer: state.currentPlayer,
  };
}

export function applyMove(state: ShogiState, move: Move): ShogiState {
  const next = cloneState(state);
  const { board, hand } = next;

  if (move.type === 'drop') {
    board[move.to[0]][move.to[1]] = { type: move.piece, owner: state.currentPlayer };
    const h = hand[state.currentPlayer];
    const cnt = (h[move.piece] ?? 0) - 1;
    if (cnt <= 0) delete h[move.piece];
    else h[move.piece] = cnt;
  } else {
    const [fr, fc] = move.from;
    const [tr, tc] = move.to;
    const piece = board[fr][fc]!;
    const captured = board[tr][tc];

    if (captured) {
      const handPiece = demoteType(captured.type);
      const h = hand[state.currentPlayer];
      h[handPiece] = (h[handPiece] ?? 0) + 1;
    }

    const newType = move.promote ? promoteType(piece.type) : piece.type;
    board[tr][tc] = { type: newType, owner: piece.owner };
    board[fr][fc] = null;
  }

  next.currentPlayer = opponent(state.currentPlayer);
  return next;
}

export function isInCheck(state: ShogiState, player: Owner): boolean {
  // Find king position
  let kingRow = -1, kingCol = -1;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const p = state.board[r][c];
      if (p && p.owner === player && p.type === 'ou') {
        kingRow = r; kingCol = c;
      }
    }
  }
  if (kingRow === -1) return true; // no king = in check

  const opp = opponent(player);
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const p = state.board[r][c];
      if (!p || p.owner !== opp) continue;
      const targets = getRawMoves(p, r, c, state.board);
      for (const [tr, tc] of targets) {
        if (tr === kingRow && tc === kingCol) return true;
      }
    }
  }
  return false;
}

function getBoardMovesForPiece(state: ShogiState, r: number, c: number): Move[] {
  const piece = state.board[r][c];
  if (!piece || piece.owner !== state.currentPlayer) return [];

  const raw = getRawMoves(piece, r, c, state.board);
  const moves: Move[] = [];

  for (const [tr, tc] of raw) {
    const target = state.board[tr][tc];
    if (target && target.owner === state.currentPlayer) continue;

    const baseMove: BoardMove = { type: 'move', from: [r, c], to: [tr, tc] };

    const canProm = canPromote(piece, r, tr);
    const mustProm = mustPromote(piece.type, piece.owner, tr);

    if (mustProm) {
      moves.push({ ...baseMove, promote: true });
    } else if (canProm) {
      moves.push({ ...baseMove, promote: false });
      moves.push({ ...baseMove, promote: true });
    } else {
      moves.push(baseMove);
    }
  }

  return moves;
}

function getDropMoves(state: ShogiState): Move[] {
  const h = state.hand[state.currentPlayer];
  const moves: Move[] = [];
  const pieces = Object.keys(h) as Exclude<UnpromotedType, 'ou'>[];

  for (const pieceType of pieces) {
    if (!h[pieceType]) continue;

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (state.board[r][c] !== null) continue;
        if (mustPromote(pieceType, state.currentPlayer, r)) continue;

        // 二歩禁止
        if (pieceType === 'fu') {
          let hasFu = false;
          for (let rr = 0; rr < 9; rr++) {
            const p = state.board[rr][c];
            if (p && p.owner === state.currentPlayer && p.type === 'fu') {
              hasFu = true; break;
            }
          }
          if (hasFu) continue;
        }

        moves.push({ type: 'drop', piece: pieceType, to: [r, c] });
      }
    }
  }

  return moves;
}

export function getValidMoves(state: ShogiState, player: Owner): Move[] {
  const savedPlayer = state.currentPlayer;
  const stateForPlayer = { ...state, currentPlayer: player };

  const candidates: Move[] = [];

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      candidates.push(...getBoardMovesForPiece(stateForPlayer, r, c));
    }
  }
  candidates.push(...getDropMoves(stateForPlayer));

  // Filter: must not leave own king in check
  // Also filter: 打ち歩詰め
  const legal: Move[] = [];
  for (const move of candidates) {
    const next = applyMove(stateForPlayer, move);
    if (isInCheck(next, player)) continue;

    // 打ち歩詰め check
    if (move.type === 'drop' && move.piece === 'fu') {
      const opp = opponent(player);
      const oppMoves = getValidMovesUnchecked(next, opp);
      const oppLegal = oppMoves.filter(m => {
        const nn = applyMove(next, m);
        return !isInCheck(nn, opp);
      });
      if (oppLegal.length === 0) continue; // 打ち歩詰め
    }

    legal.push(move);
  }

  return legal;
}

function getValidMovesUnchecked(state: ShogiState, player: Owner): Move[] {
  const stateForPlayer = { ...state, currentPlayer: player };
  const candidates: Move[] = [];
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      candidates.push(...getBoardMovesForPiece(stateForPlayer, r, c));
  candidates.push(...getDropMoves(stateForPlayer));
  return candidates;
}

export function isCheckmate(state: ShogiState, player: Owner): boolean {
  if (!isInCheck(state, player)) return false;
  return getValidMoves(state, player).length === 0;
}

export function isStalemate(state: ShogiState, player: Owner): boolean {
  return getValidMoves(state, player).length === 0;
}

export const PIECE_LABELS: Record<PieceType, string> = {
  fu: '歩', kyosha: '香', keima: '桂', gin: '銀', kin: '金',
  kaku: '角', hisha: '飛', ou: '王',
  tokin: 'と', narikyosha: '杏', narikeima: '圭', narigin: '全',
  uma: '馬', ryu: '竜',
};

export const PROMOTED_TYPES: PieceType[] = ['tokin','narikyosha','narikeima','narigin','uma','ryu'];
