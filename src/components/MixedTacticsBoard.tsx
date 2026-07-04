'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { RotateCcw, Trophy } from 'lucide-react';

const FILES = ['a','b','c','d','e','f','g','h'];
const RANKS = ['8','7','6','5','4','3','2','1'];
const DISPLAY_RANKS = ['8','7','6','5','4','3','2','1'];

// 12 mixed tactics: 4 forks, 4 pins, 4 discovered attacks
interface Position {
  fen: string;
  first: { from: string; to: string; piece: string };
  second: { from: string; to: string; piece: string } | null;
  hint: string;
}

const POSITIONS: Position[] = [
  { fen: '8/8/3k4/4q3/8/8/3N4/4K3 w - - 0 1', first: { from:'d2', to:'c4', piece:'n' }, second: null, hint: 'Конь с d2 на c4 — шах и атака на ферзя' },
  { fen: '8/3k4/5r2/8/8/5N2/8/4K3 w - - 0 1', first: { from:'f3', to:'d4', piece:'n' }, second: null, hint: 'Конь с f3 на d4 — шах и атака на ладью' },
  { fen: '8/8/3k4/5q2/8/4P3/8/4K3 w - - 0 1', first: { from:'e3', to:'e4', piece:'p' }, second: null, hint: 'Пешка с e3 на e4 — шах и атака на ферзя' },
  { fen: '8/3k4/5q2/8/4Q3/8/8/4K3 w - - 0 1', first: { from:'e4', to:'e6', piece:'q' }, second: null, hint: 'Ферзь с e4 на e6 — шах и атака на ферзя' },
  { fen: '4k3/4q3/8/8/8/8/4R3/4K3 w - - 0 1', first: { from:'e2', to:'e8', piece:'r' }, second: null, hint: 'Ладья с e2 на e8 — связка ферзя с королём' },
  { fen: '4k3/3n4/8/8/4B3/8/8/4K3 w - - 0 1', first: { from:'e4', to:'c7', piece:'b' }, second: null, hint: 'Слон с e4 на c7 — связка коня с королём' },
  { fen: '3r4/3n4/8/8/4Q3/8/8/4K3 w - - 0 1', first: { from:'e4', to:'e6', piece:'q' }, second: null, hint: 'Ферзь с e4 на e6 — связка коня с ладьёй' },
  { fen: '4k3/5q2/8/8/8/8/5B2/4K3 w - - 0 1', first: { from:'f2', to:'h5', piece:'b' }, second: null, hint: 'Слон с f2 на h5 — связка ферзя с королём' },
  { fen: '4k3/8/8/4r3/4P3/8/8/4K3 w - - 0 1', first: { from:'e4', to:'e5', piece:'p' }, second: null, hint: 'Пешка с e4 на e5 — вскрываем ладью на короля' },
  { fen: '4k3/8/8/3q4/3N4/2B5/8/4K3 w - - 0 1', first: { from:'d4', to:'c6', piece:'n' }, second: null, hint: 'Конь с d4 на c6 — вскрываем слона на ферзя' },
  { fen: '4k3/8/8/3q4/8/3R4/8/3QK3 w - - 0 1', first: { from:'d3', to:'d8', piece:'r' }, second: null, hint: 'Ладья с d3 на d8 — вскрываем ферзя на короля' },
  { fen: '4k3/8/8/3n4/3P4/8/8/4K3 w - - 0 1', first: { from:'d4', to:'d5', piece:'p' }, second: null, hint: 'Пешка с d4 на d5 — вскрываем коня на короля' },
];

function getBestBlackCapture(game: Chess): { from: string; to: string } | null {
  const pieceValues: Record<string, number> = { q: 9, r: 5, b: 3, n: 3, p: 1 };
  const blackCaptures = game.moves({ verbose: true }).filter(m => m.color === 'b' && m.captured);
  const safeCaptures: typeof blackCaptures = [];
  for (const m of blackCaptures) {
    const testGame = new Chess(game.fen());
    testGame.move({ from: m.from, to: m.to });
    const whiteRecaptures = testGame.moves({ verbose: true }).filter(wm => wm.color === 'w' && wm.to === m.to);
    if (whiteRecaptures.length === 0) {
      safeCaptures.push(m);
    }
  }
  if (safeCaptures.length > 0) {
    safeCaptures.sort((a, b) => (pieceValues[b.captured || 'p'] || 0) - (pieceValues[a.captured || 'p'] || 0));
    return safeCaptures[0];
  }
  return null;
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

interface PointerStart {
  x: number;
  y: number;
  square: string;
  moved: boolean;
  pointerId: number;
}

export default function MixedTacticsBoard({ onComplete, lessonId }: { onComplete: () => void; lessonId?: string }) {
  const [exercise, setExercise] = useState<number>(1);
  const [game, setGame] = useState<Chess | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [isFail, setIsFail] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [whiteMoves, setWhiteMoves] = useState(0);
  const [sqSize, setSqSize] = useState(52);
  const [exerciseStars, setExerciseStars] = useState<Record<number, number>>({});

  const isCompleteRef = useRef(false);
  const isFailRef = useRef(false);
  const mountedRef = useRef(true);

  const [dragPiece, setDragPiece] = useState<{square:string;type:string;color:'w'|'b'} | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const pointerStartRef = useRef<PointerStart | null>(null);

  const storageKey = lessonId ? `mixed_stars_${lessonId}` : 'mixed_stars';

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setExerciseStars(JSON.parse(raw));
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    const update = () => {
      if (window.innerWidth < 640) {
        setSqSize(Math.min(48, Math.floor((window.innerWidth - 24) / 8)));
      } else {
        setSqSize(Math.min(64, Math.max(48, Math.floor((window.innerWidth - 340) / 8))));
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const getFen = useCallback((ex: number) => {
    const pos = POSITIONS[ex - 1];
    return pos ? pos.fen : POSITIONS[0].fen;
  }, []);

  const reset = useCallback(() => {
    const fen = getFen(exercise);
    setGame(new Chess(fen));
    setSelectedSquare(null);
    setMessage('');
    setIsFail(false);
    setIsComplete(false);
    setWhiteMoves(0);
  }, [exercise, getFen]);

  useEffect(() => { reset(); }, [reset]);

  const saveStars = useCallback((ex: number, stars: number) => {
    setExerciseStars(prev => {
      const next = { ...prev, [ex]: Math.max(prev[ex] || 0, stars) };
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [storageKey]);

  const switchExercise = useCallback((num: number) => {
    setExercise(num);
    const fen = getFen(num);
    setGame(new Chess(fen));
    setSelectedSquare(null);
    setMessage('');
    setIsFail(false);
    setIsComplete(false);
    setWhiteMoves(0);
  }, [getFen]);

  const processWhiteMove = useCallback((from: string, to: string) => {
    if (!game) return;
    const g = game;
    if (g.turn() !== 'w') return;

    try {
      const move = g.move({ from, to });
      if (!move) return;

      const pos = POSITIONS[exercise - 1];
      const nextWhiteMoves = whiteMoves + 1;

      const isCorrectFirst = from === pos.first.from && to === pos.first.to && move.piece === pos.first.piece;
      const isCorrectSecond = pos.second !== null && from === pos.second.from && to === pos.second.to && move.piece === pos.second.piece;

      if (whiteMoves === 0) {
        if (!isCorrectFirst) {
          setTimeout(() => {
            if (!mountedRef.current) return;
            const cap = getBestBlackCapture(g);
            if (cap) {
              g.move({ from: cap.from, to: cap.to });
              setGame(new Chess(g.fen()));
            }
            setIsFail(true);
            setMessage('Провалено');
          }, 1000);
          setSelectedSquare(null);
          return;
        }
        setGame(new Chess(g.fen()));
        setSelectedSquare(null);

        if (pos.second) {
          setTimeout(() => {
            if (!mountedRef.current) return;
            const anyBlackMove = g.moves({ verbose: true }).filter((m: any) => m.color === 'b');
            if (anyBlackMove.length > 0) {
              g.move({ from: anyBlackMove[0].from, to: anyBlackMove[0].to });
            }
            setGame(new Chess(g.fen()));
            setWhiteMoves(nextWhiteMoves);
          }, 1000);
          return;
        } else {
          setIsComplete(true);
          setMessage('Отлично! Тактика выполнена.');
          saveStars(exercise, 3);
          return;
        }
      }

      if (whiteMoves === 1 && pos.second) {
        if (!isCorrectSecond) {
          setSelectedSquare(null);
          setIsFail(true);
          setMessage('Провалено');
          return;
        }
        setGame(new Chess(g.fen()));
        setSelectedSquare(null);
        setIsComplete(true);
        setMessage('Отлично! Тактика выполнена.');
        saveStars(exercise, 3);
        return;
      }
    } catch {
      // Invalid move
    }
  }, [game, whiteMoves, exercise, saveStars]);

  const handleSquareClick = useCallback((square: string) => {
    if (isCompleteRef.current || isFailRef.current) return;
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

  const handlePointerDown = useCallback((e: React.PointerEvent, square: string) => {
    if (!game || game.turn() !== 'w') return;
    const piece = game.get(square as any);
    if (!piece || piece.color !== 'w') return;
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    pointerStartRef.current = { x: e.clientX, y: e.clientY, square, moved: false, pointerId: e.pointerId };
    setDragPiece({ square, type: piece.type, color: piece.color });
    setDragPos({ x: e.clientX, y: e.clientY });
  }, [game]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!pointerStartRef.current) return;
    const dx = Math.abs(e.clientX - pointerStartRef.current.x);
    const dy = Math.abs(e.clientY - pointerStartRef.current.y);
    if (dx > 5 || dy > 5) {
      pointerStartRef.current.moved = true;
    }
    setDragPos({ x: e.clientX, y: e.clientY });
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!pointerStartRef.current) return;
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    setDragPiece(null);
    if (isCompleteRef.current || isFailRef.current) return;
    if (!start.moved) {
      handleSquareClick(start.square);
      return;
    }
    const boardEl = document.getElementById('chess-board-mixed');
    if (!boardEl) return;
    const rect = boardEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const fi = Math.floor(x / sqSize);
    const ri = Math.floor(y / sqSize);
    if (fi >= 0 && fi < 8 && ri >= 0 && ri < 8) {
      const to = `${FILES[fi]}${DISPLAY_RANKS[ri]}`;
      processWhiteMove(start.square, to);
    }
  }, [sqSize, handleSquareClick, processWhiteMove]);

  useEffect(() => {
    isCompleteRef.current = isComplete;
    isFailRef.current = isFail;
  }, [isComplete, isFail]);

  if (!game) return null;

  const turnText = game.turn() === 'w' ? 'Ход белых' : 'Ход чёрных';

  return (
    <div className="w-full flex flex-col lg:flex-row gap-4 items-start">
      {/* LEFT COLUMN */}
      <div className="w-full lg:w-[300px] flex-shrink-0 space-y-2">
        <div className="hidden lg:grid grid-cols-4 gap-1 rounded p-1 border border-gray-200">
          {[1,2,3,4,5,6,7,8,9,10,11,12].map((num) => {
            const earnedStars = exerciseStars[num] || 0;
            const isCurrent = num === exercise;
            return (
              <button
                key={num}
                onClick={() => switchExercise(num)}
                className={`flex items-center justify-center px-1 py-1 rounded transition ${
                  isCurrent ? 'bg-blue-500 text-white' : earnedStars > 0 ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'
                }`}
              >
                <span className="text-[11px] font-semibold">{num}</span>
                {earnedStars > 0 && <StarPng filled size={10} />}
              </button>
            );
          })}
        </div>

        <button
          onClick={reset}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded text-sm font-medium hover:bg-blue-700 transition"
        >
          <RotateCcw size={16} /> Начать заново
        </button>

        {isComplete && (
          <button
            onClick={() => {
              if (exercise < 12) {
                switchExercise(exercise + 1);
              } else {
                onComplete();
              }
            }}
            className="w-full flex items-center justify-center gap-2 bg-emerald-500 text-white py-2 rounded text-sm font-medium hover:bg-emerald-600 transition"
          >
            <Trophy size={16} /> {exercise < 12 ? 'Следующее упражнение' : 'Урок завершён!'}
          </button>
        )}
      </div>

      {/* CENTER COLUMN */}
      <div className="flex-1 flex flex-col items-center gap-3">
        <div className="text-[#2b2b2b] text-[15px] font-medium mb-2 text-center leading-snug w-full">
          Упражнение {exercise} / 12. Найди лучший ход!
        </div>

        <div className="text-center font-bold text-slate-700 text-lg">
          {turnText}
        </div>

        {/* Fail banner */}
        {isFail && (
          <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded text-sm font-medium">
            Провалено
          </div>
        )}

        {/* Success banner */}
        {isComplete && (
          <div className="bg-emerald-100 border border-emerald-300 text-emerald-700 px-4 py-2 rounded text-sm font-medium">
            Отлично! Тактика выполнена.
          </div>
        )}

        {/* Board */}
        <div
          id="chess-board-mixed"
          className="relative select-none cursor-pointer"
          style={{ width: sqSize * 8, height: sqSize * 8 }}
          onPointerMove={handlePointerMove}
        >
          {Array.from({ length: 8 }).map((_, ri) =>
            Array.from({ length: 8 }).map((_, fi) => {
              const sq = `${FILES[fi]}${DISPLAY_RANKS[ri]}`;
              const isDark = (fi + ri) % 2 === 1;
              const isSelected = selectedSquare === sq;
              const piece = game.get(sq as any);

              return (
                <div
                  key={sq}
                  className={`absolute ${isDark ? 'bg-[#b58863]' : 'bg-[#f0d9b5]'}`}
                  style={{
                    left: fi * sqSize,
                    top: ri * sqSize,
                    width: sqSize,
                    height: sqSize,
                    backgroundColor: isSelected ? 'rgba(120,180,240,0.5)' : undefined,
                  }}
                  onPointerDown={(e) => handlePointerDown(e, sq)}
                  onPointerUp={handlePointerUp}
                >
                  {piece && <PieceImg type={piece.type} color={piece.color} />}
                </div>
              );
            })
          )}

          {dragPiece && (
            <div
              className="fixed pointer-events-none z-50"
              style={{ left: dragPos.x - sqSize / 2, top: dragPos.y - sqSize / 2, width: sqSize, height: sqSize }}
            >
              <PieceImg type={dragPiece.type} color={dragPiece.color} />
            </div>
          )}
        </div>

        {/* Stars */}
        <div className="flex gap-1 mt-1">
          {[1, 2, 3].map((s) => (
            <StarPng key={s} filled={isComplete && s <= 3} size={20} />
          ))}
        </div>

        {/* Mobile exercise pills */}
        <div className="flex lg:hidden flex-wrap justify-center gap-1 w-full">
          {[1,2,3,4,5,6,7,8,9,10,11,12].map((num) => {
            const earnedStars = exerciseStars[num] || 0;
            const isCurrent = num === exercise;
            return (
              <button
                key={num}
                onClick={() => switchExercise(num)}
                className={`flex items-center gap-0.5 px-1.5 py-1 rounded text-xs transition ${
                  isCurrent ? 'bg-blue-500 text-white' : earnedStars > 0 ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'
                }`}
              >
                <span className="font-semibold">{num}</span>
                {earnedStars > 0 && <StarPng filled size={10} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
