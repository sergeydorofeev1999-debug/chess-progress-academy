'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { RotateCcw, Trophy } from 'lucide-react';

const FILES = ['a','b','c','d','e','f','g','h'];
const REVERSED_FILES = ['h','g','f','e','d','c','b','a'];
const RANKS = ['8','7','6','5','4','3','2','1'];
const DISPLAY_RANKS = ['8','7','6','5','4','3','2','1'];
const REVERSED_DISPLAY_RANKS = ['1','2','3','4','5','6','7','8'];

const START_FEN_1 = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const START_FEN_2 = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const START_FEN_3 = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const START_FEN_4 = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const START_FEN_5 = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const START_FEN_6 = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const START_FEN_7 = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const START_FEN_8 = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// Find a black capture that leaves the black piece safe (no white recapture)
function findSafeBlackCapture(currentGame: Chess): { from: string; to: string } | null {
  const blackMoves = currentGame.moves({ verbose: true });
  const captures = blackMoves.filter((m: any) => m.captured);
  for (const capture of captures) {
    const testGame = new Chess(currentGame.fen());
    testGame.move({ from: capture.from, to: capture.to });
    const whiteMoves = testGame.moves({ verbose: true });
    const whiteRecaptures = whiteMoves.filter((m: any) => m.captured && m.to === capture.to);
    if (whiteRecaptures.length === 0) {
      return { from: capture.from, to: capture.to };
    }
  }
  return null;
}

function handleFailWithBlackCapture(
  g: Chess,
  setGameFn: (g: Chess) => void,
  setIsFailFn: (v: boolean) => void,
  setMessageFn: (msg: string) => void,
  setSelectedSquareFn: (sq: string | null) => void,
  mountedRef: React.RefObject<boolean>
) {
  const cap = findSafeBlackCapture(g);
  if (cap) {
    setTimeout(() => {
      if (!mountedRef.current) return;
      g.move({ from: cap.from, to: cap.to });
      setGameFn(new Chess(g.fen()));
      setTimeout(() => {
        if (mountedRef.current) { setIsFailFn(true); setMessageFn('Провалено'); }
      }, 1000);
    }, 1000);
  } else {
    setTimeout(() => {
      if (mountedRef.current) { setIsFailFn(true); setMessageFn('Провалено'); }
    }, 1000);
  }
  setSelectedSquareFn(null);
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

export default function ItalianOpeningBoard({ onComplete, lessonId }: { onComplete: () => void; lessonId?: string }) {
  const [exercise, setExercise] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8>(1);
  const [game, setGame] = useState<Chess | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<{from: string; to: string} | null>(null);
  const [message, setMessage] = useState('');
  const [isFail, setIsFail] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [whiteMoves, setWhiteMoves] = useState(0);
  const [sqSize, setSqSize] = useState(52);
  const [exerciseStars, setExerciseStars] = useState<Record<number, number>>({});

  const isCompleteRef = useRef(false);
  const isFailRef = useRef(false);
  const mountedRef = useRef(true);
  const autoStartedRef = useRef(false);

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

  // Auto-start: white plays e4 on init for exercise 5, 6 and 7
  useEffect(() => {
    if (!game) return;
    if (exercise !== 5 && exercise !== 6 && exercise !== 7 && exercise !== 8) return;
    if (autoStartedRef.current) return;
    if (game.turn() === 'w' && whiteMoves === 0) {
      autoStartedRef.current = true;
      setTimeout(() => {
        if (!mountedRef.current) return;
        const g = game;
        g.move({ from: 'e2', to: 'e4' });
        setGame(new Chess(g.fen()));
        if (exercise === 7) {
          setMessage('Ответьте на e4 — сыграйте e5 и откройте диагональ для слона. Затем защититесь от атаки белых.');
        }
      }, 1000);
    }
  }, [game, exercise, whiteMoves]);

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
    const fen = exercise === 1 ? START_FEN_1 : exercise === 2 ? START_FEN_2 : exercise === 3 ? START_FEN_3 : exercise === 4 ? START_FEN_4 : exercise === 5 ? START_FEN_5 : exercise === 6 ? START_FEN_6 : exercise === 7 ? START_FEN_7 : START_FEN_8;
    setGame(new Chess(fen));
    setSelectedSquare(null);
    setMessage('');
    setIsFail(false);
    setIsComplete(false);
    setWhiteMoves(0);
    autoStartedRef.current = false;
  }, [exercise]);

  const saveStars = useCallback((ex: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8, stars: number) => {
    setExerciseStars(prev => {
      const next = { ...prev, [ex]: Math.max(prev[ex] || 0, stars) };
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [storageKey]);

  const switchExercise = useCallback((num: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8) => {
    setExercise(num);
    const fen = num === 1 ? START_FEN_1 : num === 2 ? START_FEN_2 : num === 3 ? START_FEN_3 : num === 4 ? START_FEN_4 : num === 5 ? START_FEN_5 : num === 6 ? START_FEN_6 : num === 7 ? START_FEN_7 : START_FEN_8;
    setGame(new Chess(fen));
    setSelectedSquare(null);
    setMessage('');
    setIsFail(false);
    setIsComplete(false);
    setWhiteMoves(0);
    autoStartedRef.current = false;
  }, []);

  const processWhiteMove = useCallback((from: string, to: string) => {
    if (!game) return;
    const g = game;
    if (g.turn() !== 'w' && exercise !== 5 && exercise !== 6 && exercise !== 7 && exercise !== 8) return;

    try {
      const move = g.move({ from, to });
      if (!move) return;

      setLastMove({from: move.from, to: move.to});

      const nextWhiteMoves = whiteMoves + 1;

      if (exercise === 5) {
        // Exercise 5: Защита от детского мата — ученик играет за чёрных
        // После g.move() чёрных очередь белых (g.turn() === 'w')
        if (g.turn() !== 'w') return; // не чёрный ход — игнорируем
        if (whiteMoves === 0) {
          if (from === 'e7' && to === 'e5' && move.piece === 'p') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setMessage('Белые вывели слона на c4 — теперь сыграйте конём на f6!');
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'f1', to: 'c4' });
              setGame(new Chess(g.fen()));
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        if (whiteMoves === 1) {
          if (from === 'g8' && to === 'f6' && move.piece === 'n') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setIsComplete(true);
            setMessage('Отлично! Конь на f6 защищает пункт h5 — белые больше не могут поставить детский мат через Qh5. Детский мат отражён!');
            saveStars(5, 3);
            setTimeout(() => {
              if (mountedRef.current) switchExercise(6);
            }, 1500);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
      }

      if (exercise === 6) {
        // Exercise 6: Защита от детского мата — ученик играет за чёрных БЕЗ подсказок
        if (g.turn() !== 'w') return; // не чёрный ход — игнорируем
        if (whiteMoves === 0) {
          if (from === 'e7' && to === 'e5' && move.piece === 'p') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'f1', to: 'c4' });
              setGame(new Chess(g.fen()));
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        if (whiteMoves === 1) {
          if (from === 'g8' && to === 'f6' && move.piece === 'n') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setIsComplete(true);
            setMessage('Отлично! Конь на f6 защищает пункт h5 — белые больше не могут поставить детский мат через Qh5. Детский мат отражён!');
            saveStars(6, 3);
            setTimeout(() => {
              if (mountedRef.current) switchExercise(7);
            }, 1500);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
      }

      if (exercise === 8) {
        // Exercise 8: Ученик играет за чёрных самостоятельно, без подсказок до хода
        // Подсказки появляются ПОСЛЕ ходов чёрных (жёлтая плашка)
        if (g.turn() !== 'w') return; // не чёрный ход — игнорируем
        if (whiteMoves === 0) {
          if (from === 'e7' && to === 'e5' && move.piece === 'p') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setMessage('Отлично! Пешка захватила центр и открыла диагональ для слона.');
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'd1', to: 'h5' });
              setGame(new Chess(g.fen()));
            }, 2000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        if (whiteMoves === 1) {
          if (from === 'b8' && to === 'c6' && move.piece === 'n') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setMessage('Отлично! Конь вышел ближе к центру и защитил пешку e5.');
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'f1', to: 'c4' });
              setGame(new Chess(g.fen()));
            }, 2000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        if (whiteMoves === 2) {
          if (from === 'g7' && to === 'g6' && move.piece === 'p') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setMessage('Отлично! Пешка защитила короля от мата и напала на ферзя.');
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'h5', to: 'f3' });
              setGame(new Chess(g.fen()));
            }, 2000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        if (whiteMoves === 3) {
          if (from === 'g8' && to === 'f6' && move.piece === 'n') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setIsComplete(true);
            setMessage('Отлично! Конь на f6 защищает пункт f7 — детский мат отражён!');
            saveStars(8, 3);
            onComplete();
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
      }

      if (exercise === 7) {
        // Exercise 7: Ученик играет за чёрных, белые ходят автоматически
        // Подсказки появляются ПОСЛЕ ходов чёрных (жёлтая плашка)
        if (g.turn() !== 'w') return;
        if (whiteMoves === 0) {
          if (from === 'e7' && to === 'e5' && move.piece === 'p') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setMessage('Отлично! Пешка захватила центр и открыла диагональ для слона.');
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'd1', to: 'h5' });
              setGame(new Chess(g.fen()));
            }, 2000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        if (whiteMoves === 1) {
          if (from === 'b8' && to === 'c6' && move.piece === 'n') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setMessage('Отлично! Конь вышел ближе к центру и защитил пешку e5.');
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'f1', to: 'c4' });
              setGame(new Chess(g.fen()));
            }, 2000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        if (whiteMoves === 2) {
          if (from === 'g7' && to === 'g6' && move.piece === 'p') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setMessage('Отлично! Пешка защитила короля от мата и напала на ферзя.');
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'h5', to: 'f3' });
              setGame(new Chess(g.fen()));
            }, 2000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        if (whiteMoves === 3) {
          if (from === 'g8' && to === 'f6' && move.piece === 'n') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setIsComplete(true);
            setMessage('Отлично! Конь на f6 защищает пункт f7 — детский мат отражён!');
            saveStars(7, 3);
            setTimeout(() => {
              if (mountedRef.current) switchExercise(8);
            }, 1500);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
      }

      if (exercise === 1) {
        // Сценарий: Детский мат — 1.e4 e5 2.Bc4 Nc6 3.Qh5 Nf6 4.Qxf7#
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
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        if (whiteMoves === 1) {
          if (from === 'f1' && to === 'c4' && move.piece === 'b') {
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
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        if (whiteMoves === 2) {
          if (from === 'd1' && to === 'h5' && move.piece === 'q') {
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
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        if (whiteMoves === 3) {
          if (from === 'h5' && to === 'f7' && move.piece === 'q') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setIsComplete(true);
            setMessage('Мат! Детский мат выполнен! Ферзь забрал пешку на f7, король не может выбраться из-под шаха. Самый быстрый путь к победе — атака на пункт f7!');
            saveStars(1, 3);
            setTimeout(() => {
              if (mountedRef.current) switchExercise(2);
            }, 1500);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }


      } else if (exercise === 2) {
        // Exercise 2: Scholar's Mate — moves 2 and 3 (Bc4/Qh5) in ANY order
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
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }

        // Moves 1-2: Bc4 and Qh5 in any order
        if (whiteMoves >= 1 && whiteMoves <= 2) {
          const isBc4 = from === 'f1' && to === 'c4' && move.piece === 'b';
          const isQh5 = from === 'd1' && to === 'h5' && move.piece === 'q';

          if (!isBc4 && !isQh5) {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }

          // Check we don't repeat the same move
          if (whiteMoves === 2) {
            const devCount =
              (!!g.get('c4') && g.get('c4')?.type === 'b' && g.get('c4')?.color === 'w' ? 1 : 0) +
              (!!g.get('h5') && g.get('h5')?.type === 'q' && g.get('h5')?.color === 'w' ? 1 : 0);
            if (devCount !== 2) {
              handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
              return;
            }
          }

          setGame(new Chess(g.fen()));
          setSelectedSquare(null);
          setWhiteMoves(nextWhiteMoves);

          setTimeout(() => {
            if (!mountedRef.current) return;
            if (whiteMoves === 1) {
              // After first development move, black plays Nc6
              g.move({ from: 'b8', to: 'c6' });
            } else if (whiteMoves === 2) {
              // After second development move, black plays Nf6
              g.move({ from: 'g8', to: 'f6' });
            }
            setGame(new Chess(g.fen()));
          }, 1000);
          return;
        }

        if (whiteMoves === 3) {
          if (from === 'h5' && to === 'f7' && move.piece === 'q') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setIsComplete(true);
            setMessage('Мат! Детский mat выполнен! Вы самостоятельно повторили атаку на пункт f7!');
            saveStars(2, 3);
            setTimeout(() => {
              if (mountedRef.current) switchExercise(3);
            }, 1500);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
      } else if (exercise === 3) {
        // Exercise 3: Scholar's Mate variant — 1.e4 e5 2.Bc4 Nc6 3.Qf3 Bc5 4.Qxf7#
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
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        if (whiteMoves === 1) {
          if (from === 'f1' && to === 'c4' && move.piece === 'b') {
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
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        if (whiteMoves === 2) {
          if (from === 'd1' && to === 'f3' && move.piece === 'q') {
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
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        if (whiteMoves === 3) {
          if (from === 'f3' && to === 'f7' && move.piece === 'q') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setIsComplete(true);
            setMessage('Мат! Ферзь забрал пешку на f7. Детский mat через поле f3 выполнен!');
            saveStars(3, 3);
            setTimeout(() => {
              if (mountedRef.current) switchExercise(4);
            }, 1500);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
      } else if (exercise === 4) {
        // Exercise 4: Scholar's Mate через Qf3 — ходы 2-3 (Bc4/Qf3) в ЛЮБОМ порядке
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
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }

        // Moves 1-2: Bc4 и Qf3 в любом порядке
        if (whiteMoves >= 1 && whiteMoves <= 2) {
          const isBc4 = from === 'f1' && to === 'c4' && move.piece === 'b';
          const isQf3 = from === 'd1' && to === 'f3' && move.piece === 'q';

          if (!isBc4 && !isQf3) {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }

          // На ходе 2 проверяем, что обе развивающие фигуры на местах
          if (whiteMoves === 2) {
            const devCount =
              (!!g.get('c4') && g.get('c4')?.type === 'b' && g.get('c4')?.color === 'w' ? 1 : 0) +
              (!!g.get('f3') && g.get('f3')?.type === 'q' && g.get('f3')?.color === 'w' ? 1 : 0);
            if (devCount !== 2) {
              handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
              return;
            }
          }

          setGame(new Chess(g.fen()));
          setSelectedSquare(null);
          setWhiteMoves(nextWhiteMoves);

          setTimeout(() => {
            if (!mountedRef.current) return;
            if (whiteMoves === 1) {
              // После первого развивающего хода — Nc6
              g.move({ from: 'b8', to: 'c6' });
            } else if (whiteMoves === 2) {
              // После второго развивающего хода — Bc5
              g.move({ from: 'f8', to: 'c5' });
            }
            setGame(new Chess(g.fen()));
          }, 1000);
          return;
        }

        if (whiteMoves === 3) {
          if (from === 'f3' && to === 'f7' && move.piece === 'q') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setIsComplete(true);
            setMessage('Мат! Детский mat через Qf3 выполнен! Вы сами нашли путь к победе через пункт f7!');
            saveStars(4, 3);
            setTimeout(() => {
              if (mountedRef.current) switchExercise(5);
            }, 1500);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
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
    if (g.turn() !== 'w' && exercise !== 5 && exercise !== 6 && exercise !== 7 && exercise !== 8) return;

    const piece = g.get(square as any);

    if (selectedSquare) {
      if (selectedSquare === square) {
        setSelectedSquare(null);
        return;
      }
      processWhiteMove(selectedSquare, square);
      if (piece && ((exercise === 5 || exercise === 6 || exercise === 7 || exercise === 8) ? piece.color === 'b' : piece.color === 'w')) {
        setSelectedSquare(square);
      }
    } else {
      if (piece && ((exercise === 5 || exercise === 6 || exercise === 7 || exercise === 8) ? piece.color === 'b' : piece.color === 'w')) {
        setSelectedSquare(square);
      }
    }
  }, [game, selectedSquare, processWhiteMove, exercise]);

  const handlePointerDown = useCallback((e: React.PointerEvent, square: string) => {
    if (isCompleteRef.current || isFailRef.current) return;
    if (!game) return;
    const g = game;
    if (g.turn() !== 'w' && exercise !== 5 && exercise !== 6 && exercise !== 7 && exercise !== 8) return;
    const piece = g.get(square as any);
    if (!piece) return;
    if ((exercise === 5 || exercise === 6 || exercise === 7 || exercise === 8) && piece.color !== 'b') return;
    if (exercise !== 5 && exercise !== 6 && exercise !== 7 && exercise !== 8 && piece.color !== 'w') return;
    if (e.pointerType === 'touch' && !(e as any).isPrimary) return;
    pointerStartRef.current = { x: e.clientX, y: e.clientY, square, moved: false, pointerId: e.pointerId };
  }, [game, exercise]);

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
        <div className="hidden lg:grid grid-cols-8 gap-1 rounded p-1 border border-gray-200">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => {
            const earnedStars = exerciseStars[num] || 0;
            const isCurrent = num === exercise;
            const isDone = earnedStars > 0;
            return (
              <button
                key={num}
                onClick={() => switchExercise(num as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8)}
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
           exercise === 1 && whiteMoves === 1 ? 'Сыграйте Bf1-c4 — направьте слона на поле f7.' :
           exercise === 1 && whiteMoves === 2 ? 'Выведите ферзя на h5 — угрожайте матом на f7.' :
           exercise === 1 && whiteMoves === 3 ? 'Заберите пешку на f7 — мат!' :
           exercise === 2 ? 'Повторите детский мат: e4, Bc4, Qh5, Qxf7#' :
           exercise === 3 ? 'Сыграйте: e4, Bc4, Qf3, Qxf7#' :
           exercise === 4 ? 'Самостоятельно: e4, Bc4/Qf3 в любом порядке, Qxf7#' :
           exercise === 5 ? 'Сыграйте конём на f6 — защитите пункт h5 от детского мата!' :
           exercise === 6 ? 'Самостоятельно: сыграйте e5, Nf6 — защититесь от детского мата!' : ''}
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
            (exercise === 7 || exercise === 8) ? 'bg-yellow-500' : message.includes('Отлично') ? 'bg-green-500' : 'bg-yellow-500'
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
            {(exercise === 5 || exercise === 6 || exercise === 7 || exercise === 8 ? REVERSED_DISPLAY_RANKS : DISPLAY_RANKS).map((rank, ri) => (
              (exercise === 5 || exercise === 6 || exercise === 7 || exercise === 8 ? REVERSED_FILES : FILES).map((file, fi) => {
                const sq = `${file}${rank}`;
                const pieceObj = getPieceAt(sq);
                const light = isLight(fi, ri);
                const sel = selectedSquare === sq;
                const isValidMove = validMoves.includes(sq);
                const isDragSource = dragPiece?.square === sq;
                const isLastMove = lastMove && (lastMove.from === sq || lastMove.to === sq);

                return (
                  <div
                    key={sq}
                    data-square={sq}
                    className="flex items-center justify-center relative select-none"
                    style={{
                      width: sqSize,
                      height: sqSize,
                      cursor: pieceObj && (exercise === 5 || exercise === 6 || exercise === 7 || exercise === 8 ? pieceObj.color === 'b' : pieceObj.color === 'w') && !isFail && !isComplete ? 'grab' : 'default',
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
                    {(exercise === 5 || exercise === 6 || exercise === 7 || exercise === 8 ? fi === 7 : fi === 0) && (
                      <span className={`absolute top-0.5 ${exercise === 5 || exercise === 6 || exercise === 7 || exercise === 8 ? 'right-1' : 'left-1'} text-[10px] font-bold ${light ? 'text-[#b58863]' : 'text-[#f0d9b5]'}`}>
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
          <p>{exercise <= 4 ? 'Поставьте детский мат.' :
          exercise >= 5 ? 'Защититесь от детского мата.' : ''}</p>
        </div>

        {/* Mobile exercise pills — 2 rows of 4 */}
        <div className="flex lg:hidden flex-col items-center gap-1 w-full">
          <div className="flex gap-1 justify-center w-full">
            {[1, 2, 3, 4].map((num) => {
              const earnedStars = exerciseStars[num] || 0;
              const isCurrent = num === exercise;
              const isDone = earnedStars > 0;
              return (
                <button
                  key={num}
                  onClick={() => switchExercise(num as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8)}
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
            {[5, 6, 7, 8].map((num) => {
              const earnedStars = exerciseStars[num] || 0;
              const isCurrent = num === exercise;
              const isDone = earnedStars > 0;
              return (
                <button
                  key={num}
                  onClick={() => switchExercise(num as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8)}
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
            {exercise < 8 && (
              <button
                onClick={() => switchExercise((exercise + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8)}
                className="bg-blue-500 text-white font-bold text-base px-6 py-2 rounded shadow hover:bg-blue-600 transition"
              >
                Перейти к Упражнению {exercise + 1} →
              </button>
            )}
            {exercise === 8 && (exerciseStars[8] || 0) >= 3 && (
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

