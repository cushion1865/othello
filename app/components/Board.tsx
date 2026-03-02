"use client";

import { Board as BoardType, Player, getFlippable } from "@/app/lib/othello";

interface Props {
  board: BoardType;
  validMoves: [number, number][];
  currentPlayer: Player;
  onCellClick: (row: number, col: number) => void;
  isThinking: boolean;
}

export default function Board({
  board,
  validMoves,
  currentPlayer,
  onCellClick,
  isThinking,
}: Props) {
  const validSet = new Set(validMoves.map(([r, c]) => `${r}-${c}`));

  return (
    <div className="inline-block border-4 border-amber-800 rounded shadow-2xl">
      {board.map((row, r) => (
        <div key={r} className="flex">
          {row.map((cell, c) => {
            const isValid = validSet.has(`${r}-${c}`);
            return (
              <div
                key={c}
                onClick={() => !isThinking && isValid && onCellClick(r, c)}
                className={[
                  "w-12 h-12 md:w-14 md:h-14 border border-amber-700",
                  "bg-emerald-700 flex items-center justify-center",
                  "relative transition-colors duration-150",
                  isValid && !isThinking
                    ? "cursor-pointer hover:bg-emerald-600"
                    : "",
                ].join(" ")}
              >
                {/* 石 */}
                {cell && (
                  <div
                    className={[
                      "w-9 h-9 md:w-10 md:h-10 rounded-full",
                      "shadow-lg transition-all duration-200",
                      cell === "black"
                        ? "bg-gray-900 ring-1 ring-gray-600"
                        : "bg-white ring-1 ring-gray-300",
                    ].join(" ")}
                  />
                )}
                {/* 置ける場所のヒント */}
                {!cell && isValid && !isThinking && (
                  <div
                    className={[
                      "w-3 h-3 rounded-full opacity-50",
                      currentPlayer === "black" ? "bg-gray-900" : "bg-white",
                    ].join(" ")}
                  />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
