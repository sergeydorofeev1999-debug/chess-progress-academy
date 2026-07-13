'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { RotateCcw, Trophy } from 'lucide-react';

const FILES = ['a','b','c','d','e','f','g','h'];
const DISPLAY_RANKS = ['8','7','6','5','4','3','2','1'];

const START_FEN_1 = '6k1/p4pp1/R6p/P2r4/8/8/5PPP/6K1 w - - 0 1';
const START_FEN_2 = 'r2q1rk1/pp1b1pp1/3p3p/3n4/1P1pQ3/P2B1P2/2P3PP/R2N1R1K b - - 0 1';
const START_FEN_3 = '1k5r/ppp2ppp/7r/4p3/Q3P2q/2RP4/PP3PPP/5R1K w - - 2 3';
const START_FEN_4 = 'r4rk1/ppp2pp1/3b3p/3p4/3P1q2/2PQ1B2/PP3PPP/4RRK1 w - - 1 2';
const START_FEN_5 = '7R/p5p1/2k1p1p1/3p4/5P2/1Pb5/r1P3P1/2KR4 w - - 0 2';
const START_FEN_6 = '6k1/5p1p/n1q1pQpP/4P3/1p6/1B1r2P1/P4P1K/8 b - - 0 1';
const START_FEN_7 = 'r4rk1/ppp1nppp/2np4/8/3PP3/2QBBqPb/PP3P1P/RN2R1K1 w - - 0 1';
const START_FEN_8 = 'b4rk1/1q3p1p/5BpQ/8/8/6PP/5P1K/5R2 b - - 0 1';

const DEFENSE_MOVES: Record<1|2|3|4|5|6|7|8, Set<string>> = {
  1: new Set(['g1,f1', 'f2,f3', 'f2,f4', 'g2,g3', 'g2,g4', 'h2,h3', 'h2,h4']),
  2: new Set(['d5,f6']),
  3: new Set(['h2,h3']),
  4: new Set(['g2,g3']),
  5: new Set(['h8,c8', 'c8,c3']),
  6: new Set(['g8,f8']),
  7: new Set(['d3,f1']),
  8: new Set(['b7,g2']),
};

const EXERCISE_FENS: Record<1|2|3|4|5|6|7|8, string> = {
  1: START_FEN_1,
  2: START_FEN_2,
  3: START_FEN_3,
  4: START_FEN_4,
  5: START_FEN_5,
  6: START_FEN_6,
  7: START_FEN_7,
  8: START_FEN_8,
};

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

export default function DefendMateBoard({ onComplete, lessonId }: { onComplete: () => void; lessonId?: string }) {
  const [exercise, setExercise] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8>(1);
  const [game, setGame] = useState<Chess | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [isFail, setIsFail] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [sqSize, setSqSize] = useState(52);
  const [exerciseStars, setExerciseStars] = useState<Record<number, number>>({});
  const [sequenceStep, setSequenceStep] = useState(0);

  const isCompleteRef = useRef(false);
  const isFailRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);
  useEffect(() => { isCompleteRef.current = isComplete; }, [isComplete]);
  useEffect(() => { isFailRef.current = isFail; }, [isFail]);

  const [dragPiece, setDragPiece] = useState<DragState | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const pointerStartRef = useRef<PointerStart | null>(null);

  const storageKey = lessonId ? `defendmate_progress_${lessonId}` : 'defendmate_progress';

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setExerciseStars(JSON.parse(raw));
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    if (!game) setGame(new Chess(EXERCISE_FENS[exercise]));
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
    setGame(new Chess(EXERCISE_FENS[exercise]));
    setSelectedSquare(null);
    setMessage('');
    setIsFail(false);
    setIsComplete(false);
    setDragPiece(null);
    setSequenceStep(0);
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
    setGame(new Chess(EXERCISE_FENS[num]));
    setSelectedSquare(null);
    setMessage('');
    setIsFail(false);
    setIsComplete(false);
    setDragPiece(null);
    setSequenceStep(0);
  }, []);

  // ──── DEFEND MATE LOGIC ────
  const processMove = useCallback((from: string, to: string) => {
    if (!game) return;
    const g = game;
    const validMoves = DEFENSE_MOVES[exercise];

    try {
      // ── Exercise 5: multi-move sequence ──
      if (exercise === 5) {
        if (sequenceStep === 0 && from === 'h8' && to === 'c8') {
          g.move({ from, to });
          setGame(new Chess(g.fen()));
          setSelectedSquare(null);
          setSequenceStep(1);
          setMessage('Хорошо! Чёрный король отходит...');

          // Computer reply: Kc6-d7 (or Kc6-b7 if d7 illegal)
          setTimeout(() => {
            if (!mountedRef.current) return;
            try {
              const afterComp = new Chess(g.fen());
              const compMove = afterComp.move({ from: 'c6', to: 'd7' });
              if (!compMove) afterComp.move({ from: 'c6', to: 'b7' });
              setGame(new Chess(afterComp.fen()));
              setMessage('Съешьте черного слона!');
            } catch {}
          }, 1200);
          return;
        }
        if (sequenceStep === 1 && from === 'c8' && to === 'c3') {
          g.move({ from, to });
          setGame(new Chess(g.fen()));
          setSelectedSquare(null);
          setIsComplete(true);
          setMessage('Отлично! Вы защитились от мата!');
          saveStars(exercise, 3);
          return;
        }
        // Wrong move in sequence — fall through to fail logic
      }

      const move = g.move({ from, to });
      if (!move) return;

      if (validMoves.has(`${from},${to}`)) {
        setGame(new Chess(g.fen()));
        setSelectedSquare(null);
        setIsComplete(true);
        setMessage('Отлично! Вы защитились от мата!');
        saveStars(exercise, 3);
        if (exercise === 8) onComplete();
        return;
      }

      const wrongMoveFen = g.fen();
      const afterWhite = new Chess(wrongMoveFen);

      const mateMove = afterWhite.moves({ verbose: true }).find((m: any) => m.san.includes('#'));
      const captureMoves = afterWhite.moves({ verbose: true }).filter((m: any) => m.captured);

      setGame(new Chess(wrongMoveFen));
      setSelectedSquare(null);
      setIsFail(true);

      if (mateMove) {
        setMessage('Не защитились! Соперник ставит мат.');
        setTimeout(() => {
          if (!mountedRef.current) return;
          try {
            afterWhite.move(mateMove);
            setGame(new Chess(afterWhite.fen()));
          } catch {}
        }, 1000);
      } else if (captureMoves.length > 0) {
        setMessage('Вы потеряли фигуру!');
        setTimeout(() => {
          if (!mountedRef.current) return;
          try {
            afterWhite.move(captureMoves[0]);
            setGame(new Chess(afterWhite.fen()));
          } catch {}
        }, 1000);
      } else {
        setMessage('Не защитились! Соперник ставит мат.');
      }
    } catch {
      // invalid move
    }
  }, [game, exercise, saveStars, onComplete, sequenceStep]);

  const isFlipped = exercise === 2 || exercise === 6 || exercise === 8;

  // Convert visual square (what user sees on flipped board) to chess.js square
  const toChessSquare = useCallback((visualSq: string) => {
    if (!isFlipped) return visualSq;
    const file = visualSq[0];
    const rank = visualSq[1];
    const chessFile = String.fromCharCode('a'.charCodeAt(0) + ('h'.charCodeAt(0) - file.charCodeAt(0)));
    const chessRank = String.fromCharCode('1'.charCodeAt(0) + ('8'.charCodeAt(0) - rank.charCodeAt(0)));
    return `${chessFile}${chessRank}`;
  }, [isFlipped]);

  // Convert chess.js square to visual square (for valid move highlighting on flipped board)
  const toVisualSquare = useCallback((chessSq: string) => {
    if (!isFlipped) return chessSq;
    const file = chessSq[0];
    const rank = chessSq[1];
    const visualFile = String.fromCharCode('a'.charCodeAt(0) + ('h'.charCodeAt(0) - file.charCodeAt(0)));
    const visualRank = String.fromCharCode('1'.charCodeAt(0) + ('8'.charCodeAt(0) - rank.charCodeAt(0)));
    return `${visualFile}${visualRank}`;
  }, [isFlipped]);

  // ──── CLICK ────
  const handleSquareClick = useCallback((visualSq: string) => {
    if (isCompleteRef.current || isFailRef.current) return;
    if (!game) return;
    const sq = isFlipped ? toChessSquare(visualSq) : visualSq;
    const piece = game.get(sq as any);

    if (selectedSquare === sq) {
      setSelectedSquare(null);
    } else if (selectedSquare) {
      processMove(selectedSquare, sq);
      setSelectedSquare(null);
    } else {
      if (piece && piece.color === game.turn()) {
        setSelectedSquare(sq);
      }
    }
  }, [game, selectedSquare, processMove, isFlipped, toChessSquare]);

  // ──── DRAG & DROP ────
  const handlePointerDown = useCallback((e: React.PointerEvent, visualSq: string) => {
    if (isCompleteRef.current || isFailRef.current) return;
    if (!game) return;
    const sq = isFlipped ? toChessSquare(visualSq) : visualSq;
    const piece = game.get(sq as any);
    if (!piece || piece.color !== game.turn()) return;
    if (e.pointerType === 'touch' && !(e as any).isPrimary) return;

    pointerStartRef.current = { x: e.clientX, y: e.clientY, square: sq, moved: false, pointerId: e.pointerId };
  }, [game, isFlipped, toChessSquare]);

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
        const targetVisualSq = cell?.dataset.square || null;
        if (targetVisualSq) {
          const targetChessSq = isFlipped ? toChessSquare(targetVisualSq) : targetVisualSq;
          if (targetChessSq !== start.square) {
            processMove(start.square, targetChessSq);
          }
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
  }, [game, processMove, isFlipped, toChessSquare]);

  // ──── HELPERS ────
  const getPieceAt = (sq: string) => {
    if (!game) return null;
    const chessSq = isFlipped ? toChessSquare(sq) : sq;
    const p = game.get(chessSq as any);
    if (!p) return null;
    return { type: p.type.toUpperCase(), color: p.color as 'w' | 'b' };
  };

  const isLight = (f: number, r: number) => (f + r) % 2 === 0;

  const validMovesChess = selectedSquare && game
    ? (game.moves({ square: selectedSquare as any, verbose: true }).map(m => m.to) as string[])
    : dragPiece && game
      ? (game.moves({ square: dragPiece.square as any, verbose: true }).map(m => m.to) as string[])
      : [];

  const validMoves = isFlipped ? validMovesChess.map(toVisualSquare) : validMovesChess;

  const turnText = game ? (game.turn() === 'w' ? 'Ход белых' : 'Ход чёрных') : '';

  if (!game) return null;

  return (
    <div className="flex flex-col lg:flex-row gap-4 w-full min-h-[500px]">
      {/* LEFT COLUMN */}
      <div className="w-full lg:w-[300px] flex-shrink-0 space-y-2">
        <div className="hidden lg:grid gap-1 rounded p-1 border border-gray-200" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
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
                    <StarPng key={s} filled={earnedStars > 0 && s <= earnedStars} size={16} />
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
          Защититесь от угрозы мата!
        </div>

        <div className="text-center font-bold text-slate-700 text-lg">
          {turnText}
        </div>

        {/* Fail banner */}
        {isFail && (
          <div className="w-full max-w-sm">
            <div className="bg-[#c62828] rounded-lg p-4 flex flex-col items-center gap-2 shadow-lg">
              <p className="text-white font-bold text-lg">{message}</p>
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
            data-board
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
                const chessSq = isFlipped ? toChessSquare(sq) : sq;
                const sel = selectedSquare === chessSq || dragPiece?.square === chessSq;
                const isValidMove = validMoves.includes(sq);
                const isDragSource = dragPiece?.square === chessSq;

                return (
                  <div
                    key={sq}
                    data-square={sq}
                    className="flex items-center justify-center relative select-none"
                    style={{
                      width: sqSize,
                      height: sqSize,
                      cursor: pieceObj && pieceObj.color === game?.turn() && !isFail && !isComplete ? 'grab' : 'default',
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
                        {isFlipped ? DISPLAY_RANKS[7 - ri] : rank}
                      </span>
                    )}
                    {ri === 7 && (
                      <span className={`absolute bottom-0.5 right-1 text-[10px] font-bold ${light ? 'text-[#b58863]' : 'text-[#f0d9b5]'}`}>
                        {isFlipped ? FILES[7 - fi] : file}
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
                      <StarPng key={s} filled={earnedStars > 0 && s <= earnedStars} size={14} />
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
                      <StarPng key={s} filled={earnedStars > 0 && s <= earnedStars} size={14} />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
