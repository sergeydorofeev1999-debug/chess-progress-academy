'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { RotateCcw, Trophy } from 'lucide-react';

const FILES = ['h','g','f','e','d','c','b','a'];
const RANKS = ['8','7','6','5','4','3','2','1'];
const DISPLAY_RANKS = ['1','2','3','4','5','6','7','8'];

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// Find a white capture that leaves the white piece safe (no black recapture)
function findSafeWhiteCapture(currentGame: Chess): { from: string; to: string } | null {
  const whiteMoves = currentGame.moves({ verbose: true });
  const captures = whiteMoves.filter((m: any) => m.captured);
  for (const capture of captures) {
    const testGame = new Chess(currentGame.fen());
    testGame.move({ from: capture.from, to: capture.to });
    const blackMoves = testGame.moves({ verbose: true });
    const blackRecaptures = blackMoves.filter((m: any) => m.captured && m.to === capture.to);
    if (blackRecaptures.length === 0) {
      return { from: capture.from, to: capture.to };
    }
  }
  return null;
}

function handleFailWithWhiteCapture(
  g: Chess,
  setGameFn: (g: Chess) => void,
  setIsFailFn: (v: boolean) => void,
  setMessageFn: (msg: string) => void,
  setSelectedSquareFn: (sq: string | null) => void,
  mountedRef: React.RefObject<boolean>
) {
  const cap = findSafeWhiteCapture(g);
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

export default function ItalianOpeningBoardBlack({ onComplete, lessonId }: { onComplete: () => void; lessonId?: string }) {
  const [exercise, setExercise] = useState<1 | 2 | 3>(1);
  const [game, setGame] = useState<Chess | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [isFail, setIsFail] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [blackMoves, setBlackMoves] = useState(0);
  const [sqSize, setSqSize] = useState(52);
  const [exerciseStars, setExerciseStars] = useState<Record<number, number>>({});
  const [postMoveHint, setPostMoveHint] = useState('');

  const isCompleteRef = useRef(false);
  const isFailRef = useRef(false);
  const mountedRef = useRef(true);
  const autoStartedRef = useRef(false);

  const [dragPiece, setDragPiece] = useState<DragState | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const pointerStartRef = useRef<PointerStart | null>(null);

  const storageKey = lessonId ? `italian_black_progress_${lessonId}` : 'italian_black_progress';

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
    if (!game) setGame(new Chess(START_FEN));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-start: white plays e4 on init
  useEffect(() => {
    if (!game) return;
    if (autoStartedRef.current) return;
    if (game.turn() === 'w' && blackMoves === 0) {
      autoStartedRef.current = true;
      setTimeout(() => {
        if (!mountedRef.current) return;
        const g = game;
        g.move({ from: 'e2', to: 'e4' });
        setGame(new Chess(g.fen()));
      }, 1000);
    }
  }, [game, blackMoves]);

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
    const g = new Chess(START_FEN);
    setGame(g);
    setSelectedSquare(null);
    setMessage('');
    setIsFail(false);
    setIsComplete(false);
    setBlackMoves(0);
    setPostMoveHint('');
    autoStartedRef.current = false;
    // Auto-play white e4 again
    setTimeout(() => {
      if (!mountedRef.current) return;
      g.move({ from: 'e2', to: 'e4' });
      setGame(new Chess(g.fen()));
      autoStartedRef.current = true;
    }, 1000);
  }, []);

  const switchExercise = useCallback((num: 1 | 2 | 3) => {
    setExercise(num);
    reset();
  }, [reset]);

  const saveStars = useCallback((ex: number, stars: number) => {
    setExerciseStars(prev => {
      const next = { ...prev, [ex]: Math.max(prev[ex] || 0, stars) };
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [storageKey]);

  const processBlackMove = useCallback((from: string, to: string) => {
    if (!game) return;
    const g = game;
    if (g.turn() !== 'b') return;

    try {
      const move = g.move({ from, to });
      if (!move) return;

      const nextBlackMoves = blackMoves + 1;

      if (exercise === 1) {
        // Exercise 1: Italian Opening for Black — hints BEFORE moves
        if (blackMoves === 0) {
          if (from === 'e7' && to === 'e5' && move.piece === 'p') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setBlackMoves(nextBlackMoves);
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'g1', to: 'f3' });
              setGame(new Chess(g.fen()));
            }, 1000);
            return;
          } else {
            handleFailWithWhiteCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        if (blackMoves === 1) {
          if (from === 'b8' && to === 'c6' && move.piece === 'n') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setBlackMoves(nextBlackMoves);
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'f1', to: 'c4' });
              setGame(new Chess(g.fen()));
            }, 1000);
            return;
          } else {
            handleFailWithWhiteCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        if (blackMoves === 2) {
          if (from === 'f8' && to === 'c5' && move.piece === 'b') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setBlackMoves(nextBlackMoves);
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'd2', to: 'd3' });
              setGame(new Chess(g.fen()));
            }, 1000);
            return;
          } else {
            handleFailWithWhiteCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        if (blackMoves === 3) {
          if (from === 'd7' && to === 'd6' && move.piece === 'p') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setBlackMoves(nextBlackMoves);
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'b1', to: 'c3' });
              setGame(new Chess(g.fen()));
            }, 1000);
            return;
          } else {
            handleFailWithWhiteCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        if (blackMoves === 4) {
          if (from === 'g8' && to === 'f6' && move.piece === 'n') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setBlackMoves(nextBlackMoves);
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'e1', to: 'g1' });
              setGame(new Chess(g.fen()));
            }, 1000);
            return;
          } else {
            handleFailWithWhiteCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        if (blackMoves === 5) {
          if (from === 'c8' && to === 'g4' && move.piece === 'b') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setBlackMoves(nextBlackMoves);
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'c1', to: 'g5' });
              setGame(new Chess(g.fen()));
            }, 1000);
            return;
          } else {
            handleFailWithWhiteCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        if (blackMoves === 6) {
          if (move.piece === 'k' && (to === 'g8' || to === 'h8')) {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setBlackMoves(nextBlackMoves);
            setIsComplete(true);
            setMessage('Отлично! Итальянская партия за чёрных завершена. Вы ответили на ходы белых правильно!');
            saveStars(1, 3);
            return;
          } else {
            handleFailWithWhiteCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
      } else if (exercise === 2) {
        // Exercise 2: Repeat Italian Opening for Black — hints AFTER moves, free order for moves 3-5 (d6, Nf6, Bg4)
        function isPieceOnSquare(pos: Chess, sq: string, piece: string, color: 'w'|'b'): boolean {
          const p = pos.get(sq as any);
          if (!p) return false;
          return p.type === piece && p.color === color;
        }
        function countFreeMoves(pos: Chess): number {
          let count = 0;
          if (isPieceOnSquare(pos, 'd6', 'p', 'b')) count++;   // d6
          if (isPieceOnSquare(pos, 'f6', 'n', 'b')) count++;   // Nf6
          if (isPieceOnSquare(pos, 'g4', 'b', 'b')) count++;  // Bg4
          return count;
        }
        // Move 0: e5
        if (blackMoves === 0) {
          if (from === 'e7' && to === 'e5' && move.piece === 'p') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setBlackMoves(nextBlackMoves);
            setPostMoveHint('Отлично, пешка захватила центр');
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'g1', to: 'f3' });
              setGame(new Chess(g.fen()));
            }, 1000);
            return;
          } else {
            handleFailWithWhiteCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        // Move 1: Nc6
        if (blackMoves === 1) {
          if (from === 'b8' && to === 'c6' && move.piece === 'n') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setBlackMoves(nextBlackMoves);
            setPostMoveHint('Отлично, конь вышел ближе к центру и защитил пешку e5');
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'f1', to: 'c4' });
              setGame(new Chess(g.fen()));
            }, 1000);
            return;
          } else {
            handleFailWithWhiteCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        // Move 2: Bc5
        if (blackMoves === 2) {
          if (from === 'f8' && to === 'c5' && move.piece === 'b') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setBlackMoves(nextBlackMoves);
            setPostMoveHint('Отлично, слон вышел ближе к центру');
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'd2', to: 'd3' });
              setGame(new Chess(g.fen()));
            }, 1000);
            return;
          } else {
            handleFailWithWhiteCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        // Free play: moves 3-5 (d6, Nf6, Bg4 in any order)
        if (blackMoves >= 3 && blackMoves <= 5) {
          const isAllowed = (
            (from === 'd7' && to === 'd6' && move.piece === 'p') ||
            (from === 'g8' && to === 'f6' && move.piece === 'n') ||
            (from === 'c8' && to === 'g4' && move.piece === 'b')
          );
          if (!isAllowed) {
            handleFailWithWhiteCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
          const expectedCount = blackMoves - 2;
          const actualCount = countFreeMoves(g);
          if (actualCount !== expectedCount) {
            handleFailWithWhiteCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
          setGame(new Chess(g.fen()));
          setSelectedSquare(null);
          setBlackMoves(nextBlackMoves);
          setPostMoveHint('Отлично! Правильное развитие фигур в центре.');
          setTimeout(() => {
            if (!mountedRef.current) return;
            if (blackMoves === 3) {
              g.move({ from: 'b1', to: 'c3' });
            } else if (blackMoves === 4) {
              g.move({ from: 'e1', to: 'g1' });
            } else {
              g.move({ from: 'c1', to: 'g5' });
            }
            setGame(new Chess(g.fen()));
          }, 1000);
          return;
        }
        // Move 6: O-O
        if (blackMoves === 6) {
          if (move.piece === 'k' && (to === 'g8' || to === 'h8')) {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setBlackMoves(nextBlackMoves);
            setIsComplete(true);
            setMessage('Отлично! Итальянская партия за чёрных завершена. Вы ответили на ходы белых правильно!');
            saveStars(2, 3);
            return;
          } else {
            handleFailWithWhiteCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
      } else if (exercise === 3) {
        // Exercise 3: Dyrakol (дырокол) — student plays black in a full game leading to Rxg5#
        // Sequence: e5, Nc6, Bc5, d6, Nf6, Bg4, Nd4, Nxf3, Bh3, gxf6, f5, Rg8+, Bg2+, Bxf3+, Rxg5#
        // White moves: e4 Nf3 Bc4 d3 Nc3 O-O Bg5 Nd5 Nxf6+ Bh4 Bxd8 Kh1 Kg1 Bg5
        if (blackMoves === 0) {
          if (from === 'e7' && to === 'e5' && move.piece === 'p') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setBlackMoves(nextBlackMoves);
            setPostMoveHint('Конь выходит на f3 — защищает пешку e4 и готовит развитие. Сделайте Nf3!');
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'g1', to: 'f3' });
              setGame(new Chess(g.fen()));
            }, 1000);
            return;
          } else {
            handleFailWithWhiteCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        if (blackMoves === 1) {
          if (from === 'b8' && to === 'c6' && move.piece === 'n') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setBlackMoves(nextBlackMoves);
            setPostMoveHint('Разведите слона на c4 — классическая итальянская партия. Сделайте Bc4!');
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'f1', to: 'c4' });
              setGame(new Chess(g.fen()));
            }, 1000);
            return;
          } else {
            handleFailWithWhiteCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        if (blackMoves === 2) {
          if (from === 'f8' && to === 'c5' && move.piece === 'b') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setBlackMoves(nextBlackMoves);
            setPostMoveHint('d3 — тихая итальянская, готовим позицию для дырокола. Сделайте d3!');
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'd2', to: 'd3' });
              setGame(new Chess(g.fen()));
            }, 1000);
            return;
          } else {
            handleFailWithWhiteCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        if (blackMoves === 3) {
          if (from === 'd7' && to === 'd6' && move.piece === 'p') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setBlackMoves(nextBlackMoves);
            setPostMoveHint('Конь c3 развивает фигуры и готовится к центру. Сделайте Nc3!');
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'b1', to: 'c3' });
              setGame(new Chess(g.fen()));
            }, 1000);
            return;
          } else {
            handleFailWithWhiteCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        if (blackMoves === 4) {
          if (from === 'g8' && to === 'f6' && move.piece === 'n') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setBlackMoves(nextBlackMoves);
            setPostMoveHint('Белые рокировались — король в безопасности. Сыграйте Bg4 — нападение на коня f3!');
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'e1', to: 'g1' });
              setGame(new Chess(g.fen()));
            }, 1000);
            return;
          } else {
            handleFailWithWhiteCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        if (blackMoves === 5) {
          if (from === 'c8' && to === 'g4' && move.piece === 'b') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setBlackMoves(nextBlackMoves);
            setPostMoveHint('Чёрные рокировались! Это ключевой момент — мы НЕ рокировали и можем атаковать. Конь d5!');
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'c1', to: 'g5' });
              setGame(new Chess(g.fen()));
            }, 1000);
            return;
          } else {
            handleFailWithWhiteCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        if (blackMoves === 6) {
          if (from === 'c6' && to === 'd4' && move.piece === 'n') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setBlackMoves(nextBlackMoves);
            setPostMoveHint('Конь забирает коня на f6 — размен! Делайте Nxf6!');
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'c3', to: 'd5' });
              setGame(new Chess(g.fen()));
            }, 1000);
            return;
          } else {
            handleFailWithWhiteCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        if (blackMoves === 7) {
          if (from === 'd4' && to === 'f3' && move.piece === 'n') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setBlackMoves(nextBlackMoves);
            setPostMoveHint('Пешка g берёт коня — линия f открыта! Делайте gxf3!');
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'g2', to: 'f3' });
              setGame(new Chess(g.fen()));
            }, 1000);
            return;
          } else {
            handleFailWithWhiteCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        if (blackMoves === 8) {
          if (from === 'g4' && to === 'h3' && move.piece === 'b') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setBlackMoves(nextBlackMoves);
            setPostMoveHint('Конь забирает коня на f6 — шах! Делайте Nxf6+!');
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'd5', to: 'f6' });
              setGame(new Chess(g.fen()));
            }, 1000);
            return;
          } else {
            handleFailWithWhiteCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        if (blackMoves === 9) {
          if (from === 'g7' && to === 'f6' && move.piece === 'p') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setBlackMoves(nextBlackMoves);
            setPostMoveHint('Пешка f открыта — это дырокол! Слон h6 атакует ладью. Делайте Bh6!');
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'g5', to: 'h4' });
              setGame(new Chess(g.fen()));
            }, 1000);
            return;
          } else {
            handleFailWithWhiteCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        if (blackMoves === 10) {
          if (from === 'f6' && to === 'f5' && move.piece === 'p') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setBlackMoves(nextBlackMoves);
            setPostMoveHint('Слон забирает ферзя на d8! Дырокол! Делайте Bxd8!');
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'c4', to: 'd8' });
              setGame(new Chess(g.fen()));
            }, 1000);
            return;
          } else {
            handleFailWithWhiteCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        if (blackMoves === 11) {
          if (from === 'h8' && to === 'g8' && move.piece === 'r') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setBlackMoves(nextBlackMoves);
            setPostMoveHint('Король отходит на h1. Делайте Kh1!');
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'g1', to: 'h1' });
              setGame(new Chess(g.fen()));
            }, 1000);
            return;
          } else {
            handleFailWithWhiteCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        if (blackMoves === 12) {
          if (from === 'h3' && to === 'g2' && move.piece === 'b') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setBlackMoves(nextBlackMoves);
            setPostMoveHint('Король на g1. Делайте Kg1!');
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'h1', to: 'g1' });
              setGame(new Chess(g.fen()));
            }, 1000);
            return;
          } else {
            handleFailWithWhiteCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        if (blackMoves === 13) {
          if (from === 'g2' && to === 'f3' && move.piece === 'b') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setBlackMoves(nextBlackMoves);
            setPostMoveHint('Слон g5 — финальный удар! Делайте Bg5!');
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'd8', to: 'g5' });
              setGame(new Chess(g.fen()));
            }, 1000);
            return;
          } else {
            handleFailWithWhiteCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        if (blackMoves === 14) {
          if (from === 'g8' && to === 'g5' && move.piece === 'r') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setIsComplete(true);
            setMessage('Отлично! Дырокол выполнен! Чёрные сначала разменяли коня на f6, потом разрушили рокировку, и в конце поставили мат ладьёй на g5. Когда рокировка разрушена, белого короля легче атаковать!');
            saveStars(3, 3);
            return;
          } else {
            handleFailWithWhiteCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
      }
    } catch {
      // Invalid move
    }
  }, [game, blackMoves, saveStars, exercise]);

  const handleSquareClick = useCallback((square: string) => {
    if (isCompleteRef.current || isFailRef.current) return;
    if (!game) return;
    const g = game;
    if (g.turn() !== 'b') return;

    const piece = g.get(square as any);

    if (selectedSquare) {
      if (selectedSquare === square) {
        setSelectedSquare(null);
        return;
      }
      processBlackMove(selectedSquare, square);
      if (piece && piece.color === 'b') {
        setSelectedSquare(square);
      }
    } else {
      if (piece && piece.color === 'b') {
        setSelectedSquare(square);
      }
    }
  }, [game, selectedSquare, processBlackMove]);

  const handlePointerDown = useCallback((e: React.PointerEvent, square: string) => {
    if (isCompleteRef.current || isFailRef.current) return;
    if (!game) return;
    const g = game;
    if (g.turn() !== 'b') return;
    const piece = g.get(square as any);
    if (!piece || piece.color !== 'b') return;
    if (e.pointerType === 'touch' && !(e as any).isPrimary) return;
    pointerStartRef.current = { x: e.clientX, y: e.clientY, square, moved: false, pointerId: e.pointerId };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
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
          processBlackMove(start.square, targetSquare);
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
  }, [game, processBlackMove]);

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

  const turnText = game ? (game.turn() === 'b' ? 'Ваш ход (чёрные)' : 'Белые ходят...') : '';

  const hintText = exercise === 1
    ? (blackMoves === 0 ? 'Сыграйте e7-e5 — захватите центр пешкой.' :
       blackMoves === 1 ? 'Конь выходит на c6 — ближе к центру. Сделайте Nc6!' :
       blackMoves === 2 ? 'Сыграйте Bf8-c5 — направьте слона на поле f2.' :
       blackMoves === 3 ? 'Сыграйте d7-d6 — защитите пешку e5.' :
       blackMoves === 4 ? 'Сыграйте Kg8-f6 — развейте коня.' :
       blackMoves === 5 ? 'Сыграйте Bc8-g4 — нападайте на коня f3.' :
       blackMoves === 6 ? 'Сделайте короткую рокировку (O-O) — уберите короля в безопасность!' :
       'Смотрите, как завершается партия.')
    : exercise === 3
    ? (blackMoves === 0 ? 'Сделайте e7-e5 — захватите центр пешкой.' :
       blackMoves === 1 ? 'Конь выходит на c6. Сделайте Nc6!' :
       blackMoves === 2 ? 'Сыграйте Bf8-c5.' :
       blackMoves === 3 ? 'Сыграйте d7-d6.' :
       blackMoves === 4 ? 'Сыграйте Kg8-f6.' :
       blackMoves === 5 ? 'Сыграйте Bc8-g4.' :
       blackMoves === 6 ? 'Конь c6-d4 — нападайте на центр! Сделайте Nd4!' :
       blackMoves === 7 ? 'Конь забирает на f3! Сделайте Nxf3!' :
       blackMoves === 8 ? 'Слон отступает на h3. Сделайте Bh3!' :
       blackMoves === 9 ? 'Пешка g берёт коня на f6. Сделайте gxf6!' :
       blackMoves === 10 ? 'Пешка f идёт на f5. Сделайте f5!' :
       blackMoves === 11 ? 'Ладья h8-g8 — шах! Сделайте Rg8+!' :
       blackMoves === 12 ? 'Слон h3-g2 — шах! Сделайте Bg2+!' :
       blackMoves === 13 ? 'Слон g2-f3 — нападение! Сделайте Bxf3!' :
       blackMoves === 14 ? 'Ладья g8-g5 — мат! Сделайте Rxg5!' :
       'Смотрите, как завершается партия.')
    : '';

  const earnedStars = exerciseStars[exercise] || 0;

  return (
    <div className="flex flex-col lg:flex-row gap-4 w-full min-h-[500px]">
      {/* LEFT COLUMN */}
      <div className="w-full lg:w-[300px] flex-shrink-0 space-y-2">
        <div className="hidden lg:grid grid-cols-2 gap-1 rounded p-1 border border-gray-200">
          {[1, 2, 3].map((num) => {
            const stars = exerciseStars[num] || 0;
            const isCurrent = num === exercise;
            const isDone = stars > 0;
            return (
              <button
                key={num}
                onClick={() => switchExercise(num as 1 | 2 | 3)}
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
                    <StarPng key={s} filled={stars > 0 && s <= stars} size={14} />
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
          {exercise === 1 ? hintText : postMoveHint || 'Повторите партию за чёрных!'}
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
                      cursor: pieceObj && pieceObj.color === 'b' && !isFail && !isComplete ? 'grab' : 'default',
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
                    {/* Rank numbers on the right side (a-file) */}
                    {fi === 7 && (
                      <span className={`absolute top-0.5 right-1 text-[10px] font-bold ${light ? 'text-[#b58863]' : 'text-[#f0d9b5]'}`}>
                        {rank}
                      </span>
                    )}
                    {/* File letters on the bottom (rank 8) */}
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
          <p>Пройдите итальянскую партию за чёрных: e5, Nc6, Bc5, Nf6, O-O, d6 в ответ на ходы белых.</p>
        </div>

        {/* Mobile exercise pills */}
        <div className="flex lg:hidden flex-col items-center gap-1 w-full">
          <div className="flex gap-1 justify-center w-full">
            {[1, 2, 3].map((num) => {
              const stars = exerciseStars[num] || 0;
              const isCurrent = num === exercise;
              const isDone = stars > 0;
              return (
                <button
                  key={num}
                  onClick={() => switchExercise(num as 1 | 2 | 3)}
                  className={`flex items-center gap-0.5 px-1.5 py-1 rounded text-xs transition ${
                    isCurrent ? 'bg-blue-500 text-white' : isDone ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'
                  } cursor-pointer`}
                >
                  <div className="flex gap-0.5">
                    {[1, 2, 3].map(s => (
                      <StarPng key={s} filled={stars > 0 && s <= stars} size={12} />
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
            {exercise === 1 && (
              <button
                onClick={() => switchExercise(2)}
                className="bg-blue-500 text-white font-bold text-base px-6 py-2 rounded shadow hover:bg-blue-600 transition"
              >
                Перейти к Упражнению 2 →
              </button>
            )}
            {exercise === 2 && (
              <button
                onClick={() => switchExercise(3)}
                className="bg-blue-500 text-white font-bold text-base px-6 py-2 rounded shadow hover:bg-blue-600 transition"
              >
                Перейти к Упражнению 3 →
              </button>
            )}
            {exercise === 3 && (
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
