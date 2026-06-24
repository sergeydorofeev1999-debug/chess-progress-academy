'use client';

import { useState, useCallback } from 'react';
import { RotateCcw } from 'lucide-react';

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

const EQ_PIECES: EquationPiece[] = [
  { id: 'rook', type: 'r', label: 'Ладья', value: 5 },
  { id: 'bishop', type: 'b', label: 'Слон', value: 3 },
  { id: 'knight', type: 'n', label: 'Конь', value: 3 },
  { id: 'pawn', type: 'p', label: 'Пешка', value: 1 },
];

interface Props {
  onComplete: () => void;
}

export default function PieceValueBoard({ onComplete }: Props) {
  const [stage, setStage] = useState<'intro' | 'equation'>('intro');

  // --- Equation state ---
  const [leftSlots, setLeftSlots] = useState<(EquationPiece | null)[]>([null, null]);
  const [rightSlots, setRightSlots] = useState<(EquationPiece | null)[]>([null, null]);
  const [available, setAvailable] = useState<EquationPiece[]>([...EQ_PIECES]);
  const [selectedPiece, setSelectedPiece] = useState<EquationPiece | null>(null);
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);

  const slotSize = 'w-20 h-20 sm:w-24 sm:h-24';

  const placePiece = useCallback(
    (side: 'left' | 'right', index: number) => {
      if (!selectedPiece) return;
      const piece = selectedPiece;

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
    setAvailable([...EQ_PIECES]);
    setSelectedPiece(null);
    setError(false);
    setSuccess(false);
  }, []);

  // ====== STAGE 1: INTRO ======
  if (stage === 'intro') {
    return (
      <div className="flex flex-col items-center gap-6 select-none max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-800">
          Фигуры с высокой подвижностью имеют более высокую ценность!
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 w-full">
          {INTRO_PIECES.map((p) => (
            <div
              key={p.type}
              className="flex flex-col items-center gap-3 p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition"
            >
              <div className="w-16 h-16">
                <PieceImg type={p.type} color="w" size="w-full h-full" />
              </div>
              <div className="text-center">
                <p className="font-bold text-slate-800">{p.label}</p>
                <p className="text-sm text-amber-600 font-semibold mt-1">
                  = {p.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-sm text-slate-500 text-center px-4">
          Король = бесценен! Если ему поставили мат, это означает, что игра проиграна.
        </p>

        <button
          onClick={() => setStage('equation')}
          className="px-10 py-3 rounded-xl font-semibold text-white bg-slate-900 hover:bg-slate-800 transition"
        >
          Продолжить →
        </button>
      </div>
    );
  }

  // ====== STAGE 2: EQUATION ======
  return (
    <div className="flex flex-col items-center gap-8 select-none max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-slate-800">Расставь фигуры в уравнение</h2>
      <p className="text-sm text-slate-500 -mt-6">
        Кликни фигуру, затем кликни слот, чтобы поставить её туда
      </p>

      {/* Available pieces */}
      <div className="flex flex-wrap justify-center gap-4">
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
      <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-center">
        {/* Left side */}
        <div className="flex items-center gap-2">
          {[0, 1].map((i) => (
            <button
              key={`left-${i}`}
              onClick={() =>
                leftSlots[i] ? removeFromSlot('left', i) : placePiece('left', i)
              }
              className={`${slotSize} rounded-xl border-2 border-dashed flex items-center justify-center transition
                ${leftSlots[i] ? 'border-amber-400 bg-amber-50' : 'border-slate-300 bg-slate-50 hover:border-amber-300'}
              `}
            >
              {leftSlots[i] ? (
                <PieceImg type={leftSlots[i]!.type} color="w" />
              ) : (
                <span className="text-slate-300 text-2xl font-bold">?</span>
              )}
            </button>
          ))}
        </div>

        <span className="text-3xl font-bold text-slate-700">=</span>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {[0, 1].map((i) => (
            <button
              key={`right-${i}`}
              onClick={() =>
                rightSlots[i] ? removeFromSlot('right', i) : placePiece('right', i)
              }
              className={`${slotSize} rounded-xl border-2 border-dashed flex items-center justify-center transition
                ${rightSlots[i] ? 'border-amber-400 bg-amber-50' : 'border-slate-300 bg-slate-50 hover:border-amber-300'}
              `}
            >
              {rightSlots[i] ? (
                <PieceImg type={rightSlots[i]!.type} color="w" />
              ) : (
                <span className="text-slate-300 text-2xl font-bold">?</span>
              )}
            </button>
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

      {/* Piece values hint */}
      <div className="mt-2 flex flex-wrap justify-center gap-4 text-xs text-slate-400">
        {EQ_PIECES.map((p) => (
          <span key={p.id}>
            {p.label} = {p.value} {p.value === 1 ? 'пешка' : 'пешки'}
          </span>
        ))}
      </div>
    </div>
  );
}
