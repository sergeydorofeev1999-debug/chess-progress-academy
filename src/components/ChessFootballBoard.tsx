'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { RotateCcw, Star, Trophy, ChevronRight } from 'lucide-react';

const FILES = ['a','b','c','d','e','f','g','h'];
const RANKS = ['1','2','3','4','5','6','7','8'];
const DISPLAY_RANKS = ['8','7','6','5','4','3','2','1'];

type Color = 'w' | 'b';
type Difficulty = 'easy' | 'medium' | 'hard';

/* ═════════════════════════════════════════════════════════════════
   GAME LOGIC
   ═════════════════════════════════════════════════════════════════ */

function getKingMoves(
  square: string,
  kingColor: 'w' | 'b',
  wKing: string,
  bKing: string,
  wPawns: string[],
  bPawns: string[]
): string[] {
  const ff = FILES.indexOf(square[0]);
  const fr = RANKS.indexOf(square[1]);
  const valid: string[] = [];
  const otherKing = kingColor === 'w' ? bKing : wKing;
  const otherPawns = kingColor === 'w' ? bPawns : wPawns;

  const directions = [
    [-1,-1],[-1,0],[-1,1],
    [0,-1],[0,1],
    [1,-1],[1,0],[1,1]
  ];

  for (const [df, dr] of directions) {
    const fdi = ff + df;
    const rdi = fr + dr;
    if (fdi < 0 || fdi >= 8 || rdi < 0 || rdi >= 8) continue;
    const sq = `${FILES[fdi]}${RANKS[rdi]}`;

    const otherFile = FILES.indexOf(otherKing[0]);
    const otherRank = RANKS.indexOf(otherKing[1]);
    const dist = Math.max(Math.abs(fdi - otherFile), Math.abs(rdi - otherRank));
    if (dist <= 1) continue;

    if (otherPawns.includes(sq)) continue;

    valid.push(sq);
  }

  return valid;
}

function getPawnAttackSquares(pawnSquare: string, color: 'w' | 'b'): string[] {
  const ff = FILES.indexOf(pawnSquare[0]);
  const fr = RANKS.indexOf(pawnSquare[1]);
  const attacks: string[] = [];
  const dir = color === 'w' ? 1 : -1;

  [-1, 1].forEach(df => {
    const fdi = ff + df;
    const rdi = fr + dir;
    if (fdi >= 0 && fdi < 8 && rdi >= 0 && rdi < 8) {
      attacks.push(`${FILES[fdi]}${RANKS[rdi]}`);
    }
  });

  return attacks;
}

function evaluatePosition(wKing: string, bKing: string, wScore: number, bScore: number): number {
  if (wScore >= 3) return -10000;
  if (bScore >= 3) return 10000;

  const wRank = RANKS.indexOf(wKing[1]);
  const bRank = RANKS.indexOf(bKing[1]);

  let score = 0;
  score += (7 - bRank) * 100;
  score -= wRank * 100;

  const wFile = FILES.indexOf(wKing[0]);
  const bFile = FILES.indexOf(bKing[0]);
  score += (3.5 - Math.abs(bFile - 3.5)) * 20;
  score -= (3.5 - Math.abs(wFile - 3.5)) * 20;

  return score;
}

function getAllKingMoves(
  king: string,
  kingColor: 'w' | 'b',
  wKing: string,
  bKing: string,
  wPawns: string[],
  bPawns: string[]
): { from: string; to: string }[] {
  const moves = getKingMoves(king, kingColor, wKing, bKing, wPawns, bPawns);
  return moves.map(to => ({ from: king, to }));
}

function minimax(
  wKing: string,
  bKing: string,
  wPawns: string[],
  bPawns: string[],
  wScore: number,
  bScore: number,
  depth: number,
  isMaximizing: boolean,
  alpha: number,
  beta: number
): number {
  if (wScore >= 3 || bScore >= 3 || depth === 0) {
    return evaluatePosition(wKing, bKing, wScore, bScore);
  }

  const moves = isMaximizing
    ? getAllKingMoves(bKing, 'b', wKing, bKing, wPawns, bPawns)
    : getAllKingMoves(wKing, 'w', wKing, bKing, wPawns, bPawns);

  if (moves.length === 0) {
    return isMaximizing ? -10000 : 10000;
  }

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      let newBScore = bScore;
      if (RANKS.indexOf(move.to[1]) === 0) newBScore += 1;
      const eval_ = minimax(wKing, move.to, wPawns, bPawns, wScore, newBScore, depth - 1, false, alpha, beta);
      maxEval = Math.max(maxEval, eval_);
      alpha = Math.max(alpha, eval_);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      let newWScore = wScore;
      if (RANKS.indexOf(move.to[1]) === 7) newWScore += 1;
      const eval_ = minimax(move.to, bKing, wPawns, bPawns, newWScore, bScore, depth - 1, true, alpha, beta);
      minEval = Math.min(minEval, eval_);
      beta = Math.min(beta, eval_);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

function getBestMove(
  wKing: string,
  bKing: string,
  wPawns: string[],
  bPawns: string[],
  wScore: number,
  bScore: number,
  difficulty: Difficulty
): { from: string; to: string } | null {
  const moves = getAllKingMoves(bKing, 'b', wKing, bKing, wPawns, bPawns);
  if (moves.length === 0) return null;

  const scored = moves.map(move => {
    let newBScore = bScore;
    if (RANKS.indexOf(move.to[1]) === 0) newBScore += 1;
    let score: number;
    if (difficulty === 'easy') {
      score = evaluatePosition(wKing, move.to, wScore, newBScore);
    } else if (difficulty === 'medium') {
      score = minimax(wKing, move.to, wPawns, bPawns, wScore, newBScore, 2, false, -Infinity, Infinity);
    } else {
      score = minimax(wKing, move.to, wPawns, bPawns, wScore, newBScore, 3, false, -Infinity, Infinity);
    }
    return { ...move, score };
  });

  scored.sort((a, b) => b.score - a.score);

  if (difficulty === 'easy') {
    const rand = Math.random();
    if (rand < 0.5 && scored.length >= 3) {
      return scored[Math.floor(Math.random() * 3)];
    } else if (rand < 0.8 && scored.length >= 5) {
      return scored[Math.floor(Math.random() * 5)];
    }
  } else if (difficulty === 'medium') {
    const rand = Math.random();
    if (rand < 0.2 && scored.length >= 2) {
      return scored[Math.floor(Math.random() * 2)];
    }
  }

  return scored[0];
}

/* ═════════════════════════════════════════════════════════════════
   PIECE IMAGE
   ═════════════════════════════════════════════════════════════════ */

function PieceImg({ type, color }: { type: string; color: 'w' | 'b' }) {
  const pieceKey = `${color}${type.toUpperCase()}`;
  return (
    <img
      src={`/pieces/cburnett/${pieceKey}.svg`}
      alt=""
      className="w-full h-full"
      draggable={false}
      style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }}
    />
  );
}

const LEVELS: { id: Difficulty; label: string; description: string; color: string; stars: number }[] = [
  { id: 'easy', label: 'Лёгкий', description: 'Чёрные часто ошибаются', color: 'bg-green-500', stars: 1 },
  { id: 'medium', label: 'Средний', description: 'Чёрные иногда ошибаются', color: 'bg-yellow-500', stars: 2 },
  { id: 'hard', label: 'Продвинутый', description: 'Чёрные почти не ошибаются', color: 'bg-red-500', stars: 3 },
];

const START_W_KING = 'e1';
const START_B_KING = 'e8';
const START_W_PAWNS = ['a2', 'h2'];
const START_B_PAWNS = ['a7', 'h7'];

export default function ChessFootballBoard({ onComplete, lessonId }: { onComplete: () => void; lessonId?: string }) {
  const savedKey = lessonId ? `football_progress_${lessonId}` : 'football_progress';
  const savedProgress = useMemo(() => {
    if (typeof window === 'undefined') return {} as Record<Difficulty, boolean>;
    try { return JSON.parse(localStorage.getItem(savedKey) || '{}'); } catch { return {}; }
  }, [savedKey]);

  const [wKing, setWKing] = useState(START_W_KING);
  const [bKing, setBKing] = useState(START_B_KING);
  const [wPawns] = useState(START_W_PAWNS);
  const [bPawns] = useState(START_B_PAWNS);
  const [wScore, setWScore] = useState(0);
  const [bScore, setBScore] = useState(0);
  const [turn, setTurn] = useState<'w' | 'b'>('w');
  const [winner, setWinner] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [completedLevels, setCompletedLevels] = useState<Record<Difficulty, boolean>>(savedProgress);
  const [computerThinking, setComputerThinking] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [validSquares, setValidSquares] = useState<string[]>([]);
  const [positionHistory, setPositionHistory] = useState<string[]>([]);
  const [sqSize, setSqSize] = useState(44);

  const [dragPiece, setDragPiece] = useState<{ square: string; type: string; color: string } | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const pointerStartRef = useRef<{ x: number; y: number; square: string; moved: boolean; pointerId: number } | null>(null);

  const turnRef = useRef(turn);
  const winnerRef = useRef(winner);
  const wKingRef = useRef(wKing);
  const bKingRef = useRef(bKing);
  const wScoreRef = useRef(wScore);
  const bScoreRef = useRef(bScore);
  const difficultyRef = useRef(difficulty);
  const selectedSquareRef = useRef(selectedSquare);
  const validSquaresRef = useRef(validSquares);
  const mountedRef = useRef(true);
  const positionHistoryRef = useRef(positionHistory);
  const clickRef = useRef<(square: string) => void>(() => {});
  const onCompleteRef = useRef(onComplete);

  useEffect(() => { turnRef.current = turn; }, [turn]);
  useEffect(() => { winnerRef.current = winner; }, [winner]);
  useEffect(() => { wKingRef.current = wKing; }, [wKing]);
  useEffect(() => { bKingRef.current = bKing; }, [bKing]);
  useEffect(() => { wScoreRef.current = wScore; }, [wScore]);
  useEffect(() => { bScoreRef.current = bScore; }, [bScore]);
  useEffect(() => { difficultyRef.current = difficulty; }, [difficulty]);
  useEffect(() => { selectedSquareRef.current = selectedSquare; }, [selectedSquare]);
  useEffect(() => { validSquaresRef.current = validSquares; }, [validSquares]);
  useEffect(() => { positionHistoryRef.current = positionHistory; }, [positionHistory]);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useEffect(() => () => { mountedRef.current = false; }, []);

  useEffect(() => {
    const update = () => {
      const isMobile = window.innerWidth < 1024;
      if (isMobile) {
        setSqSize(Math.min(64, Math.max(36, Math.floor((window.innerWidth - 24) / 8))));
      } else {
        setSqSize(Math.min(64, Math.max(48, Math.floor((window.innerWidth - 340) / 8))));
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const reset = useCallback(() => {
    setWKing(START_W_KING);
    setBKing(START_B_KING);
    setWScore(0);
    setBScore(0);
    setTurn('w');
    setWinner(null);
    setSelectedSquare(null);
    setValidSquares([]);
    setPositionHistory([]);
    winnerRef.current = null;
    wKingRef.current = START_W_KING;
    bKingRef.current = START_B_KING;
    wScoreRef.current = 0;
    bScoreRef.current = 0;
    positionHistoryRef.current = [];
  }, []);

  const startLevel = useCallback((diff: Difficulty) => {
    setDifficulty(diff);
    reset();
  }, [reset]);

  const checkRepetition = useCallback((history: string[]): boolean => {
    if (history.length < 6) return false;
    const current = history[history.length - 1];
    let count = 0;
    for (let i = 0; i < history.length - 1; i++) {
      if (history[i] === current) count++;
    }
    return count >= 2;
  }, []);

  const doMove = useCallback((to: string) => {
    const newWKing = to;
    setWKing(newWKing);
    wKingRef.current = newWKing;

    let newWScore = wScoreRef.current;
    let goalScored = false;
    if (RANKS.indexOf(newWKing[1]) === 7) {
      newWScore += 1;
      setWScore(newWScore);
      wScoreRef.current = newWScore;
      if (newWScore < 3) {
        goalScored = true;
      }
    }

    // If white scored but game not over, reset kings for next round
    if (goalScored) {
      setWKing(START_W_KING);
      wKingRef.current = START_W_KING;
      setBKing(START_B_KING);
      bKingRef.current = START_B_KING;
      setPositionHistory([]);
      positionHistoryRef.current = [];
      setSelectedSquare(null);
      setValidSquares([]);
      selectedSquareRef.current = null;
      setTurn('b');
      turnRef.current = 'b';
      return;
    }

    const newHistory = [...positionHistoryRef.current, `${newWKing}-${bKingRef.current}`];
    setPositionHistory(newHistory);
    positionHistoryRef.current = newHistory;

    if (newWScore >= 3) {
      setWinner('Белые победили!');
      setSelectedSquare(null);
      setValidSquares([]);
      selectedSquareRef.current = null;

      if (difficultyRef.current) {
        const d = difficultyRef.current;
        setCompletedLevels(prev => {
          if (prev[d]) return prev;
          const next = { ...prev, [d]: true };
          if (savedKey) localStorage.setItem(savedKey, JSON.stringify(next));
          return next;
        });
        onCompleteRef.current();
      }
      return;
    }

    if (checkRepetition(newHistory)) {
      setWinner('Ничья');
      setSelectedSquare(null);
      setValidSquares([]);
      selectedSquareRef.current = null;
      return;
    }

    setTurn('b');
    turnRef.current = 'b';
    setSelectedSquare(null);
    setValidSquares([]);
    selectedSquareRef.current = null;
  }, [savedKey, checkRepetition]);

  useEffect(() => {
    if (winnerRef.current || turnRef.current !== 'b' || !difficultyRef.current) return;
    setComputerThinking(true);

    const timer = setTimeout(() => {
      if (!mountedRef.current) return;
      const diff = difficultyRef.current!;

      const chosen = getBestMove(
        wKingRef.current,
        bKingRef.current,
        wPawns,
        bPawns,
        wScoreRef.current,
        bScoreRef.current,
        diff
      );

      if (!chosen) {
        setWinner('Белые победили!');
        setComputerThinking(false);
        return;
      }

      const newBKing = chosen.to;
      setBKing(newBKing);
      bKingRef.current = newBKing;

      let newBScore = bScoreRef.current;
      let bGoalScored = false;
      if (RANKS.indexOf(newBKing[1]) === 0) {
        newBScore += 1;
        setBScore(newBScore);
        bScoreRef.current = newBScore;
        if (newBScore < 3) {
          bGoalScored = true;
        }
      }

      // If black scored but game not over, reset kings for next round
      if (bGoalScored) {
        setWKing(START_W_KING);
        wKingRef.current = START_W_KING;
        setBKing(START_B_KING);
        bKingRef.current = START_B_KING;
        setPositionHistory([]);
        positionHistoryRef.current = [];
        setComputerThinking(false);
        setTurn('w');
        turnRef.current = 'w';
        return;
      }

      const newHistory = [...positionHistoryRef.current, `${wKingRef.current}-${newBKing}`];
      setPositionHistory(newHistory);
      positionHistoryRef.current = newHistory;

      if (newBScore >= 3) {
        setWinner('Чёрные победили!');
        setComputerThinking(false);
        return;
      }

      if (checkRepetition(newHistory)) {
        setWinner('Ничья');
        setComputerThinking(false);
        return;
      }

      setTurn('w');
      turnRef.current = 'w';
      setComputerThinking(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [turn, winner, wPawns, bPawns, checkRepetition, savedKey]);

  const click = useCallback((square: string) => {
    if (winnerRef.current) return;
    if (turnRef.current !== 'w') return;

    const sel = selectedSquareRef.current;

    if (sel) {
      if (sel === square) {
        setSelectedSquare(null);
        setValidSquares([]);
        selectedSquareRef.current = null;
        return;
      }

      if (validSquaresRef.current.includes(square)) {
        doMove(square);
        return;
      }
    }

    if (square === wKingRef.current) {
      const moves = getKingMoves(square, 'w', wKingRef.current, bKingRef.current, wPawns, bPawns);
      setSelectedSquare(square);
      setValidSquares(moves);
      selectedSquareRef.current = square;
      validSquaresRef.current = moves;
    } else {
      setSelectedSquare(null);
      setValidSquares([]);
      selectedSquareRef.current = null;
    }
  }, [wPawns, bPawns, doMove]);

  useEffect(() => { clickRef.current = click; }, [click]);

  const handlePointerDown = useCallback((e: React.PointerEvent, square: string) => {
    if (winnerRef.current) return;
    if (turnRef.current !== 'w') return;
    if (e.pointerType === 'touch' && e.isPrimary === false) return;
    e.preventDefault();

    if (square === wKingRef.current) {
      const moves = getKingMoves(square, 'w', wKingRef.current, bKingRef.current, wPawns, bPawns);
      setSelectedSquare(square);
      setValidSquares(moves);
      pointerStartRef.current = { x: e.clientX, y: e.clientY, square, moved: false, pointerId: e.pointerId };
    } else {
      if (selectedSquareRef.current && validSquaresRef.current.includes(square)) {
        clickRef.current(square);
      } else {
        setSelectedSquare(null);
        setValidSquares([]);
      }
    }
  }, [wPawns, bPawns]);

  useEffect(() => {
    const handleGlobalMove = (e: PointerEvent) => {
      const start = pointerStartRef.current;
      if (!start) return;
      if (e.pointerId !== start.pointerId) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (!start.moved && (Math.abs(dx) > 20 || Math.abs(dy) > 20)) {
        start.moved = true;
        setDragPiece({ square: start.square, type: 'k', color: 'w' });
        setSelectedSquare(null);
      }
      if (start.moved) {
        setDragPos({ x: e.clientX, y: e.clientY });
      }
    };

    const handleGlobalUp = (e: PointerEvent) => {
      const start = pointerStartRef.current;
      if (!start) return;
      if (e.pointerId !== start.pointerId) return;
      if (!start.moved) {
        clickRef.current(start.square);
      } else {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const cell = el?.closest('[data-square]') as HTMLElement | null;
        const targetSquare = cell?.dataset.square || null;
        if (targetSquare) {
          const valid = getKingMoves(start.square, 'w', wKingRef.current, bKingRef.current, wPawns, bPawns);
          if (valid.includes(targetSquare)) {
            doMove(targetSquare);
          } else {
            setSelectedSquare(null);
            setValidSquares([]);
            selectedSquareRef.current = null;
          }
        } else {
          setSelectedSquare(null);
          setValidSquares([]);
          selectedSquareRef.current = null;
        }
      }
      setDragPiece(null);
      pointerStartRef.current = null;
    };

    const handleGlobalCancel = (e: PointerEvent) => {
      if (pointerStartRef.current && e.pointerId === pointerStartRef.current.pointerId) {
        setDragPiece(null);
        pointerStartRef.current = null;
      }
    };

    window.addEventListener('pointermove', handleGlobalMove);
    window.addEventListener('pointerup', handleGlobalUp);
    window.addEventListener('pointercancel', handleGlobalCancel);
    return () => {
      window.removeEventListener('pointermove', handleGlobalMove);
      window.removeEventListener('pointerup', handleGlobalUp);
      window.removeEventListener('pointercancel', handleGlobalCancel);
    };
  }, [wPawns, bPawns, doMove]);

  const getPieceAt = (sq: string) => {
    if (wKing === sq) return { type: 'k', color: 'w' as Color };
    if (bKing === sq) return { type: 'k', color: 'b' as Color };
    if (wPawns.includes(sq)) return { type: 'p', color: 'w' as Color };
    if (bPawns.includes(sq)) return { type: 'p', color: 'b' as Color };
    return null;
  };

  const isLight = (f: number, r: number) => (f + r) % 2 === 0;

  const validMoves = selectedSquare
    ? getKingMoves(selectedSquare, 'w', wKing, bKing, wPawns, bPawns)
    : dragPiece
      ? getKingMoves(dragPiece.square, 'w', wKing, bKing, wPawns, bPawns)
      : [];

  if (!difficulty) {
    const allCompleted = LEVELS.every(l => completedLevels[l.id]);
    return (
      <div className="flex flex-col items-center gap-6 w-full px-4 py-6">
        <h3 className="text-xl font-bold text-slate-800">Выберите уровень сложности</h3>
        <div className="flex flex-col gap-3 w-full max-w-sm">
          {LEVELS.map(level => {
            const isCompleted = completedLevels[level.id];
            return (
              <button
                key={level.id}
                onClick={() => startLevel(level.id)}
                className={`flex items-center gap-4 px-5 py-4 rounded-xl border-2 transition text-left ${
                  isCompleted
                    ? 'border-green-300 bg-green-50 hover:bg-green-100'
                    : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${level.color}`}>
                  {isCompleted ? <Trophy size={20} /> : level.stars}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-slate-800">{level.label}</div>
                  <div className="text-sm text-slate-500">{level.description}</div>
                </div>
                <ChevronRight size={20} className="text-slate-400" />
              </button>
            );
          })}
        </div>
        {allCompleted && (
          <div className="mt-4 px-6 py-3 bg-green-100 border border-green-300 rounded-xl text-green-800 font-bold flex items-center gap-2">
            <Trophy size={20} /> Все уровни пройдены!
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full select-none" style={{ touchAction: 'none' }}>
      {/* Score */}
      <div className="flex items-center gap-4 text-lg font-bold">
        <div className="flex items-center gap-2">
          <img src="/pieces/cburnett/wK.svg" alt="" width={24} height={24} draggable={false} />
          <span>{wScore}</span>
        </div>
        <span className="text-slate-400">:</span>
        <div className="flex items-center gap-2">
          <span>{bScore}</span>
          <img src="/pieces/cburnett/bK.svg" alt="" width={24} height={24} draggable={false} />
        </div>
      </div>

      {/* Difficulty */}
      <div className="flex items-center gap-2">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${LEVELS.find(l => l.id === difficulty)?.color}`}>
          {LEVELS.find(l => l.id === difficulty)?.label}
        </span>
        {computerThinking && (
          <span className="text-xs text-slate-500">Думает...</span>
        )}
      </div>

      {/* Turn */}
      <div className={`text-sm font-bold ${turn === 'w' ? 'text-blue-600' : 'text-slate-400'}`}>
        {computerThinking ? 'Ход компьютера...' : 'Ваш ход'}
      </div>

      {/* Winner */}
      {winner && (
        <div className={`px-6 py-3 rounded-xl text-center font-bold text-white ${
          winner === 'Белые победили!' ? 'bg-green-500' : winner === 'Чёрные победили!' ? 'bg-red-500' : 'bg-yellow-500'
        }`}>
          {winner}
          <div className="text-sm font-normal mt-1">
            Счёт: {wScore} : {bScore}
          </div>
        </div>
      )}

      {/* Board */}
      <div className="flex justify-center w-full">
        <div
          className="grid border-[3px] border-[#2b2b2b] rounded-sm relative select-none"
          style={{
            gridTemplateColumns: `repeat(8, ${sqSize}px)`,
            gridTemplateRows: `repeat(8, ${sqSize}px)`,
            touchAction: 'none',
          }}
        >
          {DISPLAY_RANKS.map((rank, ri) =>
            FILES.map((file, fi) => {
              const sq = `${file}${rank}`;
              const pieceObj = getPieceAt(sq);
              const light = isLight(fi, ri);
              const sel = selectedSquare === sq;
              const isSource = dragPiece?.square === sq;
              const isValidMove = validMoves.includes(sq);

              return (
                <div
                  key={sq}
                  data-square={sq}
                  className={`flex items-center justify-center relative select-none ${isSource ? 'opacity-50' : ''}`}
                  style={{
                    width: sqSize,
                    height: sqSize,
                    cursor: pieceObj && pieceObj.color === 'w' ? 'grab' : 'default',
                    touchAction: 'none',
                    backgroundColor: light ? '#f0d9b5' : '#b58863',
                  }}
                  onPointerDown={(e) => handlePointerDown(e, sq)}
                  onDragStart={(e) => e.preventDefault()}
                >
                  {sel && (
                    <div className="absolute inset-[1px] rounded-[5px] bg-[rgba(100,160,60,0.45)] pointer-events-none z-10" />
                  )}
                  {fi === 0 && (
                    <span className={`absolute top-0.5 left-1 text-[10px] font-bold ${light ? 'text-[#b58863]' : 'text-[#f0d9b5]'}`}>
                      {rank}
                    </span>
                  )}
                  {ri === 7 && (
                    <span className={`absolute bottom-0.5 right-1 text-[10px] font-bold ${light ? 'text-[#b58863]' : 'text-[#f0d9b5]'}`}>
                      {file}
                    </span>
                  )}
                  {isValidMove && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                      <div
                        style={{
                          width: Math.round(sqSize * 0.3),
                          height: Math.round(sqSize * 0.3),
                          backgroundColor: '#5d9040',
                          borderRadius: '50%',
                          opacity: 0.85,
                        }}
                      />
                    </div>
                  )}
                  {pieceObj && !isSource && (
                    <div className="relative pointer-events-none" style={{ width: Math.round(sqSize * 0.85), height: Math.round(sqSize * 0.85) }}>
                      <PieceImg type={pieceObj.type} color={pieceObj.color} />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Drag overlay */}
      {dragPiece && (
        <div
          className="fixed pointer-events-none z-50"
          style={{
            left: dragPos.x - Math.round(sqSize / 2),
            top: dragPos.y - Math.round(sqSize / 2),
            width: Math.round(sqSize * 0.85),
            height: Math.round(sqSize * 0.85),
          }}
        >
          <PieceImg type={dragPiece.type} color={dragPiece.color as 'w' | 'b'} />
        </div>
      )}

      {/* Goal indicators */}
      <div className="flex justify-between w-full max-w-sm px-4 text-xs text-slate-500">
        <span>Гол чёрных ↓</span>
        <span>↑ Гол белых</span>
      </div>

      {/* Controls */}
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Начать заново
        </button>
        <button
          onClick={() => { setDifficulty(null); reset(); }}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
        >
          Сменить уровень
        </button>
      </div>

      {/* Stars */}
      <div className="flex gap-1">
        {LEVELS.map(lvl => (
          <div key={lvl.id} className="flex flex-col items-center">
            <Star
              className={`w-5 h-5 ${completedLevels[lvl.id] ? 'text-yellow-500 fill-current' : 'text-slate-300'}`}
            />
            <span className="text-[10px] text-slate-500">{lvl.label}</span>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="text-center text-sm text-slate-600 max-w-sm px-4">
        <p className="font-medium mb-1">Цель игры:</p>
        <p>Дойди королём до 8 ряда (для белых) или 1 ряда (для чёрных) — это гол. Игра до 3 голов.</p>
        <p className="text-xs text-slate-400 mt-1">Короли не могут стоять рядом. Пешки блокируют диагональные клетки.</p>
      </div>
    </div>
  );
}
