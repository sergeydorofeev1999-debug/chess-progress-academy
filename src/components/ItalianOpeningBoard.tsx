'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { RotateCcw, Trophy } from 'lucide-react';

const FILES = ['a','b','c','d','e','f','g','h'];
const RANKS = ['8','7','6','5','4','3','2','1'];
const DISPLAY_RANKS = ['8','7','6','5','4','3','2','1'];

const START_FEN_1 = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

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

export default function ItalianOpeningBoard({ onComplete, lessonId }: { onComplete: () => void; lessonId?: string }) {
  const [exercise, setExercise] = useState<1>(1);
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

  const storageKey = lessonId ? `italian_progress_${lessonId}` : 'italian_progress';

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
    if (!game) {
      setGame(new Chess(START_FEN_1));
      setMessage('В дебюте главное — захватить центр. Белые начинают с e4.');
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
    setGame(new Chess(START_FEN_1));
    setSelectedSquare(null);
    setMessage('В дебюте главное — захватить центр. Белые начинают с e4.');
    setIsFail(false);
    setIsComplete(false);
    setWhiteMoves(0);
  }, []);

  const saveStars = useCallback((ex: 1, stars: number) => {
    setExerciseStars(prev => {
      const next = { ...prev, [ex]: Math.max(prev[ex] || 0, stars) };
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [storageKey]);

  const processWhiteMove = useCallback((from: string, to: string) => {
    if (!game) return;
    const g = game;
    if (g.turn() !== 'w') return;

    try {
      const move = g.move({ from, to });
      if (!move) return;

      const nextWhiteMoves = whiteMoves + 1;

      if (exercise === 1) {
        // EXERCISE 1: Italian Game — e4, Nf3, Bc4
        const isCorrectE4 = from === 'e2' && to === 'e4' && move.piece === 'p';
        const isCorrectNf3 = from === 'g1' && to === 'f3' && move.piece === 'n';
        const isCorrectBc4 = from === 'f1' && to === 'c4' && move.piece === 'b';

        if (whiteMoves === 0) {
          if (!isCorrectE4) {
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
            g.move({ from: 'e7' as any, to: 'e5' as any });
            setGame(new Chess(g.fen()));
            setMessage('Конь выходит на f3 — защищает пешку e4 и готовит развитие.');
          }, 1000);
          return;
        }

        if (whiteMoves === 1) {
          if (!isCorrectNf3) {
            setSelectedSquare(null);
            setIsFail(true);
            setMessage('Провалено');
            return;
          }
          setGame(new Chess(g.fen()));
          setSelectedSquare(null);
          setWhiteMoves(nextWhiteMoves);

          setTimeout(() => {
            if (!mountedRef.current) return;
            g.move({ from: 'b8' as any, to: 'c6' as any });
            setGame(new Chess(g.fen()));
            setMessage('Развейте слона на c4 — он направит орудие на уязвимое поле f7.');
          }, 1000);
          return;
        }

        if (whiteMoves === 2) {
          if (!isCorrectBc4) {
            setSelectedSquare(null);
            setIsFail(true);
            setMessage('Провалено');
            return;
          }
          setGame(new Chess(g.fen()));
          setSelectedSquare(null);
          setWhiteMoves(nextWhiteMoves);

          setTimeout(() => {
            if (!mountedRef.current) return;
            g.move({ from: 'f8' as any, to: 'c5' as any });
            setGame(new Chess(g.fen()));
            setIsComplete(true);
            setMessage('Отлично! Вы развели слона на c4 — классическая итальянская партия.');
            saveStars(1, 3);
          }, 1000);
          return;
        }
      }
    } catch {
      // ignore invalid move
    }
  }, [game, whiteMoves, exercise, saveStars]);

  const handleSquareClick = useCallback((sq: string) => {
    if (!game || isCompleteRef.current || isFailRef.current) return;

    const piece = game.get(sq as any);
    if (selectedSquare) {
      if (selectedSquare === sq) {
        setSelectedSquare(null);
        return;
      }
      processWhiteMove(selectedSquare, sq);
      return;
    }
    if (piece && piece.color === 'w') {
      setSelectedSquare(sq);
    }
  }, [game, selectedSquare, processWhiteMove]);

  const handlePointerDown = useCallback((e: React.PointerEvent, sq: string) => {
    if (!game || isCompleteRef.current || isFailRef.current) return;
    const piece = game.get(sq as any);
    if (!piece || piece.color !== 'w') return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    pointerStartRef.current = { x: e.clientX, y: e.clientY, square: sq, moved: false, pointerId: e.pointerId };
  }, [game]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const start = pointerStartRef.current;
    if (!start || start.pointerId !== e.pointerId) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (!start.moved && Math.sqrt(dx*dx + dy*dy) > 6) {
      start.moved = true;
      const piece = game?.get(start.square as any);
      if (piece) {
        setDragPiece({ square: start.square, type: piece.type, color: piece.color });
      }
    }
    if (start.moved) {
      setDragPos({ x: e.clientX, y: e.clientY });
    }
  }, [game]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const start = pointerStartRef.current;
    if (!start || start.pointerId !== e.pointerId) return;
    pointerStartRef.current = null;
    setDragPiece(null);
    if (!start.moved) return;

    const boardEl = document.getElementById('italian-chess-board');
    if (!boardEl) return;
    const rect = boardEl.getBoundingClientRect();
    const size = rect.width / 8;
    const col = Math.floor((e.clientX - rect.left) / size);
    const row = Math.floor((e.clientY - rect.top) / size);
    if (col < 0 || col > 7 || row < 0 || row > 7) return;
    const to = FILES[col] + DISPLAY_RANKS[row];
    if (to !== start.square) {
      processWhiteMove(start.square, to);
    }
  }, [processWhiteMove]);

  const board = game ? game.board() : null;

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 items-start justify-center">
      {/* Board area */}
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center justify-between w-full max-w-[600px]">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <span>Упражнение</span>
            <span className="font-semibold text-white">1/1</span>
          </div>
          <button
            onClick={reset}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors px-2 py-1 rounded-md hover:bg-slate-800"
          >
            <RotateCcw size={14} />
            Сначала
          </button>
        </div>

        {/* message banner */}
        {message && (
          <div className={`w-full max-w-[600px] px-4 py-3 rounded-lg text-sm font-medium text-center transition-all ${
            isComplete ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50' :
            isFail ? 'bg-red-900/60 text-red-300 border border-red-700/50' :
            'bg-amber-900/60 text-amber-300 border border-amber-700/50'
          }`}>
            {message}
            {isFail && (
              <button
                onClick={reset}
                className="ml-3 text-xs underline hover:no-underline"
              >
                ЕЩЁ РАЗ
              </button>
            )}
          </div>
        )}

        <div
          id="italian-chess-board"
          className="relative select-none"
          style={{ width: sqSize * 8, height: sqSize * 8 }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* squares */}
          {RANKS.map((rank, rIdx) =>
            FILES.map((file, fIdx) => {
              const sq = file + DISPLAY_RANKS[rIdx];
              const isLight = (fIdx + rIdx) % 2 === 0;
              const isSelected = selectedSquare === sq;
              return (
                <div
                  key={sq}
                  className="absolute flex items-center justify-center"
                  style={{
                    left: fIdx * sqSize,
                    top: rIdx * sqSize,
                    width: sqSize,
                    height: sqSize,
                    backgroundColor: isSelected ? '#4ade80' : isLight ? '#f0d9b5' : '#b58863',
                    cursor: 'pointer',
                  }}
                  onClick={() => handleSquareClick(sq)}
                  onPointerDown={(e) => handlePointerDown(e, sq)}
                >
                  {(() => {
                    const p = board && board[7 - rIdx]?.[fIdx];
                    if (!p) return null;
                    return (
                      <div className="w-full h-full p-0.5">
                        <PieceImg type={p.type} color={p.color} />
                      </div>
                    );
                  })()}
                  {/* rank/file labels */}
                  {fIdx === 0 && (
                    <span className="absolute top-0.5 left-0.5 text-[10px] font-bold opacity-60"
                      style={{ color: isLight ? '#b58863' : '#f0d9b5' }}>
                      {DISPLAY_RANKS[rIdx]}
                    </span>
                  )}
                  {rIdx === 7 && (
                    <span className="absolute bottom-0.5 right-0.5 text-[10px] font-bold opacity-60"
                      style={{ color: isLight ? '#b58863' : '#f0d9b5' }}>
                      {file}
                    </span>
                  )}
                </div>
              );
            })
          )}

          {/* dragged piece */}
          {dragPiece && (
            <div
              className="absolute pointer-events-none z-50"
              style={{
                left: dragPos.x - sqSize / 2,
                top: dragPos.y - sqSize / 2,
                width: sqSize,
                height: sqSize,
              }}
            >
              <PieceImg type={dragPiece.type} color={dragPiece.color} />
            </div>
          )}
        </div>

        {/* stars */}
        <div className="flex items-center gap-3">
          {[1, 2, 3].map(s => (
            <StarPng key={s} filled={(exerciseStars[exercise] || 0) >= s} size={20} />
          ))}
        </div>
      </div>

      {/* Side nav */}
      <div className="hidden lg:flex flex-col gap-2 w-48">
        <div className="flex items-center gap-2 text-sm font-semibold text-white mb-1">
          <Trophy size={16} className="text-amber-400" />
          Упражнения
        </div>
        {([1] as const).map((num) => (
          <button
            key={num}
            onClick={() => {
              setExercise(num);
              setGame(new Chess(START_FEN_1));
              setSelectedSquare(null);
              setMessage('');
              setIsFail(false);
              setIsComplete(false);
              setWhiteMoves(0);
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              exercise === num
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              (exerciseStars[num] || 0) >= 3 ? 'bg-amber-500/20 text-amber-400' :
              (exerciseStars[num] || 0) >= 1 ? 'bg-slate-600 text-slate-300' :
              'bg-slate-800 text-slate-500'
            }`}>
              {num}
            </span>
            <span className="flex-1 text-left">Итальянская партия</span>
            <div className="flex gap-0.5">
              {[1, 2, 3].map(s => (
                <StarPng key={s} filled={(exerciseStars[num] || 0) >= s} size={12} />
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
