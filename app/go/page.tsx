"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import GoBoard from "@/app/components/GoBoard";
import {
  GoState, Move, Color, BoardSize,
  createInitialState, applyMove, isGameOver, calculateScore, opponent,
} from "@/app/lib/go";
import { getBestMove, Difficulty } from "@/app/lib/go-ai";

type GameStatus = 'playing' | 'gameover';

export default function GoPage() {
  const [boardSize, setBoardSize] = useState<BoardSize>(9);
  const [humanPlayer, setHumanPlayer] = useState<Color>('black');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [state, setState] = useState<GoState>(() => createInitialState(9));
  const [gameStatus, setGameStatus] = useState<GameStatus>('playing');
  const [isThinking, setIsThinking] = useState(false);
  const [showScore, setShowScore] = useState(false);

  const isAITurn = state.currentPlayer !== humanPlayer && gameStatus === 'playing';
  const score = calculateScore(state);

  const resetGame = useCallback((size: BoardSize = boardSize, color: Color = humanPlayer) => {
    setState(createInitialState(size));
    setGameStatus('playing');
    setIsThinking(false);
    setShowScore(false);
  }, [boardSize, humanPlayer]);

  const executeMove = useCallback((move: Move) => {
    const newState = applyMove(state, move);
    if (!newState) return;
    setState(newState);
    if (isGameOver(newState)) {
      setGameStatus('gameover');
      setShowScore(true);
    }
  }, [state]);

  const handleCellClick = useCallback((r: number, c: number) => {
    if (isThinking || gameStatus !== 'playing' || state.currentPlayer !== humanPlayer) return;
    executeMove({ type: 'place', r, c });
  }, [isThinking, gameStatus, state, humanPlayer, executeMove]);

  const handlePass = useCallback(() => {
    if (isThinking || gameStatus !== 'playing' || state.currentPlayer !== humanPlayer) return;
    executeMove({ type: 'pass' });
  }, [isThinking, gameStatus, state, humanPlayer, executeMove]);

  const aiTurnRef = useRef(false);
  useEffect(() => {
    if (!isAITurn || aiTurnRef.current) return;
    aiTurnRef.current = true;
    setIsThinking(true);

    const timer = setTimeout(() => {
      const aiColor = opponent(humanPlayer);
      const move = getBestMove(state, aiColor, difficulty);
      const newState = applyMove(state, move);
      if (newState) {
        setState(newState);
        if (isGameOver(newState)) {
          setGameStatus('gameover');
          setShowScore(true);
        }
      }
      setIsThinking(false);
      aiTurnRef.current = false;
    }, 400);

    return () => clearTimeout(timer);
  }, [isAITurn, state, humanPlayer, difficulty]);

  const winner = score.blackTotal > score.whiteTotal ? 'black' : 'white';
  const margin = Math.abs(score.blackTotal - score.whiteTotal).toFixed(1);

  return (
    <main className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 gap-4">
      <div className="flex items-center gap-4 w-full max-w-2xl">
        <Link href="/" className="text-gray-400 hover:text-white text-sm transition-colors">
          ← ゲーム一覧
        </Link>
        <h1 className="text-4xl font-bold tracking-tight">囲碁</h1>
      </div>

      {/* Settings */}
      <div className="flex flex-wrap gap-3 items-center justify-center">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">盤面</span>
          <select
            value={boardSize}
            onChange={e => {
              const s = Number(e.target.value) as BoardSize;
              setBoardSize(s);
              setState(createInitialState(s));
              setGameStatus('playing');
              setIsThinking(false);
              setShowScore(false);
            }}
            className="bg-gray-700 rounded px-3 py-1 text-sm"
          >
            <option value={9}>9×9</option>
            <option value={13}>13×13</option>
            <option value={19}>19×19</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">あなた</span>
          <select
            value={humanPlayer}
            onChange={e => {
              const c = e.target.value as Color;
              setHumanPlayer(c);
              setState(createInitialState(boardSize));
              setGameStatus('playing');
              setIsThinking(false);
              setShowScore(false);
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
            onChange={e => setDifficulty(e.target.value as Difficulty)}
            className="bg-gray-700 rounded px-3 py-1 text-sm"
          >
            <option value="easy">かんたん</option>
            <option value="normal">ふつう</option>
            <option value="hard">むずかしい</option>
          </select>
        </div>
        <button
          onClick={() => resetGame()}
          className="bg-amber-600 hover:bg-amber-500 px-4 py-1.5 rounded text-sm font-semibold transition-colors"
        >
          リセット
        </button>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-gray-400">
          {gameStatus === 'playing'
            ? isThinking
              ? 'AI が考え中...'
              : state.currentPlayer === humanPlayer
                ? 'あなたの番です'
                : 'AIの番です'
            : '対局終了'}
        </span>
        <span className="text-gray-500">|</span>
        <span className="text-gray-400">
          黒の取り石: <span className="text-white font-bold">{state.captures.black}</span>
        </span>
        <span className="text-gray-400">
          白の取り石: <span className="text-white font-bold">{state.captures.white}</span>
        </span>
      </div>

      {/* Board */}
      <GoBoard
        state={state}
        onCellClick={handleCellClick}
        humanPlayer={humanPlayer}
        disabled={isThinking || gameStatus !== 'playing' || state.currentPlayer !== humanPlayer}
      />

      {/* Pass button — always rendered to prevent layout shift */}
      <button
        onClick={handlePass}
        disabled={isThinking || gameStatus !== 'playing' || state.currentPlayer !== humanPlayer}
        className="px-6 py-2 rounded-lg text-sm font-semibold transition-colors bg-gray-700 hover:bg-gray-600 disabled:opacity-20 disabled:cursor-default disabled:hover:bg-gray-700"
      >
        パス
      </button>

      {/* Score display (during game) */}
      <div className="text-xs text-gray-500 text-center">
        参考スコア: 黒 {score.blackTotal.toFixed(1)} | 白 {score.whiteTotal.toFixed(1)}（コミ {score.komi}）
      </div>

      {/* Game over modal */}
      {gameStatus === 'gameover' && showScore && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl p-8 text-center shadow-2xl flex flex-col gap-4 min-w-[280px]">
            <h2 className="text-3xl font-bold">
              {winner === humanPlayer ? 'あなたの勝ち！' : 'AIの勝ち'}
            </h2>
            <p className="text-gray-400 text-sm">{winner === 'black' ? '黒' : '白'}の勝利（{margin}目差）</p>
            <div className="bg-gray-700 rounded-xl p-4 text-sm text-left space-y-1">
              <div className="flex justify-between">
                <span>黒: 地 {score.blackTerritory} + 石 {score.blackStones}</span>
                <span className="font-bold">{score.blackTotal.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span>白: 地 {score.whiteTerritory} + 石 {score.whiteStones} + コミ {score.komi}</span>
                <span className="font-bold">{score.whiteTotal.toFixed(1)}</span>
              </div>
            </div>
            <button
              onClick={() => resetGame()}
              className="bg-amber-600 hover:bg-amber-500 px-6 py-2.5 rounded-xl font-semibold transition-colors"
            >
              もう一度
            </button>
            <Link href="/" className="text-gray-400 hover:text-white text-sm transition-colors">
              ゲーム一覧へ戻る
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
