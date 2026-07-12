'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { RotateCcw, Trophy } from 'lucide-react';

const FILES = ['a','b','c','d','e','f','g','h'];
const RANKS = ['8','7','6','5','4','3','2','1'];
const DISPLAY_RANKS = ['8','7','6','5','4','3','2','1'];

const START_FEN_1 = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const START_FEN_2 = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const START_FEN_3 = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const START_FEN_4 = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const START_FEN_5 = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const START_FEN_6 = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

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
  const [exercise, setExercise] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
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
    const fen = exercise === 1 ? START_FEN_1 : exercise === 2 ? START_FEN_2 : exercise === 3 ? START_FEN_3 : exercise === 4 ? START_FEN_4 : exercise === 5 ? START_FEN_5 : START_FEN_6;
    setGame(new Chess(fen));
    setSelectedSquare(null);
    setMessage('');
    setIsFail(false);
    setIsComplete(false);
    setWhiteMoves(0);
  }, [exercise]);

  const saveStars = useCallback((ex: 1 | 2 | 3 | 4 | 5 | 6, stars: number) => {
    setExerciseStars(prev => {
      const next = { ...prev, [ex]: Math.max(prev[ex] || 0, stars) };
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [storageKey]);

  const switchExercise = useCallback((num: 1 | 2 | 3 | 4 | 5 | 6) => {
    setExercise(num);
    const fen = num === 1 ? START_FEN_1 : num === 2 ? START_FEN_2 : num === 3 ? START_FEN_3 : num === 4 ? START_FEN_4 : num === 5 ? START_FEN_5 : START_FEN_6;
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
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
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
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
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
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
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
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
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
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
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
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
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
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
      } else if (exercise === 2) {
        // Exercise 2: Italian Opening free-play — 4 moves in any order: d3, Bg5, Nc3, O-O
        // Black responses: Nf6 after white move 4, O-O after move 5, d6 after move 6
        function isPieceOnSquare(pos: Chess, sq: string, piece: string, color: 'w'|'b'): boolean {
          const p = pos.get(sq as any);
          if (!p) return false;
          return p.type === piece && p.color === color;
        }
        function countCompletedMoves(pos: Chess): number {
          let count = 0;
          if (isPieceOnSquare(pos, 'd3', 'p', 'w')) count++;          // d3
          if (isPieceOnSquare(pos, 'g5', 'b', 'w')) count++;          // Bg5
          if (isPieceOnSquare(pos, 'c3', 'n', 'w')) count++;          // Nc3
          if (!isPieceOnSquare(pos, 'e1', 'k', 'w')) count++;        // O-O
          return count;
        }
        function isAllowedMove(from: string, to: string, piece: string): boolean {
          if (from === 'd2' && to === 'd3' && piece === 'p') return true;   // d3
          if (from === 'c1' && to === 'g5' && piece === 'b') return true; // Bg5
          if (from === 'b1' && to === 'c3' && piece === 'n') return true; // Nc3
          if (piece === 'k' && (to === 'g1' || to === 'c1' || to === 'h1')) return true; // O-O
          return false;
        }

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
            setMessage('Отлично! Пешка захватила центр.');
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
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
            setMessage('Отлично! Конь вышел ближе к центру и напал на пешку e5.');
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
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
            setMessage('Отлично! Слон вышел ближе к центру.');
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        // Free play moves 3-6: must play d3, Bg5, Nc3, O-O in any order
        if (whiteMoves >= 3 && whiteMoves <= 6) {
          if (!isAllowedMove(from, to, move.piece)) {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
          const expectedCount = whiteMoves - 2;
          const actualCount = countCompletedMoves(g);
          if (actualCount !== expectedCount) {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
          setGame(new Chess(g.fen()));
          setSelectedSquare(null);
          setWhiteMoves(nextWhiteMoves);
          setTimeout(() => {
            if (!mountedRef.current) return;
            if (whiteMoves === 3) {
              const nf6 = g.moves({ verbose: true }).find((m: any) => m.color === 'b' && m.piece === 'n' && m.to === 'f6');
              if (nf6) g.move({ from: nf6.from, to: nf6.to });
            } else if (whiteMoves === 4) {
              const castle = g.moves({ verbose: true }).find((m: any) => m.color === 'b' && m.piece === 'k' && (m.to === 'g8' || m.to === 'c8'));
              if (castle) g.move({ from: castle.from, to: castle.to });
            } else if (whiteMoves === 5) {
              const d6 = g.moves({ verbose: true }).find((m: any) => m.color === 'b' && m.piece === 'p' && m.to === 'd6');
              if (d6) g.move({ from: d6.from, to: d6.to });
            }
            setGame(new Chess(g.fen()));
          }, 1000);
          if (whiteMoves === 6) {
            setIsComplete(true);
            setMessage('Отлично! Все фигуры развиты и король в безопасности.');
            saveStars(2, 3);
          } else {
            setMessage('Отлично! Продолжайте развивать фигуры.');
          }
          return;
        }
      } else if (exercise === 3) {
        // Exercise 3: Dyrakol — student plays ALL white moves with hints before each
        if (whiteMoves === 0) {
          if (from === 'e2' && to === 'e4' && move.piece === 'p') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'e7', to: 'e5' });
              setGame(new Chess(g.fen()));
              setMessage('Конь выходит на f3 — защищает пешку e4 и готовит развитие. Сделайте Nf3!');
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
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
              setMessage('Отлично! Конь на f3 развит. Теперь разведите слона на c4 — классическая итальянская партия. Сделайте Bc4!');
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
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
              setMessage('Слон на c4 разведён. d3 — тихая итальянская, готовим позицию для дырокола. Сделайте d3!');
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
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
              setMessage('Пешка d3 защищена. Конь c3 развивает фигуры и готовится к центру. Сделайте Nc3!');
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        if (whiteMoves === 4) {
          if (from === 'b1' && to === 'c3' && move.piece === 'n') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'd7', to: 'd6' });
              setGame(new Chess(g.fen()));
              setMessage('Конь на c3 развит. Слон g5 связывает коня f6 — начало дырокола! Сделайте Bg5!');
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        if (whiteMoves === 5) {
          if (from === 'c1' && to === 'g5' && move.piece === 'b') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'e8', to: 'g8' });
              setGame(new Chess(g.fen()));
              setMessage('Чёрные рокировались! Это ключевой момент — мы НЕ рокировали и можем атаковать. Конь d5!');
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        if (whiteMoves === 6) {
          if (from === 'c3' && to === 'd5' && move.piece === 'n') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'c8', to: 'g4' });
              setGame(new Chess(g.fen()));
              setMessage('Конь забирает коня на f6 — размен! Делайте Nxf6!');
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        if (whiteMoves === 7) {
          if (from === 'd5' && to === 'f6' && move.piece === 'n') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'g7', to: 'f6' });
              setGame(new Chess(g.fen()));
              setMessage('Пешка f открыта — это дырокол! Слон h6 атакует ладью. Делайте Bh6!');
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        if (whiteMoves === 8) {
          if (from === 'g5' && to === 'h6' && move.piece === 'b') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'f8', to: 'e8' });
              setGame(new Chess(g.fen()));
              setMessage('h3 гоним слона g4. Делайте h3!');
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        if (whiteMoves === 9) {
          if (from === 'h2' && to === 'h3' && move.piece === 'p') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'g4', to: 'f3' });
              setGame(new Chess(g.fen()));
              setMessage('Пешка g берёт слона — линия f открыта! Делайте gxf3!');
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        if (whiteMoves === 10) {
          if (from === 'g2' && to === 'f3' && move.piece === 'p') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'c6', to: 'd4' });
              setGame(new Chess(g.fen()));
              setMessage('Ладья g1 защищает пешку f3. Делайте Rg1!');
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        if (whiteMoves === 11) {
          if (from === 'h1' && to === 'g1' && move.piece === 'r') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'g8', to: 'h8' });
              setGame(new Chess(g.fen()));
              setMessage('Слон g7 — шах! Делайте Bg7+!');
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        if (whiteMoves === 12) {
          if (from === 'h6' && to === 'g7' && move.piece === 'b') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'h8', to: 'g8' });
              setGame(new Chess(g.fen()));
              setMessage('Слон забирает пешку f6 с шахом! Делайте Bxf6+!');
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        if (whiteMoves === 13) {
          if (from === 'g7' && to === 'f6' && move.piece === 'b') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'g8', to: 'f8' });
              setGame(new Chess(g.fen()));
              setMessage('Слон забирает ферзя на d8! Дырокол выполнен! Делайте Bxd8!');
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        if (whiteMoves === 14) {
          if (from === 'f6' && to === 'd8' && move.piece === 'b') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setIsComplete(true);
            setMessage('Отлично! Дырокол выполнен! Мы разменяли коня на f6, разрушили рокировку и забрали ферзя. Когда рокировка разрушена, чёрного короля легче атаковать!');
            saveStars(3, 3);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
      } else if (exercise === 4) {
        // Exercise 4: Dyrakol — student plays ALL white moves with feedback AFTER each move
        // Moves 1-3: strict order (e4, Nf3, Bc4)
        // Moves 4-6: free order (d3, Nc3, Bg5)
        // Moves 7-15: strict order
        function isPieceOnSquareEx4(pos: Chess, sq: string, piece: string, color: 'w'|'b'): boolean {
          const p = pos.get(sq as any);
          if (!p) return false;
          return p.type === piece && p.color === color;
        }
        function countFreeMovesDone(pos: Chess): number {
          let count = 0;
          if (isPieceOnSquareEx4(pos, 'd3', 'p', 'w')) count++;
          if (isPieceOnSquareEx4(pos, 'c3', 'n', 'w')) count++;
          if (isPieceOnSquareEx4(pos, 'g5', 'b', 'w')) count++;
          return count;
        }
        if (whiteMoves === 0) {
          if (from === 'e2' && to === 'e4' && move.piece === 'p') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'e7', to: 'e5' });
              setGame(new Chess(g.fen()));
              setMessage('Отлично! Пешка захватила центр.');
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
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
              setMessage('Отлично! Конь вышел ближе к центру и напал на пешку e5.');
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
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
              setMessage('Отлично! Слон вышел ближе к центру.');
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        // Free play moves 3-5 (whiteMoves 3,4,5): d3, Nc3, Bg5 in any order
        if (whiteMoves >= 3 && whiteMoves <= 5) {
          const isAllowed = (
            (from === 'd2' && to === 'd3' && move.piece === 'p') ||
            (from === 'b1' && to === 'c3' && move.piece === 'n') ||
            (from === 'c1' && to === 'g5' && move.piece === 'b')
          );
          if (!isAllowed) {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
          const expectedCount = whiteMoves - 2;
          const actualCount = countFreeMovesDone(g);
          if (actualCount !== expectedCount) {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
          setGame(new Chess(g.fen()));
          setSelectedSquare(null);
          setWhiteMoves(nextWhiteMoves);
          setTimeout(() => {
            if (!mountedRef.current) return;
            if (whiteMoves === 3) {
              g.move({ from: 'g8', to: 'f6' });
            } else if (whiteMoves === 4) {
              g.move({ from: 'd7', to: 'd6' });
            } else if (whiteMoves === 5) {
              g.move({ from: 'e8', to: 'g8' });
            }
            setGame(new Chess(g.fen()));
          }, 1000);
          if (whiteMoves === 5) {
            setMessage('Отлично! Чёрные рокировались — дырокол начинается! Конь d5!');
          } else {
            setMessage('Отлично! Продолжайте развивать фигуры.');
          }
          return;
        }
        // Move 6: Nd5
        if (whiteMoves === 6) {
          if (from === 'c3' && to === 'd5' && move.piece === 'n') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'c8', to: 'g4' });
              setGame(new Chess(g.fen()));
              setMessage('Отлично! Конь идёт на d5 — атака! Nxf6!');
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        // Move 7: Nxf6
        if (whiteMoves === 7) {
          if (from === 'd5' && to === 'f6' && move.piece === 'n') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'g7', to: 'f6' });
              setGame(new Chess(g.fen()));
              setMessage('Отлично! Разменяли коня на f6, открыли пешку. Слон h6!');
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        // Move 8: Bh6
        if (whiteMoves === 8) {
          if (from === 'g5' && to === 'h6' && move.piece === 'b') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'f8', to: 'e8' });
              setGame(new Chess(g.fen()));
              setMessage('Отлично! Слон h6 атакует ладью, готовим дырокол. h3!');
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        // Move 9: h3
        if (whiteMoves === 9) {
          if (from === 'h2' && to === 'h3' && move.piece === 'p') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'g4', to: 'f3' });
              setGame(new Chess(g.fen()));
              setMessage('Отлично! h3 гоним слона g4. gxf3!');
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        // Move 10: gxf3
        if (whiteMoves === 10) {
          if (from === 'g2' && to === 'f3' && move.piece === 'p') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'c6', to: 'd4' });
              setGame(new Chess(g.fen()));
              setMessage('Отлично! Пешка g берёт слона, открывая линию f. Ладья g1!');
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        // Move 11: Rg1
        if (whiteMoves === 11) {
          if (from === 'h1' && to === 'g1' && move.piece === 'r') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'g8', to: 'h8' });
              setGame(new Chess(g.fen()));
              setMessage('Отлично! Ладья защищает пешку f3. Bg7+!');
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        // Move 12: Bg7+
        if (whiteMoves === 12) {
          if (from === 'h6' && to === 'g7' && move.piece === 'b') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'h8', to: 'g8' });
              setGame(new Chess(g.fen()));
              setMessage('Отлично! Шах слоном g7! Bxf6+!');
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        // Move 13: Bxf6+
        if (whiteMoves === 13) {
          if (from === 'g7' && to === 'f6' && move.piece === 'b') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'g8', to: 'f8' });
              setGame(new Chess(g.fen()));
              setMessage('Отлично! Шах слоном f6, король уходит на f8. Bxd8!');
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        // Move 14: Bxd8
        if (whiteMoves === 14) {
          if (from === 'f6' && to === 'd8' && move.piece === 'b') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setIsComplete(true);
            setMessage('Отлично! Дырокол выполнен! Разрушили рокировку и забрали ферзя!');
            saveStars(4, 3);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
      } else if (exercise === 5) {
        // Exercise 5: Pawn Storm (Пешечный штурм) — full sequence from starting position
        // Moves 0-2: strict order (e4, Nf3, Bc4) with hints BEFORE each move
        // Moves 3-4: free order (d3, Nc3) in any order
        // Moves 5+: strict order (h3, g4, g5, Bxg5, Qd2, O-O-O, Bxf6, Qh6, Rdg1, Rxg1, Rxg4, hxg4)
        function isPieceOnSquareEx5(pos: Chess, sq: string, piece: string, color: 'w'|'b'): boolean {
          const p = pos.get(sq as any);
          if (!p) return false;
          return p.type === piece && p.color === color;
        }
        function countFreeMovesEx5(pos: Chess): number {
          let count = 0;
          if (isPieceOnSquareEx5(pos, 'd3', 'p', 'w')) count++;
          if (isPieceOnSquareEx5(pos, 'c3', 'n', 'w')) count++;
          return count;
        }
        // Move 0: e4
        if (whiteMoves === 0) {
          if (from === 'e2' && to === 'e4' && move.piece === 'p') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'e7', to: 'e5' });
              setGame(new Chess(g.fen()));
              setMessage('Конь выходит на f3 — защищает пешку e4 и готовит развитие. Сделайте Nf3!');
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        // Move 1: Nf3
        if (whiteMoves === 1) {
          if (from === 'g1' && to === 'f3' && move.piece === 'n') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'b8', to: 'c6' });
              setGame(new Chess(g.fen()));
              setMessage('Отлично! Вы развели слона на c4 — классическая итальянская партия. Сделайте Bc4!');
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        // Move 2: Bc4
        if (whiteMoves === 2) {
          if (from === 'f1' && to === 'c4' && move.piece === 'b') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'f8', to: 'c5' });
              setGame(new Chess(g.fen()));
              setMessage('d3 — тихая итальянская, готовим позицию. Сделайте d3!');
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        // Free play: moves 3-4 (d3 and Nc3 in any order)
        if (whiteMoves >= 3 && whiteMoves <= 4) {
          const isAllowed = (
            (from === 'd2' && to === 'd3' && move.piece === 'p') ||
            (from === 'b1' && to === 'c3' && move.piece === 'n')
          );
          if (!isAllowed) {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
          const expectedCount = whiteMoves - 2;
          const actualCount = countFreeMovesEx5(g);
          if (actualCount !== expectedCount) {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
          setGame(new Chess(g.fen()));
          setSelectedSquare(null);
          setWhiteMoves(nextWhiteMoves);
          setTimeout(() => {
            if (!mountedRef.current) return;
            if (whiteMoves === 3) {
              g.move({ from: 'h7', to: 'h6' });
            } else {
              g.move({ from: 'g8', to: 'f6' });
            }
            setGame(new Chess(g.fen()));
            setMessage('h3 — не даём слону чёрных выйти на g4. Сделайте h3!');
          }, 1000);
          return;
        }
        // Move 5: h3
        if (whiteMoves === 5) {
          if (from === 'h2' && to === 'h3' && move.piece === 'p') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'e8', to: 'g8' });
              setGame(new Chess(g.fen()));
              setMessage('g4 — начинаем пешечный штурм на королевском фланге! Сделайте g4!');
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        // Move 6: g4
        if (whiteMoves === 6) {
          if (from === 'g2' && to === 'g4' && move.piece === 'p') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'd7', to: 'd6' });
              setGame(new Chess(g.fen()));
              setMessage('g5 — давим пешками! Сделайте g5!');
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        // Move 7: g5
        if (whiteMoves === 7) {
          if (from === 'g4' && to === 'g5' && move.piece === 'p') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'h6', to: 'g5' });
              setGame(new Chess(g.fen()));
              setMessage('Белый слон забирает пешку на g5. Сделайте Bxg5!');
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        // Move 8: Bxg5 (from c1 to g5)
        if (whiteMoves === 8) {
          if (from === 'c1' && to === 'g5' && move.piece === 'b' && move.captured === 'p') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'c8', to: 'e6' });
              setGame(new Chess(g.fen()));
              setMessage('Ферзь d2 — готовим атаку. Сделайте Qd2!');
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        // Move 9: Qd2
        if (whiteMoves === 9) {
          if (from === 'd1' && to === 'd2' && move.piece === 'q') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'f8', to: 'e8' });
              setGame(new Chess(g.fen()));
              setMessage('O-O-O — длинная рокировка, уводим короля и подключаем ладью. Сделайте O-O-O!');
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        // Move 10: O-O-O
        if (whiteMoves === 10) {
          if (move.piece === 'k' && (to === 'c1' || to === 'b1')) {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'd8', to: 'd7' });
              setGame(new Chess(g.fen()));
              setMessage('Слон забирает коня на f6. Сделайте Bxf6!');
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        // Move 11: Bxf6
        if (whiteMoves === 11) {
          if (from === 'g5' && to === 'f6' && move.piece === 'b' && move.captured === 'n') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'g7', to: 'f6' });
              setGame(new Chess(g.fen()));
              setMessage('Ферзь h6 — атакуем! Сделайте Qh6!');
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        // Move 12: Qh6
        if (whiteMoves === 12) {
          if (from === 'd2' && to === 'h6' && move.piece === 'q') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'c5', to: 'f2' });
              setGame(new Chess(g.fen()));
              setMessage('Ладья d1 защищает первую линию. Сделайте Rdg1!');
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        // Move 13: Rdg1
        if (whiteMoves === 13) {
          if (from === 'd1' && to === 'g1' && move.piece === 'r') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'f2', to: 'g1' });
              setGame(new Chess(g.fen()));
              setMessage('Ладья забирает слона. Сделайте Rxg1!');
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        // Move 14: Rxg1 (from h1)
        if (whiteMoves === 14) {
          if (from === 'h1' && to === 'g1' && move.piece === 'r' && move.captured === 'b') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'e6', to: 'g4' });
              setGame(new Chess(g.fen()));
              setMessage('Ладья бьёт слона. Сделайте Rxg4!');
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        // Move 15: Rxg4
        if (whiteMoves === 15) {
          if (from === 'g1' && to === 'g4' && move.piece === 'r' && move.captured === 'b') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'd7', to: 'g4' });
              setGame(new Chess(g.fen()));
              setMessage('h x g4 — забираем ферзя! Сделайте hxg4!');
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        // Move 16: hxg4
        if (whiteMoves === 16) {
          if (from === 'h3' && to === 'g4' && move.piece === 'p' && move.captured === 'q') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setIsComplete(true);
            setMessage('Отлично! Пешечный штурм успешен! Белые взяли ферзя и получили решающее преимущество!');
            saveStars(5, 3);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
      } else if (exercise === 6) {
        // Exercise 6: Пешечный штурм — ученик повторяет сам (как exercise 5)
        // Moves 0-2: strict order (e4, Nf3, Bc4) — hints AFTER each move
        // Moves 3-4: free order (d3, Nc3) in any order
        // Moves 5+: strict order (h3, g4, g5, Bxg5, Qd2, O-O-O, Bxf6, Qh6, Rdg1, Rxg1, Rxg4, hxg4)
        function isPieceOnSquareEx6(pos: Chess, sq: string, piece: string, color: 'w'|'b'): boolean {
          const p = pos.get(sq as any);
          if (!p) return false;
          return p.type === piece && p.color === color;
        }
        function countFreeMovesEx6(pos: Chess): number {
          let count = 0;
          if (isPieceOnSquareEx6(pos, 'd3', 'p', 'w')) count++;
          if (isPieceOnSquareEx6(pos, 'c3', 'n', 'w')) count++;
          return count;
        }
        // Move 0: e4
        if (whiteMoves === 0) {
          if (from === 'e2' && to === 'e4' && move.piece === 'p') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setMessage('Отлично! Пешка захватила центр, открыла дорогу слону и ферзю.');
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
        // Move 1: Nf3
        if (whiteMoves === 1) {
          if (from === 'g1' && to === 'f3' && move.piece === 'n') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setMessage('Отлично! Конь вышел ближе к центру и напал на пешку e5.');
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
        // Move 2: Bc4
        if (whiteMoves === 2) {
          if (from === 'f1' && to === 'c4' && move.piece === 'b') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setMessage('Отлично! Слон вышел ближе к центру и готов атаковать f7.');
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
        // Free play: moves 3-4 (d3 and Nc3 in any order)
        if (whiteMoves >= 3 && whiteMoves <= 4) {
          const isAllowed = (
            (from === 'd2' && to === 'd3' && move.piece === 'p') ||
            (from === 'b1' && to === 'c3' && move.piece === 'n')
          );
          if (!isAllowed) {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
          const expectedCount = whiteMoves - 2;
          const actualCount = countFreeMovesEx6(g);
          if (actualCount !== expectedCount) {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
          setGame(new Chess(g.fen()));
          setSelectedSquare(null);
          setWhiteMoves(nextWhiteMoves);
          setMessage('Отлично! Правильное развитие фигур в центре.');
          setTimeout(() => {
            if (!mountedRef.current) return;
            if (whiteMoves === 3) {
              g.move({ from: 'h7', to: 'h6' });
            } else {
              g.move({ from: 'g8', to: 'f6' });
            }
            setGame(new Chess(g.fen()));
          }, 1000);
          return;
        }
        // Move 5: h3
        if (whiteMoves === 5) {
          if (from === 'h2' && to === 'h3' && move.piece === 'p') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setMessage('Отлично! Пешка h3 не даёт слону чёрных выйти на g4.');
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'e8', to: 'g8' });
              setGame(new Chess(g.fen()));
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        // Move 6: g4
        if (whiteMoves === 6) {
          if (from === 'g2' && to === 'g4' && move.piece === 'p') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setMessage('Отлично! Пешка g4 начинает штурм на королевском фланге.');
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'd7', to: 'd6' });
              setGame(new Chess(g.fen()));
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        // Move 7: g5
        if (whiteMoves === 7) {
          if (from === 'g4' && to === 'g5' && move.piece === 'p') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setMessage('Отлично! Пешка g5 давит на позицию чёрных.');
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'h6', to: 'g5' });
              setGame(new Chess(g.fen()));
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        // Move 8: Bxg5
        if (whiteMoves === 8) {
          if (from === 'c1' && to === 'g5' && move.piece === 'b' && move.captured === 'p') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setMessage('Отлично! Слон забрал пешку, открывая линию для атаки.');
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'c8', to: 'e6' });
              setGame(new Chess(g.fen()));
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        // Move 9: Qd2
        if (whiteMoves === 9) {
          if (from === 'd1' && to === 'd2' && move.piece === 'q') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setMessage('Отлично! Ферзь d2 готовит атаку на королевском фланге.');
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'f8', to: 'e8' });
              setGame(new Chess(g.fen()));
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        // Move 10: O-O-O
        if (whiteMoves === 10) {
          if (move.piece === 'k' && (to === 'c1' || to === 'b1')) {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setMessage('Отлично! Длинная рокировка уводит короля в безопасность и подключает ладью.');
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'd8', to: 'd7' });
              setGame(new Chess(g.fen()));
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        // Move 11: Bxf6
        if (whiteMoves === 11) {
          if (from === 'g5' && to === 'f6' && move.piece === 'b' && move.captured === 'n') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setMessage('Отлично! Слон уничтожил коня, ослабляя защиту короля.');
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'g7', to: 'f6' });
              setGame(new Chess(g.fen()));
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        // Move 12: Qh6
        if (whiteMoves === 12) {
          if (from === 'd2' && to === 'h6' && move.piece === 'q') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setMessage('Отлично! Ферзь h6 — смертельная угроза матом!');
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'c5', to: 'f2' });
              setGame(new Chess(g.fen()));
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        // Move 13: Rdg1
        if (whiteMoves === 13) {
          if (from === 'd1' && to === 'g1' && move.piece === 'r') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setMessage('Отлично! Ладья d1 перешла на g1 для решающего удара.');
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'f2', to: 'g1' });
              setGame(new Chess(g.fen()));
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        // Move 14: Rxg1
        if (whiteMoves === 14) {
          if (from === 'h1' && to === 'g1' && move.piece === 'r' && move.captured === 'b') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setMessage('Отлично! Ладья забирает слона, продолжая штурм.');
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'e6', to: 'g4' });
              setGame(new Chess(g.fen()));
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        // Move 15: Rxg4
        if (whiteMoves === 15) {
          if (from === 'g1' && to === 'g4' && move.piece === 'r' && move.captured === 'b') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setWhiteMoves(nextWhiteMoves);
            setMessage('Отлично! Ладья уничтожила слона, открывая путь пешке.');
            setTimeout(() => {
              if (!mountedRef.current) return;
              g.move({ from: 'd7', to: 'g4' });
              setGame(new Chess(g.fen()));
            }, 1000);
            return;
          } else {
            handleFailWithBlackCapture(g, setGame, setIsFail, setMessage, setSelectedSquare, mountedRef);
            return;
          }
        }
        // Move 16: hxg4
        if (whiteMoves === 16) {
          if (from === 'h3' && to === 'g4' && move.piece === 'p' && move.captured === 'q') {
            setGame(new Chess(g.fen()));
            setSelectedSquare(null);
            setIsComplete(true);
            setMessage('Отлично! Пешечный штурм завершён — ферзь взят и белые получили решающее преимущество!');
            saveStars(6, 3);
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
          {[1, 2, 3, 4, 5, 6].map((num) => {
            const earnedStars = exerciseStars[num] || 0;
            const isCurrent = num === exercise;
            const isDone = earnedStars > 0;
            return (
              <button
                key={num}
                onClick={() => switchExercise(num as any)}
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
          <p>{exercise === 1 || exercise === 2 ? 'Захватите центр пешкой, выведите коней и слонов и сделайте рокировку.' :
          exercise === 3 || exercise === 4 ? 'Используйте дырокол, чтобы разрушить рокировку соперника.' :
          exercise === 5 || exercise === 6 ? 'Пешечный штурм — захватите центр, развейтесь и атакуйте короля!' : ''}</p>
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
                  onClick={() => switchExercise(num as any)}
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
            {exercise < 6 && (
              <button
                onClick={() => switchExercise((exercise + 1) as 1 | 2 | 3 | 4 | 5 | 6)}
                className="bg-blue-500 text-white font-bold text-base px-6 py-2 rounded shadow hover:bg-blue-600 transition"
              >
                Перейти к Упражнению {exercise + 1} →
              </button>
            )}
            {exercise === 6 && (exerciseStars[6] || 0) >= 3 && (
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

