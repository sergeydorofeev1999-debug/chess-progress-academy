'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { RotateCcw, Trophy } from 'lucide-react';

const FILES = ['a','b','c','d','e','f','g','h'];
const RANKS = ['8','7','6','5','4','3','2','1'];
const DISPLAY_RANKS = ['8','7','6','5','4','3','2','1'];

const START_FEN_1 = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const START_FEN_2 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2';
const START_FEN_3 = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
const START_FEN_4 = 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
const START_FEN_5 = 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
const START_FEN_6 = 'r1bqk1nr/pppp1ppp/2n5/2b1p3/1BP1P3/2P2N2/PP3PPP/RNBQK2R b KQkq - 0 5';
const START_FEN_7 = 'r1bqk1nr/pppp1ppp/2n5/1b2p3/1BP1P3/2P2N2/PP3PPP/RNBQK2R w KQkq - 0 6';
const START_FEN_8 = 'r1bqk1nr/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 6 5';
const START_FEN_9 = 'r1bqk2r/pppp1ppp/2n2n2/1b2p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 w kq - 6 6';
const START_FEN_10 = 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 6 5';
const START_FEN_11 = 'r1bqk1nr/pppp1ppp/2n5/2bp4/2BPP3/2P2N2/PP3PPP/RNBQK2R b KQkq - 0 6';
const START_FEN_12 = 'r2qk1nr/pppp1ppp/2n5/2bp4/2BPP3/2P2N2/PP3PPP/RNBQK2R w KQkq - 2 7';

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
    const fen = exercise === 1 ? START_FEN_1 : exercise === 2 ? START_FEN_2 : exercise === 3 ? START_FEN_3 : exercise === 4 ? START_FEN_4 : exercise === 5 ? START_FEN_5 : exercise === 6 ? START_FEN_6 : exercise === 7 ? START_FEN_7 : exercise === 8 ? START_FEN_8 : exercise === 9 ? START_FEN_9 : exercise === 10 ? START_FEN_10 : exercise === 11 ? START_FEN_11 : START_FEN_12;
    setGame(new Chess(fen));
    setSelectedSquare(null);
    if (exercise === 1) {
      setMessage('В дебюте главное — захватить центр. Белые начинают с e4.');
    } else if (exercise === 2) {
      setMessage('Конь выходит на f3 — защищает пешку e4 и готовит развитие.');
    } else if (exercise === 3) {
      setMessage('Развейте слона на c4 — он направит орудие на уязвимое поле f7.');
    } else if (exercise === 4) {
      setMessage('Играйте c3 — Гиуоко Пиано (тихая итальянская партия).');
    } else if (exercise === 5) {
      setMessage('Играйте d3 — спокойное развитие без пешечного шторма.');
    } else if (exercise === 6) {
      setMessage('Играйте d4 — развитие центра в гамбите Эванса.');
    } else if (exercise === 7) {
      setMessage('Чёрные играют Nf6 (защита двух коней). Ответьте d3.');
    } else if (exercise === 8) {
      setMessage('Чёрные играют Be7 (венгерская защита). Разбейте центр d4.');
    } else if (exercise === 9) {
      setMessage('Король в безопасности? Рокируйтесь!');
    } else if (exercise === 10) {
      setMessage('Развейте коня на c3 — защита пешки e4.');
    } else if (exercise === 11) {
      setMessage('Возьмите на d4 открытым полем пешки.');
    } else {
      setMessage('Развейте коня на c3 — классическое развитие.');
    }
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
    if (num === 1) {
      setMessage('В дебюте главное — захватить центр. Белые начинают с e4.');
    } else if (num === 2) {
      setMessage('Конь выходит на f3 — защищает пешку e4 и готовит развитие.');
    } else if (num === 3) {
      setMessage('Развейте слона на c4 — он направит орудие на уязвимое поле f7.');
    } else if (num === 4) {
      setMessage('Играйте c3 — Гиуоко Пиано (тихая итальянская партия).');
    } else if (num === 5) {
      setMessage('Играйте d3 — спокойное развитие без пешечного шторма.');
    } else if (num === 6) {
      setMessage('Играйте d4 — развитие центра в гамбите Эванса.');
    } else if (num === 7) {
      setMessage('Чёрные играют Nf6 (защита двух коней). Ответьте d3.');
    } else if (num === 8) {
      setMessage('Чёрные играют Be7 (венгерская защита). Разбейте центр d4.');
    } else if (num === 9) {
      setMessage('Король в безопасности? Рокируйтесь!');
    } else if (num === 10) {
      setMessage('Развейте коня на c3 — защита пешки e4.');
    } else if (num === 11) {
      setMessage('Возьмите на d4 открытым полем пешки.');
    } else {
      setMessage('Развейте коня на c3 — классическое развитие.');
    }
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
        // EXERCISE 1: e2-e4, computer e7-e5
        const isCorrectFirst = from === 'e2' && to === 'e4' && move.piece === 'p';

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
            g.move({ from: 'e7', to: 'e5' });
            setGame(new Chess(g.fen()));
            setMessage('Конь выходит на f3 — защищает пешку e4 и готовит развитие.');
          }, 1000);
          return;
        }
      } else if (exercise === 2) {
        // EXERCISE 2: Ng1-f3 after e4 e5
        const isCorrectFirst = from === 'g1' && to === 'f3' && move.piece === 'n';

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
            g.move({ from: 'b8', to: 'c6' });
            setGame(new Chess(g.fen()));
            setMessage('Развейте слона на c4 — он направит орудие на уязвимое поле f7.');
          }, 1000);
          return;
        }
      } else if (exercise === 3) {
        // EXERCISE 3: Bf1-c4 after e4 e5 Nf3 Nc6
        const isCorrectFirst = from === 'f1' && to === 'c4' && move.piece === 'b';

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
            g.move({ from: 'f8', to: 'c5' });
            setGame(new Chess(g.fen()));
            setIsComplete(true);
            setMessage('Отлично! Вы развели слона на c4 — классическая итальянская партия.');
            saveStars(3, 3);
          }, 1000);
          return;
        }
      } else if (exercise === 4) {
        // EXERCISE 4: c2-c3 (Giuoco Piano) after e4 e5 Nf3 Nc6 Bc4 Bc5
        const isCorrectFirst = from === 'c2' && to === 'c3' && move.piece === 'p';

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
            g.move({ from: 'd7', to: 'd6' });
            setGame(new Chess(g.fen()));
            setIsComplete(true);
            setMessage('Отлично! Вы сыграли c3 — Гиуоко Пиано.');
            saveStars(4, 3);
          }, 1000);
          return;
        }
      } else if (exercise === 5) {
        // EXERCISE 5: d2-d3 (quieter line) after e4 e5 Nf3 Nc6 Bc4 Bc5
        const isCorrectFirst = from === 'd2' && to === 'd3' && move.piece === 'p';

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
            g.move({ from: 'd7', to: 'd6' });
            setGame(new Chess(g.fen()));
            setIsComplete(true);
            setMessage('Отлично! Вы сыграли d3 — спокойное развитие.');
            saveStars(5, 3);
          }, 1000);
          return;
        }
      } else if (exercise === 6) {
        // EXERCISE 6: d2-d4 (Evans Gambit after b4 Bxb4 c3 Ba5)
        const isCorrectFirst = from === 'd2' && to === 'd4' && move.piece === 'p';

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
            g.move({ from: 'b7', to: 'b5' });
            setGame(new Chess(g.fen()));
            setIsComplete(true);
            setMessage('Отлично! Вы сыграли d4 — развитие центра в гамбите Эванса.');
            saveStars(6, 3);
          }, 1000);
          return;
        }
      } else if (exercise === 7) {
        // EXERCISE 7: d2-d3 against Two Knights after Nf6
        const isCorrectFirst = from === 'd2' && to === 'd3' && move.piece === 'p';

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
            g.move({ from: 'd7', to: 'd5' });
            setGame(new Chess(g.fen()));
            setIsComplete(true);
            setMessage('Отлично! Вы сыграли d3 против защиты двух коней.');
            saveStars(7, 3);
          }, 1000);
          return;
        }
      } else if (exercise === 8) {
        // EXERCISE 8: d2-d4 against Hungarian after Be7
        const isCorrectFirst = from === 'd2' && to === 'd4' && move.piece === 'p';

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
            g.move({ from: 'd7', to: 'd6' });
            setGame(new Chess(g.fen()));
            setIsComplete(true);
            setMessage('Отлично! Вы разбили центр d4 против венгерской защиты.');
            saveStars(8, 3);
          }, 1000);
          return;
        }
      } else if (exercise === 9) {
        // EXERCISE 9: 0-0 kingside castling after e4 e5 Nf3 Nc6 Bc4 Bc5
        const isCorrectFirst = move.piece === 'k' && (to === 'g1' || to === 'h1');

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
            g.move({ from: 'd7', to: 'd6' });
            setGame(new Chess(g.fen()));
            setIsComplete(true);
            setMessage('Отлично! Вы рокировались — безопасность короля прежде всего.');
            saveStars(9, 3);
          }, 1000);
          return;
        }
      } else if (exercise === 10) {
        // EXERCISE 10: Nb1-c3 after e4 e5 Nf3 Nc6 Bc4 Bc5
        const isCorrectFirst = from === 'b1' && to === 'c3' && move.piece === 'n';

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
            g.move({ from: 'g8', to: 'f6' });
            setGame(new Chess(g.fen()));
            setIsComplete(true);
            setMessage('Отлично! Вы развели коня на c3 — защита центра.');
            saveStars(10, 3);
          }, 1000);
          return;
        }
      } else if (exercise === 11) {
        // EXERCISE 11: c3xd4 after d4 exd4
        const isCorrectFirst = from === 'c3' && to === 'd4' && move.piece === 'p' && move.captured === 'p';

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
            g.move({ from: 'd8', to: 'e7' });
            setGame(new Chess(g.fen()));
            setIsComplete(true);
            setMessage('Отлично! Вы взяли на d4 — открытый центр.');
            saveStars(11, 3);
          }, 1000);
          return;
        }
      } else if (exercise === 12) {
        // EXERCISE 12: Nb1-c3 after c3 d6 d4 exd4 cxd4
        const isCorrectFirst = from === 'b1' && to === 'c3' && move.piece === 'n';

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
            g.move({ from: 'c8', to: 'g4' });
            setGame(new Chess(g.fen()));
            setIsComplete(true);
            setMessage('Отлично! Вы развели коня на c3 — классическое развитие.');
            saveStars(12, 3);
          }, 1000);
          return;
        }
      }
    } catch {
      // Invalid move
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
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      start.moved = true;
    }
    if (start.moved) {
      setDragPos({ x: e.clientX, y: e.clientY });
    }
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent, sq: string) => {
    const start = pointerStartRef.current;
    if (!start || start.pointerId !== e.pointerId) return;
    pointerStartRef.current = null;
    setDragPiece(null);

    if (!start.moved) {
      handleSquareClick(sq);
      return;
    }

    const boardEl = document.getElementById('chess-board');
    if (!boardEl) return;
    const rect = boardEl.getBoundingClientRect();
    const fileIdx = Math.floor((e.clientX - rect.left) / sqSize);
    const rankIdx = Math.floor((e.clientY - rect.top) / sqSize);
    if (fileIdx < 0 || fileIdx > 7 || rankIdx < 0 || rankIdx > 7) return;
    const targetSquare = FILES[fileIdx] + DISPLAY_RANKS[rankIdx];
    if (targetSquare !== start.square) {
      processWhiteMove(start.square, targetSquare);
    }
  }, [sqSize, processWhiteMove, handleSquareClick]);

  const isLight = (r: number, f: number) => (r + f) % 2 === 0;

  if (!game) return <div className="text-center py-8 text-gray-500">Загрузка...</div>;

  const totalScore = Object.values(exerciseStars).reduce((s, v) => s + v, 0);
  const maxScore = 12 * 3;
  const progressPct = Math.round((totalScore / maxScore) * 100);
  const hasCompletedAll = totalScore >= maxScore;

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
      {/* LEFT: Board */}
      <div className="flex-1">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold text-gray-700">
              Упражнение {exercise}/12
            </div>
            <div className="flex items-center gap-1 ml-2">
              <StarPng filled={(exerciseStars[exercise] || 0) >= 1} />
              <StarPng filled={(exerciseStars[exercise] || 0) >= 2} />
              <StarPng filled={(exerciseStars[exercise] || 0) >= 3} />
            </div>
          </div>
          <div className="text-xs text-gray-500">
            {totalScore}/{maxScore} звёзд
          </div>
        </div>

        {/* Banner / Message */}
        {message && (
          <div className={`mb-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
            isComplete
              ? 'bg-green-50 text-green-700 border border-green-200'
              : isFail
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-amber-50 text-amber-800 border border-amber-200'
          }`}>
            {message}
          </div>
        )}

        {/* Fail banner with retry */}
        {isFail && (
          <div className="mb-3">
            <button
              onClick={reset}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <RotateCcw size={16} />
              ЕЩЁ РАЗ
            </button>
          </div>
        )}

        {/* Chess board */}
        <div
          id="chess-board"
          className="relative mx-auto select-none"
          style={{ width: sqSize * 8, height: sqSize * 8, touchAction: 'none' }}
          onDragStart={(e) => e.preventDefault()}
        >
          {/* Squares */}
          {RANKS.map((rankLabel, rIdx) => (
            <div key={rankLabel} className="flex">
              {FILES.map((fileLabel, fIdx) => {
                const sq = fileLabel + DISPLAY_RANKS[rIdx];
                const piece = (() => {
                  const p = game.get(sq as any);
                  if (!p) return null;
                  return { type: p.type, color: p.color };
                })();
                const isSelected = selectedSquare === sq;
                const isLastMove = false;
                return (
                  <div
                    key={sq}
                    className={`relative flex items-center justify-center ${isLight(rIdx, fIdx) ? 'bg-[#f0d9b5]' : 'bg-[#b58863]'}`}
                    style={{ width: sqSize, height: sqSize }}
                    onPointerDown={(e) => handlePointerDown(e, sq)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={(e) => handlePointerUp(e, sq)}
                  >
                    {isSelected && (
                      <div className="absolute inset-0 bg-yellow-300/40 pointer-events-none" />
                    )}
                    {piece && (
                      <div className="w-full h-full p-[2px]">
                        <PieceImg type={piece.type} color={piece.color} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {/* Drag piece overlay */}
          {dragPiece && (
            <div
              className="pointer-events-none fixed z-50"
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

        {/* Controls */}
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={reset}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors flex items-center gap-1"
          >
            <RotateCcw size={12} />
            Сначала
          </button>

          <div className="flex gap-2">
            {exercise > 1 && (
              <button
                onClick={() => switchExercise((exercise - 1) as any)}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                ← Предыдущее
              </button>
            )}
            {exercise < 12 && (
              <button
                onClick={() => switchExercise((exercise + 1) as any)}
                className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              >
                Следующее →
              </button>
            )}
            {exercise === 12 && isComplete && (
              <button
                onClick={onComplete}
                className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors flex items-center gap-1"
              >
                <Trophy size={12} />
                Завершить
              </button>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT: Exercise selector */}
      <div className="lg:w-64 flex-shrink-0">
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Упражнения</div>
          <div className="space-y-1">
            {[1,2,3,4,5,6,7,8,9,10,11,12].map((num) => (
              <button
                key={num}
                onClick={() => switchExercise(num as any)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between transition-colors ${
                  exercise === num
                    ? 'bg-blue-50 text-blue-700 font-medium border border-blue-200'
                    : 'text-gray-700 hover:bg-gray-50 border border-transparent'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                    exercise === num ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {num}
                  </span>
                  <span className="text-xs">
                    {num === 1 ? 'Итальянская партия — e4' :
                     num === 2 ? 'Развитие коня — Nf3' :
                     num === 3 ? 'Слон на c4' :
                     num === 4 ? 'Гиуоко Пиано — c3' :
                     num === 5 ? 'Спокойная игра — d3' :
                     num === 6 ? 'Гамбит Эванса' :
                     num === 7 ? 'Защита двух коней' :
                     num === 8 ? 'Венгерская защита' :
                     num === 9 ? 'Рокировка' :
                     num === 10 ? 'Конь на c3' :
                     num === 11 ? 'Взятие на d4' :
                     'Развитие фигур'}
                  </span>
                </span>
                <div className="flex items-center gap-0.5">
                  <StarPng filled={(exerciseStars[num] || 0) >= 1} size={12} />
                  <StarPng filled={(exerciseStars[num] || 0) >= 2} size={12} />
                  <StarPng filled={(exerciseStars[num] || 0) >= 3} size={12} />
                </div>
              </button>
            ))}
          </div>

          {/* Progress */}
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-500">Прогресс</span>
              <span className="font-semibold text-gray-700">{progressPct}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {hasCompletedAll && (
              <div className="mt-2 text-xs text-green-600 font-medium text-center">
                🎉 Все упражнения пройдены!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
