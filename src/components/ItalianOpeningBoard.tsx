'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { RotateCcw, Trophy } from 'lucide-react';

const FILES = ['a','b','c','d','e','f','g','h'];
const RANKS = ['8','7','6','5','4','3','2','1'];
const DISPLAY_RANKS = ['8','7','6','5','4','3','2','1'];

const START_FEN_1 = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const START_FEN_2 = 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
const START_FEN_3 = 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
const START_FEN_4 = 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
const START_FEN_5 = 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
const START_FEN_6 = 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
const START_FEN_7 = 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
const START_FEN_8 = 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
const START_FEN_9 = 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
const START_FEN_10 = 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
const START_FEN_11 = 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
const START_FEN_12 = 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';

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

export default function ItalianOpeningBoard({ onComplete, lessonId }: { onComplete: () => void; lessonId?: string }) {
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
        // Сценарий: 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.d3 Nf6 5.Bg5 0-0 6.Nc3 d6 7.0-0
        if (whiteMoves === 0) {
          if (from === 'e2' && to === 'e4' && move.piece === 'p') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'e7', to: 'e5' });
              setGame(new Chess(g.fen()));
            }, 1000);
            return;
          } else {
            setTimeout(() => { if (mountedRef.current) { setIsFail(true); setMessage('Провалено'); } }, 1000);
            setSelectedSquare(null);
            return;
          }
        }
        if (whiteMoves === 1) {
          if (from === 'g1' && to === 'f3' && move.piece === 'n') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'b8', to: 'c6' });
              setGame(new Chess(g.fen()));
            }, 1000);
            return;
          } else {
            setTimeout(() => { if (mountedRef.current) { setIsFail(true); setMessage('Провалено'); } }, 1000);
            setSelectedSquare(null);
            return;
          }
        }
        if (whiteMoves === 2) {
          if (from === 'f1' && to === 'c4' && move.piece === 'b') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'f8', to: 'c5' });
              setGame(new Chess(g.fen()));
            }, 1000);
            return;
          } else {
            setTimeout(() => { if (mountedRef.current) { setIsFail(true); setMessage('Провалено'); } }, 1000);
            setSelectedSquare(null);
            return;
          }
        }
        if (whiteMoves === 3) {
          if (from === 'd2' && to === 'd3' && move.piece === 'p') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'g8', to: 'f6' });
              setGame(new Chess(g.fen()));
            }, 1000);
            return;
          } else {
            setTimeout(() => { if (mountedRef.current) { setIsFail(true); setMessage('Провалено'); } }, 1000);
            setSelectedSquare(null);
            return;
          }
        }
        if (whiteMoves === 4) {
          if (from === 'c1' && to === 'g5' && move.piece === 'b') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'e8', to: 'g8' });
              setGame(new Chess(g.fen()));
            }, 1000);
            return;
          } else {
            setTimeout(() => { if (mountedRef.current) { setIsFail(true); setMessage('Провалено'); } }, 1000);
            setSelectedSquare(null);
            return;
          }
        }
        if (whiteMoves === 5) {
          if (from === 'b1' && to === 'c3' && move.piece === 'n') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'd7', to: 'd6' });
              setGame(new Chess(g.fen()));
            }, 1000);
            return;
          } else {
            setTimeout(() => { if (mountedRef.current) { setIsFail(true); setMessage('Провалено'); } }, 1000);
            setSelectedSquare(null);
            return;
          }
        }
        if (whiteMoves === 6) {
          if (move.piece === 'k' && (to === 'g1' || to === 'h1')) {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setIsComplete(true);
            setMessage('Отлично! Итальянская партия завершена. Белые захватили центр пешкой, вывели коней и слонов и сделали рокировку!');
            saveStars(1, 3);
            return;
          } else {
            setTimeout(() => { if (mountedRef.current) { setIsFail(true); setMessage('Провалено'); } }, 1000);
            setSelectedSquare(null);
            return;
          }
        }
      } else if (exercise === 2) {
        if (whiteMoves === 0) {
          if (from === 'c2' && to === 'c3' && move.piece === 'p') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setIsComplete(true);
            setMessage('Отлично! Вы сыграли c3 — Гиуоко Пиано.');
            saveStars(2, 3);
            return;
          } else {
            setTimeout(() => { if (mountedRef.current) { setIsFail(true); setMessage('Провалено'); } }, 1000);
            setSelectedSquare(null);
            return;
          }
        }
      } else if (exercise === 3) {
        if (whiteMoves === 0) {
          if (from === 'd2' && to === 'd3' && move.piece === 'p') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setIsComplete(true);
            setMessage('Отлично! Вы сыграли d3 — тихая итальянская.');
            saveStars(3, 3);
            return;
          } else {
            setTimeout(() => { if (mountedRef.current) { setIsFail(true); setMessage('Провалено'); } }, 1000);
            setSelectedSquare(null);
            return;
          }
        }
      } else if (exercise === 4) {
        if (whiteMoves === 0) {
          if (move.piece === 'k' && (to === 'g1' || to === 'h1')) {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setIsComplete(true);
            setMessage('Отлично! Вы рокировались — король в безопасности.');
            saveStars(4, 3);
            return;
          } else {
            setTimeout(() => { if (mountedRef.current) { setIsFail(true); setMessage('Провалено'); } }, 1000);
            setSelectedSquare(null);
            return;
          }
        }
      } else if (exercise === 5) {
        if (whiteMoves === 0) {
          if (from === 'b1' && to === 'c3' && move.piece === 'n') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setIsComplete(true);
            setMessage('Отлично! Конь на c3 защищает пешку e4.');
            saveStars(5, 3);
            return;
          } else {
            setTimeout(() => { if (mountedRef.current) { setIsFail(true); setMessage('Провалено'); } }, 1000);
            setSelectedSquare(null);
            return;
          }
        }
      } else if (exercise === 6) {
        if (whiteMoves === 0) {
          if (from === 'h2' && to === 'h3' && move.piece === 'p') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setIsComplete(true);
            setMessage('Отлично! Пешка h3 не даёт слону чёрных выйти на g4.');
            saveStars(6, 3);
            return;
          } else {
            setTimeout(() => { if (mountedRef.current) { setIsFail(true); setMessage('Провалено'); } }, 1000);
            setSelectedSquare(null);
            return;
          }
        }
      } else if (exercise === 7) {
        if (whiteMoves === 0) {
          if (from === 'a2' && to === 'a4' && move.piece === 'p') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setIsComplete(true);
            setMessage('Отлично! Пешка a4 не даёт коню чёрных съесть слона на c4.');
            saveStars(7, 3);
            return;
          } else {
            setTimeout(() => { if (mountedRef.current) { setIsFail(true); setMessage('Провалено'); } }, 1000);
            setSelectedSquare(null);
            return;
          }
        }
      } else if (exercise === 8) {
        if (whiteMoves === 0) {
          if (from === 'd2' && to === 'd4' && move.piece === 'p') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setIsComplete(true);
            setMessage('Отлично! d4 — развитие центра в гамбите Эванса.');
            saveStars(8, 3);
            return;
          } else {
            setTimeout(() => { if (mountedRef.current) { setIsFail(true); setMessage('Провалено'); } }, 1000);
            setSelectedSquare(null);
            return;
          }
        }
      } else if (exercise === 9) {
        if (whiteMoves === 0) {
          if (from === 'f1' && to === 'e1' && move.piece === 'r') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setIsComplete(true);
            setMessage('Отлично! Ладья на e1 защищает пешку e4.');
            saveStars(9, 3);
            return;
          } else {
            setTimeout(() => { if (mountedRef.current) { setIsFail(true); setMessage('Провалено'); } }, 1000);
            setSelectedSquare(null);
            return;
          }
        }
      } else if (exercise === 10) {
        if (whiteMoves === 0) {
          if (from === 'a2' && to === 'a3' && move.piece === 'p') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setIsComplete(true);
            setMessage('Отлично! Пешка a3 — профилактический ход.');
            saveStars(10, 3);
            return;
          } else {
            setTimeout(() => { if (mountedRef.current) { setIsFail(true); setMessage('Провалено'); } }, 1000);
            setSelectedSquare(null);
            return;
          }
        }
      } else if (exercise === 11) {
        if (whiteMoves === 0) {
          if (from === 'd1' && to === 'e2' && move.piece === 'q') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setIsComplete(true);
            setMessage('Отлично! Ферзь на e2 — классическая позиция в итальянской партии.');
            saveStars(11, 3);
            return;
          } else {
            setTimeout(() => { if (mountedRef.current) { setIsFail(true); setMessage('Провалено'); } }, 1000);
            setSelectedSquare(null);
            return;
          }
        }
      } else if (exercise === 12) {
        if (whiteMoves === 0) {
          if (from === 'c4' && to === 'f7' && move.piece === 'b' && move.captured === 'p') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setIsComplete(true);
            setMessage('Отлично! Жертва слона на f7 — форк на короля и ладью!');
            saveStars(12, 3);
            return;
          } else {
            setTimeout(() => { if (mountedRef.current) { setIsFail(true); setMessage('Провалено'); } }, 1000);
            setSelectedSquare(null);
            return;
          }
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
        <div className="hidden lg:grid grid-cols-6 gap-1 rounded p-1 border border-gray-200">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => {
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
        <div className="px-6 py-3 rounded-xl text-center font-bold text-white bg-yellow-500 mb-2 w-full">
          {exercise === 1 && whiteMoves === 0 ? 'Сыграйте e2-e4 — захватите центр пешкой.' :
           exercise === 1 && whiteMoves === 1 ? 'Конь выходит на f3 — ближе к центру и нападает на чёрную пешку e5.' :
           exercise === 1 && whiteMoves === 2 ? 'Сыграйте Bf1-c4 — направьте слона на поле f7.' :
           exercise === 1 && whiteMoves === 3 ? 'Сыграйте d2-d3 — откройте дорогу слону c1.' :
           exercise === 1 && whiteMoves === 4 ? 'Сыграйте Bc1-g5 — свяжите коня f6.' :
           exercise === 1 && whiteMoves === 5 ? 'Сыграйте Nb1-c3 — развейте второго коня.' :
           exercise === 1 && whiteMoves === 6 ? 'Сделайте рокировку — уберите короля в безопасность.' :
           exercise === 2 ? 'Сыграйте c2-c3 — подготовьте центральный прорыв d4.' :
           exercise === 3 ? 'Сыграйте d2-d3 — тихая итальянская партия.' :
           exercise === 4 ? 'Сделайте короткую рокировку — безопасность короля прежде всего.' :
           exercise === 5 ? 'Сыграйте Nb1-c3 — защитите пешку e4.' :
           exercise === 6 ? 'Сыграйте h2-h3 — не дайте слону выйти на g4.' :
           exercise === 7 ? 'Сыграйте a2-a4 — не дайте коню съесть слона на c4.' :
           exercise === 8 ? 'Сыграйте d2-d4 — разбейте центр!' :
           exercise === 9 ? 'Сыграйте ладью на e1 — защитите пешку e4.' :
           exercise === 10 ? 'Сыграйте a2-a3 — профилактика.' :
           exercise === 11 ? 'Сыграйте ферзём на e2 — классическая манёвренная позиция.' :
           exercise === 12 ? 'Сыграйте слоном на f7 — жертва за форк!' : ''}
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
          <p>{exercise === 1 ? 'Пройдите всю итальянскую партию: e4, Nf3, Bc4, d3, Bg5, Nc3, 0-0' :
          exercise === 2 ? 'Гиуоко Пиано — сыграйте c3.' :
          exercise === 3 ? 'Тихая итальянская — сыграйте d3.' :
          exercise === 4 ? 'Рокировка — король в безопасности.' :
          exercise === 5 ? 'Развитие коня на c3.' :
          exercise === 6 ? 'Профилактика h3.' :
          exercise === 7 ? 'Профилактика a4.' :
          exercise === 8 ? 'Гамбит Эванса — d4.' :
          exercise === 9 ? 'Ладья на e1.' :
          exercise === 10 ? 'Профилактика a3.' :
          exercise === 11 ? 'Ферзь на e2.' :
          exercise === 12 ? 'Жертва слона на f7.' : ''}
          </p>
        </div>

        {/* Mobile exercise pills — 2 rows of 6 */}
        <div className="flex lg:hidden flex-col items-center gap-1 w-full">
          <div className="flex gap-1 justify-center w-full">
            {[1, 2, 3, 4, 5, 6].map((num) => {
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
          <div className="flex gap-1 justify-center w-full">
            {[7, 8, 9, 10, 11, 12].map((num) => {
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
        </div>

        {/* Completion banner */}
        {isComplete && (
          <div className="flex flex-col items-center gap-3 mt-2">
            <div className="flex items-center gap-2 text-green-600 font-bold text-lg">
              <Trophy className="w-6 h-6" />
              <span>Упражнение {exercise} пройдено!</span>
            </div>
            {exercise < 12 && (
              <button
                onClick={() => switchExercise((exercise + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12)}
                className="bg-blue-500 text-white font-bold text-base px-6 py-2 rounded shadow hover:bg-blue-600 transition"
              >
                Перейти к Упражнению {exercise + 1} →
              </button>
            )}
            {exercise === 12 && (exerciseStars[12] || 0) >= 3 && (
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

