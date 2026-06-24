'use client';

import { useState, useCallback } from 'react';
import { RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';

/* ====== SVG Chess Piece ====== */
function PieceImg({ type, color, size = 'w-16 h-16' }: { type: string; color: 'w' | 'b'; size?: string }) {
  const pieceKey = `${color}${type.toUpperCase()}`;
  const src = `/pieces/cburnett/${pieceKey}.svg`;
  return (
    <div className={`${size}`} style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }}>
      <img src={src} alt="" className="w-full h-full" draggable={false} />
    </div>
  );
}

interface PieceInfo {
  type: string;
  label: string;
  value: string;
}

const INTRO_PIECES: PieceInfo[] = [
  { type: 'q', label: 'Ферзь', value: '9 пешек' },
  { type: 'r', label: 'Ладья', value: '5 пешек' },
  { type: 'b', label: 'Слон', value: '3 пешки' },
  { type: 'n', label: 'Конь', value: '3 пешки' },
  { type: 'p', label: 'Пешка', value: '1 пешка' },
  { type: 'k', label: 'Король', value: 'Бесценен!' },
];

interface EquationPiece {
  id: string;
  type: string;
  label: string;
  value: number;
}

interface LevelConfig {
  id: number;
  title: string;
  instructions: string;
  pieces: EquationPiece[];
  leftSlots: number;
  rightSlots: number;
  leftSum: number;
  rightSum: number;
}

const LEVELS: LevelConfig[] = [
  {
    id: 0,
    title: 'Ценность фигур',
    instructions: 'Фигуры с высокой подвижностью имеют более высокую ценность!',
    pieces: [],
    leftSlots: 0,
    rightSlots: 0,
    leftSum: 0,
    rightSum: 0,
  },
  {
    id: 1,
    title: 'Уравнение 1',
    instructions: 'Расставь фигуры так, чтобы суммы с обеих сторон были равны.',
    pieces: [
      { id: 'rook', type: 'r', label: 'Ладья', value: 5 },
      { id: 'bishop', type: 'b', label: 'Слон', value: 3 },
      { id: 'knight', type: 'n', label: 'Конь', value: 3 },
      { id: 'pawn', type: 'p', label: 'Пешка', value: 1 },
    ],
    leftSlots: 2,
    rightSlots: 2,
    leftSum: 6,
    rightSum: 6,
  },
  {
    id: 2,
    title: 'Уравнение 2',
    instructions: 'Расставь фигуры так, чтобы равенство выполнялось.',
    pieces: [
      { id: 'queen', type: 'q', label: 'Ферзь', value: 9 },
      { id: 'rook', type: 'r', label: 'Ладья', value: 5 },
      { id: 'bishop', type: 'b', label: 'Слон', value: 3 },
      { id: 'pawn', type: 'p', label: 'Пешка', value: 1 },
    ],
    leftSlots: 1,
    rightSlots: 3,
    leftSum: 9,
    rightSum: 9,
  },
  {
    id: 3,
    title: 'Уравнение 3',
    instructions: 'Расставь фигуры так, чтобы равенство выполнялось.',
    pieces: [
      { id: 'queen', type: 'q', label: 'Ферзь', value: 9 },
      { id: 'rook1', type: 'r', label: 'Ладья', value: 5 },
      { id: 'rook2', type: 'r', label: 'Ладья', value: 5 },
      { id: 'pawn', type: 'p', label: 'Пешка', value: 1 },
    ],
    leftSlots: 2,
    rightSlots: 2,
    leftSum: 10,
    rightSum: 10,
  },
  {
    id: 4,
    title: 'Уравнение 4',
    instructions: 'Расставь фигуры так, чтобы равенство выполнялось.',
    pieces: [
      { id: 'queen', type: 'q', label: 'Ферзь', value: 9 },
      { id: 'rook1', type: 'r', label: 'Ладья', value: 5 },
      { id: 'rook2', type: 'r', label: 'Ладья', value: 5 },
      { id: 'knight', type: 'n', label: 'Конь', value: 3 },
      { id: 'pawn1', type: 'p', label: 'Пешка', value: 1 },
      { id: 'pawn2', type: 'p', label: 'Пешка', value: 1 },
    ],
    leftSlots: 2,
    rightSlots: 4,
    leftSum: 12,
    rightSum: 12,
  },
  {
    id: 5,
    title: 'Упражнение 6',
    instructions:
      'Ладья + Слон + Пешка = Слон + Конь + Конь. Или Ладья + Конь + Пешка = Слон + Слон + Конь. Расставь фигуры так, чтобы равенство выполнялось.',
    pieces: [
      { id: 'rook', type: 'r', label: 'Ладья', value: 5 },
      { id: 'bishop1', type: 'b', label: 'Слон', value: 3 },
      { id: 'bishop2', type: 'b', label: 'Слон', value: 3 },
      { id: 'knight1', type: 'n', label: 'Конь', value: 3 },
      { id: 'knight2', type: 'n', label: 'Конь', value: 3 },
      { id: 'pawn', type: 'p', label: 'Пешка', value: 1 },
    ],
    leftSlots: 3,
    rightSlots: 3,
    leftSum: 9,
    rightSum: 9,
  },
];

interface Props {
  onComplete: () => void;
  onLevelComplete?: (levelIndex: number, stars: number) => void;
}

export default function PieceValueBoard({ onComplete, onLevelComplete }: Props) {
  const [currentLevel, setCurrentLevel] = useState(0);
  const [levelStars, setLevelStars] = useState<Record<number, number>>({});
  const [allDone, setAllDone] = useState(false);

  // Per-level state
  const [leftSlots, setLeftSlots] = useState<(EquationPiece | null)[]>([]);
  const [rightSlots, setRightSlots] = useState<(EquationPiece | null)[]>([]);
  const [available, setAvailable] = useState<EquationPiece[]>([]);
  const [selectedPiece, setSelectedPiece] = useState<EquationPiece | null>(null);
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);

  const level = LEVELS[currentLevel];
  const totalSlots = level.leftSlots + level.rightSlots;
  const slotSize = totalSlots >= 6 ? 'w-12 h-12 sm:w-14 sm:h-14' : 'w-20 h-20 sm:w-24 sm:h-24';

  const initLevel = useCallback((levelIndex: number) => {
    const cfg = LEVELS[levelIndex];
    setLeftSlots(Array(cfg.leftSlots).fill(null));
    setRightSlots(Array(cfg.rightSlots).fill(null));
    setAvailable([...cfg.pieces]);
    setSelectedPiece(null);
    setError(false);
    setSuccess(false);
  }, []);

  const goToLevel = useCallback(
    (idx: number) => {
      if (idx >= LEVELS.length) {
        setAllDone(true);
        onComplete();
        return;
      }
      setCurrentLevel(idx);
      initLevel(idx);
    },
    [initLevel, onComplete]
  );

  const placePiece = useCallback(
    (side: 'left' | 'right', index: number) => {
      if (!selectedPiece) return;
      const piece = selectedPiece;

      setAvailable((prev) => prev.filter((p) => p.id !== piece.id));
      setLeftSlots((prev) => prev.map((p) => (p?.id === piece.id ? null : p)));
      setRightSlots((prev) => prev.map((p) => (p?.id === piece.id ? null : p)));

      if (side === 'left') {
        setLeftSlots((prev) => {
          const next = [...prev];
          next[index] = piece;
          return next;
        });
      } else {
        setRightSlots((prev) => {
          const next = [...prev];
          next[index] = piece;
          return next;
        });
      }

      setSelectedPiece(null);
      setError(false);
    },
    [selectedPiece]
  );

  const removeFromSlot = useCallback(
    (side: 'left' | 'right', index: number) => {
      let piece: EquationPiece | null = null;
      if (side === 'left') {
        piece = leftSlots[index];
        setLeftSlots((prev) => {
          const next = [...prev];
          next[index] = null;
          return next;
        });
      } else {
        piece = rightSlots[index];
        setRightSlots((prev) => {
          const next = [...prev];
          next[index] = null;
          return next;
        });
      }
      if (piece) {
        setAvailable((prev) => [...prev, piece!]);
      }
      setSelectedPiece(null);
      setError(false);
    },
    [leftSlots, rightSlots]
  );

  const selectPiece = useCallback(
    (piece: EquationPiece) => {
      if (selectedPiece?.id === piece.id) {
        setSelectedPiece(null);
      } else {
        setSelectedPiece(piece);
      }
      setError(false);
    },
    [selectedPiece]
  );

  const checkSolution = useCallback(() => {
    const leftPieces = leftSlots.filter(Boolean) as EquationPiece[];
    const rightPieces = rightSlots.filter(Boolean) as EquationPiece[];

    if (leftPieces.length !== level.leftSlots || rightPieces.length !== level.rightSlots) return;

    const leftSum = leftPieces.reduce((s, p) => s + p.value, 0);
    const rightSum = rightPieces.reduce((s, p) => s + p.value, 0);

    if (leftSum === rightSum) {
      setSuccess(true);
      const newStars = { ...levelStars, [currentLevel]: 3 };
      setLevelStars(newStars);
      if (onLevelComplete) onLevelComplete(currentLevel, 3);
      setTimeout(() => goToLevel(currentLevel + 1), 1500);
    } else {
      setError(true);
    }
  }, [leftSlots, rightSlots, level, currentLevel, levelStars, goToLevel, onLevelComplete]);

  const reset = useCallback(() => {
    initLevel(currentLevel);
  }, [initLevel, currentLevel]);

  // ====== LEVEL 0: INTRO ======
  if (currentLevel === 0) {
    return (
      <div className="flex flex-col lg:flex-row gap-4 w-full">
        {/* LEFT: Level nav */}
        <div className="w-full lg:w-[140px] flex-shrink-0 space-y-2">
          <div className="hidden sm:flex flex-col rounded overflow-hidden border border-gray-200">
            {LEVELS.slice(1).map((_, i) => {
              const idx = i + 1;
              const earned = levelStars[idx];
              const isCurrent = idx === currentLevel;
              const isDone = earned != null;
              const isFuture = !isCurrent && !isDone && idx > currentLevel;
              return (
                <button
                  key={idx}
                  onClick={() => !isFuture && goToLevel(idx)}
                  disabled={isFuture}
                  className={`flex items-center justify-center px-2 py-1.5 transition font-medium text-sm ${
                    isCurrent ? 'bg-blue-500 text-white' : isDone ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'
                  } ${isFuture ? 'cursor-not-allowed' : 'cursor-pointer hover:brightness-110'}`}
                >
                  <span className="hidden sm:inline">{idx}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* CENTER: Intro content */}
        <div className="flex-1 flex flex-col items-center gap-6">
          <h2 className="text-2xl font-bold text-slate-800 text-center">
            Фигуры с высокой подвижностью имеют более высокую ценность!
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full max-w-xl">
            {INTRO_PIECES.map((p) => (
              <div
                key={p.type}
                className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm"
              >
                <div className="w-14 h-14">
                  <PieceImg type={p.type} color="w" size="w-full h-full" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-slate-800 text-sm">{p.label}</p>
                  <p className="text-xs text-amber-600 font-semibold mt-0.5">= {p.value}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-sm text-slate-500 text-center px-4">
            Король = бесценен! Если ему поставили мат, это означает, что игра проиграна.
          </p>

          <button
            onClick={() => goToLevel(1)}
            className="px-10 py-3 rounded-xl font-semibold text-white bg-slate-900 hover:bg-slate-800 transition"
          >
            Продолжить →
          </button>
        </div>
      </div>
    );
  }

  // ====== LEVELS 1-5: EQUATIONS ======
  return (
    <div className="flex flex-col lg:flex-row gap-4 w-full">
      {/* LEFT: Level nav */}
      <div className="w-full lg:w-[140px] flex-shrink-0 space-y-2">
        <div className="hidden lg:flex flex-col rounded overflow-hidden border border-gray-200">
          {LEVELS.slice(1).map((_, i) => {
            const idx = i + 1;
            const earned = levelStars[idx];
            const isCurrent = idx === currentLevel;
            const isDone = earned != null;
            const isFuture = !isCurrent && !isDone && idx > currentLevel;
            return (
              <button
                key={idx}
                onClick={() => !isFuture && goToLevel(idx)}
                disabled={isFuture}
                className={`flex items-center justify-center px-2 py-1.5 transition font-medium text-sm ${
                  isCurrent ? 'bg-blue-500 text-white' : isDone ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'
                } ${isFuture ? 'cursor-not-allowed' : 'cursor-pointer hover:brightness-110'}`}
              >
                <span className="hidden sm:inline">{idx}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={reset}
          className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition w-full justify-center"
        >
          <RotateCcw size={14} /> Заново
        </button>
      </div>

      {/* CENTER: Equation */}
      <div className="flex-1 flex flex-col items-center gap-6">
        <div className="text-[#2b2b2b] text-[15px] font-medium text-center leading-snug">
          {level.instructions}
        </div>

        {/* Available pieces */}
        <div className="flex flex-wrap justify-center gap-3">
          {available.map((piece) => (
            <button
              key={piece.id}
              onClick={() => selectPiece(piece)}
              className={`${slotSize} rounded-xl border-2 transition hover:scale-105 flex items-center justify-center
                ${selectedPiece?.id === piece.id ? 'border-amber-500 bg-amber-100 ring-2 ring-amber-300' : 'border-slate-200 bg-white'}
              `}
            >
              <PieceImg type={piece.type} color="w" />
            </button>
          ))}
        </div>

        {/* Equation */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
          {/* Left side */}
          <div className="flex items-center gap-2">
            {leftSlots.map((slot, i) => (
              <button
                key={`left-${i}`}
                onClick={() =>
                  slot ? removeFromSlot('left', i) : placePiece('left', i)
                }
                className={`${slotSize} rounded-xl border-2 border-dashed flex items-center justify-center transition
                  ${slot ? 'border-amber-400 bg-amber-50' : 'border-slate-300 bg-slate-50 hover:border-amber-300'}
                `}
              >
                {slot ? (
                  <PieceImg type={slot.type} color="w" />
                ) : (
                  <span className="text-slate-300 text-2xl font-bold">?</span>
                )}
              </button>
            ))}
          </div>

          <span className="text-3xl font-bold text-slate-700">=</span>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {rightSlots.map((slot, i) => (
              <button
                key={`right-${i}`}
                onClick={() =>
                  slot ? removeFromSlot('right', i) : placePiece('right', i)
                }
                className={`${slotSize} rounded-xl border-2 border-dashed flex items-center justify-center transition
                  ${slot ? 'border-amber-400 bg-amber-50' : 'border-slate-300 bg-slate-50 hover:border-amber-300'}
                `}
              >
                {slot ? (
                  <PieceImg type={slot.type} color="w" />
                ) : (
                  <span className="text-slate-300 text-2xl font-bold">?</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Actions: Check + Reset (above) */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={checkSolution}
            disabled={success}
            className={`px-8 py-3 rounded-xl font-semibold text-white transition
              ${success ? 'bg-green-500 cursor-default' : 'bg-slate-900 hover:bg-slate-800'}
            `}
          >
            {success ? 'Правильно! 🎉' : 'Проверить'}
          </button>

          <button
            onClick={reset}
            className="px-4 py-3 rounded-xl font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition flex items-center gap-2"
          >
            <RotateCcw size={16} />
            Сначала
          </button>
        </div>

        {/* Navigation: Back + Forward (below) */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => goToLevel(currentLevel - 1)}
            disabled={currentLevel <= 0}
            className={`flex items-center gap-1 px-4 py-2 rounded-lg font-medium transition
              ${currentLevel <= 0 ? 'text-gray-300 bg-gray-100 cursor-not-allowed' : 'text-slate-600 bg-slate-100 hover:bg-slate-200'}
            `}
          >
            <ChevronLeft size={18} /> Назад
          </button>

          <button
            onClick={() => goToLevel(currentLevel + 1)}
            disabled={currentLevel >= LEVELS.length - 1}
            className={`flex items-center gap-1 px-4 py-2 rounded-lg font-medium transition
              ${currentLevel >= LEVELS.length - 1 ? 'text-gray-300 bg-gray-100 cursor-not-allowed' : 'text-slate-600 bg-slate-100 hover:bg-slate-200'}
            `}
          >
            Вперёд <ChevronRight size={18} />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex flex-col items-center gap-3">
            <div className="px-6 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 font-medium">
              Неверно! Суммы не равны. Попробуй ещё раз.
            </div>
            <button
              onClick={reset}
              className="px-6 py-2 rounded-lg font-medium text-white bg-red-500 hover:bg-red-600 transition"
            >
              Попробовать снова
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
