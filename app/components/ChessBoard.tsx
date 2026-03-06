"use client";

import { ChessState, Move, Color, PIECE_UNICODE } from '@/app/lib/chess';

interface Props {
  state: ChessState;
  validMoves: Move[];
  selectedFrom: [number, number] | null;
  onCellClick: (r: number, c: number) => void;
  humanPlayer: Color;
  lastAiMove?: Move | null;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

export default function ChessBoard({ state, validMoves, selectedFrom, onCellClick, humanPlayer, lastAiMove }: Props) {
  const flipped = humanPlayer === 'black';

  // Valid move destinations from selected piece
  const moveTargets = new Set<string>();
  if (selectedFrom) {
    for (const m of validMoves) {
      if (m.from[0] === selectedFrom[0] && m.from[1] === selectedFrom[1])
        moveTargets.add(`${m.to[0]},${m.to[1]}`);
    }
  }

  // Last AI move highlight
  const aiMoveSet = new Set<string>();
  if (lastAiMove) {
    aiMoveSet.add(`${lastAiMove.from[0]},${lastAiMove.from[1]}`);
    aiMoveSet.add(`${lastAiMove.to[0]},${lastAiMove.to[1]}`);
  }

  const rows = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const cols = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

  return (
    <div className="flex flex-col items-center select-none">
      {/* File labels top */}
      <div className="flex ml-5">
        {cols.map(c => (
          <div key={c} className="w-10 sm:w-12 text-center text-xs text-gray-500">{FILES[c]}</div>
        ))}
      </div>

      <div className="flex">
        {/* Rank labels left */}
        <div className="flex flex-col">
          {rows.map(r => (
            <div key={r} className="h-10 sm:h-12 flex items-center justify-center w-5 text-xs text-gray-500">
              {8 - r}
            </div>
          ))}
        </div>

        {/* Board */}
        <div className="border-2 border-gray-600">
          {rows.map(r => (
            <div key={r} className="flex">
              {cols.map(c => {
                const isLight = (r + c) % 2 === 0;
                const key = `${r},${c}`;
                const isSelected = selectedFrom?.[0] === r && selectedFrom?.[1] === c;
                const isMoveTarget = moveTargets.has(key);
                const isAiMove = aiMoveSet.has(key);
                const cell = state.board[r][c];

                let bgClass: string;
                if (isSelected) {
                  bgClass = 'bg-yellow-300';
                } else if (isAiMove) {
                  bgClass = isLight ? 'bg-green-200' : 'bg-green-600';
                } else {
                  bgClass = isLight ? 'bg-amber-100' : 'bg-amber-700';
                }

                return (
                  <div
                    key={c}
                    onClick={() => onCellClick(r, c)}
                    className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center cursor-pointer relative ${bgClass}`}
                  >
                    {cell && (
                      <span
                        className={`text-2xl sm:text-3xl leading-none ${cell.color === 'white' ? 'text-white' : 'text-gray-900'}`}
                        style={{
                          textShadow: cell.color === 'white'
                            ? '0 0 3px #000, 0 0 3px #000, 1px 1px 0 #000'
                            : '0 0 2px rgba(255,255,255,0.8), 0 0 4px rgba(255,255,255,0.4)',
                        }}
                      >
                        {PIECE_UNICODE[cell.type][cell.color]}
                      </span>
                    )}
                    {/* Move target indicator */}
                    {isMoveTarget && !cell && (
                      <div className="w-3 h-3 rounded-full bg-blue-500/60 pointer-events-none" />
                    )}
                    {isMoveTarget && cell && (
                      <div className="absolute inset-0 border-4 border-blue-400/70 pointer-events-none" />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* File labels bottom */}
      <div className="flex ml-5">
        {cols.map(c => (
          <div key={c} className="w-10 sm:w-12 text-center text-xs text-gray-500">{FILES[c]}</div>
        ))}
      </div>
    </div>
  );
}
