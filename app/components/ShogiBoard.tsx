"use client";

import { ShogiState, Move, Owner, PieceType, PIECE_LABELS, PROMOTED_TYPES, UnpromotedType } from '@/app/lib/shogi';

interface Props {
  state: ShogiState;
  validMoves: Move[];
  selectedFrom: [number, number] | null;
  selectedDrop: Exclude<UnpromotedType, 'ou'> | null;
  onCellClick: (r: number, c: number) => void;
  onHandClick: (piece: Exclude<UnpromotedType, 'ou'>, owner: Owner) => void;
  humanPlayer: Owner;
}

const HAND_PIECE_ORDER: Exclude<UnpromotedType, 'ou'>[] = ['hisha','kaku','kin','gin','keima','kyosha','fu'];

export default function ShogiBoard({
  state, validMoves, selectedFrom, selectedDrop, onCellClick, onHandClick, humanPlayer,
}: Props) {
  const highlightSet = new Set<string>();
  for (const m of validMoves) {
    if (selectedFrom) {
      if (m.type === 'move') {
        const [fr, fc] = m.from;
        if (fr === selectedFrom[0] && fc === selectedFrom[1]) {
          highlightSet.add(`${m.to[0]},${m.to[1]}`);
        }
      }
    } else if (selectedDrop) {
      if (m.type === 'drop' && m.piece === selectedDrop) {
        highlightSet.add(`${m.to[0]},${m.to[1]}`);
      }
    }
  }

  const renderPiece = (piece: { type: PieceType; owner: Owner }) => {
    const isGote = piece.owner === 'gote';
    const isPromoted = PROMOTED_TYPES.includes(piece.type);
    return (
      <span
        className={`text-sm sm:text-base font-bold leading-none select-none ${
          isPromoted ? 'text-red-500' : isGote ? 'text-gray-100' : 'text-gray-900'
        } ${isGote ? 'rotate-180 inline-block' : ''}`}
      >
        {PIECE_LABELS[piece.type]}
      </span>
    );
  };

  const renderHand = (owner: Owner) => {
    const h = state.hand[owner];
    const isHuman = owner === humanPlayer;
    return (
      <div className={`flex flex-wrap gap-1 items-center min-h-[36px] px-2 py-1 bg-amber-900/20 rounded-lg ${owner === 'gote' ? 'rotate-180' : ''}`}>
        <span className={`text-xs text-gray-400 mr-1 ${owner === 'gote' ? 'rotate-180' : ''}`}>
          {isHuman ? '手駒（あなた）' : '手駒（AI）'}
        </span>
        {HAND_PIECE_ORDER.map(pt => {
          const cnt = h[pt] ?? 0;
          if (cnt === 0) return null;
          const isSelected = selectedDrop === pt && isHuman;
          return (
            <button
              key={pt}
              onClick={() => isHuman ? onHandClick(pt, owner) : undefined}
              disabled={!isHuman}
              className={`w-8 h-8 flex items-center justify-center rounded border text-sm font-bold transition-colors
                ${isSelected
                  ? 'border-yellow-400 bg-yellow-400/30'
                  : isHuman
                    ? 'border-amber-600 bg-amber-800/40 hover:bg-amber-700/40 cursor-pointer'
                    : 'border-gray-600 bg-gray-700/40 cursor-default'
                }`}
            >
              <span className={`text-xs ${PROMOTED_TYPES.includes(pt) ? 'text-red-400' : owner === 'gote' ? 'text-gray-100' : 'text-gray-900'}`}>
                {PIECE_LABELS[pt]}{cnt > 1 ? cnt : ''}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {/* 後手手駒 */}
      {renderHand('gote')}

      {/* ボード */}
      <div
        className="border-2 border-amber-700 bg-amber-100"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)' }}
      >
        {state.board.map((row, r) =>
          row.map((cell, c) => {
            const isHighlight = highlightSet.has(`${r},${c}`);
            const isSelected = selectedFrom
              ? selectedFrom[0] === r && selectedFrom[1] === c
              : false;
            const isOwn = cell?.owner === humanPlayer;
            const isSelectable = !selectedDrop && isOwn && state.currentPlayer === humanPlayer;

            return (
              <div
                key={`${r}-${c}`}
                onClick={() => onCellClick(r, c)}
                className={`w-9 h-9 sm:w-10 sm:h-10 border border-amber-600 flex items-center justify-center cursor-pointer transition-colors
                  ${isSelected ? 'bg-yellow-300' : isHighlight ? 'bg-green-300/70' : 'bg-amber-100 hover:bg-amber-200'}
                  ${isSelectable && cell ? 'hover:bg-yellow-200' : ''}
                `}
              >
                {cell && renderPiece(cell)}
              </div>
            );
          })
        )}
      </div>

      {/* 先手手駒 */}
      {renderHand('sente')}
    </div>
  );
}
