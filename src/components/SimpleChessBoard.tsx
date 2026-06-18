'use client';

import { useState, useCallback } from 'react';
import { Chess } from 'chess.js';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

const PIECE_SYMBOLS: Record<string, string> = {
  'wP': '♙', 'wN': '♘', 'wB': '♗', 'wR': '♖', 'wQ': '♕', 'wK': '♔',
  'bP': '♟', 'bN': '♞', 'bB': '♝', 'bR': '♜', 'bQ': '♛', 'bK': '♚',
};

interface Props {
  fen: string;
  stars?: string[];
  onMove?: (from: string, to: string) => boolean;
  onStarCollect?: (square: string) => void;
  highlightSquares?: string[];
}

export default function SimpleChessBoard({
  fen,
  stars = [],
  onMove,
  onStarCollect,
  highlightSquares = [],
}: Props) {
  const [game] = useState(() => new Chess(fen));
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [position, setPosition] = useState(fen);
  const [collectedStars, setCollectedStars] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');

  const getPiece = (square: string): string | null => {
    const piece = game.get(square as any);
    if (!piece) return null;
    const color = piece.color === 'w' ? 'w' : 'b';
    const type = piece.type.toUpperCase();
    return PIECE_SYMBOLS[`${color}${type}`] || null;
  };

  const isLightSquare = (file: number, rank: number) => (file + rank) % 2 === 0;

  const handleSquareClick = useCallback(
    (square: string) => {
      const piece = game.get(square as any);

      if (selectedSquare) {
        // Try to move
        try {
          const move = game.move({ from: selectedSquare, to: square });
          if (move) {
            setPosition(game.fen());
            setSelectedSquare(null);
            setMessage('');

            if (stars.includes(square) && !collectedStars.has(square)) {
              setCollectedStars((prev) => {
                const next = new Set(prev);
                next.add(square);
                return next;
              });
              onStarCollect?.(square);
            }

            onMove?.(selectedSquare, square);
            return;
          }
        } catch {
          // Invalid move
        }

        // If clicked another own piece, select it
        if (piece && piece.color === game.turn()) {
          setSelectedSquare(square);
          setMessage('');
        } else {
          setSelectedSquare(null);
          setMessage('Недопустимый ход');
        }
      } else {
        if (piece && piece.color === game.turn()) {
          setSelectedSquare(square);
        }
      }
    },
    [selectedSquare, game, stars, collectedStars, onMove, onStarCollect]
  );

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="grid border-2 border-amber-800 rounded"
        style={{
          gridTemplateColumns: 'repeat(8, 48px)',
          gridTemplateRows: 'repeat(8, 48px)',
        }}
      >
        {RANKS.map((rank, rankIdx) =>
          FILES.map((file, fileIdx) => {
            const square = `${file}${rank}`;
            const piece = getPiece(square);
            const isLight = isLightSquare(fileIdx, rankIdx);
            const isSelected = selectedSquare === square;
            const isHighlighted = highlightSquares.includes(square);
            const hasStar = stars.includes(square) && !collectedStars.has(square);

            return (
              <div
                key={square}
                onClick={() => handleSquareClick(square)}
                className={`
                  flex items-center justify-center relative cursor-pointer
                  select-none text-3xl
                  ${isLight ? 'bg-amber-100' : 'bg-amber-700'}
                  ${isSelected ? 'ring-2 ring-blue-500 ring-inset' : ''}
                  ${isHighlighted ? 'ring-2 ring-green-500 ring-inset' : ''}
                  hover:opacity-90 transition
                `}
                style={{ width: 48, height: 48 }}
              >
                {/* Coordinate labels */}
                {fileIdx === 0 && (
                  <span className={`absolute top-0.5 left-1 text-[10px] font-bold ${isLight ? 'text-amber-800' : 'text-amber-100'}`}>
                    {rank}
                  </span>
                )}
                {rankIdx === 7 && (
                  <span className={`absolute bottom-0.5 right-1 text-[10px] font-bold ${isLight ? 'text-amber-800' : 'text-amber-100'}`}>
                    {file}
                  </span>
                )}

                {/* Star */}
                {hasStar && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                      <span className="text-yellow-800 text-sm font-bold">★</span>
                    </div>
                  </div>
                )}

                {/* Piece */}
                {piece && (
                  <span className={`relative z-10 ${piece === '♙' || piece === '♔' || piece === '♕' || piece === '♖' || piece === '♗' || piece === '♘' ? 'text-white drop-shadow-md' : 'text-slate-900 drop-shadow-md'}`}>
                    {piece}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {message && (
        <p className="text-red-500 text-sm">{message}</p>
      )}
    </div>
  );
}
