'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { RotateCcw, Eye, Trophy, ChevronRight, Star } from 'lucide-react';

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
  },
  {
    id: 2,
    label: 'Упражнение 2',
    description: 'Ладьи в центре — загоняем вправо',
    fen: '8/3R4/8/8/4k3/K7/8/3R4 w - - 0 1',
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
  },
];

/* ═════════════════════════════════════════════════════════════════
   PIECE IMAGE (cburnett SVG)
   ═════════════════════════════════════════════════════════════════ */
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

/* ═════════════════════════════════════════════════════════════════
   BLACK KING AI — run away from rooks, avoid check
   ═════════════════════════════════════════════════════════════════ */
function getBlackKingMove(game: Chess): { from: string; to: string } | null {
  const moves = game.moves({ verbose: true }).filter(m => m.piece === 'k');
  if (moves.length === 0) return null;

  // Find white rooks
  const squares = game.board();
  let rooks: { row: number; col: number }[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = squares[r][c];
      if (p && p.type === 'r' && p.color === 'w') {
        rooks.push({ row: r, col: c });
      }
    }
  }

  // Score each move: prefer distance from rooks, staying near center, not on edge
  const scored = moves.map(m => {
    const toRow = RANKS.indexOf(m.to[1]);
    const toCol = FILES.indexOf(m.to[0]);
    let score = 0;

    // Distance from rooks (Manhattan)
    for (const r of rooks) {
      const dist = Math.abs(toRow - r.row) + Math.abs(toCol - r.col);
      score += dist * 10;
    }

    // Prefer center files
    score += (3.5 - Math.abs(toCol - 3.5)) * 5;

    // Prefer higher ranks (away from white's promotion)
    score += toRow * 3;

    // Penalty for edge squares
    if (toCol === 0 || toCol === 7) score -= 15;
    if (toRow === 0 || toRow === 7) score -= 15;

    return { move: m, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  return best ? { from: best.move.from, to: best.move.to } : null;
}

/* ═════════════════════════════════════════════════════════════════
   COMPONENT
   ═════════════════════════════════════════════════════════════════ */
export default function TwoRooksMateBoard({ onComplete, lessonId }: { onComplete: () => void; lessonId?: string }) {
  const [exercise, setExercise] = useState<ExerciseId | null>(null);
  const [game, setGame] = useState<Chess>(() => new Chess(EXERCISES[0].fen));
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [demoMode, setDemoMode] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [demoComment, setDemoComment] = useState('');
  const [sqSize, setSqSize] = useState(52);
  const [isComplete, setIsComplete] = useState(false);
  const [completedExercises, setCompletedExercises] = useState<Record<number, boolean>>({});
  const mountedRef = useRef(true);

  const storageKey = lessonId ? `tworooks_progress_${lessonId}` : 'tworooks_progress';

  useEffect(() => () => { mountedRef.current = false; }, []);

  // Load progress from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        setCompletedExercises(parsed);
      }
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
    const g = new Chess(ex.fen);
    setGame(g);
    setSelectedSquare(null);
    setMessage('');
    setDemoMode(false);
    setDemoStep(0);
    setDemoComment('');
    setIsComplete(false);
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
  }, []);

  const saveProgress = useCallback((id: ExerciseId) => {
    setCompletedExercises(prev => {
      const next = { ...prev, [id]: true };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [storageKey]);

  // Demo auto-play
  useEffect(() => {
    if (!demoMode || !exercise) return;
    const ex = EXERCISES.find(e => e.id === exercise)!;
    if (demoStep >= ex.demoMoves.length) {
      setDemoMode(false);
      setDemoComment('Мат чёрному королю!');
      setTimeout(() => {
        if (!mountedRef.current) return;
        setDemoComment('');
      }, 3000);
      return;
    }

    const move = ex.demoMoves[demoStep];
    setDemoComment(move.comment);

    const timer = setTimeout(() => {
      if (!mountedRef.current) return;
      setGame(prev => {
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
    if (game.turn() !== 'w') return;

    const piece = game.get(square as any);

    if (selectedSquare) {
      try {
        const move = game.move({ from: selectedSquare, to: square });
        if (move) {
          setGame(new Chess(game.fen()));
          setSelectedSquare(null);
          setMessage('');

          // Check for mate
          if (game.isCheckmate()) {
            setMessage('Мат чёрному королю!');
            setIsComplete(true);
            if (exercise) saveProgress(exercise);
            onComplete();
            return;
          }

          // Check for stalemate or draw
          if (game.isStalemate() || game.isDraw()) {
            setMessage('Ничья! Начните заново.');
            return;
          }

          // Black's turn — AI move
          setTimeout(() => {
            if (!mountedRef.current) return;
            const blackMove = getBlackKingMove(game);
            if (blackMove) {
              game.move({ from: blackMove.from, to: blackMove.to });
              setGame(new Chess(game.fen()));

              if (game.isCheckmate()) {
                setMessage('Мат чёрному королю!');
                setIsComplete(true);
                if (exercise) saveProgress(exercise);
                onComplete();
              }
            } else {
              if (game.isCheckmate()) {
                setMessage('Мат чёрному королю!');
                setIsComplete(true);
                if (exercise) saveProgress(exercise);
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
  }, [game, selectedSquare, demoMode, isComplete, exercise, saveProgress, onComplete]);

  const getPieceAt = (sq: string) => {
    const p = game.get(sq as any);
    if (!p) return null;
    return { type: p.type.toUpperCase(), color: p.color as 'w' | 'b' };
  };

  const isLight = (f: number, r: number) => (f + r) % 2 === 0;

  // Valid moves for selected piece
  const validMoves = selectedSquare
    ? (game.moves({ square: selectedSquare as any, verbose: true }).map(m => m.to) as string[])
    : [];

  // ═══════════════════════════════════════════════════════════════
  // EXERCISE SELECTOR
  // ═══════════════════════════════════════════════════════════════
  if (!exercise) {
    const allCompleted = EXERCISES.every(e => completedExercises[e.id]);
    return (
      <div className="flex flex-col items-center gap-6 w-full px-4 py-6">
        <h3 className="text-xl font-bold text-slate-800">Выберите упражнение</h3>
        <div className="flex flex-col gap-3 w-full max-w-sm">
          {EXERCISES.map(ex => {
            const isCompleted = completedExercises[ex.id];
            return (
              <button
                key={ex.id}
                onClick={() => startExercise(ex.id)}
                className={`flex items-center gap-4 px-5 py-4 rounded-xl border-2 transition text-left ${
                  isCompleted
                    ? 'border-green-300 bg-green-50 hover:bg-green-100'
                    : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                  isCompleted ? 'bg-green-500' : 'bg-blue-500'
                }`}>
                  {isCompleted ? <Trophy size={20} /> : ex.id}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-slate-800">{ex.label}</div>
                  <div className="text-sm text-slate-500">{ex.description}</div>
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

  return (
    <div className="flex flex-col items-center gap-4 w-full select-none" style={{ touchAction: 'none' }}>
      {/* Exercise badge */}
      <div className="flex items-center gap-2">
        <span className="px-3 py-1 rounded-full bg-blue-500 text-white text-sm font-bold">
          {currentEx.label}
        </span>
        {completedExercises[exercise] && (
          <span className="flex items-center gap-1 text-green-600 text-sm font-bold">
            <Star size={14} fill="currentColor" /> Пройдено
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-lg font-bold text-slate-800">Мат двумя ладьями</h3>

      {/* Demo button */}
      {!demoMode && !isComplete && (
        <button
          onClick={() => { reset(); setDemoMode(true); setDemoStep(0); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Eye className="w-4 h-4" />
          Посмотреть как ставить мат
        </button>
      )}

      {/* Demo comment */}
      {demoComment && (
        <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 text-center max-w-sm">
          {demoComment}
        </div>
      )}

      {/* Turn indicator */}
      <div className={`text-sm font-bold ${game.turn() === 'w' ? 'text-blue-600' : 'text-slate-400'}`}>
        {demoMode ? 'Демонстрация...' : game.turn() === 'w' ? 'Ваш ход (белые)' : 'Ход чёрных...'}
      </div>

      {/* Message */}
      {message && (
        <div className={`px-6 py-3 rounded-xl text-center font-bold text-white ${
          message.includes('Мат') ? 'bg-green-500' : 'bg-yellow-500'
        }`}>
          {message.includes('Мат') && <Trophy className="w-5 h-5 inline-block mr-2" />}
          {message}
        </div>
      )}

      {/* Board */}
      <div className="flex justify-center w-full">
        <div
          className="grid border-[3px] border-[#2b2b2b] rounded-sm relative select-none"
          style={{
            gridTemplateColumns: `repeat(8, ${sqSize}px)`,
            gridTemplateRows: `repeat(8, ${sqSize}px)`,
            touchAction: 'none',
          }}
        >
          {DISPLAY_RANKS.map((rank, ri) =>
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
          )}
        </div>
      </div>

      {/* Controls */}
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

      {/* Info */}
      <div className="text-center text-sm text-slate-600 max-w-sm px-4">
        <p className="font-medium mb-1">Цель:</p>
        <p>Поставьте мат чёрному королю двумя ладьями. Используйте одну ладью для ограничения пространства, вторую — для шаха и мата.</p>
      </div>
    </div>
  );
}
