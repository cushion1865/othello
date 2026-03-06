"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import ChessBoard from "@/app/components/ChessBoard";
import {
  ChessState, Move, Color, PromotionPiece, PIECE_UNICODE,
  createInitialState, getValidMoves, applyMove,
  isCheckmate, isStalemate, isDraw, isInCheck, opponent,
} from "@/app/lib/chess";
import { getBestMove, Difficulty } from "@/app/lib/chess-ai";

type GameStatus = 'playing' | 'gameover';
type GameResult = Color | 'draw' | null;

interface PromotionPending {
  from: [number, number];
  to: [number, number];
}

const PROMOTION_PIECES: PromotionPiece[] = ['queen', 'rook', 'bishop', 'knight'];
const PROMOTION_LABELS: Record<PromotionPiece, string> = {
  queen: 'クイーン', rook: 'ルーク', bishop: 'ビショップ', knight: 'ナイト',
};

export default function ChessPage() {
  const [state, setState] = useState<ChessState>(createInitialState);
  const [humanPlayer, setHumanPlayer] = useState<Color>('white');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [gameStatus, setGameStatus] = useState<GameStatus>('playing');
  const [gameResult, setGameResult] = useState<GameResult>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [selectedFrom, setSelectedFrom] = useState<[number, number] | null>(null);
  const [promotionPending, setPromotionPending] = useState<PromotionPending | null>(null);
  const [lastAiMove, setLastAiMove] = useState<Move | null>(null);
  const [statusMsg, setStatusMsg] = useState('');

  const validMoves = getValidMoves(state, state.currentPlayer);
  const isAITurn = state.currentPlayer !== humanPlayer && gameStatus === 'playing';

  const checkGameOver = useCallback((newState: ChessState, lastMover: Color) => {
    const next = newState.currentPlayer;
    if (isCheckmate(newState, next)) {
      setGameResult(lastMover);
      setGameStatus('gameover');
      return true;
    }
    if (isStalemate(newState, next)) {
      setGameResult('draw');
      setGameStatus('gameover');
      return true;
    }
    if (isDraw(newState)) {
      setGameResult('draw');
      setGameStatus('gameover');
      return true;
    }
    if (isInCheck(newState, next)) {
      setStatusMsg('チェック！');
    } else {
      setStatusMsg('');
    }
    return false;
  }, []);

  const resetGame = useCallback(() => {
    setState(createInitialState());
    setGameStatus('playing');
    setGameResult(null);
    setIsThinking(false);
    setSelectedFrom(null);
    setPromotionPending(null);
    setLastAiMove(null);
    setStatusMsg('');
  }, []);

  const executeMove = useCallback((move: Move) => {
    setSelectedFrom(null);
    setLastAiMove(null);
    const mover = state.currentPlayer;
    const newState = applyMove(state, move);
    setState(newState);
    checkGameOver(newState, mover);
  }, [state, checkGameOver]);

  const handleCellClick = useCallback((r: number, c: number) => {
    if (isThinking || gameStatus !== 'playing' || state.currentPlayer !== humanPlayer) return;
    if (promotionPending) return;

    const cell = state.board[r][c];

    if (selectedFrom) {
      const [sr, sc] = selectedFrom;

      // Deselect
      if (sr === r && sc === c) { setSelectedFrom(null); return; }

      // Try to move
      const matchingMoves = validMoves.filter(
        m => m.from[0] === sr && m.from[1] === sc && m.to[0] === r && m.to[1] === c
      );

      if (matchingMoves.length > 0) {
        // Check if this is a pawn promotion (multiple moves with different promotions)
        if (matchingMoves[0].promotion !== undefined) {
          setPromotionPending({ from: [sr, sc], to: [r, c] });
        } else {
          executeMove(matchingMoves[0]);
        }
        return;
      }

      // Reselect own piece
      if (cell?.color === humanPlayer) {
        const hasMoves = validMoves.some(m => m.from[0] === r && m.from[1] === c);
        if (hasMoves) { setSelectedFrom([r, c]); return; }
      }

      setSelectedFrom(null);
      return;
    }

    // Select own piece
    if (cell?.color === humanPlayer) {
      const hasMoves = validMoves.some(m => m.from[0] === r && m.from[1] === c);
      if (hasMoves) setSelectedFrom([r, c]);
    }
  }, [isThinking, gameStatus, state, humanPlayer, validMoves, selectedFrom, promotionPending, executeMove]);

  const handlePromotion = useCallback((piece: PromotionPiece) => {
    if (!promotionPending) return;
    setPromotionPending(null);
    executeMove({ from: promotionPending.from, to: promotionPending.to, promotion: piece });
  }, [promotionPending, executeMove]);

  const aiTurnRef = useRef(false);
  useEffect(() => {
    if (!isAITurn || aiTurnRef.current) return;
    aiTurnRef.current = true;
    setIsThinking(true);

    const timer = setTimeout(() => {
      const aiColor = opponent(humanPlayer);
      const move = getBestMove(state, aiColor, difficulty);
      if (move) {
        const mover = state.currentPlayer;
        const newState = applyMove(state, move);
        setState(newState);
        setLastAiMove(move);
        checkGameOver(newState, mover);
      }
      setIsThinking(false);
      aiTurnRef.current = false;
    }, 300);

    return () => clearTimeout(timer);
  }, [isAITurn, state, humanPlayer, difficulty, checkGameOver]);

  const resultText = () => {
    if (gameResult === 'draw') return '引き分け';
    if (gameResult === humanPlayer) return 'あなたの勝ち！';
    return 'AIの勝ち';
  };

  const humanTurnText = () => {
    if (isThinking) return 'AI が考え中...';
    if (state.currentPlayer === humanPlayer) {
      return statusMsg ? statusMsg : 'あなたの番です';
    }
    return 'AIの番です';
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 gap-4">
      <div className="flex items-center gap-4 w-full max-w-xl">
        <Link href="/" className="text-gray-400 hover:text-white text-sm transition-colors">
          ← ゲーム一覧
        </Link>
        <h1 className="text-4xl font-bold tracking-tight">Chess</h1>
      </div>

      {/* Settings */}
      <div className="flex flex-wrap gap-4 items-center justify-center">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">あなた</span>
          <select
            value={humanPlayer}
            onChange={e => { setHumanPlayer(e.target.value as Color); resetGame(); }}
            className="bg-gray-700 rounded px-3 py-1 text-sm"
          >
            <option value="white">白（先手）</option>
            <option value="black">黒（後手）</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">難易度</span>
          <select
            value={difficulty}
            onChange={e => { setDifficulty(e.target.value as Difficulty); resetGame(); }}
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

      {/* Status */}
      <div className="h-6 text-sm text-center">
        {gameStatus === 'playing' && (
          <span className={`${isThinking ? 'text-gray-400 animate-pulse' : statusMsg === 'チェック！' ? 'text-red-400 font-bold' : 'text-gray-400'}`}>
            {humanTurnText()}
          </span>
        )}
      </div>

      <ChessBoard
        state={state}
        validMoves={gameStatus === 'playing' && state.currentPlayer === humanPlayer ? validMoves : []}
        selectedFrom={selectedFrom}
        onCellClick={handleCellClick}
        humanPlayer={humanPlayer}
        lastAiMove={lastAiMove}
      />

      {/* Promotion dialog */}
      {promotionPending && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl p-8 text-center shadow-2xl flex flex-col gap-4 min-w-[260px]">
            <h2 className="text-xl font-bold">プロモーション</h2>
            <p className="text-gray-400 text-sm">どの駒に成りますか？</p>
            <div className="grid grid-cols-2 gap-3">
              {PROMOTION_PIECES.map(p => (
                <button
                  key={p}
                  onClick={() => handlePromotion(p)}
                  className="bg-amber-600 hover:bg-amber-500 px-4 py-3 rounded-xl font-semibold transition-colors flex flex-col items-center gap-1"
                >
                  <span className="text-2xl">{PIECE_UNICODE[p][humanPlayer]}</span>
                  <span className="text-sm">{PROMOTION_LABELS[p]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Game over modal */}
      {gameStatus === 'gameover' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl p-8 text-center shadow-2xl flex flex-col gap-4 min-w-[260px]">
            <h2 className="text-3xl font-bold">{resultText()}</h2>
            <p className="text-gray-400 text-sm">
              {gameResult === 'draw'
                ? 'ドロー'
                : `${gameResult === 'white' ? '白' : '黒'}の勝利`}
            </p>
            <button
              onClick={resetGame}
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
