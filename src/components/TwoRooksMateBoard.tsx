'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { RotateCcw, Eye, Trophy, ChevronRight, Star, Info } from 'lucide-react';

const FILES = ['a','b','c','d','e','f','g','h'];
const RANKS = ['8','7','6','5','4','3','2','1'];
const DISPLAY_RANKS = ['8','7','6','5','4','3','2','1'];

type ExerciseId = 1 | 2;

interface Exercise {
  id: ExerciseId;
  label: string;
  description: string;
  fen: string;
  demoMoves: { from: string; to: string; comment: string }[];
  minMoves3: number; // ходов белых для 3 звёзд
  minMoves2: number; // ходов белых для 2 звёзд
}

const EXERCISES: Exercise[] = [
  {
    id: 1,
    label: 'Упражнение 1',
    description: 'Ладьи на флангах — загоняем влево',
    fen: '8/8/8/4k3/R7/7R/8/4K3 w - - 0 1',
    demoMoves: [
      { from: 'h3', to: 'h5', comment: 'Ладья выдвигается на 5-ю горизонталь' },
      { from: 'e5', to: 'f6', comment: 'Чёрный король отступает' },
      { from: 'a4', to: 'a6', comment: 'Вторая ладья даёт шах!' },
      { from: 'f6', to: 'g7', comment: 'Король уходит на 7-ю линию' },
      { from: 'h5', to: 'b5', comment: 'Ладья отступает, готовясь к финалу' },
      { from: 'g7', to: 'f7', comment: 'Король пытается уйти' },
      { from: 'b5', to: 'b7', comment: 'Шах! Сужаем пространство' },
      { from: 'f7', to: 'g8', comment: 'Король отступает на край доски' },
      { from: 'a6', to: 'a8', comment: 'Мат!' },
    ],
    minMoves3: 5,
    minMoves2: 6,
  },
  {
    id: 2,
    label: 'Упражнение 2',
    description: 'Ладьи в центре — загоняем вправо',
    fen: '3R4/8/8/8/K3k3/8/8/3R4 w - - 0 1',
    demoMoves: [
      { from: 'd8', to: 'h8', comment: 'Ладья перекрывает правый фланг' },
      { from: 'e4', to: 'f4', comment: 'Чёрный король отступает вправо' },
      { from: 'd1', to: 'h1', comment: 'Вторая ладья выдвигается на правый фланг' },
      { from: 'f4', to: 'g4', comment: 'Король продолжает отступать' },
      { from: 'h8', to: 'h7', comment: 'Шах! Сужаем пространство сверху' },
      { from: 'g4', to: 'h4', comment: 'Король вынужден на край доски' },
      { from: 'h1', to: 'g1', comment: 'Ладья готовится к финальному шаху' },
      { from: 'h4', to: 'h3', comment: 'Король отступает вниз' },
      { from: 'h7', to: 'h3', comment: 'Шах!' },
      { from: 'h3', to: 'h2', comment: 'Король вынужден на 2-ю линию' },
      { from: 'g1', to: 'g2', comment: 'Шах!' },
      { from: 'h2', to: 'h1', comment: 'Король отступает в угол' },
      { from: 'h3', to: 'h1', comment: 'Мат!' },
    ],
    minMoves3: 5,
    minMoves2: 6,
  },
];

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
  const moves = game.moves({ verbose: true }).filter(m => m.piece === 'k');
  if (moves.length === 0) return null;

  const squares = game.board();
  const rooks: { row: number; col: number }[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = squares[r][c];
      if (p && p.type === 'r' && p.color === 'w') {
        rooks.push({ row: r, col: c });
      }
    }
  }

  const scored = moves.map(m => {
    const toRow = RANKS.indexOf(m.to[1]);
    const toCol = FILES.indexOf(m.to[0]);
    let score = 0;
    for (const r of rooks) {
      const dist = Math.abs(toRow - r.row) + Math.abs(toCol - r.col);
      score += dist * 10;
    }
    score += (3.5 - Math.abs(toCol - 3.5)) * 5;
    score += toRow * 3;
    if (toCol === 0 || toCol === 7) score -= 15;
    if (toRow === 0 || toRow === 7) score -= 15;
    return { move: m, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0] ? { from: scored[0].move.from, to: scored[0].move.to } : null;
}

function calcStars(ex: Exercise, whiteMoves: number): number {
  if (whiteMoves <= ex.minMoves3) return 3;
  if (whiteMoves <= ex.minMoves2) return 2;
  return 1;
}

export default function TwoRooksMateBoard({ onComplete, lessonId }: { onComplete: () => void; lessonId?: string }) {
  const [exercise, setExercise] = useState<ExerciseId | null>(null);
  const [game, setGame] = useState<Chess | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [demoMode, setDemoMode] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [demoComment, setDemoComment] = useState('');
  const [sqSize, setSqSize] = useState(52);
  const [isComplete, setIsComplete] = useState(false);
  const [exerciseStars, setExerciseStars] = useState<Record<number, number>>({});
  const [whiteMoves, setWhiteMoves] = useState(0);
  const [showStarHint, setShowStarHint] = useState(false);
  const mountedRef = useRef(true);

  const storageKey = lessonId ? `tworooks_progress_${lessonId}` : 'tworooks_progress';

  useEffect(() => () => { mountedRef.current = false; }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setExerciseStars(JSON.parse(raw));
    } catch {}
  }, [storageKey]);

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
    if (!exercise) return;
    const ex = EXERCISES.find(e => e.id === exercise)!;
    setGame(new Chess(ex.fen));
    setSelectedSquare(null);
    setMessage('');
    setDemoMode(false);
    setDemoStep(0);
    setDemoComment('');
    setIsComplete(false);
    setWhiteMoves(0);
  }, [exercise]);

  const startExercise = useCallback((id: ExerciseId) => {
    const ex = EXERCISES.find(e => e.id === id)!;
    setExercise(id);
    setGame(new Chess(ex.fen));
    setSelectedSquare(null);
    setMessage('');
    setDemoMode(false);
    setDemoStep(0);
    setDemoComment('');
    setIsComplete(false);
    setWhiteMoves(0);
  }, []);

  const saveStars = useCallback((id: ExerciseId, stars: number) => {
    setExerciseStars(prev => {
      const next = { ...prev, [id]: Math.max(prev[id] || 0, stars) };
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [storageKey]);

  useEffect(() => {
    if (!demoMode || !exercise) return;
    const ex = EXERCISES.find(e => e.id === exercise)!;
    if (demoStep >= ex.demoMoves.length) {
      setDemoMode(false);
      setDemoComment('Мат чёрному королю!');
      setTimeout(() => { if (mountedRef.current) setDemoComment(''); }, 3000);
      return;
    }
    const move = ex.demoMoves[demoStep];
    setDemoComment(move.comment);
    const timer = setTimeout(() => {
      if (!mountedRef.current) return;
      setGame(prev => {
        if (!prev) return null;
        const g = new Chess(prev.fen());
        g.move({ from: move.from, to: move.to });
        return g;
      });
      setDemoStep(s => s + 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [demoMode, demoStep, exercise]);

  const handleSquareClick = useCallback((square: string) => {
    if (demoMode || isComplete) return;
    if (!game) return;
    const g = game;
    if (g.turn() !== 'w') return;

    const piece = g.get(square as any);

    if (selectedSquare) {
      try {
        const move = g.move({ from: selectedSquare, to: square });
        if (move) {
          const fenAfter = g.fen();
          const nextWhiteMoves = whiteMoves + 1;
          setGame(new Chess(fenAfter));
          setSelectedSquare(null);
          setMessage('');
          setWhiteMoves(nextWhiteMoves);

          if (g.isCheckmate()) {
            const ex = EXERCISES.find(e => e.id === exercise)!;
            const earned = calcStars(ex, nextWhiteMoves);
            setMessage(`Мат чёрному королю! ${earned} ★`);
            setIsComplete(true);
            if (exercise) saveStars(exercise, earned);
            onComplete();
            return;
          }

          if (g.isStalemate() || g.isDraw()) {
            setMessage('Ничья! Начните заново.');
            return;
          }

          setTimeout(() => {
            if (!mountedRef.current) return;
            const blackMove = getBlackKingMove(g);
            if (blackMove) {
              g.move({ from: blackMove.from, to: blackMove.to });
              const fenAfterBlack = g.fen();
              setGame(new Chess(fenAfterBlack));
              if (g.isCheckmate()) {
                const ex = EXERCISES.find(e => e.id === exercise)!;
                const earned = calcStars(ex, nextWhiteMoves);
                setMessage(`Мат чёрному королю! ${earned} ★`);
                setIsComplete(true);
                if (exercise) saveStars(exercise, earned);
                onComplete();
              }
            } else {
              if (g.isCheckmate()) {
                const ex = EXERCISES.find(e => e.id === exercise)!;
                const earned = calcStars(ex, nextWhiteMoves);
                setMessage(`Мат чёрному королю! ${earned} ★`);
                setIsComplete(true);
                if (exercise) saveStars(exercise, earned);
                onComplete();
              } else {
                setMessage('Ничья! Начните заново.');
              }
            }
          }, 500);

          return;
        }
      } catch {
        // Invalid move
      }

      if (piece && piece.color === 'w') {
        setSelectedSquare(square);
        setMessage('');
      } else {
        setSelectedSquare(null);
        setMessage('Недопустимый ход');
      }
    } else {
      if (piece && piece.color === 'w') {
        setSelectedSquare(square);
      }
    }
  }, [game, selectedSquare, demoMode, isComplete, exercise, whiteMoves, saveStars, onComplete]);

  const getPieceAt = (sq: string) => {
    if (!game) return null;
    const p = game.get(sq as any);
    if (!p) return null;
    return { type: p.type.toUpperCase(), color: p.color as 'w' | 'b' };
  };

  const isLight = (f: number, r: number) => (f + r) % 2 === 0;

  const validMoves = selectedSquare && game
    ? (game.moves({ square: selectedSquare as any, verbose: true }).map(m => m.to) as string[])
    : [];

  // Exercise selector
  if (!exercise) {
    const allCompleted = EXERCISES.every(e => (exerciseStars[e.id] || 0) >= 1);
    return (
      <div className="flex flex-col items-center gap-6 w-full px-4 py-6">
        <h3 className="text-xl font-bold text-slate-800">Выберите упражнение</h3>
        <div className="flex flex-col gap-3 w-full max-w-sm">
          {EXERCISES.map(ex => {
            const stars = exerciseStars[ex.id] || 0;
            return (
              <button
                key={ex.id}
                onClick={() => startExercise(ex.id)}
                className={`flex items-center gap-4 px-5 py-4 rounded-xl border-2 transition text-left ${
                  stars >= 1
                    ? 'border-green-300 bg-green-50 hover:bg-green-100'
                    : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                  stars >= 1 ? 'bg-green-500' : 'bg-blue-500'
                }`}>
                  {stars >= 1 ? <Trophy size={20} /> : ex.id}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-slate-800">{ex.label}</div>
                  <div className="text-sm text-slate-500">{ex.description}</div>
                  {stars > 0 && (
                    <div className="flex gap-0.5 mt-1">
                      {[1,2,3].map(s => (
                        <Star key={s} size={14} fill={s <= stars ? '#fbbf24' : 'none'} color={s <= stars ? '#fbbf24' : '#cbd5e1'} />
                      ))}
                    </div>
                  )}
                </div>
                <ChevronRight size={20} className="text-slate-400" />
              </button>
            );
          })}
        </div>
        {allCompleted && (
          <div className="mt-4 px-6 py-3 bg-green-100 border border-green-300 rounded-xl text-green-800 font-bold flex items-center gap-2">
            <Trophy size={20} /> Все упражнения пройдены!
          </div>
        )}
      </div>
    );
  }

  const currentEx = EXERCISES.find(e => e.id === exercise)!;
  const earned = exerciseStars[exercise] || 0;
  const turnText = game ? (game.turn() === 'w' ? 'Ваш ход (белые)' : 'Ход чёрных...') : '';

  return (
    <div className="flex flex-col items-center gap-4 w-full select-none" style={{ touchAction: 'none' }}>
      <div className="flex items-center gap-2">
        <span className="px-3 py-1 rounded-full bg-blue-500 text-white text-sm font-bold">
          {currentEx.label}
        </span>
        {earned > 0 && (
          <span className="flex items-center gap-1 text-green-600 text-sm font-bold">
            <Star size={14} fill="currentColor" /> {earned}/3
          </span>
        )}
      </div>

      <h3 className="text-lg font-bold text-slate-800">Мат двумя ладьями</h3>

      {/* Demo button only for Exercise 1 */}
      {exercise === 1 && !demoMode && !isComplete && (
        <button
          onClick={() => { reset(); setDemoMode(true); setDemoStep(0); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Eye className="w-4 h-4" />
          Посмотреть как ставить мат
        </button>
      )}

      {demoComment && (
        <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 text-center max-w-sm">
          {demoComment}
        </div>
      )}

      <div className={`text-sm font-bold ${game && game.turn() === 'w' ? 'text-blue-600' : 'text-slate-400'}`}>
        {demoMode ? 'Демонстрация...' : turnText}
      </div>

      {message && (
        <div className={`px-6 py-3 rounded-xl text-center font-bold text-white ${
          message.includes('Мат') ? 'bg-green-500' : 'bg-yellow-500'
        }`}>
          {message.includes('Мат') && <Trophy className="w-5 h-5 inline-block mr-2" />}
          {message}
        </div>
      )}

      <div className="flex justify-center w-full">
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

              return (
                <div
                  key={sq}
                  data-square={sq}
                  className="flex items-center justify-center relative select-none"
                  style={{
                    width: sqSize,
                    height: sqSize,
                    cursor: pieceObj && pieceObj.color === 'w' && !demoMode && !isComplete ? 'grab' : 'default',
                    touchAction: 'none',
                    backgroundColor: light ? '#f0d9b5' : '#b58863',
                  }}
                  onClick={() => handleSquareClick(sq)}
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
                  {pieceObj && (
                    <div className="relative pointer-events-none" style={{ width: Math.round(sqSize * 0.85), height: Math.round(sqSize * 0.85) }}>
                      <PieceImg type={pieceObj.type} color={pieceObj.color} />
                    </div>
                  )}
                </div>
              );
            })
          ))}
        </div>
      </div>

      {/* Star rating row */}
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-2">
          {[1,2,3].map(s => (
            <button
              key={s}
              onClick={() => setShowStarHint(v => !v)}
              className="transition-transform active:scale-90"
              title={`Кликните для подсказки`}
            >
              <Star
                size={28}
                fill={isComplete && s <= earned ? '#fbbf24' : '#e2e8f0'}
                color={isComplete && s <= earned ? '#fbbf24' : '#cbd5e1'}
              />
            </button>
          ))}
        </div>
        {showStarHint && (
          <div className="flex items-center gap-1 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <Info size={12} />
            3★ — мат за {currentEx.minMoves3} ходов белых · 2★ — за {currentEx.minMoves2} · 1★ — за {currentEx.minMoves2 + 1}+
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={reset}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Начать заново
        </button>
        <button
          onClick={() => setExercise(null)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          К упражнениям
        </button>
      </div>

      <div className="text-center text-sm text-slate-600 max-w-sm px-4">
        <p className="font-medium mb-1">Цель:</p>
        <p>Поставьте мат чёрному королю двумя ладьями. Используйте одну ладью для ограничения пространства, вторую — для шаха и мата.</p>
      </div>
    </div>
  );
}
