'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { RotateCcw, Trophy } from 'lucide-react';

const FILES = ['a','b','c','d','e','f','g','h'];
const RANKS = ['8','7','6','5','4','3','2','1'];
const DISPLAY_RANKS = ['8','7','6','5','4','3','2','1'];

// 12 mixed tactics — lesson 31
const START_FEN_1 = '8/4k3/8/2pn2b1/3p4/3P2P1/1P2K3/5R2 w - - 0 1';
const START_FEN_2 = '4k3/4q3/8/8/8/8/4R3/4K3 w - - 0 1';   // pin
const START_FEN_3 = '4k3/3n4/8/8/4B3/8/8/4K3 w - - 0 1';   // pin
const START_FEN_4 = '6k1/6pp/1p2rp2/p1p5/5P2/1P4b1/P5P1/2Q3K1 w - - 0 1'; // pin
const START_FEN_5 = '8/B5kp/8/4r2p/8/5P2/6K1/8 w - - 0 1';   // pin
const START_FEN_6 = 'r1bqkb1r/1pp2ppp/2np1n2/pB2p3/3PP3/2N2N2/PPP2PPP/R1BQK2R w KQkq - 0 1'; // pin
const START_FEN_7 = '7r/1k6/1p3p2/pPpr2p1/Q7/6Pp/P1P2P1P/6K1 w - - 0 1'; // pin
const START_FEN_8 = 'rnb1kbnr/pp2pppp/2qp4/2p5/4P3/2N2N1P/PPPP1PP1/R1BQKB1R w KQkq - 0 1'; // pin
const START_FEN_9 = 'r2qkb1r/pppbpp1p/2n2np1/8/4N3/8/PPPPQPPP/R1B1KBNR w KQkq - 0 1'; // pin
const START_FEN_10 = '7k/6qp/8/8/8/2B5/r5PP/5RK1 w - - 0 1'; // pin
const START_FEN_11 = 'kr3r2/1p4R1/n5R1/8/1PP5/P4B2/1K6/8 w - - 0 1'; // pin
const START_FEN_12 = '4k3/6pp/5p2/4n3/8/7P/5PP1/4R1K1 w - - 0 1'; // pin

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

function getBlackKingMove(game: Chess): { from: string; to: string } | null {
  const moves = game.moves({ verbose: true }).filter(m => m.piece === 'k' && m.color === 'b');
  if (moves.length === 0) return null;
  const idx = Math.floor(Math.random() * moves.length);
  return { from: moves[idx].from, to: moves[idx].to };
}

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

export default function MixedTacticsBoard({ onComplete, lessonId }: { onComplete: () => void; lessonId?: string }) {
  const [exercise, setExercise] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12>(1);
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

  const [dragPiece, setDragPiece] = useState<DragState | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const pointerStartRef = useRef<PointerStart | null>(null);

  const storageKey = lessonId ? `mixed_progress_${lessonId}` : 'mixed_progress';

  useEffect(() => () => { mountedRef.current = false; }, []);
  useEffect(() => { isCompleteRef.current = isComplete; }, [isComplete]);
  useEffect(() => { isFailRef.current = isFail; }, [isFail]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setExerciseStars(JSON.parse(raw));
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    if (!game) setGame(new Chess(START_FEN_1));
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
    const fen = exercise === 1 ? START_FEN_1 : exercise === 2 ? START_FEN_2 : exercise === 3 ? START_FEN_3 : exercise === 4 ? START_FEN_4 : exercise === 5 ? START_FEN_5 : exercise === 6 ? START_FEN_6 : exercise === 7 ? START_FEN_7 : exercise === 8 ? START_FEN_8 : exercise === 9 ? START_FEN_9 : exercise === 10 ? START_FEN_10 : exercise === 11 ? START_FEN_11 : START_FEN_12;
    setGame(new Chess(fen));
    setSelectedSquare(null);
    setMessage('');
    setIsFail(false);
    setIsComplete(false);
    setWhiteMoves(0);
  }, [exercise]);

  const saveStars = useCallback((ex: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12, stars: number) => {
    setExerciseStars(prev => {
      const next = { ...prev, [ex]: Math.max(prev[ex] || 0, stars) };
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [storageKey]);

  const switchExercise = useCallback((num: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12) => {
    setExercise(num);
    const fen = num === 1 ? START_FEN_1 : num === 2 ? START_FEN_2 : num === 3 ? START_FEN_3 : num === 4 ? START_FEN_4 : num === 5 ? START_FEN_5 : num === 6 ? START_FEN_6 : num === 7 ? START_FEN_7 : num === 8 ? START_FEN_8 : num === 9 ? START_FEN_9 : num === 10 ? START_FEN_10 : num === 11 ? START_FEN_11 : START_FEN_12;
    setGame(new Chess(fen));
    setSelectedSquare(null);
    setMessage('');
    setIsFail(false);
    setIsComplete(false);
    setWhiteMoves(0);
  }, []);

  const processWhiteMove = useCallback((from: string, to: string) => {
    if (!game) return;
    const g = game;
    if (g.turn() !== 'w') return;

    try {
      const move = g.move({ from, to });
      if (!move) return;

      const nextWhiteMoves = whiteMoves + 1;

      if (exercise === 1) {
        // EXERCISE 1: Fork — Rf1-f5 attacks knight d5 and bishop g5
        const isCorrectFirst = from === 'f1' && to === 'f5' && move.piece === 'r';
        const isCorrectSecond = from === 'f5' && to === 'g5' && move.piece === 'r';

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
          setWhiteMoves(nextWhiteMoves);

          setTimeout(() => {
            if (!mountedRef.current) return;
            // King moves to d6 or e6 to defend the knight
            const kingMoves = g.moves({ verbose: true }).filter((m: any) => m.color === 'b' && m.piece === 'k');
            const preferred = kingMoves.filter((m: any) => m.to === 'd6' || m.to === 'e6');
            if (preferred.length > 0) {
              const km = preferred[Math.floor(Math.random() * preferred.length)];
              g.move({ from: km.from, to: km.to });
            } else if (kingMoves.length > 0) {
              const km = kingMoves[Math.floor(Math.random() * kingMoves.length)];
              g.move({ from: km.from, to: km.to });
            }
            setGame(new Chess(g.fen()));
          }, 1000);

          setMessage('Хорошо! Теперь заберите слона.');
          return;
        }

        if (whiteMoves === 1) {
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
          saveStars(1, 3);
          return;
        }
      } else {
        // EXERCISES 2-12: placeholder — just accept any move for now
        setGame(new Chess(g.fen()));
        setSelectedSquare(null);
        setIsComplete(true);
        setMessage('Отлично! Упражнение выполнено.');
        saveStars(exercise as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12, 3);
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
                onClick={() => switchExercise(num as 1|2|3|4|5|6|7|8|9|10|11|12)}
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
                switchExercise((exercise + 1) as 1|2|3|4|5|6|7|8|9|10|11|12);
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

        {isFail && (
          <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded text-sm font-medium">
            Провалено
          </div>
        )}

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
                onClick={() => switchExercise(num as 1|2|3|4|5|6|7|8|9|10|11|12)}
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
