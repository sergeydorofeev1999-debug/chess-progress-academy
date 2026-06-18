'use client';

import { useState, useCallback } from 'react';
import { Chess } from 'chess.js';
import SimpleChessBoard from './SimpleChessBoard';
import { Star, CheckCircle, RotateCcw } from 'lucide-react';

interface Props {
  fen: string;
  stars: string[];
  allowedPieces?: string[];
  onComplete?: () => void;
}

export default function StarBoard({ fen, stars, allowedPieces = [], onComplete }: Props) {
  const [game] = useState(() => new Chess(fen));
  const [position, setPosition] = useState(fen);
  const [collectedStars, setCollectedStars] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [moveCount, setMoveCount] = useState(0);

  const remainingStars = stars.filter(s => !collectedStars.has(s)).length;

  const handleMove = useCallback(
    (from: string, to: string) => {
      if (isComplete) return false;

      const piece = game.get(from as any);
      if (!piece) return false;

      // Validate allowed pieces
      if (allowedPieces.length > 0 && !allowedPieces.includes(piece.type)) {
        setMessage(`Используйте ${getPieceName(allowedPieces[0])}!`);
        return false;
      }

      try {
        const move = game.move({ from, to });
        if (move) {
          setPosition(game.fen());
          setMoveCount(c => c + 1);
          setMessage('');

          // Check star collection
          if (stars.includes(to) && !collectedStars.has(to)) {
            setCollectedStars(prev => {
              const next = new Set(prev);
              next.add(to);
              return next;
            });

            const newCollected = collectedStars.size + 1;
            const stillRemaining = stars.length - newCollected;

            if (stillRemaining === 0) {
              setIsComplete(true);
              setMessage('🎉 Отлично! Все звёзды собраны!');
              onComplete?.();
            } else {
              setMessage(`⭐ Собрано! Осталось ${stillRemaining} звёзд`);
            }
          }

          return true;
        }
      } catch {
        setMessage('Недопустимый ход');
      }
      return false;
    },
    [game, stars, collectedStars, allowedPieces, isComplete, onComplete]
  );

  const reset = () => {
    const newGame = new Chess(fen);
    game.load(fen);
    setPosition(fen);
    setCollectedStars(new Set());
    setMessage('');
    setIsComplete(false);
    setMoveCount(0);
  };

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Star size={18} fill="#fbbf24" color="#f59e0b" />
          <span className="text-sm font-medium">
            {collectedStars.size} / {stars.length} звёзд
          </span>
        </div>

        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-yellow-400 transition-all duration-300"
            style={{ width: `${(collectedStars.size / stars.length) * 100}%` }}
          />
        </div>

        {isComplete && (
          <div className="flex items-center gap-1 text-green-600">
            <CheckCircle size={18} />
            <span className="text-sm font-medium">Готово!</span>
          </div>
        )}
      </div>

      {/* Message */}
      {message && (
        <div className={`text-center py-2 px-4 rounded-lg text-sm font-medium ${
          isComplete ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
        }`}>
          {message}
        </div>
      )}

      {/* Board */}
      <SimpleChessBoard
        fen={position}
        stars={stars.filter(s => !collectedStars.has(s))}
        onMove={handleMove}
      />

      {/* Controls */}
      <div className="flex items-center justify-between">
        <button
          onClick={reset}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
        >
          <RotateCcw size={16} />
          Начать заново
        </button>

        <span className="text-sm text-gray-500">
          Ходов: {moveCount}
        </span>
      </div>
    </div>
  );
}

function getPieceName(piece: string): string {
  const names: Record<string, string> = {
    r: 'ладью',
    n: 'коня',
    b: 'слона',
    q: 'ферзя',
    k: 'короля',
    p: 'пешку',
  };
  return names[piece] || piece;
}
