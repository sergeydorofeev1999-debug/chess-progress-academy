'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { RotateCcw, Eye, Trophy } from 'lucide-react';

const FILES = ['a','b','c','d','e','f','g','h'];
const RANKS = ['8','7','6','5','4','3','2','1'];
const DISPLAY_RANKS = ['8','7','6','5','4','3','2','1'];

const START_FEN = '8/8/8/4k3/R7/7R/8/4K3 w - - 0 1';

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
   DEMO MOVES (pre-recorded)
   ═════════════════════════════════════════════════════════════════ */
const DEMO_MOVES = [
  { from: 'h3', to: 'h5', comment: 'Ладья выдвигается на 5-ю горизонталь' },
  { from: 'e5', to: 'f6', comment: 'Чёрный король отступает' },
  { from: 'a4', to: 'a6', comment: 'Вторая ладья даёт шах!' },
  { from: 'f6', to: 'g7', comment: 'Король уходит на 7-ю линию' },
  { from: 'h5', to: 'b5', comment: 'Ладья отступает, готовясь к финалу' },
  { from: 'g7', to: 'f7', comment: 'Король пытается уйти' },
  { from: 'b5', to: 'b7', comment: 'Шах! Сужаем пространство' },
  { from: 'f7', to: 'g8', comment: 'Король отступает на край доски' },
  { from: 'a6', to: 'a8', comment: 'Мат!' },
];

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
  const [game, setGame] = useState(() => new Chess(START_FEN));
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [demoMode, setDemoMode] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [demoComment, setDemoComment] = useState('');
  const [sqSize, setSqSize] = useState(52);
  const [isComplete, setIsComplete] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

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
    const g = new Chess(START_FEN);
    setGame(g);
    setSelectedSquare(null);
    setMessage('');
    setDemoMode(false);
    setDemoStep(0);
    setDemoComment('');
    setIsComplete(false);
  }, []);

  // Demo auto-play
  useEffect(() => {
    if (!demoMode) return;
    if (demoStep >= DEMO_MOVES.length) {
      setDemoMode(false);
      setDemoComment('Мат чёрному королю!');
      setTimeout(() => {
        if (!mountedRef.current) return;
        setDemoComment('');
      }, 3000);
      return;
    }

    const move = DEMO_MOVES[demoStep];
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
  }, [demoMode, demoStep]);

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
                onComplete();
              }
            } else {
              // No moves for black = stalemate or checkmate
              if (game.isCheckmate()) {
                setMessage('Мат чёрному королю!');
                setIsComplete(true);
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
  }, [game, selectedSquare, demoMode, isComplete, onComplete]);

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

  return (
    <div className="flex flex-col items-center gap-4 w-full select-none" style={{ touchAction: 'none' }}>
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
      </div>

      {/* Info */}
      <div className="text-center text-sm text-slate-600 max-w-sm px-4">
        <p className="font-medium mb-1">Цель:</p>
        <p>Поставьте мат чёрному королю двумя ладьями. Используйте одну ладью для ограничения пространства, вторую — для шаха и мата.</p>
      </div>
    </div>
  );
}
