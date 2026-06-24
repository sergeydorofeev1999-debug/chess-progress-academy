'use client';

import { useState, useCallback, useRef } from 'react';
import { RotateCcw } from 'lucide-react';

/* ====== SVG Chess Piece ====== */
function PieceImg({ type, color }: { type: string; color: 'w' | 'b' }) {
  const pieceKey = `${color}${type.toUpperCase()}`;
  const src = `/pieces/cburnett/${pieceKey}.svg`;
  return (
    <div className="w-full h-full" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }}>
      <img src={src} alt="" className="w-full h-full" draggable={false} />
    </div>
  );
}

interface PieceData {
  id: string;
  type: string;
  label: string;
  value: number;
}

const ALL_PIECES: PieceData[] = [
  { id: 'rook', type: 'r', label: 'Ладья', value: 5 },
  { id: 'bishop', type: 'b', label: 'Слон', value: 3 },
  { id: 'knight', type: 'n', label: 'Конь', value: 3 },
  { id: 'pawn', type: 'p', label: 'Пешка', value: 1 },
];

interface Props {
  onComplete: () => void;
}

export default function PieceValueBoard({ onComplete }: Props) {
  const [leftSlots, setLeftSlots] = useState<(PieceData | null)[]>([null, null]);
  const [rightSlots, setRightSlots] = useState<(PieceData | null)[]>([null, null]);
  const [available, setAvailable] = useState<PieceData[]>([...ALL_PIECES]);
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);
  const dragRef = useRef<PieceData | null>(null);

  const handleDragStart = useCallback((piece: PieceData) => {
    dragRef.current = piece;
  }, []);

  const handleDrop = useCallback(
    (side: 'left' | 'right', index: number) => {
      const piece = dragRef.current;
      if (!piece) return;

      // Remove from wherever it currently is
      setAvailable((prev) => prev.filter((p) => p.id !== piece.id));
      setLeftSlots((prev) => prev.map((p) => (p?.id === piece.id ? null : p)));
      setRightSlots((prev) => prev.map((p) => (p?.id === piece.id ? null : p)));

      // Place in new slot
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

      dragRef.current = null;
      setError(false);
    },
    []
  );

  const handleRemoveFromSlot = useCallback((side: 'left' | 'right', index: number) => {
    let piece: PieceData | null = null;
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
    setError(false);
  }, [leftSlots, rightSlots]);

  const checkSolution = useCallback(() => {
    const leftPieces = leftSlots.filter(Boolean) as PieceData[];
    const rightPieces = rightSlots.filter(Boolean) as PieceData[];

    if (leftPieces.length !== 2 || rightPieces.length !== 2) return;

    const leftSum = leftPieces.reduce((s, p) => s + p.value, 0);
    const rightSum = rightPieces.reduce((s, p) => s + p.value, 0);

    if (leftSum === rightSum) {
      setSuccess(true);
      setTimeout(onComplete, 1500);
    } else {
      setError(true);
    }
  }, [leftSlots, rightSlots, onComplete]);

  const reset = useCallback(() => {
    setLeftSlots([null, null]);
    setRightSlots([null, null]);
    setAvailable([...ALL_PIECES]);
    setError(false);
    setSuccess(false);
  }, []);

  const slotSize = 'w-16 h-16 sm:w-20 sm:h-20';

  return (
    <div className="flex flex-col items-center gap-8 select-none">
      {/* Title */}
      <h2 className="text-xl font-bold text-slate-800">
        Расставь фигуры в уравнение
      </h2>
      <p className="text-sm text-slate-500 -mt-4">
        Перетащи фигуры так, чтобы суммы с обеих сторон были равны
      </p>

      {/* Available pieces */}
      <div className="flex flex-wrap justify-center gap-4">
        {available.map((piece) => (
          <div
            key={piece.id}
            draggable
            onDragStart={() => handleDragStart(piece)}
            className={`${slotSize} cursor-grab active:cursor-grabbing transition hover:scale-105`}
          >
            <PieceImg type={piece.type} color="w" />
          </div>
        ))}
      </div>

      {/* Equation */}
      <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-center">
        {/* Left side */}
        <div className="flex items-center gap-2">
          {[0, 1].map((i) => (
            <div
              key={`left-${i}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop('left', i)}
              onClick={() => leftSlots[i] && handleRemoveFromSlot('left', i)}
              className={`${slotSize} rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer transition
                ${leftSlots[i] ? 'border-amber-400 bg-amber-50' : 'border-slate-300 bg-slate-50'}
                ${leftSlots[i] ? '' : 'hover:border-amber-300'}
              `}
            >
              {leftSlots[i] ? (
                <div className="w-full h-full">
                  <PieceImg type={leftSlots[i]!.type} color="w" />
                </div>
              ) : (
                <span className="text-slate-300 text-2xl font-bold">?</span>
              )}
            </div>
          ))}
        </div>

        <span className="text-3xl font-bold text-slate-700">=</span>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {[0, 1].map((i) => (
            <div
              key={`right-${i}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop('right', i)}
              onClick={() => rightSlots[i] && handleRemoveFromSlot('right', i)}
              className={`${slotSize} rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer transition
                ${rightSlots[i] ? 'border-amber-400 bg-amber-50' : 'border-slate-300 bg-slate-50'}
                ${rightSlots[i] ? '' : 'hover:border-amber-300'}
              `}
            >
              {rightSlots[i] ? (
                <div className="w-full h-full">
                  <PieceImg type={rightSlots[i]!.type} color="w" />
                </div>
              ) : (
                <span className="text-slate-300 text-2xl font-bold">?</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
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

      {/* Error message */}
      {error && (
        <div className="flex flex-col items-center gap-3 animate-in fade-in">
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

      {/* Piece values hint */}
      <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs text-slate-400">
        {ALL_PIECES.map((p) => (
          <span key={p.id}>{p.label} = {p.value} {p.value === 1 ? 'пешка' : 'пешки'}</span>
        ))}
      </div>
    </div>
  );
}
