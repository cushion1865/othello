"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import ShogiBoard from "@/app/components/ShogiBoard";
import {
  ShogiState, Move, Owner, UnpromotedType, PieceType,
  createInitialState, getValidMoves, applyMove, isCheckmate, isStalemate,
  canPromote, mustPromote, PIECE_LABELS, opponent,
} from "@/app/lib/shogi";
import { getBestMove, Difficulty } from "@/app/lib/shogi-ai";

type GameStatus = 'playing' | 'gameover';

interface PromoteDialog {
  move: Omit<Extract<Move, { type: 'move' }>, 'promote'> & { type: 'move' };
}

export default function ShogiPage() {
  const [state, setState] = useState<ShogiState>(createInitialState);
  const [humanPlayer, setHumanPlayer] = useState<Owner>('sente');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [gameStatus, setGameStatus] = useState<GameStatus>('playing');
  const [winner, setWinner] = useState<Owner | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [selectedFrom, setSelectedFrom] = useState<[number, number] | null>(null);
  const [selectedDrop, setSelectedDrop] = useState<Exclude<UnpromotedType, 'ou'> | null>(null);
  const [promoteDialog, setPromoteDialog] = useState<PromoteDialog | null>(null);

  const validMoves = getValidMoves(state, state.currentPlayer);
  const isAITurn = state.currentPlayer !== humanPlayer && gameStatus === 'playing';

  const resetGame = useCallback(() => {
    setState(createInitialState());
    setGameStatus('playing');
    setWinner(null);
    setIsThinking(false);
    setSelectedFrom(null);
    setSelectedDrop(null);
    setPromoteDialog(null);
  }, []);

  const executeMove = useCallback((move: Move) => {
    setSelectedFrom(null);
    setSelectedDrop(null);

    const newState = applyMove(state, move);
    const nextPlayer = newState.currentPlayer;

    if (isCheckmate(newState, nextPlayer)) {
      setState(newState);
      setWinner(state.currentPlayer);
      setGameStatus('gameover');
    } else if (isStalemate(newState, nextPlayer)) {
      setState(newState);
      setWinner(state.currentPlayer);
      setGameStatus('gameover');
    } else {
      setState(newState);
    }
  }, [state]);

  const handleCellClick = useCallback((r: number, c: number) => {
    if (isThinking || gameStatus !== 'playing' || state.currentPlayer !== humanPlayer) return;
    if (promoteDialog) return;

    const cell = state.board[r][c];

    // Drop mode
    if (selectedDrop) {
      const dropMove = validMoves.find(
        m => m.type === 'drop' && m.piece === selectedDrop && m.to[0] === r && m.to[1] === c
      );
      if (dropMove) {
        executeMove(dropMove);
      } else {
        setSelectedDrop(null);
      }
      return;
    }

    // If a piece is selected
    if (selectedFrom) {
      const [sr, sc] = selectedFrom;

      // Clicked same cell: deselect
      if (sr === r && sc === c) {
        setSelectedFrom(null);
        return;
      }

      // Try to move
      const matchingMoves = validMoves.filter(
        m => m.type === 'move' && m.from[0] === sr && m.from[1] === sc && m.to[0] === r && m.to[1] === c
      ) as Extract<Move, { type: 'move' }>[];

      if (matchingMoves.length > 0) {
        const piece = state.board[sr][sc]!;
        const canProm = canPromote(piece, sr, r);
        const mustProm = mustPromote(piece.type, piece.owner, r);

        if (mustProm) {
          executeMove({ ...matchingMoves[0], promote: true });
        } else if (canProm) {
          setPromoteDialog({ move: matchingMoves[0] });
        } else {
          executeMove({ ...matchingMoves[0], promote: false });
        }
        return;
      }

      // Click on own piece: reselect
      if (cell && cell.owner === humanPlayer) {
        setSelectedFrom([r, c]);
        return;
      }

      setSelectedFrom(null);
      return;
    }

    // No selection — select own piece
    if (cell && cell.owner === humanPlayer) {
      const hasMoves = validMoves.some(m => m.type === 'move' && m.from[0] === r && m.from[1] === c);
      if (hasMoves) setSelectedFrom([r, c]);
    }
  }, [isThinking, gameStatus, state, humanPlayer, validMoves, selectedFrom, selectedDrop, promoteDialog, executeMove]);

  const handleHandClick = useCallback((piece: Exclude<UnpromotedType, 'ou'>, owner: Owner) => {
    if (isThinking || gameStatus !== 'playing' || state.currentPlayer !== humanPlayer) return;
    if (owner !== humanPlayer) return;
    if (selectedDrop === piece) {
      setSelectedDrop(null);
    } else {
      setSelectedDrop(piece);
      setSelectedFrom(null);
    }
  }, [isThinking, gameStatus, state.currentPlayer, humanPlayer, selectedDrop]);

  const aiTurnRef = useRef(false);
  useEffect(() => {
    if (!isAITurn || aiTurnRef.current) return;
    aiTurnRef.current = true;
    setIsThinking(true);

    const timer = setTimeout(() => {
      const aiPlayer = opponent(humanPlayer);
      const move = getBestMove(state, aiPlayer, difficulty);
      if (move) {
        const newState = applyMove(state, move);
        const nextPlayer = newState.currentPlayer;
        if (isCheckmate(newState, nextPlayer) || isStalemate(newState, nextPlayer)) {
          setState(newState);
          setWinner(aiPlayer);
          setGameStatus('gameover');
        } else {
          setState(newState);
        }
      }
      setIsThinking(false);
      aiTurnRef.current = false;
    }, 300);

    return () => clearTimeout(timer);
  }, [isAITurn, state, humanPlayer, difficulty]);

  return (
    <main className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 gap-4">
      <div className="flex items-center gap-4 w-full max-w-lg">
        <Link href="/" className="text-gray-400 hover:text-white text-sm transition-colors">
          ← ゲーム一覧
        </Link>
        <h1 className="text-4xl font-bold tracking-tight">将棋</h1>
      </div>

      {/* 設定パネル */}
      <div className="flex flex-wrap gap-4 items-center justify-center">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">あなた</span>
          <select
            value={humanPlayer}
            onChange={e => { setHumanPlayer(e.target.value as Owner); resetGame(); }}
            className="bg-gray-700 rounded px-3 py-1 text-sm"
          >
            <option value="sente">先手（下）</option>
            <option value="gote">後手（上）</option>
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

      {/* 状態 */}
      <div className="h-6 text-sm text-center">
        {gameStatus === 'playing' && isThinking && (
          <span className="text-gray-400 animate-pulse">AI が考え中...</span>
        )}
        {gameStatus === 'playing' && !isThinking && (
          <span className="text-gray-400">
            {state.currentPlayer === humanPlayer ? 'あなたの番です' : 'AIの番です'}
            {selectedDrop && `（${PIECE_LABELS[selectedDrop]}を打つ場所を選択）`}
          </span>
        )}
      </div>

      <ShogiBoard
        state={state}
        validMoves={gameStatus === 'playing' && state.currentPlayer === humanPlayer ? validMoves : []}
        selectedFrom={selectedFrom}
        selectedDrop={selectedDrop}
        onCellClick={handleCellClick}
        onHandClick={handleHandClick}
        humanPlayer={humanPlayer}
      />

      {/* 成りダイアログ */}
      {promoteDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl p-8 text-center shadow-2xl flex flex-col gap-4 min-w-[220px]">
            <h2 className="text-xl font-bold">成りますか？</h2>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => { executeMove({ ...promoteDialog.move, promote: true }); setPromoteDialog(null); }}
                className="bg-amber-600 hover:bg-amber-500 px-6 py-2 rounded-xl font-semibold transition-colors"
              >
                成る
              </button>
              <button
                onClick={() => { executeMove({ ...promoteDialog.move, promote: false }); setPromoteDialog(null); }}
                className="bg-gray-600 hover:bg-gray-500 px-6 py-2 rounded-xl font-semibold transition-colors"
              >
                成らない
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ゲームオーバーモーダル */}
      {gameStatus === 'gameover' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl p-8 text-center shadow-2xl flex flex-col gap-4 min-w-[260px]">
            <h2 className="text-3xl font-bold">
              {winner === humanPlayer ? 'あなたの勝ち！' : 'AIの勝ち'}
            </h2>
            <p className="text-gray-400">
              {winner === 'sente' ? '先手' : '後手'}の勝利
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
