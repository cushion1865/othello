"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Board from "@/app/components/Board";
import {
  Board as BoardType,
  Player,
  applyMove,
  createInitialBoard,
  countStones,
  getValidMoves,
  isGameOver,
  opponent,
} from "@/app/lib/othello";
import { Difficulty, getBestMove } from "@/app/lib/ai";

type GameState = "playing" | "gameover";

export default function Home() {
  const [board, setBoard] = useState<BoardType>(createInitialBoard);
  const [currentPlayer, setCurrentPlayer] = useState<Player>("black");
  const [humanColor, setHumanColor] = useState<Player>("black");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [gameState, setGameState] = useState<GameState>("playing");
  const [isThinking, setIsThinking] = useState(false);
  const [passMessage, setPassMessage] = useState<string | null>(null);

  const scores = countStones(board);
  const validMoves = getValidMoves(board, currentPlayer);
  const isAITurn = currentPlayer !== humanColor && gameState === "playing";

  const resetGame = useCallback(() => {
    setBoard(createInitialBoard());
    setCurrentPlayer("black");
    setGameState("playing");
    setIsThinking(false);
    setPassMessage(null);
  }, []);

  const makeMove = useCallback(
    (board: BoardType, row: number, col: number, player: Player) => {
      const newBoard = applyMove(board, row, col, player);
      const nextPlayer = opponent(player);
      const nextMoves = getValidMoves(newBoard, nextPlayer);

      if (isGameOver(newBoard)) {
        setBoard(newBoard);
        setGameState("gameover");
        return;
      }

      if (nextMoves.length === 0) {
        setPassMessage(`${nextPlayer === "black" ? "黒" : "白"}は置ける場所がないためパスします`);
        setTimeout(() => {
          setPassMessage(null);
          setBoard(newBoard);
          setCurrentPlayer(player);
        }, 1500);
      } else {
        setBoard(newBoard);
        setCurrentPlayer(nextPlayer);
      }
    },
    []
  );

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (isThinking || currentPlayer !== humanColor || gameState !== "playing") return;
      makeMove(board, row, col, currentPlayer);
    },
    [board, currentPlayer, humanColor, gameState, isThinking, makeMove]
  );

  const aiTurnRef = useRef(false);
  useEffect(() => {
    if (!isAITurn || isThinking || aiTurnRef.current) return;

    aiTurnRef.current = true;
    setIsThinking(true);

    const timer = setTimeout(() => {
      const aiPlayer = opponent(humanColor);
      const move = getBestMove(board, aiPlayer, difficulty);
      if (move) {
        makeMove(board, move[0], move[1], aiPlayer);
      }
      setIsThinking(false);
      aiTurnRef.current = false;
    }, 200);

    return () => clearTimeout(timer);
  }, [isAITurn, board, humanColor, difficulty, isThinking, makeMove]);

  const winner =
    gameState === "gameover"
      ? scores.black > scores.white
        ? "black"
        : scores.white > scores.black
        ? "white"
        : "draw"
      : null;

  const humanWon = winner === humanColor;
  const isDraw = winner === "draw";

  return (
    <main className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 gap-6">
      <h1 className="text-4xl font-bold tracking-tight">Othello</h1>

      {/* 設定パネル */}
      <div className="flex flex-wrap gap-4 items-center justify-center">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">あなたの色</span>
          <select
            value={humanColor}
            onChange={(e) => {
              setHumanColor(e.target.value as Player);
              resetGame();
            }}
            className="bg-gray-700 rounded px-3 py-1 text-sm"
          >
            <option value="black">黒（先手）</option>
            <option value="white">白（後手）</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">難易度</span>
          <select
            value={difficulty}
            onChange={(e) => {
              setDifficulty(e.target.value as Difficulty);
              resetGame();
            }}
            className="bg-gray-700 rounded px-3 py-1 text-sm"
          >
            <option value="easy">かんたん</option>
            <option value="normal">ふつう</option>
            <option value="hard">むずかしい</option>
          </select>
        </div>
        <button
          onClick={resetGame}
          className="bg-amber-600 hover:bg-amber-500 px-4 py-1.5 rounded text-sm font-semibold transition-colors"
        >
          リセット
        </button>
      </div>

      {/* スコア */}
      <div className="flex gap-8 text-center">
        <div className={`flex flex-col items-center gap-1 ${currentPlayer === "black" && gameState === "playing" ? "opacity-100" : "opacity-60"}`}>
          <div className="w-8 h-8 rounded-full bg-gray-900 ring-2 ring-gray-500 shadow" />
          <span className="text-2xl font-bold">{scores.black}</span>
          <span className="text-xs text-gray-400">黒{humanColor === "black" ? "（あなた）" : "（AI）"}</span>
        </div>
        <div className={`flex flex-col items-center gap-1 ${currentPlayer === "white" && gameState === "playing" ? "opacity-100" : "opacity-60"}`}>
          <div className="w-8 h-8 rounded-full bg-white ring-2 ring-gray-300 shadow" />
          <span className="text-2xl font-bold">{scores.white}</span>
          <span className="text-xs text-gray-400">白{humanColor === "white" ? "（あなた）" : "（AI）"}</span>
        </div>
      </div>

      {/* 状態メッセージ */}
      <div className="h-6 text-sm text-center">
        {passMessage && (
          <span className="text-yellow-400">{passMessage}</span>
        )}
        {!passMessage && gameState === "playing" && isThinking && (
          <span className="text-gray-400 animate-pulse">AI が考え中...</span>
        )}
        {!passMessage && gameState === "playing" && !isThinking && (
          <span className="text-gray-400">
            {currentPlayer === humanColor ? "あなたの番です" : "AIの番です"}
          </span>
        )}
      </div>

      {/* ボード */}
      <Board
        board={board}
        validMoves={currentPlayer === humanColor && gameState === "playing" ? validMoves : []}
        currentPlayer={currentPlayer}
        onCellClick={handleCellClick}
        isThinking={isThinking}
      />

      {/* ゲームオーバーモーダル */}
      {gameState === "gameover" && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
          <div className="bg-gray-800 rounded-2xl p-8 text-center shadow-2xl flex flex-col gap-4 min-w-[260px]">
            <h2 className="text-3xl font-bold">
              {isDraw ? "引き分け！" : humanWon ? "あなたの勝ち！" : "AIの勝ち"}
            </h2>
            <p className="text-gray-400">
              黒 {scores.black} vs 白 {scores.white}
            </p>
            <button
              onClick={resetGame}
              className="bg-amber-600 hover:bg-amber-500 px-6 py-2.5 rounded-xl font-semibold transition-colors"
            >
              もう一度
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
