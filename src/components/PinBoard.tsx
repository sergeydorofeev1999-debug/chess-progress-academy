'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { RotateCcw, Trophy } from 'lucide-react';

const FILES = ['a','b','c','d','e','f','g','h'];
const RANKS = ['8','7','6','5','4','3','2','1'];
const DISPLAY_RANKS = ['8','7','6','5','4','3','2','1'];

const START_FEN_1 = '4k3/8/8/4b3/8/8/3R4/1K6 w - - 0 1';
const START_FEN_2 = '1k6/8/8/4r3/Q7/8/8/6K1 w - - 0 1';
const START_FEN_3 = '6k1/8/8/3q4/8/1P6/K7/5B2 w - - 0 1';
const START_FEN_4 = '4k3/6pp/5p2/4n3/8/7P/5PP1/4R1K1 w - - 0 1';
const START_FEN_5 = '8/4k3/8/4r3/8/2B5/5P2/7K w - - 0 1';
const START_FEN_6 = '8/8/3k1r2/8/3PP3/8/8/K7 w - - 0 1';
const START_FEN_7 = 'rnbqk2r/ppp2ppp/3bpn2/3p4/3PP3/2N2N2/PPP2PPP/R1BQKB1R w KQkq - 0 1';

const START_FEN_8 = 'r3k3/8/8/3N4/8/8/8/7K w - - 0 1';
const START_FEN_9 = '2kr3r/pb1n1pp1/1pp3q1/5N2/2p1P1p1/2N3P1/PP3PB1/R1BQRK2 w - - 0 1';
const START_FEN_10 = 'r1bk1bnr/pp3ppp/1qn1p3/1N1p4/3P1B2/8/PPP2PPP/R2QKBNR w KQkq - 0 1';
const START_FEN_11 = '3k4/5p2/R2P4/3r4/PP1b3p/5KP1/6P1/8 w - - 0 1';
const START_FEN_12 = 'R7/3b1kp1/2p1n1Np/7P/P1PpB1r1/3P4/1r6/R4K2 w - - 0 1';

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

function getWhiteRookSquare(game: Chess): string | null {
  const squares = game.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = squares[r][c];
      if (p && p.type === 'r' && p.color === 'w') {
        return `${FILES[c]}${RANKS[r]}`;
      }
    }
  }
  return null;
}

function getBlackKingMove(game: Chess): { from: string; to: string } | null {
  const moves = game.moves({ verbose: true }).filter(m => m.piece === 'k' && m.color === 'b');
  if (moves.length === 0) return null;
  const idx = Math.floor(Math.random() * moves.length);
  return { from: moves[idx].from, to: moves[idx].to };
}

function getBlackAutoCapture(game: Chess): { from: string; to: string } | null {
  const rookSq = getWhiteRookSquare(game);
  if (!rookSq) return null;
  const blackMoves = game.moves({ verbose: true }).filter(m => m.color === 'b');
  for (const m of blackMoves) {
    if (m.to === rookSq) {
      return { from: m.from, to: m.to };
    }
  }
  return null;
}

function getBlackAutoCaptureAny(game: Chess): { from: string; to: string } | null {
  const blackMoves = game.moves({ verbose: true }).filter(m => m.color === 'b');
  for (const m of blackMoves) {
    if (m.captured) {
      return { from: m.from, to: m.to };
    }
  }
  return null;
}

function getBlackSafeCapture(game: Chess): { from: string; to: string } | null {
  const blackMoves = game.moves({ verbose: true }).filter(m => m.color === 'b' && m.captured);
  for (const m of blackMoves) {
    const testGame = new Chess(game.fen());
    testGame.move({ from: m.from, to: m.to });
    const whiteRecaptures = testGame.moves({ verbose: true }).filter(
      wm => wm.color === 'w' && wm.to === m.to
    );
    if (whiteRecaptures.length === 0) {
      return { from: m.from, to: m.to };
    }
  }
  return null;
}

function getBlackSafeBishopEscape(game: Chess): { from: string; to: string } | null {
  const bishopMoves = game.moves({ verbose: true }).filter(m => m.color === 'b' && m.piece === 'b');
  for (const m of bishopMoves) {
    const testGame = new Chess(game.fen());
    testGame.move({ from: m.from, to: m.to });
    const whiteRookMoves = testGame.moves({ verbose: true }).filter(wm => wm.color === 'w' && wm.piece === 'r');
    if (!whiteRookMoves.some(wm => wm.to === m.to)) {
      return { from: m.from, to: m.to };
    }
  }
  return null;
}

function getBestBlackCapture(game: Chess): { from: string; to: string } | null {
  const blackCaptures = game.moves({ verbose: true }).filter(m => m.color === 'b' && m.captured);
  // Prefer captures that don't hang the capturing piece
  const safeCaptures = blackCaptures.filter((m: any) => {
    const testGame = new Chess(game.fen());
    testGame.move({ from: m.from, to: m.to });
    const whiteRecaptures = testGame.moves({ verbose: true }).filter(wm => wm.color === 'w' && wm.to === m.to);
    return whiteRecaptures.length === 0;
  });
  if (safeCaptures.length > 0) {
    return safeCaptures[Math.floor(Math.random() * safeCaptures.length)];
  }
  // Fallback: any capture
  if (blackCaptures.length > 0) {
    return blackCaptures[Math.floor(Math.random() * blackCaptures.length)];
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

export default function PinBoard({ onComplete, lessonId }: { onComplete: () => void; lessonId?: string }) {
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

  const storageKey = lessonId ? `fork_progress_${lessonId}` : 'fork_progress';

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

  const saveStars = useCallback((ex: 1 | 2 | 3 | 4 | 5, stars: number) => {
    setExerciseStars(prev => {
      const next = { ...prev, [ex]: Math.max(prev[ex] || 0, stars) };
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [storageKey]);

  const switchExercise = useCallback((num: 1 | 2 | 3 | 4 | 5) => {
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
        // EXERCISE 1: Pin — Rd2-e2 pins Be5, then Rxe5
        const isCorrectFirst = from === 'd2' && to === 'e2' && move.piece === 'r';
        const isCorrectSecond = from === 'e2' && to === 'e5' && move.piece === 'r';

        if (whiteMoves === 0) {
          if (!isCorrectFirst) {
            // Incorrect first move: bishop escapes to safe square (not capturable by rook)
            setTimeout(() => {
              if (!mountedRef.current) return;
              const safeEscape = getBlackSafeBishopEscape(g);
              if (safeEscape) {
                g.move({ from: safeEscape.from, to: safeEscape.to });
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
            // After Re2 pin, black king must move (bishop is pinned)
            const blackMoves = g.moves({ verbose: true }).filter((m: any) => m.color === 'b' && m.piece === 'k');
            if (blackMoves.length > 0) {
              const kingMove = blackMoves[Math.floor(Math.random() * blackMoves.length)];
              g.move({ from: kingMove.from, to: kingMove.to });
              setGame(new Chess(g.fen()));
            }
          }, 1000);

          setMessage('Хорошо! Теперь заберите слона.');
          return;
        }

        if (whiteMoves === 1) {
          if (!isCorrectSecond) {
            const safeCap = getBlackSafeCapture(g);
            if (safeCap) g.move({ from: safeCap.from, to: safeCap.to });
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setIsFail(true);
            setMessage('Провалено');
            return;
          }
          setGame(new Chess(g.fen()));
          setSelectedSquare(null);
          setIsComplete(true);
          setMessage('Отлично! Связка выполнена.');
          saveStars(1, 3);
          return;
        }
      } else if (exercise === 2) {
        // EXERCISE 2: Queen pin — Qa4-f4 pins Re5, then Qxe5
        const isCorrectFirst = from === 'a4' && to === 'f4' && move.piece === 'q';
        const isCorrectSecond = from === 'f4' && to === 'e5' && move.piece === 'q';

        if (whiteMoves === 0) {
          if (!isCorrectFirst) {
            // Incorrect: black plays best defense — king escapes if under check
            setTimeout(() => {
              if (!mountedRef.current) return;
              const blackKingMoves = g.moves({ verbose: true }).filter((m: any) => m.color === 'b' && m.piece === 'k');
              if (blackKingMoves.length > 0) {
                const kingMove = blackKingMoves[Math.floor(Math.random() * blackKingMoves.length)];
                g.move({ from: kingMove.from, to: kingMove.to });
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
            // After Qf4 pin, black king must move (rook is pinned)
            const kingMoves = g.moves({ verbose: true }).filter((m: any) => m.color === 'b' && m.piece === 'k');
            if (kingMoves.length > 0) {
              const kingMove = kingMoves[Math.floor(Math.random() * kingMoves.length)];
              g.move({ from: kingMove.from, to: kingMove.to });
              setGame(new Chess(g.fen()));
            }
          }, 1000);

          setMessage('');
          return;
        }

        if (whiteMoves === 1) {
          if (!isCorrectSecond) {
            const safeCap = getBlackSafeCapture(g);
            if (safeCap) g.move({ from: safeCap.from, to: safeCap.to });
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setIsFail(true);
            setMessage('Провалено');
            return;
          }
          setGame(new Chess(g.fen()));
          setSelectedSquare(null);
          setIsComplete(true);
          setMessage('Отлично! Связка выполнена.');
          saveStars(2, 3);
          return;
        }
      } else if (exercise === 3) {
        // EXERCISE 3: Bishop pin — Bf1-c4 pins Qd5, then Bxd5
        const isCorrectFirst = from === 'f1' && to === 'c4' && move.piece === 'b';
        const isCorrectSecond = from === 'c4' && to === 'd5' && move.piece === 'b';

        if (whiteMoves === 0) {
          if (!isCorrectFirst) {
            // Check if black has a safe capture first
            const safeCap = getBlackSafeCapture(g);
            if (safeCap) {
              setTimeout(() => {
                if (!mountedRef.current) return;
                g.move({ from: safeCap.from, to: safeCap.to });
                setGame(new Chess(g.fen()));
                setIsFail(true);
                setMessage('Провалено');
              }, 1000);
              setSelectedSquare(null);
              return;
            }
            // No safe capture: immediate fail
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
            // After Bc4, black queen captures the bishop
            const queenCap = g.moves({ verbose: true }).find((m: any) => m.color === 'b' && m.piece === 'q' && m.to === 'c4');
            if (queenCap) {
              g.move({ from: queenCap.from, to: queenCap.to });
              setGame(new Chess(g.fen()));
            }
          }, 1000);

          return;
        }

        if (whiteMoves === 1) {
          const isPawnCapture = move.piece === 'p' && to === 'c4';
          if (!isPawnCapture) {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setIsFail(true);
            setMessage('Провалено');
            return;
          }
          setGame(new Chess(g.fen()));
          setSelectedSquare(null);
          setIsComplete(true);
          setMessage('Отлично! Связка выполнена.');
          saveStars(3, 3);
          return;
        }
      } else if (exercise === 4) {
        // EXERCISE 4: Pin + push — f4 pushes pinned knight, then fxe5
        const isCorrectFirst = from === 'f2' && to === 'f4' && move.piece === 'p';
        const isCorrectSecond = from === 'f4' && to === 'e5' && move.piece === 'p';

        if (whiteMoves === 0) {
          if (!isCorrectFirst) {
            // Wrong move: let black capture the rook (e.g., f6xe5) after a delay
            setTimeout(() => {
              if (!mountedRef.current) return;
              const blackMoves = g.moves({ verbose: true }).filter((m: any) => m.color === 'b');
              const pawnCaptures = blackMoves.filter((m: any) => m.piece === 'p' && m.captured);
              if (pawnCaptures.length > 0) {
                const cap = pawnCaptures[0];
                g.move({ from: cap.from, to: cap.to });
                setGame(new Chess(g.fen()));
              } else if (blackMoves.length > 0) {
                const randomMove = blackMoves[Math.floor(Math.random() * blackMoves.length)];
                g.move({ from: randomMove.from, to: randomMove.to });
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
            // After f4, black must respond. Knight is pinned, can't move.
            // Exclude f6-f5 because it leaves the knight completely undefended.
            // Exclude g7-g5 because it weakens the king position.
            const blackMoves = g.moves({ verbose: true }).filter((m: any) => m.color === 'b' && !(m.from === 'f6' && m.to === 'f5') && !(m.from === 'g7' && m.to === 'g5'));
            if (blackMoves.length > 0) {
              const randomMove = blackMoves[Math.floor(Math.random() * blackMoves.length)];
              g.move({ from: randomMove.from, to: randomMove.to });
              setGame(new Chess(g.fen()));
            }
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
          setMessage('Отлично! Связка выполнена.');
          saveStars(4, 3);
          return;
        }
      } else if (exercise === 5) {
        // EXERCISE 5: Pin — Bc3-d4 pins Re5, black king defends, then f4 push and capture
        const isCorrectFirst = from === 'c3' && to === 'd4' && move.piece === 'b';
        const isCorrectSecond = from === 'f2' && to === 'f4' && move.piece === 'p';
        const isCorrectThird = from === 'd4' && to === 'e5' && move.piece === 'b';

        if (whiteMoves === 0) {
          if (!isCorrectFirst) {
            setTimeout(() => {
              if (!mountedRef.current) return;
              const safeCap = getBlackSafeCapture(g);
              if (safeCap) g.move({ from: safeCap.from, to: safeCap.to });
              setGame(new Chess(g.fen()));
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
            // After Bd4, black king moves to f6 to defend the rook
            const kingMoves = g.moves({ verbose: true }).filter((m: any) => m.color === 'b' && m.piece === 'k');
            const kingToF6 = kingMoves.find((m: any) => m.to === 'f6');
            if (kingToF6) {
              g.move({ from: kingToF6.from, to: kingToF6.to });
            } else if (kingMoves.length > 0) {
              const randomKingMove = kingMoves[Math.floor(Math.random() * kingMoves.length)];
              g.move({ from: randomKingMove.from, to: randomKingMove.to });
            }
            setGame(new Chess(g.fen()));
          }, 1000);

          setMessage('Связка! Теперь надавите пешкой.');
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
          setWhiteMoves(nextWhiteMoves);

          setTimeout(() => {
            if (!mountedRef.current) return;
            // After f4, black responds with any non-hanging move
            const blackMoves = g.moves({ verbose: true }).filter((m: any) => m.color === 'b');
            if (blackMoves.length > 0) {
              const randomMove = blackMoves[Math.floor(Math.random() * blackMoves.length)];
              g.move({ from: randomMove.from, to: randomMove.to });
              setGame(new Chess(g.fen()));
            }
          }, 1000);

          setMessage('Заберите ладью!');
          return;
        }

        if (whiteMoves === 2) {
          if (!isCorrectThird) {
            setSelectedSquare(null);
            setIsFail(true);
            setMessage('Провалено');
            return;
          }
          setGame(new Chess(g.fen()));
          setSelectedSquare(null);
          setIsComplete(true);
          setMessage('Отлично! Связка выполнена.');
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
      <div className="w-full lg:w-[140px] flex-shrink-0 space-y-2">
        <div className="hidden lg:flex flex-col rounded overflow-hidden border border-gray-200">
          {[1, 2, 3, 4, 5].map((num) => {
            const earnedStars = exerciseStars[num] || 0;
            const isCurrent = num === exercise;
            const isDone = earnedStars > 0;
            return (
              <button
                key={num}
                onClick={() => switchExercise(num as 1)}
                className={`flex items-center justify-center px-2 py-1.5 transition ${
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
                <span className="ml-2 text-xs font-medium">{num}</span>
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
            ? 'Связка — сходите ладьёй с d2 на e2 (связка слона), затем заберите слона'
            : exercise === 2
            ? 'Связка — сходите ферзём с a4 на f4 (связка ладьи), затем заберите ладью'
            : exercise === 3
            ? 'Связка — сходите слоном с f1 на c4 (связка ферзя), затем заберите ферзя'
            : exercise === 4
            ? 'Связка + нажим — пешка f4 надавливает на связанного коня, затем заберите коня'
            : exercise === 5
            ? 'Связка — слон d4 связка ладьи, король защищает, пешка f4, заберите ладью'
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
          ? 'Сходите ладьёй на e2, чтобы связать чёрного слона. Затем заберите слона.'
          : exercise === 2
          ? 'Сходите ферзём на f4, чтобы связать чёрную ладью. Затем заберите ладью.'
          : exercise === 3
          ? 'Сходите слоном на c4, чтобы связать чёрного ферзя. Затем заберите ферзя.'
          : exercise === 4
          ? 'Связка + нажим: пешка f4 надавливает на связанного коня. Затем заберите коня.'
          : exercise === 5
          ? 'Слон d4 связывает ладью. Король защищает. Пешка f4, затем заберите ладью.'
          : ''}</p>
        </div>

        {/* Mobile exercise pills */}
        <div className="flex lg:hidden gap-1 justify-center w-full overflow-x-auto">
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
