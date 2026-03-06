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
  lastAiMove?: Move | null;
}

const HAND_PIECE_ORDER: Exclude<UnpromotedType, 'ou'>[] = ['hisha','kaku','kin','gin','keima','kyosha','fu'];

export default function ShogiBoard({
  state, validMoves, selectedFrom, selectedDrop, onCellClick, onHandClick, humanPlayer, lastAiMove,
}: Props) {
  // AI の直前の手のセルをハイライト
  const aiMoveSet = new Set<string>();
  if (lastAiMove) {
    if (lastAiMove.type === 'move') {
      aiMoveSet.add(`${lastAiMove.from[0]},${lastAiMove.from[1]}`);
    }
    aiMoveSet.add(`${lastAiMove.to[0]},${lastAiMove.to[1]}`);
  }

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
      <div
        className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-sm border shadow-sm select-none
          ${isPromoted
            ? 'bg-red-50 border-red-400'
            : 'bg-amber-50 border-amber-700/60'
          }
          ${isGote ? 'rotate-180' : ''}
        `}
      >
        <span className={`text-sm sm:text-base font-bold leading-none ${isPromoted ? 'text-red-700' : 'text-gray-900'}`}>
          {PIECE_LABELS[piece.type]}
        </span>
      </div>
    );
  };

  const renderHand = (owner: Owner) => {
    const h = state.hand[owner];
    const isHuman = owner === humanPlayer;
    return (
      <div className={`flex flex-wrap gap-1 items-center min-h-[40px] px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg w-full max-w-[360px] sm:max-w-[400px] ${owner === 'gote' ? 'rotate-180' : ''}`}>
        <span className={`text-xs text-gray-400 mr-1 whitespace-nowrap ${owner === 'gote' ? 'rotate-180' : ''}`}>
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
              className={`w-8 h-8 flex items-center justify-center rounded-sm border font-bold transition-colors relative
                ${isSelected
                  ? 'border-yellow-400 bg-yellow-100 ring-2 ring-yellow-400'
                  : isHuman
                    ? 'border-amber-700/60 bg-amber-50 hover:bg-yellow-100 cursor-pointer'
                    : 'border-amber-700/60 bg-amber-50 cursor-default'
                }`}
            >
              <span className="text-sm text-gray-900 font-bold leading-none">
                {PIECE_LABELS[pt]}
              </span>
              {cnt > 1 && (
                <span className="absolute -bottom-1 -right-1 text-[10px] text-white bg-gray-600 rounded-full w-4 h-4 flex items-center justify-center leading-none">
                  {cnt}
                </span>
              )}
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
        className="border-2 border-amber-900 bg-amber-700 gap-px"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)' }}
      >
        {state.board.map((row, r) =>
          row.map((cell, c) => {
            const isHighlight = highlightSet.has(`${r},${c}`);
            const isAiMove = aiMoveSet.has(`${r},${c}`);
            const isSelected = selectedFrom
              ? selectedFrom[0] === r && selectedFrom[1] === c
              : false;
            const isOwn = cell?.owner === humanPlayer;
            const isSelectable = !selectedDrop && isOwn && state.currentPlayer === humanPlayer;

            return (
              <div
                key={`${r}-${c}`}
                onClick={() => onCellClick(r, c)}
                className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center cursor-pointer transition-colors
                  ${isSelected
                    ? 'bg-yellow-300'
                    : isHighlight
                      ? 'bg-blue-300/80'
                      : isAiMove
                        ? 'bg-green-300/80'
                        : isSelectable && cell
                          ? 'bg-amber-200 hover:bg-yellow-200'
                          : 'bg-amber-200 hover:bg-amber-300'
                  }
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
