'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { RotateCcw, Eye, Trophy } from 'lucide-react';

const FILES = ['a','b','c','d','e','f','g','h'];
const RANKS = ['8','7','6','5','4','3','2','1'];
const DISPLAY_RANKS = ['8','7','6','5','4','3','2','1'];

const START_FEN = '8/8/8/8/P3k3/8/8/7K w - - 0 1';

const SQUARE_FILL = 'rgba(255,255,255,0.22)';

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

/** Only the BORDER cells of the square (perimeter) */
function getSquareBorder(pawnSq: string): string[] {
  const pf = FILES.indexOf(pawnSq[0]);
  const pr = parseInt(pawnSq[1]);
  const side = 8 - pr + 1; // moves remaining to promotion
  const maxFile = pf + side - 1;
  if (maxFile >= 8) return [];

  const cells: string[] = [];
  // bottom edge
  for (let c = pf; c <= maxFile; c++) cells.push(`${FILES[c]}${pr}`);
  // top edge
  for (let c = pf; c <= maxFile; c++) cells.push(`${FILES[c]}8`);
  // left edge
  for (let r = pr; r <= 8; r++) cells.push(`${FILES[pf]}${r}`);
  // right edge
  for (let r = pr; r <= 8; r++) cells.push(`${FILES[maxFile]}${r}`);

  // dedupe
  return [...new Set(cells)];
}

function getPawnSquare(game: Chess): string | null {
  const sqs = game.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = sqs[r][c];
      if (p && p.type === 'p' && p.color === 'w') return `${FILES[c]}${RANKS[r]}`;
    }
  }
  return null;
}

function getBlackKingSquare(game: Chess): string | null {
  const sqs = game.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = sqs[r][c];
      if (p && p.type === 'k' && p.color === 'b') return `${FILES[c]}${RANKS[r]}`;
    }
  }
  return null;
}

function getBlackKingMoveTowards(game: Chess, targetSq: string): { from: string; to: string } | null {
  const moves = game.moves({ verbose: true }).filter(m => m.piece === 'k' && m.color === 'b');
  if (moves.length === 0) return null;

  const tFile = FILES.indexOf(targetSq[0]);
  const tRank = parseInt(targetSq[1]);

  const scored = moves.map(m => {
    const mf = FILES.indexOf(m.to[0]);
    const mr = parseInt(m.to[1]);
    const dist = Math.max(Math.abs(mf - tFile), Math.abs(mr - tRank));
    return { move: m, score: -dist };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0] ? { from: scored[0].move.from, to: scored[0].move.to } : null;
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

export default function SquareRuleBoard({ onComplete, lessonId }: { onComplete: () => void; lessonId?: string }) {
  const [game, setGame] = useState<Chess>(() => new Chess(START_FEN));
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [demoMode, setDemoMode] = useState(false);
  const [demoPhase, setDemoPhase] = useState<number>(0);
  const [sqSize, setSqSize] = useState(52);
  const [showSquare, setShowSquare] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isFail, setIsFail] = useState(false);
  const [whiteMoves, setWhiteMoves] = useState(0);

  const [dragPiece, setDragPiece] = useState<DragState | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const pointerStartRef = useRef<PointerStart | null>(null);
  const mountedRef = useRef(true);
  const isCompleteRef = useRef(false);
  const demoModeRef = useRef(false);
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => () => { mountedRef.current = false; }, []);
  useEffect(() => { isCompleteRef.current = isComplete; }, [isComplete]);
  useEffect(() => { demoModeRef.current = demoMode; }, [demoMode]);

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

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(t => clearTimeout(t));
    timersRef.current = [];
  }, []);

  const reset = useCallback(() => {
    clearTimers();
    setGame(new Chess(START_FEN));
    setSelectedSquare(null);
    setMessage('');
    setDemoMode(false);
    setDemoPhase(0);
    setShowSquare(false);
    setIsComplete(false);
    setIsFail(false);
    setWhiteMoves(0);
  }, [clearTimers]);

  const pawnSq = getPawnSquare(game);
  const squareCells = pawnSq ? getSquareBorder(pawnSq) : [];

  // ═══════════════════════════════════════════════════════════════
  // DEMO: step-by-step with pauses
  // ═══════════════════════════════════════════════════════════════
  const schedule = useCallback((fn: () => void, delay: number) => {
    const t = setTimeout(() => { if (mountedRef.current) fn(); }, delay);
    timersRef.current.push(t);
  }, []);

  const runDemoSequence = useCallback(() => {
    // Phase 0: initial position with square shown
    setShowSquare(true);
    setDemoPhase(0);
    setMessage('Квадрат от пешки a4. Король на e4 — на границе.');

    const g1 = new Chess(START_FEN);

    // Step 1: white a4→a5
    schedule(() => {
      setMessage('');
      setShowSquare(false);
      g1.move({ from: 'a4', to: 'a5' });
      setGame(new Chess(g1.fen()));
      setDemoPhase(1);

      // pause 1s, then black moves
      schedule(() => {
        const bk = getBlackKingMoveTowards(g1, 'a5');
        if (bk) g1.move({ from: bk.from, to: bk.to });
        setGame(new Chess(g1.fen()));
        setDemoPhase(2);

        // show new square
        schedule(() => {
          setShowSquare(true);
          setMessage('Квадрат сузился. Король внутри, но пешка убегает…');
        }, 500);

        // pause then white a6
        schedule(() => {
          setMessage('');
          setShowSquare(false);
          g1.move({ from: 'a5', to: 'a6' });
          setGame(new Chess(g1.fen()));
          setDemoPhase(3);

          // pause 1s, black moves
          schedule(() => {
            const bk2 = getBlackKingMoveTowards(g1, 'a6');
            if (bk2) g1.move({ from: bk2.from, to: bk2.to });
            setGame(new Chess(g1.fen()));
            setDemoPhase(4);

            schedule(() => {
              setShowSquare(true);
              setMessage('Король на c6. Пешка всё ближе к ферзю…');
            }, 500);

            schedule(() => {
              setMessage('');
              setShowSquare(false);
              g1.move({ from: 'a6', to: 'a7' });
              setGame(new Chess(g1.fen()));
              setDemoPhase(5);

              schedule(() => {
                const bk3 = getBlackKingMoveTowards(g1, 'a7');
                if (bk3) g1.move({ from: bk3.from, to: bk3.to });
                setGame(new Chess(g1.fen()));
                setDemoPhase(6);

                schedule(() => {
                  setShowSquare(true);
                  setMessage('Король на b7. Пешка на a7 — один шаг до ферзя!');
                }, 500);

                schedule(() => {
                  setMessage('');
                  setShowSquare(false);
                  g1.move({ from: 'a7', to: 'a8', promotion: 'q' });
                  setGame(new Chess(g1.fen()));
                  setDemoPhase(7);

                  // pause 1s, then black king captures the queen
                  schedule(() => {
                    const bk4 = getBlackKingMoveTowards(g1, 'a8');
                    if (bk4) g1.move({ from: bk4.from, to: bk4.to });
                    setGame(new Chess(g1.fen()));
                    setDemoPhase(8);
                    setIsFail(true);
                    setMessage('Король съел ферзя на a8! Правило квадрата: король внутри квадрата — догнал.');
                  }, 1000);
                }, 1500);
              }, 1000);
            }, 1500);
          }, 1000);
        }, 1500);
      }, 1000);
    }, 1500);
  }, [schedule, onComplete]);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  const handleShowSquare = useCallback(() => {
    setShowSquare(prev => !prev);
    setMessage(showSquare ? '' : 'Квадрат от пешки до последней горизонтали. Король внутри — догонит, снаружи — пешка проходит.');
  }, [showSquare]);

  const startDemo = useCallback(() => {
    reset();
    setDemoMode(true);
    runDemoSequence();
  }, [reset, runDemoSequence]);

  // Manual play: white move then black AI
  const processWhiteMove = useCallback((from: string, to: string) => {
    if (isCompleteRef.current || demoModeRef.current) return;
    if (game.turn() !== 'w') return;

    try {
      const move = game.move({ from, to });
      if (!move) return;

      const nextWhiteMoves = whiteMoves + 1;
      const fenAfter = game.fen();
      setGame(new Chess(fenAfter));
      setSelectedSquare(null);
      setWhiteMoves(nextWhiteMoves);
      setMessage('');

      const toRank = parseInt(to[1]);
      if (toRank === 8) {
        setIsComplete(true);
        setMessage('Пешка прошла! Правило квадрата сработало.');
        onComplete();
        return;
      }

      setTimeout(() => {
        if (!mountedRef.current) return;
        const g2 = new Chess(fenAfter);
        const ps = getPawnSquare(g2);
        if (ps) {
          const bk = getBlackKingMoveTowards(g2, ps);
          if (bk) {
            g2.move({ from: bk.from, to: bk.to });
            setGame(new Chess(g2.fen()));

            const sqsAfter = g2.board();
            let pawnExists = false;
            for (let r = 0; r < 8; r++) {
              for (let c = 0; c < 8; c++) {
                const p = sqsAfter[r][c];
                if (p && p.type === 'p' && p.color === 'w') pawnExists = true;
              }
            }
            if (!pawnExists) {
              setIsFail(true);
              setMessage('Провалено. Король съел пешку.');
            }
          }
        }
      }, 500);
    } catch {
      // invalid move
    }
  }, [game, whiteMoves, onComplete]);

  const handleSquareClick = useCallback((square: string) => {
    if (demoModeRef.current || isCompleteRef.current || isFail) return;
    if (game.turn() !== 'w') return;

    const piece = game.get(square as any);
    if (selectedSquare) {
      if (selectedSquare === square) {
        setSelectedSquare(null);
        return;
      }
      processWhiteMove(selectedSquare, square);
      if (piece && piece.color === 'w') setSelectedSquare(square);
    } else {
      if (piece && piece.color === 'w') setSelectedSquare(square);
    }
  }, [game, selectedSquare, processWhiteMove, isFail]);

  const handlePointerDown = useCallback((e: React.PointerEvent, square: string) => {
    if (isCompleteRef.current || demoModeRef.current || isFail) return;
    if (game.turn() !== 'w') return;
    const piece = game.get(square as any);
    if (!piece || piece.color !== 'w') return;
    if (e.pointerType === 'touch' && !(e as any).isPrimary) return;
    pointerStartRef.current = { x: e.clientX, y: e.clientY, square, moved: false, pointerId: e.pointerId };
  }, [game, isFail]);

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
      if (start.moved) setDragPos({ x: e.clientX, y: e.clientY });
    };

    const handleGlobalUp = (e: PointerEvent) => {
      const start = pointerStartRef.current;
      if (!start) return;
      if (e.pointerId !== start.pointerId) return;
      if (start.moved) {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const cell = el?.closest('[data-square]') as HTMLElement | null;
        const targetSquare = cell?.dataset.square || null;
        if (targetSquare && targetSquare !== start.square) {
          processWhiteMove(start.square, targetSquare);
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
  }, [game, processWhiteMove]);

  const getPieceAt = (sq: string) => {
    const p = game.get(sq as any);
    if (!p) return null;
    return { type: p.type.toUpperCase(), color: p.color as 'w' | 'b' };
  };

  const isLight = (f: number, r: number) => (f + r) % 2 === 0;

  const validMoves = selectedSquare
    ? (game.moves({ square: selectedSquare as any, verbose: true }).map(m => m.to) as string[])
    : dragPiece
      ? (game.moves({ square: dragPiece.square as any, verbose: true }).map(m => m.to) as string[])
      : [];

  const turnText = game.turn() === 'w' ? 'Ваш ход (белые)' : 'Ход чёрных...';

  return (
    <div className="flex flex-col lg:flex-row gap-4 w-full min-h-[500px]">
      {/* LEFT: exercise pill */}
      <div className="w-full lg:w-[140px] flex-shrink-0 space-y-2">
        <div className="hidden lg:flex flex-col rounded overflow-hidden border border-[#c5b5d8]">
          <button className="flex items-center justify-center px-2 py-1.5 bg-blue-500 text-white cursor-pointer">
            <span className="text-xs font-medium">Упражнение 1</span>
          </button>
        </div>
        <button
          onClick={reset}
          className="hidden lg:flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition w-full justify-center"
        >
          <RotateCcw size={14} /> Заново
        </button>
      </div>

      {/* CENTER: board + controls */}
      <div className="flex-1 flex flex-col items-center gap-3">
        <div className="text-[#2b2b2b] text-[15px] font-medium mb-2 text-center leading-snug w-full">
          Правило квадрата — успеет ли король догнать пешку?
        </div>

        {!demoMode && !isComplete && !isFail && (
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={handleShowSquare}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showSquare ? 'bg-slate-600 hover:bg-slate-700 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white'}`}
            >
              <Eye className="w-4 h-4" />
              {showSquare ? 'Скрыть квадрат' : 'Показать квадрат'}
            </button>
            <button
              onClick={startDemo}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Eye className="w-4 h-4" />
              Сыграть a5
            </button>
          </div>
        )}

        <div className="text-center font-bold text-slate-700 text-lg">
          {demoMode ? 'Демонстрация…' : turnText}
        </div>

        {message && (
          <div className={`px-4 py-2 rounded-lg text-sm text-center max-w-sm ${isComplete ? 'bg-green-50 border border-green-200 text-green-800' : isFail ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-blue-50 border border-blue-200 text-blue-800'}`}>
            {message}
          </div>
        )}

        {isComplete && (
          <div className="px-6 py-3 rounded-xl text-center font-bold text-white bg-green-500">
            <Trophy className="w-5 h-5 inline-block mr-2" />
            Правило квадрата сработало!
          </div>
        )}

        {/* Fail banner */}
        {isFail && (
          <div className="w-full max-w-sm">
            <div className="bg-[#c62828] rounded-lg p-4 flex flex-col items-center gap-2 shadow-lg">
              <p className="text-white font-bold text-lg">{message || 'Провалено'}</p>
              <button
                onClick={reset}
                className="bg-white text-[#c62828] font-bold text-base px-6 py-2 rounded shadow hover:bg-gray-100 transition"
              >
                ЕЩЁ РАЗ
              </button>
            </div>
          </div>
        )}

        {/* Board */}
        <div className="flex justify-center w-full relative">
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
                const isDragSource = dragPiece?.square === sq;
                const isSquareBorder = showSquare && squareCells.includes(sq);

                return (
                  <div
                    key={sq}
                    data-square={sq}
                    className="flex items-center justify-center relative select-none"
                    style={{
                      width: sqSize,
                      height: sqSize,
                      cursor: pieceObj && pieceObj.color === 'w' && !demoMode && !isComplete && !isFail ? 'grab' : 'default',
                      touchAction: 'none',
                      backgroundColor: isSquareBorder ? SQUARE_FILL : (light ? '#f0d9b5' : '#b58863'),
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
                    {pieceObj && !isDragSource && (
                      <div className="relative pointer-events-none" style={{ width: Math.round(sqSize * 0.85), height: Math.round(sqSize * 0.85) }}>
                        <PieceImg type={pieceObj.type} color={pieceObj.color} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
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

        {/* Mobile reset */}
        <button
          onClick={reset}
          className="flex lg:hidden items-center gap-1 px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition"
        >
          <RotateCcw size={14} /> Заново
        </button>

        <div className="text-center text-sm text-slate-600 max-w-sm px-4">
          <p className="font-medium mb-1">Цель:</p>
          <p>Продвиньте пешку до последней горизонтали. Король будет преследовать.</p>
        </div>
      </div>
    </div>
  );
}
