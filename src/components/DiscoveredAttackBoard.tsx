'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { RotateCcw, Trophy } from 'lucide-react';

const FILES = ['a','b','c','d','e','f','g','h'];
const RANKS = ['8','7','6','5','4','3','2','1'];
const DISPLAY_RANKS = ['8','7','6','5','4','3','2','1'];

const START_FEN_1 = '5q2/6pp/8/1k6/8/5N2/6PP/5RK1 w - - 0 1';
const START_FEN_2 = '5k2/3q2pp/8/8/8/5N2/6PP/5RK1 w - - 0 1';
const START_FEN_3 = '2k4r/1pp2r2/p7/4P3/3B4/2N5/PP6/1K1R4 w - - 0 1';
const START_FEN_4 = '8/2p1r1pk/3n2p1/8/4N1P1/1P4KP/8/4R3 w - - 0 1';
const START_FEN_5 = '1k5r/p1pq2p1/1p5p/5R2/6Q1/6P1/PP3PKP/8 w - - 0 1';

function getBestBlackCapture(game: Chess): { from: string; to: string } | null {
  const blackCaptures = game.moves({ verbose: true }).filter(m => m.color === 'b' && m.captured);
  for (const m of blackCaptures) {
    const testGame = new Chess(game.fen());
    testGame.move({ from: m.from, to: m.to });
    const whiteRecaptures = testGame.moves({ verbose: true }).filter(wm => wm.color === 'w' && wm.to === m.to);
    if (whiteRecaptures.length === 0) {
      return m;
    }
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

export default function DiscoveredAttackBoard({ onComplete, lessonId }: { onComplete: () => void; lessonId?: string }) {
  const [exercise, setExercise] = useState<1 | 2 | 3 | 4 | 5>(1);
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

  const storageKey = lessonId ? `discovered_attack_progress_${lessonId}` : 'discovered_attack_progress';

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
    const fen = exercise === 1 ? START_FEN_1 : exercise === 2 ? START_FEN_2 : exercise === 3 ? START_FEN_3 : exercise === 4 ? START_FEN_4 : START_FEN_5;
    setGame(new Chess(fen));
    setSelectedSquare(null);
    setMessage('');
    setIsFail(false);
    setIsComplete(false);
    setWhiteMoves(0);
  }, [exercise]);

  const saveStars = useCallback((ex: 1 | 2 | 3 | 4 | 5, stars: number) => {
    setExerciseStars(prev => {
      const next = { ...prev, [ex]: Math.max(prev[ex] || 0, stars) };
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [storageKey]);

  const switchExercise = useCallback((num: 1 | 2 | 3 | 4 | 5) => {
    setExercise(num);
    const fen = num === 1 ? START_FEN_1 : num === 2 ? START_FEN_2 : num === 3 ? START_FEN_3 : num === 4 ? START_FEN_4 : START_FEN_5;
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
        // EXERCISE 1: Discovered attack — Nf3-d4 check, black king escapes to c4, then Rf1xf8
        const isCorrectFirst = from === 'f3' && to === 'd4' && move.piece === 'n';
        const isCorrectSecond = from === 'f1' && to === 'f8' && move.piece === 'r';

        if (whiteMoves === 0) {
          if (!isCorrectFirst) {
            setTimeout(() => {
              if (!mountedRef.current) return;
              setIsFail(true);
              setMessage('Провалено');
            }, 1000);
            setSelectedSquare(null);
            return;
          }
          setGame(new Chess(g.fen()));
          setSelectedSquare(null);

          setTimeout(() => {
            if (!mountedRef.current) return;
            // After Nd4+, black king escapes to c4
            const kingMoves = g.moves({ verbose: true }).filter((m: any) => m.color === 'b' && m.piece === 'k');
            const kingToC4 = kingMoves.find((m: any) => m.to === 'c4');
            if (kingToC4) {
              g.move({ from: kingToC4.from, to: kingToC4.to });
            } else if (kingMoves.length > 0) {
              const kingMove = kingMoves[Math.floor(Math.random() * kingMoves.length)];
              g.move({ from: kingMove.from, to: kingMove.to });
            }
            setGame(new Chess(g.fen()));
            setWhiteMoves(nextWhiteMoves);
          }, 1000);

          setMessage('Шах! Теперь заберите ферзя.');
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
          setMessage('Отлично! Вскрытое нападение выполнено.');
          saveStars(1, 3);
          return;
        }
      } else if (exercise === 2) {
        // EXERCISE 2: Discovered attack — Nf3-e5 check, black king escapes to e8, then Nxd7
        const isCorrectFirst = from === 'f3' && to === 'e5' && move.piece === 'n';
        const isCorrectSecond = from === 'e5' && to === 'd7' && move.piece === 'n' && move.captured === 'q';

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

          setTimeout(() => {
            if (!mountedRef.current) return;
            // After Ne5+, black king escapes to e8
            const kingMoves = g.moves({ verbose: true }).filter((m: any) => m.color === 'b' && m.piece === 'k');
            const preferredKingSquares = ['e8'];
            const preferred = kingMoves.find((m: any) => preferredKingSquares.includes(m.to));
            if (preferred) {
              g.move({ from: preferred.from, to: preferred.to });
            } else if (kingMoves.length > 0) {
              const kingMove = kingMoves[Math.floor(Math.random() * kingMoves.length)];
              g.move({ from: kingMove.from, to: kingMove.to });
            }
            setGame(new Chess(g.fen()));
            setWhiteMoves(nextWhiteMoves);
          }, 1000);

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
          setMessage('Отлично! Вскрытое нападение выполнено.');
          saveStars(2, 3);
          return;
        }
      } else if (exercise === 3) {
        // EXERCISE 3: Discovered attack — e5-e6, rook f7 escapes to f8 or h7, then Bxh8
        const isCorrectFirst = from === 'e5' && to === 'e6' && move.piece === 'p';
        const isCorrectSecond = from === 'd4' && to === 'h8' && move.piece === 'b' && move.captured === 'r';

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

          setTimeout(() => {
            if (!mountedRef.current) return;
            // After e6, black rook on f7 escapes
            const rookMoves = g.moves({ verbose: true }).filter((m: any) => m.color === 'b' && m.piece === 'r' && m.from === 'f7');
            const preferredRookSquares = ['f8', 'h7'];
            const preferred = rookMoves.find((m: any) => preferredRookSquares.includes(m.to));
            if (preferred) {
              g.move({ from: preferred.from, to: preferred.to });
            } else if (rookMoves.length > 0) {
              const rookMove = rookMoves[Math.floor(Math.random() * rookMoves.length)];
              g.move({ from: rookMove.from, to: rookMove.to });
            }
            setGame(new Chess(g.fen()));
            setWhiteMoves(nextWhiteMoves);
          }, 1000);

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
          setMessage('Отлично! Вскрытое нападение выполнено.');
          saveStars(3, 3);
          return;
        }
      } else if (exercise === 4) {
        // EXERCISE 4: Discovered attack — Ne4-g5+ check, king escapes to h6, then Rxe7
        const isCorrectFirst = from === 'e4' && to === 'g5' && move.piece === 'n';
        const isCorrectSecond = from === 'e1' && to === 'e7' && move.piece === 'r' && move.captured === 'r';

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

          setTimeout(() => {
            if (!mountedRef.current) return;
            // After Ng5+, black king escapes to h6
            const kingMoves = g.moves({ verbose: true }).filter((m: any) => m.color === 'b' && m.piece === 'k');
            const preferredKingSquares = ['h6'];
            const preferred = kingMoves.find((m: any) => preferredKingSquares.includes(m.to));
            if (preferred) {
              g.move({ from: preferred.from, to: preferred.to });
            } else if (kingMoves.length > 0) {
              const kingMove = kingMoves[Math.floor(Math.random() * kingMoves.length)];
              g.move({ from: kingMove.from, to: kingMove.to });
            }
            setGame(new Chess(g.fen()));
            setWhiteMoves(nextWhiteMoves);
          }, 1000);

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
          setMessage('Отлично! Вскрытое нападение выполнено.');
          saveStars(4, 3);
          return;
        }
      } else if (exercise === 5) {
        // EXERCISE 5: Discovered attack — Rf5-f8+ check, black rook captures on f8, then Qg4xd7
        const isCorrectFirst = from === 'f5' && to === 'f8' && move.piece === 'r';
        const isCorrectSecond = from === 'g4' && to === 'd7' && move.piece === 'q' && move.captured === 'q';

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

          setTimeout(() => {
            if (!mountedRef.current) return;
            // After Rf8+, black rook on h8 captures on f8
            const rookCaptures = g.moves({ verbose: true }).filter((m: any) => m.color === 'b' && m.piece === 'r' && m.to === 'f8');
            if (rookCaptures.length > 0) {
              g.move({ from: rookCaptures[0].from, to: rookCaptures[0].to });
            } else {
              // Fallback: any black capture on f8
              const capturesOnF8 = g.moves({ verbose: true }).filter((m: any) => m.color === 'b' && m.captured && m.to === 'f8');
              if (capturesOnF8.length > 0) {
                g.move({ from: capturesOnF8[0].from, to: capturesOnF8[0].to });
              } else {
                // If no capture, just make any legal move
                const anyBlackMove = g.moves({ verbose: true }).filter((m: any) => m.color === 'b');
                if (anyBlackMove.length > 0) {
                  g.move({ from: anyBlackMove[0].from, to: anyBlackMove[0].to });
                }
              }
            }
            setGame(new Chess(g.fen()));
            setWhiteMoves(nextWhiteMoves);
          }, 1000);

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
          setMessage('Отлично! Вскрытое нападение выполнено.');
          saveStars(5, 3);
          return;
        }
      }
    } catch {
      // Invalid move
    }
  }, [game, whiteMoves, onComplete, saveStars, exercise]);

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
    if (isCompleteRef.current || isFailRef.current) return;
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

  const turnText = game ? (game.turn() === 'w' ? 'Ваш ход (белые)' : 'Ход чёрных...') : '';

  return (
    <div className="flex flex-col lg:flex-row gap-4 w-full min-h-[500px]">
      {/* LEFT COLUMN */}
      <div className="w-full lg:w-[300px] flex-shrink-0 space-y-2">
        <div className="hidden lg:grid grid-cols-5 gap-1 rounded p-1 border border-gray-200">
          {[1, 2, 3, 4, 5].map((num) => {
            const earnedStars = exerciseStars[num] || 0;
            const isCurrent = num === exercise;
            const isDone = earnedStars > 0;
            return (
              <button
                key={num}
                onClick={() => switchExercise(num as 1)}
                className={`flex items-center justify-center px-1 py-1 rounded transition ${
                  isCurrent
                    ? 'bg-blue-500 text-white'
                    : isDone
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                } cursor-pointer hover:brightness-110`}
              >
                <div className="flex gap-0.5">
                  {[1, 2, 3].map(s => (
                    <StarPng key={s} filled={earnedStars > 0 && s <= earnedStars} size={14} />
                  ))}
                </div>
                <span className="ml-1 text-xs font-medium">{num}</span>
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

      {/* CENTER COLUMN */}
      <div className="flex-1 flex flex-col items-center gap-3">
        <div className="text-[#2b2b2b] text-[15px] font-medium mb-2 text-center leading-snug w-full">
          {exercise === 1
            ? 'Вскрытое нападение — сходите конём с f3 на d4 (шах!), затем заберите ферзя ладьёй'
            : exercise === 2
            ? 'Вскрытое нападение — сходите конём с f3 на e5 (шах!), затем заберите ферзя'
            : exercise === 3
            ? 'Вскрытое нападение — сходите пешкой на e6, затем заберите ладью слоном'
            : exercise === 4
            ? 'Вскрытое нападение — сходите конём на g5 (шах!), затем заберите ладью'
            : exercise === 5
            ? 'Вскрытое нападение — сходите ладьёй на f8 (шах!), затем заберите ферзя'
            : ''}
        </div>

        <div className="text-center font-bold text-slate-700 text-lg">
          {turnText}
        </div>

        {/* Fail banner */}
        {isFail && (
          <div className="w-full max-w-sm">
            <div className="bg-[#c62828] rounded-lg p-4 flex flex-col items-center gap-2 shadow-lg">
              <p className="text-white font-bold text-lg">{message || 'Провалено'}</p>
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
        {message && !isFail && (
          <div className={`px-6 py-3 rounded-xl text-center font-bold text-white ${
            message.includes('Отлично') ? 'bg-green-500' : 'bg-yellow-500'
          }`}>
            {message.includes('Отлично') && <Trophy className="w-5 h-5 inline-block mr-2" />}
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
                      cursor: pieceObj && pieceObj.color === 'w' && !isFail && !isComplete ? 'grab' : 'default',
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

        <button
          onClick={reset}
          className="flex lg:hidden items-center gap-1 px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition"
        >
          <RotateCcw size={14} /> Заново
        </button>

        <div className="text-center text-sm text-slate-600 max-w-sm px-4">
          <p className="font-medium mb-1">Цель:</p>
          <p>{exercise === 1
          ? 'Сходите конём на d4, чтобы открыть ладью и поставить шах. Затем заберите ферзя ладьёй.'
          : exercise === 2
          ? 'Сходите конём на e5, чтобы открыть ладью и поставить шах. Затем заберите ферзя конём.'
          : exercise === 3
          ? 'Сходите пешкой на e6, чтобы открыть слона. Затем заберите ладью на h8 слоном.'
          : exercise === 4
          ? 'Сходите конём на g5, чтобы открыть ладью и поставить шах. Затем заберите ладью на e7.'
          : exercise === 5
          ? 'Сходите ладьёй на f8, чтобы поставить шах. После того как чёрная ладья заберёт вашу, ферзь заберёт чёрного ферзя на d7.'
          : ''}</p>
        </div>

        {/* Mobile exercise pills */}
        <div className="flex lg:hidden flex-wrap justify-center gap-1 w-full">
          {[1, 2, 3, 4, 5].map((num) => {
            const earnedStars = exerciseStars[num] || 0;
            const isCurrent = num === exercise;
            const isDone = earnedStars > 0;
            return (
              <button
                key={num}
                onClick={() => switchExercise(num as 1)}
                className={`flex items-center gap-0.5 px-1.5 py-1 rounded text-xs transition ${
                  isCurrent ? 'bg-blue-500 text-white' : isDone ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'
                } cursor-pointer`}
              >
                <div className="flex gap-0.5">
                  {[1, 2, 3].map(s => (
                    <StarPng key={s} filled={earnedStars > 0 && s <= earnedStars} size={12} />
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* Completion banner */}
        {isComplete && (
          <div className="flex flex-col items-center gap-3 mt-2">
            <div className="flex items-center gap-2 text-green-600 font-bold text-lg">
              <Trophy className="w-6 h-6" />
              <span>Упражнение {exercise} пройдено!</span>
            </div>
            {exercise < 5 && (
              <button
                onClick={() => switchExercise((exercise + 1) as 1 | 2 | 3 | 4 | 5)}
                className="bg-blue-500 text-white font-bold text-base px-6 py-2 rounded shadow hover:bg-blue-600 transition"
              >
                Перейти к Упражнению {exercise + 1} →
              </button>
            )}
            {exercise === 5 && (exerciseStars[5] || 0) >= 3 && (
              <button
                onClick={onComplete}
                className="bg-emerald-500 text-white font-bold text-base px-6 py-2 rounded shadow hover:bg-emerald-600 transition"
              >
                Урок завершён ✓
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
