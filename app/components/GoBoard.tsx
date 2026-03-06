"use client";

import { useState } from "react";
import { GoState, Color, STAR_POINTS, isLegal } from "@/app/lib/go";

interface Props {
  state: GoState;
  onCellClick: (r: number, c: number) => void;
  humanPlayer: Color;
  disabled: boolean;
}

// Cell size in px per board size
const CELL_SIZE: Record<number, number> = { 9: 48, 13: 40, 19: 32 };
const STONE_RATIO = 0.88;

export default function GoBoard({ state, onCellClick, humanPlayer, disabled }: Props) {
  const [hoverPos, setHoverPos] = useState<[number, number] | null>(null);

  const { board, size, currentPlayer, lastMove } = state;
  const cellPx = CELL_SIZE[size] ?? 36;
  const stonePx = Math.round(cellPx * STONE_RATIO);

  const starSet = new Set((STAR_POINTS[size] ?? []).map(([r, c]) => `${r},${c}`));
  const isHumanTurn = currentPlayer === humanPlayer && !disabled;

  return (
    <div
      className="relative inline-block"
      style={{ backgroundColor: '#dcb870', padding: cellPx / 2 }}
      onMouseLeave={() => setHoverPos(null)}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${size}, ${cellPx}px)`,
          gridTemplateRows: `repeat(${size}, ${cellPx}px)`,
        }}
      >
        {board.map((row, r) =>
          row.map((cell, c) => {
            const key = `${r},${c}`;
            const isHoshi = starSet.has(key) && !cell;
            const isLastMove = lastMove && lastMove[0] === r && lastMove[1] === c;
            const isHover = !disabled && hoverPos?.[0] === r && hoverPos?.[1] === c && !cell && isHumanTurn;
            const canPlace = isHumanTurn && !cell;

            return (
              <div
                key={key}
                className="relative flex items-center justify-center"
                style={{ width: cellPx, height: cellPx, cursor: canPlace ? 'pointer' : 'default' }}
                onClick={() => !disabled && isHumanTurn && onCellClick(r, c)}
                onMouseEnter={() => setHoverPos([r, c])}
              >
                {/* Horizontal grid line */}
                <div
                  className="absolute top-1/2 bg-amber-950"
                  style={{
                    height: 1,
                    left: c === 0 ? '50%' : 0,
                    right: c === size - 1 ? '50%' : 0,
                    transform: 'translateY(-50%)',
                  }}
                />
                {/* Vertical grid line */}
                <div
                  className="absolute left-1/2 bg-amber-950"
                  style={{
                    width: 1,
                    top: r === 0 ? '50%' : 0,
                    bottom: r === size - 1 ? '50%' : 0,
                    transform: 'translateX(-50%)',
                  }}
                />

                {/* Star point (hoshi) */}
                {isHoshi && (
                  <div
                    className="absolute rounded-full bg-amber-950 pointer-events-none"
                    style={{
                      width: 6,
                      height: 6,
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                    }}
                  />
                )}

                {/* Ghost stone on hover */}
                {isHover && isLegal(state, r, c) && (
                  <div
                    className={`absolute rounded-full pointer-events-none ${
                      currentPlayer === 'black' ? 'bg-gray-900' : 'bg-white'
                    }`}
                    style={{
                      width: stonePx,
                      height: stonePx,
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      opacity: 0.45,
                    }}
                  />
                )}

                {/* Stone */}
                {cell && (
                  <div
                    className={`absolute rounded-full pointer-events-none ${
                      cell === 'black'
                        ? 'bg-gradient-to-br from-gray-600 to-gray-900'
                        : 'bg-gradient-to-br from-white to-gray-200 border border-gray-300'
                    }`}
                    style={{
                      width: stonePx,
                      height: stonePx,
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      boxShadow: '1px 2px 4px rgba(0,0,0,0.5)',
                    }}
                  >
                    {/* Last move marker */}
                    {isLastMove && (
                      <div
                        className={`absolute rounded-full ${cell === 'black' ? 'bg-white' : 'bg-gray-600'}`}
                        style={{
                          width: '30%',
                          height: '30%',
                          top: '35%',
                          left: '35%',
                          opacity: 0.7,
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
