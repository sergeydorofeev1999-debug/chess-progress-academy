'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { RotateCcw, Star, Trophy, ChevronRight } from 'lucide-react';

const FILES = ['a','b','c','d','e','f','g','h'];
const RANKS = ['1','2','3','4','5','6','7','8'];

type Color = 'w' | 'b';

function getSquareCenter(square: string): { x: number; y: number } {
  const fileIndex = FILES.indexOf(square[0]);
  const rankIndex = RANKS.indexOf(square[1]);
  return { x: fileIndex * 50 + 25, y: (7 - rankIndex) * 50 + 25 };
}

function isSameSquare(s1: string, s2: string): boolean {
  return s1 === s2;
}

/* ═════════════════════════════════════════════════════════════════
   BOARD RENDERING
   ═════════════════════════════════════════════════════════════════ */

function BoardBackground() {
  const squares = [];
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const isWhite = (file + rank) % 2 === 0;
      squares.push(
        <div
          key={`${file}-${rank}`}
          style={{
            position: 'absolute',
            left: `${file * 50}px`,
            top: `${rank * 50}px`,
            width: '50px',
            height: '50px',
            backgroundColor: isWhite ? '#f0d9b5' : '#b58863',
          }}
        />
      );
    }
  }
  return <>{squares}</>;
}

function FileLabels() {
  return (
    <div className="flex ml-[25px]">
      {FILES.map(f => (
        <div key={f} className="w-[50px] text-center text-xs text-slate-400 select-none">{f}</div>
      ))}
    </div>
  );
}

function RankLabels() {
  return (
    <div className="absolute left-0 top-[25px] flex flex-col">
      {RANKS.slice().reverse().map(r => (
        <div key={r} className="h-[50px] w-[25px] flex items-center justify-center text-xs text-slate-400 select-none">{r}</div>
      ))}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════
   PIECE SVG
   ═════════════════════════════════════════════════════════════════ */

function PieceImage({ type, color, size = 45 }: { type: string; color: 'w' | 'b'; size?: number }) {
  const src = `/pieces/cburnett/${color}${type}.svg`;
  return <img src={src} alt={`${color}${type}`} style={{ width: size, height: size }} draggable={false} />;
}

/* ═════════════════════════════════════════════════════════════════
   KING MOVES
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

    // Kings cannot be adjacent (must be at least 1 square apart)
    const otherFile = FILES.indexOf(otherKing[0]);
    const otherRank = RANKS.indexOf(otherKing[1]);
    const dist = Math.max(Math.abs(fdi - otherFile), Math.abs(rdi - otherRank));
    if (dist <= 1) continue;

    // Cannot move to a square attacked by enemy pawns
    if (otherPawns.includes(sq)) continue;

    valid.push(sq);
  }

  return valid;
}

/* ═════════════════════════════════════════════════════════════════
   PAWN ATTACK SQUARES (for blocking king moves)
   ═════════════════════════════════════════════════════════════════ */

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

/* ═════════════════════════════════════════════════════════════════
   AI ENGINE
   ═════════════════════════════════════════════════════════════════ */

type Difficulty = 'easy' | 'medium' | 'hard';

function evaluatePosition(wKing: string, bKing: string, wScore: number, bScore: number): number {
  if (wScore >= 3) return -10000;
  if (bScore >= 3) return 10000;

  const wRank = RANKS.indexOf(wKing[1]);
  const bRank = RANKS.indexOf(bKing[1]);

  let score = 0;
  // Black wants to reach rank 1, white wants to reach rank 8
  score += (7 - bRank) * 100; // black advancing
  score -= wRank * 100; // white advancing

  // Prefer center files for both kings
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
   MAIN COMPONENT
   ═════════════════════════════════════════════════════════════════ */

const START_W_KING = 'e1';
const START_B_KING = 'e8';
const START_W_PAWNS = ['a2', 'h2'];
const START_B_PAWNS = ['a7', 'h7'];

const LEVELS: { id: Difficulty; label: string; description: string; color: string; stars: number }[] = [
  { id: 'easy', label: 'Лёгкий', description: 'Чёрные часто ошибаются', color: 'bg-green-500', stars: 1 },
  { id: 'medium', label: 'Средний', description: 'Чёрные иногда ошибаются', color: 'bg-yellow-500', stars: 2 },
  { id: 'hard', label: 'Продвинутый', description: 'Чёрные почти не ошибаются', color: 'bg-red-500', stars: 3 },
];

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
  useEffect(() => () => { mountedRef.current = false; }, []);

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

  // Check for draw by 3-fold repetition
  const checkRepetition = useCallback((history: string[]): boolean => {
    if (history.length < 6) return false;
    const current = history[history.length - 1];
    let count = 0;
    for (let i = 0; i < history.length - 1; i++) {
      if (history[i] === current) count++;
    }
    return count >= 2; // 3 times total (including current)
  }, []);

  // Computer move (black) - auto after 1 second
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

      // Move black king
      const newBKing = chosen.to;
      setBKing(newBKing);
      bKingRef.current = newBKing;

      // Check goal for black
      let newBScore = bScoreRef.current;
      if (RANKS.indexOf(newBKing[1]) === 0) {
        newBScore += 1;
        setBScore(newBScore);
        bScoreRef.current = newBScore;
      }

      // Update position history
      const newHistory = [...positionHistoryRef.current, `${wKingRef.current}-${newBKing}`];
      setPositionHistory(newHistory);
      positionHistoryRef.current = newHistory;

      // Check win
      if (newBScore >= 3) {
        setWinner('Чёрные победили!');
        setComputerThinking(false);
        return;
      }

      // Check draw by repetition
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
  }, [wPawns, bPawns, checkRepetition]);

  // Click logic for white king
  const click = useCallback((square: string) => {
    if (winnerRef.current) return;
    if (turnRef.current !== 'w') return;

    const sel = selectedSquareRef.current;

    if (sel) {
      if (sel === square) {
        selectedSquareRef.current = null;
        setSelectedSquare(null);
        setValidSquares([]);
        return;
      }

      if (validSquaresRef.current.includes(square)) {
        // Move white king
        const newWKing = square;
        setWKing(newWKing);
        wKingRef.current = newWKing;

        // Check goal for white
        let newWScore = wScoreRef.current;
        if (RANKS.indexOf(newWKing[1]) === 7) {
          newWScore += 1;
          setWScore(newWScore);
          wScoreRef.current = newWScore;
        }

        // Update position history
        const newHistory = [...positionHistoryRef.current, `${newWKing}-${bKingRef.current}`];
        setPositionHistory(newHistory);
        positionHistoryRef.current = newHistory;

        // Check win
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
            onComplete();
          }
          return;
        }

        // Check draw by repetition
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
        return;
      }
    }

    // Select white king
    if (square === wKingRef.current) {
      const moves = getKingMoves(square, 'w', wKingRef.current, bKingRef.current, wPawns, bPawns);
      selectedSquareRef.current = square;
      setSelectedSquare(square);
      setValidSquares(moves);
      validSquaresRef.current = moves;
    } else {
      selectedSquareRef.current = null;
      setSelectedSquare(null);
      setValidSquares([]);
    }
  }, [wPawns, bPawns, savedKey, onComplete, checkRepetition]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (winnerRef.current || turnRef.current !== 'w') return;
    const target = e.target as HTMLElement;
    const squareEl = target.closest('[data-square]');
    if (!squareEl) return;
    const square = (squareEl as HTMLElement).dataset.square!;

    if (square === wKingRef.current) {
      const moves = getKingMoves(square, 'w', wKingRef.current, bKingRef.current, wPawns, bPawns);
      selectedSquareRef.current = square;
      setSelectedSquare(square);
      setValidSquares(moves);
      validSquaresRef.current = moves;
    } else if (selectedSquareRef.current && validSquaresRef.current.includes(square)) {
      // Move white king
      const newWKing = square;
      setWKing(newWKing);
      wKingRef.current = newWKing;

      let newWScore = wScoreRef.current;
      if (RANKS.indexOf(newWKing[1]) === 7) {
        newWScore += 1;
        setWScore(newWScore);
        wScoreRef.current = newWScore;
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
          onComplete();
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
    } else {
      selectedSquareRef.current = null;
      setSelectedSquare(null);
      setValidSquares([]);
    }
  }, [wPawns, bPawns, savedKey, onComplete, checkRepetition]);

  // Render pieces
  const renderPieces = () => {
    const elements: React.ReactElement[] = [];

    // White king
    const wCenter = getSquareCenter(wKing);
    elements.push(
      <div
        key="wK"
        style={{ position: 'absolute', left: wCenter.x - 22.5, top: wCenter.y - 22.5, zIndex: 2, cursor: 'pointer' }}
        data-square={wKing}
        onPointerDown={handlePointerDown}
      >
        <PieceImage type="k" color="w" />
      </div>
    );

    // Black king
    const bCenter = getSquareCenter(bKing);
    elements.push(
      <div
        key="bK"
        style={{ position: 'absolute', left: bCenter.x - 22.5, top: bCenter.y - 22.5, zIndex: 2 }}
        data-square={bKing}
      >
        <PieceImage type="k" color="b" />
      </div>
    );

    // White pawns
    for (const sq of wPawns) {
      const center = getSquareCenter(sq);
      elements.push(
        <div
          key={`wP-${sq}`}
          style={{ position: 'absolute', left: center.x - 22.5, top: center.y - 22.5, zIndex: 1 }}
        >
          <PieceImage type="p" color="w" />
        </div>
      );
    }

    // Black pawns
    for (const sq of bPawns) {
      const center = getSquareCenter(sq);
      elements.push(
        <div
          key={`bP-${sq}`}
          style={{ position: 'absolute', left: center.x - 22.5, top: center.y - 22.5, zIndex: 1 }}
        >
          <PieceImage type="p" color="b" />
        </div>
      );
    }

    return elements;
  };

  if (!difficulty) {
    return (
      <div className="flex flex-col items-center gap-6 py-8">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
            <Trophy className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold mb-2">Шахматный футбол</h3>
          <p className="text-slate-600 max-w-xs mx-auto">Дойди королём до противоположной линии и забей 3 гола. Пешки блокируют ходы королям. Чёрный король ходит автоматически.</p>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-sm">
          {LEVELS.map((lvl, idx) => {
            const isDone = completedLevels[lvl.id];
            return (
              <button
                key={lvl.id}
                onClick={() => startLevel(lvl.id)}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl border transition-all text-left ${
                  isDone ? 'border-green-500 bg-green-50' : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-sm ${lvl.color}`}>
                  {isDone ? (
                    <Trophy className="w-5 h-5" />
                  ) : (
                    idx + 1
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{lvl.label}</div>
                  <div className="text-xs text-slate-500">{lvl.description}</div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Score */}
      <div className="flex items-center gap-4 text-lg font-bold">
        <div className="flex items-center gap-2">
          <PieceImage type="k" color="w" size={24} />
          <span>{wScore}</span>
        </div>
        <span className="text-slate-400">:</span>
        <div className="flex items-center gap-2">
          <span>{bScore}</span>
          <PieceImage type="k" color="b" size={24} />
        </div>
      </div>

      {/* Difficulty label */}
      <div className="flex items-center gap-2">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${LEVELS.find(l => l.id === difficulty)?.color}`}>
          {LEVELS.find(l => l.id === difficulty)?.label}
        </span>
        {computerThinking && (
          <span className="text-xs text-slate-500">Думает...</span>
        )}
      </div>

      {/* Board */}
      <div className="relative" style={{ width: '400px', height: '400px' }}>
        <div className="absolute left-[25px] top-0">
          <BoardBackground />
        </div>
        <RankLabels />
        <div className="absolute left-[25px] top-0" style={{ width: '400px', height: '400px' }}>
          {renderPieces()}
        </div>

        {/* Valid move indicators */}
        {validSquares.map(sq => {
          const center = getSquareCenter(sq);
          return (
            <div
              key={`valid-${sq}`}
              style={{
                position: 'absolute',
                left: center.x + 25 - 6,
                top: center.y + 25 - 6,
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                pointerEvents: 'none',
                zIndex: 3,
              }}
            />
          );
        })}

        {/* Selected square highlight */}
        {selectedSquare && (() => {
          const center = getSquareCenter(selectedSquare);
          return (
            <div
              style={{
                position: 'absolute',
                left: center.x + 25 - 25,
                top: center.y + 25 - 25,
                width: '50px',
                height: '50px',
                backgroundColor: 'rgba(123, 182, 72, 0.4)',
                pointerEvents: 'none',
                zIndex: 1,
              }}
            />
          );
        })()}
      </div>
      <FileLabels />

      {/* Goal indicators */}
      <div className="flex justify-between w-[400px] px-8 text-xs text-slate-500">
        <span>Гол чёрных ↓</span>
        <span>↑ Гол белых</span>
      </div>

      {/* Result banner */}
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
