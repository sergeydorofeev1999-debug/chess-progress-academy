'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { RotateCcw, Eye, Trophy } from 'lucide-react';

const FILES = ['a','b','c','d','e','f','g','h'];
const RANKS = ['8','7','6','5','4','3','2','1'];
const DISPLAY_RANKS = ['8','7','6','5','4','3','2','1'];

type ExerciseId = 1 | 2 | 3;

interface Exercise {
  id: ExerciseId;
  label: string;
  description: string;
  fen: string;
  demoMoves: { from: string; to: string; comment: string }[];
  minMoves3: number;
  minMoves2: number;
}

const EXERCISES: Exercise[] = [
  {
    id: 1,
    label: 'Упражнение 1',
    description: 'Мат ферзём — загоняем короля в угол',
    fen: '8/8/8/4k3/1Q6/8/4K3/8 w - - 0 1',
    demoMoves: [
      { from: 'b4', to: 'c4', comment: 'Ферзь сужает пространство' },
      { from: 'e5', to: 'd6', comment: 'Чёрный король отступает' },
      { from: 'c4', to: 'b5', comment: 'Ферзь продолжает наступление' },
      { from: 'd6', to: 'e6', comment: 'Король уходит в центр' },
      { from: 'b5', to: 'c5', comment: 'Ферзь ограничивает пространство' },
      { from: 'e6', to: 'f6', comment: 'Король бежит вправо' },
      { from: 'c5', to: 'd5', comment: 'Ферзь преследует короля' },
      { from: 'f6', to: 'e7', comment: 'Король отступает назад' },
      { from: 'd5', to: 'c6', comment: 'Ферзь сужает пространство' },
      { from: 'e7', to: 'f7', comment: 'Король пытается уйти' },
      { from: 'c6', to: 'd6', comment: 'Ферзь давит на короля' },
      { from: 'f7', to: 'g7', comment: 'Король отступает в угол' },
      { from: 'd6', to: 'e6', comment: 'Ферзь приближается' },
      { from: 'g7', to: 'f8', comment: 'Король бежит' },
      { from: 'e6', to: 'd7', comment: 'Ферзь сужает коридор' },
      { from: 'f8', to: 'g8', comment: 'Король на край доски' },
      { from: 'd7', to: 'e7', comment: 'Ферзь готовит мат' },
      { from: 'g8', to: 'h8', comment: 'Король в углу' },
      { from: 'e2', to: 'e3', comment: 'Белый король подходит' },
      { from: 'h8', to: 'g8', comment: 'Чёрный король пытается уйти' },
      { from: 'e3', to: 'f4', comment: 'Белый король приближается' },
      { from: 'g8', to: 'h8', comment: 'Король возвращается в угол' },
      { from: 'f4', to: 'g5', comment: 'Белый король продолжает наступление' },
      { from: 'h8', to: 'g8', comment: 'Чёрный король вынужден отступать' },
      { from: 'g5', to: 'g6', comment: 'Белый король сужает пространство' },
      { from: 'g8', to: 'h8', comment: 'Король в углу' },
      { from: 'e7', to: 'g7', comment: 'Мат!' },
    ],
    minMoves3: 14,
    minMoves2: 16,
  },
  {
    id: 2,
    label: 'Упражнение 2',
    description: 'Мат ферзём — короли далеко друг от друга',
    fen: '8/3K4/8/8/6Q1/3k4/8/8 w - - 0 1',
    demoMoves: [
      { from: 'g4', to: 'h4', comment: 'Ферзь сужает пространство справа' },
      { from: 'd3', to: 'e2', comment: 'Чёрный король уходит в центр' },
      { from: 'd7', to: 'e6', comment: 'Белый король приближается' },
      { from: 'e2', to: 'f1', comment: 'Чёрный король отступает' },
      { from: 'h4', to: 'h1', comment: 'Ферзь даёт шах!' },
      { from: 'f1', to: 'f2', comment: 'Король уходит от шаха' },
      { from: 'e6', to: 'f5', comment: 'Белый король продолжает наступление' },
      { from: 'f2', to: 'g2', comment: 'Чёрный король бежит' },
      { from: 'h1', to: 'f3', comment: 'Ферзь преследует' },
      { from: 'g2', to: 'h1', comment: 'Король прячется' },
      { from: 'f5', to: 'g5', comment: 'Белый король сокращает дистанцию' },
      { from: 'h1', to: 'h2', comment: 'Чёрный король держится' },
      { from: 'f3', to: 'h3', comment: 'Ферзь даёт шах!' },
      { from: 'h2', to: 'g1', comment: 'Король вынужден отступить' },
      { from: 'g5', to: 'g4', comment: 'Белый король приближается' },
      { from: 'g1', to: 'f1', comment: 'Чёрный король пытается уйти' },
      { from: 'h3', to: 'g3', comment: 'Ферзь сужает пространство' },
      { from: 'f1', to: 'e1', comment: 'Король отступает' },
      { from: 'g4', to: 'f3', comment: 'Белый король наступает' },
      { from: 'e1', to: 'd2', comment: 'Чёрный король в центр' },
      { from: 'g3', to: 'd3', comment: 'Ферзь даёт шах!' },
      { from: 'd2', to: 'c2', comment: 'Король уходит' },
      { from: 'f3', to: 'e2', comment: 'Белый король поддерживает' },
      { from: 'c2', to: 'b2', comment: 'Чёрный король держится' },
      { from: 'd3', to: 'd2', comment: 'Ферзь даёт шах!' },
      { from: 'b2', to: 'a1', comment: 'Король в углу' },
      { from: 'd2', to: 'b2', comment: 'Мат!' },
    ],
    minMoves3: 12,
    minMoves2: 14,
  },
  {
    id: 3,
    label: 'Упражнение 3',
    description: 'Мат ферзём — далёкая начальная позиция',
    fen: '8/8/8/2k5/8/8/8/K6Q w - - 0 1',
    demoMoves: [
      { from: 'h1', to: 'e4', comment: 'Ферзь выходит в центр' },
      { from: 'c5', to: 'd6', comment: 'Чёрный король отступает' },
      { from: 'a1', to: 'b2', comment: 'Белый король приближается' },
      { from: 'd6', to: 'c5', comment: 'Король держится в центре' },
      { from: 'e4', to: 'c4', comment: 'Ферзь сужает пространство' },
      { from: 'c5', to: 'd4', comment: 'Король отступает' },
      { from: 'b2', to: 'c3', comment: 'Белый король продолжает наступление' },
      { from: 'd4', to: 'e3', comment: 'Чёрный король в центр' },
      { from: 'c4', to: 'e4', comment: 'Ферзь даёт шах!' },
      { from: 'e3', to: 'f2', comment: 'Король отступает' },
      { from: 'c3', to: 'd3', comment: 'Белый король поддерживает' },
      { from: 'e4', to: 'f4', comment: 'Ферзь даёт шах!' },
      { from: 'f2', to: 'g1', comment: 'Король прячется в углу' },
      { from: 'f4', to: 'f2', comment: 'Мат!' },
    ],
    minMoves3: 14,
    minMoves2: 16,
  },
];

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

function getBlackKingMove(game: Chess): { from: string; to: string } | null {
  const moves = game.moves({ verbose: true }).filter(m => m.piece === 'k');
  if (moves.length === 0) return null;

  const squares = game.board();
  let queenPos: { row: number; col: number } | null = null;
  let whiteKingPos: { row: number; col: number } | null = null;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = squares[r][c];
      if (p && p.type === 'q' && p.color === 'w') {
        queenPos = { row: r, col: c };
      }
      if (p && p.type === 'k' && p.color === 'w') {
        whiteKingPos = { row: r, col: c };
      }
    }
  }

  const scored = moves.map(m => {
    const toRow = RANKS.indexOf(m.to[1]);
    const toCol = FILES.indexOf(m.to[0]);
    let score = 0;

    // 1. ГЛАВНОЕ — держаться в ЦЕНТРЕ доски
    const centerDist = Math.abs(toRow - 3.5) + Math.abs(toCol - 3.5);
    score -= centerDist * 50; // чем ближе к центру, тем лучше

    // 2. Штраф за край доски
    const isEdge = (toRow === 0 || toRow === 7 || toCol === 0 || toCol === 7);
    if (isEdge) score -= 200;

    // 3. Штраф за угол
    const isCorner = ((toRow === 0 || toRow === 7) && (toCol === 0 || toCol === 7));
    if (isCorner) score -= 300;

    // 4. Увеличить расстояние до белого короля (не дать подойти)
    if (whiteKingPos) {
      const distToWK = Math.max(Math.abs(toRow - whiteKingPos.row), Math.abs(toCol - whiteKingPos.col));
      score += distToWK * 30;
    }

    // 5. Увеличить расстояние до ферзя (но меньший вес)
    if (queenPos) {
      const distToQueen = Math.max(Math.abs(toRow - queenPos.row), Math.abs(toCol - queenPos.col));
      score += distToQueen * 15;
      // Не стоять на одной линии с ферзём (под боем)
      if (toRow === queenPos.row || toCol === queenPos.col ||
          Math.abs(toRow - queenPos.row) === Math.abs(toCol - queenPos.col)) {
        score -= 100;
      }
    }

    // 6. Если можно съесть ферзя — отличный ход
    if (m.captured && m.captured === 'q') score += 1000;

    return { move: m, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0] ? { from: scored[0].move.from, to: scored[0].move.to } : null;
}

function calcStars(ex: Exercise, whiteMoves: number): number {
  if (whiteMoves <= ex.minMoves3) return 3;
  if (whiteMoves <= ex.minMoves2) return 2;
  return 1;
}

function StarPng({ filled, size = 14 }: { filled: boolean; size?: number }) {
  return (
    <img
      src="/images/learn/star.png"
      alt=""
      className="shrink-0"
      style={{
        width: size,
        height: size,
        filter: filled
          ? 'brightness(1.2) drop-shadow(0 0 1px rgba(255,255,255,0.6))'
          : 'grayscale(100%) brightness(0.4)',
      }}
      draggable={false}
    />
  );
}

/* ═══════════════════════════════════════════════════════════════
   DRAG STATE
   ═══════════════════════════════════════════════════════════════ */
interface DragState {
  square: string;
  type: string;
  color: 'w' | 'b';
}

interface PointerStart {
  x: number;
  y: number;
  square: string;
  moved: boolean;
  pointerId: number;
}

export default function QueenMateBoard({ onComplete, lessonId }: { onComplete: () => void; lessonId?: string }) {
  const [currentExercise, setCurrentExercise] = useState<ExerciseId>(1);
  const [game, setGame] = useState<Chess | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [demoMode, setDemoMode] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [demoComment, setDemoComment] = useState('');
  const [sqSize, setSqSize] = useState(52);
  const [isComplete, setIsComplete] = useState(false);
  const [exerciseStars, setExerciseStars] = useState<Record<number, number>>({});
  const [whiteMoves, setWhiteMoves] = useState(0);
  const [isStalemate, setIsStalemate] = useState(false);

  // Drag state
  const [dragPiece, setDragPiece] = useState<DragState | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const pointerStartRef = useRef<PointerStart | null>(null);
  const isCompleteRef = useRef(false);
  const demoModeRef = useRef(false);
  const mountedRef = useRef(true);

  const storageKey = lessonId ? `queenmate_progress_${lessonId}` : 'queenmate_progress';

  useEffect(() => () => { mountedRef.current = false; }, []);
  useEffect(() => { isCompleteRef.current = isComplete; }, [isComplete]);
  useEffect(() => { demoModeRef.current = demoMode; }, [demoMode]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setExerciseStars(JSON.parse(raw));
    } catch {}
  }, [storageKey]);

  // Initialize game on first mount
  useEffect(() => {
    if (!game) {
      const ex = EXERCISES.find(e => e.id === currentExercise)!;
      setGame(new Chess(ex.fen));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const ex = EXERCISES.find(e => e.id === currentExercise)!;
    setGame(new Chess(ex.fen));
    setSelectedSquare(null);
    setMessage('');
    setDemoMode(false);
    setDemoStep(0);
    setDemoComment('');
    setIsComplete(false);
    setIsStalemate(false);
    setWhiteMoves(0);
  }, [currentExercise]);

  const switchExercise = useCallback((id: ExerciseId) => {
    if (id === currentExercise) return;
    const ex = EXERCISES.find(e => e.id === id)!;
    setCurrentExercise(id);
    setGame(new Chess(ex.fen));
    setSelectedSquare(null);
    setMessage('');
    setDemoMode(false);
    setDemoStep(0);
    setDemoComment('');
    setIsComplete(false);
    setIsStalemate(false);
    setWhiteMoves(0);
  }, [currentExercise]);

  const saveStars = useCallback((id: ExerciseId, stars: number) => {
    setExerciseStars(prev => {
      const next = { ...prev, [id]: Math.max(prev[id] || 0, stars) };
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [storageKey]);

  // Demo auto-play
  useEffect(() => {
    if (!demoMode || !currentExercise) return;
    const ex = EXERCISES.find(e => e.id === currentExercise)!;
    if (demoStep >= ex.demoMoves.length) {
      setDemoMode(false);
      setDemoComment('Мат чёрному королю!');
      setTimeout(() => { if (mountedRef.current) setDemoComment(''); }, 3000);
      return;
    }
    const move = ex.demoMoves[demoStep];
    setDemoComment(move.comment);
    const timer = setTimeout(() => {
      if (!mountedRef.current) return;
      setGame(prev => {
        if (!prev) return null;
        const g = new Chess(prev.fen());
        g.move({ from: move.from, to: move.to });
        return g;
      });
      setDemoStep(s => s + 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [demoMode, demoStep, currentExercise]);

  // ═══════════════════════════════════════════════════════════════
  // GAME LOGIC (handle white move + black AI response)
  // ═══════════════════════════════════════════════════════════════
  const processWhiteMove = useCallback((from: string, to: string) => {
    if (!game) return;
    const g = game;
    if (g.turn() !== 'w') return;

    try {
      const move = g.move({ from, to });
      if (!move) return;

      const fenAfter = g.fen();
      const nextWhiteMoves = whiteMoves + 1;
      setGame(new Chess(fenAfter));
      setSelectedSquare(null);
      setMessage('');
      setWhiteMoves(nextWhiteMoves);

      if (g.isCheckmate()) {
        const ex = EXERCISES.find(e => e.id === currentExercise)!;
        const earned = calcStars(ex, nextWhiteMoves);
        setMessage(`Мат чёрному королю! ${earned} ★`);
        setIsComplete(true);
        saveStars(currentExercise, earned);
        onComplete();
        return;
      }

      if (g.isStalemate()) {
        setIsStalemate(true);
        setMessage('Пат. Ещё раз. Провалено.');
        return;
      }

      if (g.isDraw()) {
        setMessage('Ничья! Начните заново.');
        return;
      }

      // Black's turn — AI move
      setTimeout(() => {
        if (!mountedRef.current) return;
        const blackMove = getBlackKingMove(g);
        if (blackMove) {
          g.move({ from: blackMove.from, to: blackMove.to });
          const fenAfterBlack = g.fen();
          setGame(new Chess(fenAfterBlack));
          if (g.isCheckmate()) {
            const ex = EXERCISES.find(e => e.id === currentExercise)!;
            const earned = calcStars(ex, nextWhiteMoves);
            setMessage(`Мат чёрному королю! ${earned} ★`);
            setIsComplete(true);
            saveStars(currentExercise, earned);
            onComplete();
          }
        } else {
          if (g.isCheckmate()) {
            const ex = EXERCISES.find(e => e.id === currentExercise)!;
            const earned = calcStars(ex, nextWhiteMoves);
            setMessage(`Мат чёрному королю! ${earned} ★`);
            setIsComplete(true);
            saveStars(currentExercise, earned);
            onComplete();
          } else if (g.isStalemate()) {
            setIsStalemate(true);
            setMessage('Пат. Ещё раз. Провалено.');
          } else {
            setMessage('Ничья! Начните заново.');
          }
        }
      }, 500);
    } catch {
      // Invalid move
    }
  }, [game, whiteMoves, currentExercise, saveStars, onComplete]);

  // ═══════════════════════════════════════════════════════════════
  // CLICK HANDLER
  // ═══════════════════════════════════════════════════════════════
  const handleSquareClick = useCallback((square: string) => {
    if (demoModeRef.current || isCompleteRef.current) return;
    if (!game) return;
    const g = game;
    if (g.turn() !== 'w') return;

    const piece = g.get(square as any);

    if (selectedSquare) {
      if (selectedSquare === square) {
        setSelectedSquare(null);
        return;
      }
      processWhiteMove(selectedSquare, square);
      if (piece && piece.color === 'w') {
        setSelectedSquare(square);
      }
    } else {
      if (piece && piece.color === 'w') {
        setSelectedSquare(square);
      }
    }
  }, [game, selectedSquare, processWhiteMove]);

  // ═══════════════════════════════════════════════════════════════
  // DRAG AND DROP (pointer events)
  // ═══════════════════════════════════════════════════════════════
  const handlePointerDown = useCallback((e: React.PointerEvent, square: string) => {
    if (isCompleteRef.current || demoModeRef.current) return;
    if (!game) return;
    const g = game;
    if (g.turn() !== 'w') return;
    const piece = g.get(square as any);
    if (!piece || piece.color !== 'w') return;
    if (e.pointerType === 'touch' && !(e as any).isPrimary) return;
    pointerStartRef.current = { x: e.clientX, y: e.clientY, square, moved: false, pointerId: e.pointerId };
  }, [game]);

  useEffect(() => {
    const handleGlobalMove = (e: PointerEvent) => {
      const start = pointerStartRef.current;
      if (!start) return;
      if (e.pointerId !== start.pointerId) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (!start.moved && (Math.abs(dx) > 20 || Math.abs(dy) > 20)) {
        start.moved = true;
        const piece = game?.get(start.square as any);
        if (piece) {
          setDragPiece({ square: start.square, type: piece.type.toUpperCase(), color: piece.color as 'w' | 'b' });
          setSelectedSquare(null);
        }
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
        // click handled by onClick
      } else {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const cell = el?.closest('[data-square]') as HTMLElement | null;
        const targetSquare = cell?.dataset.square || null;
        if (targetSquare && targetSquare !== start.square) {
          processWhiteMove(start.square, targetSquare);
        }
        setDragPiece(null);
      }
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
  }, [game, processWhiteMove]);

  const getPieceAt = (sq: string) => {
    if (!game) return null;
    const p = game.get(sq as any);
    if (!p) return null;
    return { type: p.type.toUpperCase(), color: p.color as 'w' | 'b' };
  };

  const isLight = (f: number, r: number) => (f + r) % 2 === 0;

  const validMoves = selectedSquare && game
    ? (game.moves({ square: selectedSquare as any, verbose: true }).map(m => m.to) as string[])
    : dragPiece && game
      ? (game.moves({ square: dragPiece.square as any, verbose: true }).map(m => m.to) as string[])
      : [];

  const currentEx = EXERCISES.find(e => e.id === currentExercise)!;
  const earned = exerciseStars[currentExercise] || 0;
  const turnText = game ? (game.turn() === 'w' ? 'Ваш ход (белые)' : 'Ход чёрных...') : '';

  return (
    <div className="flex flex-col lg:flex-row gap-4 w-full min-h-[500px]">
      {/* LEFT COLUMN: exercise pills (desktop) */}
      <div className="w-full lg:w-[140px] flex-shrink-0 space-y-2">
        <div className="hidden lg:flex flex-col rounded overflow-hidden border border-gray-200">
          {EXERCISES.map((ex) => {
            const earnedStars = exerciseStars[ex.id] || 0;
            const isCurrent = ex.id === currentExercise;
            const isDone = earnedStars > 0;
            return (
              <button
                key={ex.id}
                onClick={() => switchExercise(ex.id)}
                className={`flex items-center justify-center px-2 py-1.5 transition ${
                  isCurrent
                    ? 'bg-blue-500 text-white'
                    : isDone
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                } cursor-pointer hover:brightness-110`}
              >
                <div className="flex gap-0.5">
                  {[1, 2, 3].map((s) => (
                    <StarPng key={s} filled={earnedStars > 0 && s <= earnedStars} size={14} />
                  ))}
                </div>
                <span className="ml-2 text-xs font-medium">{ex.id}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={reset}
          className="hidden lg:flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition w-full justify-center"
        >
          <RotateCcw size={14} /> Заново
        </button>
      </div>

      {/* CENTER COLUMN: board + stats */}
      <div className="flex-1 flex flex-col items-center gap-3">
        <div className="text-[#2b2b2b] text-[15px] font-medium mb-2 text-center leading-snug w-full">
          {currentEx.description}
        </div>

        {currentExercise === 1 && !demoMode && !isComplete && (
          <button
            onClick={() => { reset(); setDemoMode(true); setDemoStep(0); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Eye className="w-4 h-4" />
            Посмотреть, как ставить мат
          </button>
        )}

        {demoComment && (
          <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 text-center max-w-sm">
            {demoComment}
          </div>
        )}

        <div className={`text-sm font-bold ${game && game.turn() === 'w' ? 'text-blue-600' : 'text-slate-400'}`}>
          {demoMode ? 'Демонстрация...' : turnText}
        </div>

        {/* Stalemate / fail banner */}
        {isStalemate && (
          <div className="w-full max-w-sm">
            <div className="bg-[#c62828] rounded-lg p-4 flex flex-col items-center gap-2 shadow-lg">
              <p className="text-white font-bold text-lg">Пат. Провалено.</p>
              <button
                onClick={reset}
                className="bg-white text-[#c62828] font-bold text-base px-6 py-2 rounded shadow hover:bg-gray-100 transition"
              >
                ЕЩЁ РАЗ
              </button>
            </div>
          </div>
        )}

        {/* Success message */}
        {message && !isStalemate && (
          <div className={`px-6 py-3 rounded-xl text-center font-bold text-white ${
            message.includes('Мат') ? 'bg-green-500' : 'bg-yellow-500'
          }`}>
            {message.includes('Мат') && <Trophy className="w-5 h-5 inline-block mr-2" />}
            {message}
          </div>
        )}

        {/* Board */}
        <div className="flex justify-center w-full relative">
          <div
            className="grid border-[3px] border-[#2b2b2b] rounded-sm relative select-none"
            style={{
              gridTemplateColumns: `repeat(8, ${sqSize}px)`,
              gridTemplateRows: `repeat(8, ${sqSize}px)`,
              touchAction: 'none',
            }}
          >
            {DISPLAY_RANKS.map((rank, ri) => (
              FILES.map((file, fi) => {
                const sq = `${file}${rank}`;
                const pieceObj = getPieceAt(sq);
                const light = isLight(fi, ri);
                const sel = selectedSquare === sq;
                const isValidMove = validMoves.includes(sq);
                const isDragSource = dragPiece?.square === sq;

                return (
                  <div
                    key={sq}
                    data-square={sq}
                    className="flex items-center justify-center relative select-none"
                    style={{
                      width: sqSize,
                      height: sqSize,
                      cursor: pieceObj && pieceObj.color === 'w' && !demoMode && !isComplete ? 'grab' : 'default',
                      touchAction: 'none',
                      backgroundColor: light ? '#f0d9b5' : '#b58863',
                      opacity: isDragSource ? 0.3 : 1,
                    }}
                    onClick={() => handleSquareClick(sq)}
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
                            backgroundColor: pieceObj ? '#c41e3a' : '#5d9040',
                            borderRadius: pieceObj ? '4px' : '50%',
                            opacity: 0.85,
                          }}
                        />
                      </div>
                    )}
                    {pieceObj && !isDragSource && (
                      <div className="relative pointer-events-none" style={{ width: Math.round(sqSize * 0.85), height: Math.round(sqSize * 0.85) }}>
                        <PieceImg type={pieceObj.type} color={pieceObj.color} />
                      </div>
                    )}
                  </div>
                );
              })
            ))}
          </div>

          {/* Dragged piece overlay */}
          {dragPiece && (
            <div
              className="fixed pointer-events-none z-50"
              style={{
                left: dragPos.x - sqSize * 0.425,
                top: dragPos.y - sqSize * 0.425,
                width: Math.round(sqSize * 0.85),
                height: Math.round(sqSize * 0.85),
              }}
            >
              <PieceImg type={dragPiece.type} color={dragPiece.color} />
            </div>
          )}
        </div>

        {/* Mobile exercise pills */}
        <div className="flex lg:hidden gap-1 justify-center w-full overflow-x-auto">
          {EXERCISES.map((ex) => {
            const earnedStars = exerciseStars[ex.id] || 0;
            const isCurrent = ex.id === currentExercise;
            const isDone = earnedStars > 0;
            return (
              <button
                key={ex.id}
                onClick={() => switchExercise(ex.id)}
                className={`flex items-center gap-0.5 px-1.5 py-1 rounded text-xs transition ${
                  isCurrent ? 'bg-blue-500 text-white' : isDone ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'
                } cursor-pointer`}
              >
                <div className="flex gap-0.5">
                  {[1, 2, 3].map((s) => (
                    <StarPng key={s} filled={earnedStars > 0 && s <= earnedStars} size={12} />
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={reset}
          className="flex lg:hidden items-center gap-1 px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition"
        >
          <RotateCcw size={14} /> Заново
        </button>

        <div className="text-center text-sm text-slate-600 max-w-sm px-4">
          <p className="font-medium mb-1">Цель:</p>
          <p>Поставьте мат чёрному королю ферзём. Используйте ферзя для ограничения пространства, а короля — для поддержки.</p>
        </div>
      </div>
    </div>
  );
}
