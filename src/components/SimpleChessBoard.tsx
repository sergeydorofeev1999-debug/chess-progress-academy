'use client';

import { useState, useCallback } from 'react';
import { Chess } from 'chess.js';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

// ─── SVG Chess Pieces (Lichess-style) ───────────────────────────
function PieceSvg({ type, color }: { type: string; color: 'w' | 'b' }) {
  const fill = color === 'w' ? '#fff' : '#333';
  const stroke = '#1a1a1a';
  const strokeWidth = 1.2;

  const pieceSvgs: Record<string, React.ReactNode> = {
    K: (
      <svg viewBox="0 0 45 45" className="w-full h-full">
        <g fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          <path d="M22.5 11.63V6M20 8h5" fill="none" strokeLinejoin="miter"/>
          <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill={fill}/>
          <path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-1-5.5 2.5-9 3.5C29 25.5 23 25.5 18 26c-3.5-1-5-4.5-9-3.5-3 6 6 10.5 6 10.5v7z" fill={fill}/>
          <path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-3c-5.5 3.5-15.5 3.5-21 0v3z" fill="none" strokeWidth={1}/>
          <path d="M20 15l-1.5-1.5M25 15l1.5-1.5" fill="none" strokeWidth={1.5}/>
        </g>
      </svg>
    ),
    Q: (
      <svg viewBox="0 0 45 45" className="w-full h-full">
        <g fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 12l5.5 3L12 18l-7-2zM37 12l-5.5 3L33 18l7-2zM16 8.5l6.5 2 6.5-2-3-4.5h-7z" fill={fill}/>
          <path d="M9 26c8.5-1.5 18.5-1.5 27 0l2.5-12.5L34 19l-3-3-3.5 2.7L24 14l-3.5 4.7L17 16l-3 3-4.5-5.5L6.5 13.5 9 26z" fill={fill}/>
          <path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-1-5.5 2.5-9 3.5C23 25.5 17 25.5 13 26c-3.5-1-5-4.5-9-3.5-3 6 6 10.5 6 10.5v7z" fill={fill}/>
          <path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-3c-5.5 3.5-15.5 3.5-21 0v3z" fill="none" strokeWidth={1}/>
        </g>
      </svg>
    ),
    R: (
      <svg viewBox="0 0 45 45" className="w-full h-full">
        <g fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 39h27v-3H9v3zM12.5 36v-4h20v4h-20zM11 14V9h4v2h5V9h5v2h5V9h4v5" fill={fill}/>
          <path d="M34 14l-3 3H14l-3-3" fill={fill}/>
          <path d="M31 17v12.5H14V17" fill={fill}/>
          <path d="M31 29.5l1.5 2.5h-20l1.5-2.5" fill={fill}/>
          <path d="M11 14h23" fill="none"/>
        </g>
      </svg>
    ),
    B: (
      <svg viewBox="0 0 45 45" className="w-full h-full">
        <g fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.43-13.5 2-3.39-2.43-10.11-1.03-13.5-2-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2z" fill={fill}/>
          <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z" fill={fill}/>
          <path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z" fill={fill}/>
        </g>
      </svg>
    ),
    N: (
      <svg viewBox="0 0 45 45" className="w-full h-full">
        <g fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill={fill}/>
          <path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0-5 1.99-5 1.99l3.5-7c2.91-1.96 7.56-4.47 14.5-4.95z" fill={fill}/>
          <path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0z" fill={stroke} stroke="none"/>
          <path d="M15 15.5a.5 1.5 0 1 1-1 0 .5 1.5 0 1 1 1 0z" fill={stroke} transform="matrix(.866.5-.5.866 9.693-5.173)" stroke="none"/>
        </g>
      </svg>
    ),
    P: (
      <svg viewBox="0 0 45 45" className="w-full h-full">
        <g fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          <path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill={fill}/>
        </g>
      </svg>
    ),
  };

  const svg = pieceSvgs[type.toUpperCase()];
  if (!svg) return null;
  return svg;
}

// ─── SVG Star (Lichess-style) ─────────────────────────────────
function StarSvg() {
  return (
    <svg viewBox="0 0 45 45" className="w-7 h-7 drop-shadow-lg">
      <defs>
        <linearGradient id="starGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fcd34d"/>
          <stop offset="100%" stopColor="#f59e0b"/>
        </linearGradient>
      </defs>
      <path
        d="M22.5 2l5.5 14.5L43 18l-11.5 9 4 15-13-9.5-13 9.5 4-15L2 18l15-1.5z"
        fill="url(#starGrad)"
        stroke="#b45309"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Board ──────────────────────────────────────────────────────
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

  const getPiece = (square: string): { type: string; color: 'w' | 'b' } | null => {
    const piece = game.get(square as any);
    if (!piece) return null;
    return { type: piece.type.toUpperCase(), color: piece.color as 'w' | 'b' };
  };

  const isLightSquare = (file: number, rank: number) => (file + rank) % 2 !== 0;

  const handleSquareClick = useCallback(
    (square: string) => {
      const piece = game.get(square as any);

      if (selectedSquare) {
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
        className="grid border-2 border-slate-700 rounded"
        style={{
          gridTemplateColumns: 'repeat(8, 52px)',
          gridTemplateRows: 'repeat(8, 52px)',
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
                  select-none
                  ${isLight ? 'bg-[#f0d9b5]' : 'bg-[#b58863]'}
                  ${isSelected ? 'ring-2 ring-blue-500 ring-inset' : ''}
                  ${isHighlighted ? 'ring-2 ring-green-500 ring-inset' : ''}
                  hover:opacity-90 transition
                `}
                style={{ width: 52, height: 52 }}
              >
                {/* Coordinate labels */}
                {fileIdx === 0 && (
                  <span className={`absolute top-0.5 left-1 text-[10px] font-bold ${isLight ? 'text-[#b58863]' : 'text-[#f0d9b5]'}`}>
                    {rank}
                  </span>
                )}
                {rankIdx === 7 && (
                  <span className={`absolute bottom-0.5 right-1 text-[10px] font-bold ${isLight ? 'text-[#b58863]' : 'text-[#f0d9b5]'}`}>
                    {file}
                  </span>
                )}

                {/* Star overlay */}
                {hasStar && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div className="animate-pulse">
                      <StarSvg />
                    </div>
                  </div>
                )}

                {/* Piece SVG */}
                {piece && (
                  <div className="w-[42px] h-[42px] relative z-0">
                    <PieceSvg type={piece.type} color={piece.color} />
                  </div>
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
// Thu Jun 18 14:38:02 WITA 2026
