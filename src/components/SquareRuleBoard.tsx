'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { RotateCcw, Eye, Trophy } from 'lucide-react';

const FILES = ['a','b','c','d','e','f','g','h'];
const RANKS = ['8','7','6','5','4','3','2','1'];
const DISPLAY_RANKS = ['8','7','6','5','4','3','2','1'];

const START_FEN_1 = '8/8/8/8/P3k3/8/8/7K w - - 0 1';
const START_FEN_2 = '8/3k4/8/8/7P/8/8/K7 w - - 0 1';

const SQUARE_FILL = 'rgba(255,255,255,0.75)';

const PROMOTION_PIECES = [
  { code: 'q', name: 'Ферзь' },
  { code: 'r', name: 'Ладья' },
  { code: 'b', name: 'Слон' },
  { code: 'n', name: 'Конь' },
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

function getSquareBorder(pawnSq: string): string[] {
  const pf = FILES.indexOf(pawnSq[0]);
  const pr = parseInt(pawnSq[1]);
  const side = 8 - pr + 1;
  const maxFile = pf + side - 1;
  if (maxFile >= 8) return [];
  const cells: string[] = [];
  for (let c = pf; c <= maxFile; c++) cells.push(`${FILES[c]}${pr}`);
  for (let c = pf; c <= maxFile; c++) cells.push(`${FILES[c]}8`);
  for (let r = pr; r <= 8; r++) cells.push(`${FILES[pf]}${r}`);
  for (let r = pr; r <= 8; r++) cells.push(`${FILES[maxFile]}${r}`);
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

function getWhitePieceSquare(game: Chess): string | null {
  const sqs = game.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = sqs[r][c];
      if (p && p.color === 'w') return `${FILES[c]}${RANKS[r]}`;
    }
  }
  return null;
}

export default function SquareRuleBoard({ onComplete, lessonId }: { onComplete: () => void; lessonId?: string }) {
  const [exercise, setExercise] = useState<1 | 2>(1);
  const [ex2Mode, setEx2Mode] = useState<'king' | 'pawn' | null>(null);

  const [game, setGame] = useState<Chess>(() => new Chess(START_FEN_1));
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [demoMode, setDemoMode] = useState(false);
  const [demoPhase, setDemoPhase] = useState(0);
  const [sqSize, setSqSize] = useState(52);
  const [showSquare, setShowSquare] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isFail, setIsFail] = useState(false);
  const [dragPiece, setDragPiece] = useState<{square:string;type:string;color:'w'|'b'}|null>(null);
  const [dragPos, setDragPos] = useState({x:0,y:0});
  const [promotionPending, setPromotionPending] = useState<{mode:'king'|'pawn';from:string;to:string;afterGameFen:string}|null>(null);

  const mountedRef = useRef(true);
  const isCompleteRef = useRef(false);
  const demoModeRef = useRef(false);
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  const ptrStart = useRef<{square:string;moved:boolean;pointerId:number;x:number;y:number}|null>(null);
  const gameRef = useRef(game);
  const justDraggedRef = useRef(false);

  const activeStartFen = exercise === 2 ? START_FEN_2 : START_FEN_1;

  useEffect(() => () => { mountedRef.current = false; }, []);
  useEffect(() => { isCompleteRef.current = isComplete; }, [isComplete]);
  useEffect(() => { demoModeRef.current = demoMode; }, [demoMode]);
  useEffect(() => { gameRef.current = game; }, [game]);

  useEffect(() => {
    const update = () => {
      const isMobile = window.innerWidth < 1024;
      if (isMobile) setSqSize(Math.min(64, Math.max(36, Math.floor((window.innerWidth - 24) / 8))));
      else setSqSize(Math.min(64, Math.max(48, Math.floor((window.innerWidth - 340) / 8))));
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
    setGame(new Chess(activeStartFen));
    setSelectedSquare(null);
    
    setMessage('');
    setDemoMode(false);
    setDemoPhase(0);
    setShowSquare(false);
    setIsComplete(false);
    setIsFail(false);
    setDragPiece(null);
    setPromotionPending(null);
    if (exercise === 2) setEx2Mode(null);
  }, [clearTimers, activeStartFen, exercise]);

  const switchExercise = useCallback((num: 1 | 2) => {
    setExercise(num);
    clearTimers();
    const fen = num === 2 ? START_FEN_2 : START_FEN_1;
    setGame(new Chess(fen));
    setSelectedSquare(null);
    
    setMessage('');
    setDemoMode(false);
    setDemoPhase(0);
    setShowSquare(false);
    setIsComplete(false);
    setIsFail(false);
    setDragPiece(null);
    setPromotionPending(null);
    setEx2Mode(null);
  }, [clearTimers]);

  // ═══════════════════════════════════════════════════════════════
  // EXERCISE 1 DEMO
  // ═══════════════════════════════════════════════════════════════
  const schedule = useCallback((fn: () => void, delay: number) => {
    const t = setTimeout(() => { if (mountedRef.current) fn(); }, delay);
    timersRef.current.push(t);
  }, []);

  const runDemoSequence = useCallback(() => {
    setShowSquare(true);
    setDemoPhase(0);
    setMessage('Квадрат от пешки a4. Король на e4 — на границе.');
    const g1 = new Chess(START_FEN_1);

    schedule(() => {
      setMessage(''); setShowSquare(false);
      g1.move({ from: 'a4', to: 'a5' });
      setGame(new Chess(g1.fen())); setDemoPhase(1);
      schedule(() => {
        const bk = getBlackKingMoveTowards(g1, 'a5');
        if (bk) g1.move({ from: bk.from, to: bk.to });
        setGame(new Chess(g1.fen())); setDemoPhase(2);
        schedule(() => { setShowSquare(true); setMessage('Квадрат сузился. Король внутри, но пешка убегает…'); }, 500);
        schedule(() => {
          setMessage(''); setShowSquare(false);
          g1.move({ from: 'a5', to: 'a6' });
          setGame(new Chess(g1.fen())); setDemoPhase(3);
          schedule(() => {
            const bk2 = getBlackKingMoveTowards(g1, 'a6');
            if (bk2) g1.move({ from: bk2.from, to: bk2.to });
            setGame(new Chess(g1.fen())); setDemoPhase(4);
            schedule(() => { setShowSquare(true); setMessage('Король на c6. Пешка всё ближе к ферзю…'); }, 500);
            schedule(() => {
              setMessage(''); setShowSquare(false);
              g1.move({ from: 'a6', to: 'a7' });
              setGame(new Chess(g1.fen())); setDemoPhase(5);
              schedule(() => {
                const bk3 = getBlackKingMoveTowards(g1, 'a7');
                if (bk3) g1.move({ from: bk3.from, to: bk3.to });
                setGame(new Chess(g1.fen())); setDemoPhase(6);
                schedule(() => { setShowSquare(true); setMessage('Король на b7. Пешка на a7 — один шаг до ферзя!'); }, 500);
                schedule(() => {
                  setMessage(''); setShowSquare(false);
                  g1.move({ from: 'a7', to: 'a8', promotion: 'q' });
                  setGame(new Chess(g1.fen())); setDemoPhase(7);
                  schedule(() => {
                    const bk4 = getBlackKingMoveTowards(g1, 'a8');
                    if (bk4) g1.move({ from: bk4.from, to: bk4.to });
                    setGame(new Chess(g1.fen())); setDemoPhase(8);
                    setIsComplete(true);
                    setMessage('Король съел ферзя на a8! Правило квадрата: король внутри квадрата — догнал.');
                  }, 1000);
                }, 1500);
              }, 1000);
            }, 1500);
          }, 1000);
        }, 1500);
      }, 1000);
    }, 1500);
  }, [schedule]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const handleShowSquare = useCallback(() => {
    setShowSquare(prev => !prev);
    setMessage(showSquare ? '' : 'Квадрат от пешки до последней горизонтали. Король внутри — догонит, снаружи — пешка проходит.');
  }, [showSquare]);

  const startDemo = useCallback(() => {
    reset();
    setDemoMode(true);
    runDemoSequence();
  }, [reset, runDemoSequence]);

  // ═══════════════════════════════════════════════════════════════
  // AUTO PAWN MOVE HELPER
  // ═══════════════════════════════════════════════════════════════
  const doAutoWhitePawnMove = useCallback((mode: 'king' | 'pawn', fromGame: Chess) => {
    if (isCompleteRef.current || isFail) return;
    const g = new Chess(fromGame.fen());
    const ps = getPawnSquare(g);
    if (!ps) return;

    const nr = parseInt(ps[1]) + 1;

    if (nr === 8) {
      if (mode === 'king') {
        // King chase: auto-promote to queen, then USER must move black king to capture
        try {
          g.move({ from: ps, to: `${ps[0]}8`, promotion: 'q' });
          setGame(new Chess(g.fen()));

          // Check if black king CAN capture the new queen
          const blackMoves = g.moves({ verbose: true });
          const canCapture = blackMoves.some(m => m.piece === 'k' && m.color === 'b' && m.captured);
          if (!canCapture) {
            setIsFail(true);
            setMessage('Провалено. Король не успел.');
          }
          // Otherwise: user's turn — they must capture the queen manually
        } catch {}
      } else {
        // Pawn run: show promotion modal
        setPromotionPending({ mode, from: ps, to: `${ps[0]}8`, afterGameFen: g.fen() });
      }
      return;
    }

    if (nr > 8) return;
    try {
      g.move({ from: ps, to: `${ps[0]}${nr}` });
      setGame(new Chess(g.fen()));

      // After auto pawn move, check if black king can capture the pawn
      if (mode === 'king') {
        const psAfter = getPawnSquare(g);
        if (!psAfter) {
          setIsComplete(true);
          setMessage('Король догнал пешку! Правило квадрата: король внутри — догонит.');
          onComplete();
          return;
        }
        if (parseInt(psAfter[1]) === 8) {
          setIsComplete(true);
          setMessage('Пешка прошла! Король не догнал.');
          onComplete();
          return;
        }
      }

      // In pawn-run mode: check if black king ate the pawn
      if (mode === 'pawn') {
        const psAfter = getPawnSquare(g);
        if (!psAfter) {
          setIsFail(true);
          setMessage('Провалено. Король съел пешку.');
          return;
        }
      }
    } catch {}
  }, [isFail, onComplete]);

  // ═══════════════════════════════════════════════════════════════
  // PROMOTION HANDLER
  // ═══════════════════════════════════════════════════════════════
  const handlePromotion = useCallback((pieceCode: string) => {
    if (!promotionPending) return;
    const { from, to, afterGameFen, mode } = promotionPending;
    const g = new Chess(afterGameFen);
    try {
      g.move({ from, to, promotion: pieceCode });
      setGame(new Chess(g.fen()));
      setPromotionPending(null);

      if (mode === 'king') {
        // After auto promotion in king chase mode, it's now black's turn.
        // User must move black king to capture the queen manually.
      }

      if (mode === 'pawn') {
        // After user promotion, black king moves to capture the promoted piece
        setTimeout(() => {
          if (!mountedRef.current || isCompleteRef.current) return;
          const g2 = new Chess(g.fen());
          const targetSq = to; // The square where the promoted piece stands
          const bk = getBlackKingMoveTowards(g2, targetSq);
          if (bk) {
            g2.move({ from: bk.from, to: bk.to });
            setGame(new Chess(g2.fen()));
            setIsFail(true);
            setMessage('Провалено. Король съел фигуру.');
          }
        }, 500);
      }
    } catch {
      setPromotionPending(null);
    }
  }, [promotionPending, onComplete]);

  // ═══════════════════════════════════════════════════════════════
  // EXERCISE 2: KING CHASE MODE (auto white pawn, user black king)
  // ═══════════════════════════════════════════════════════════════
  const startEx2KingChase = useCallback(() => {
    setEx2Mode('king');
    setShowSquare(true);
    setMessage('Король на d7 — внутри квадрата пешки h4. Белая пешка ходит первой!');
    const g = new Chess(START_FEN_2);
    setGame(g);
    // Auto white pawn move after 1 second
    const t = setTimeout(() => {
      if (!mountedRef.current) return;
      doAutoWhitePawnMove('king', g);
    }, 1000);
    timersRef.current.push(t);
  }, [doAutoWhitePawnMove]);

  const processBlackMoveEx2 = useCallback((from: string, to: string) => {
    if (isCompleteRef.current || isFail || promotionPending) return;
    const g1 = new Chess(gameRef.current.fen());
    try {
      const move = g1.move({ from, to });
      if (!move) return;

      // In king chase mode: after pawn promotes to queen (no pawn on board),
      // user MUST capture the queen. While pawn still exists, king can move freely.
      if (ex2Mode === 'king') {
        const pawnStillOnBoard = getPawnSquare(g1) !== null;
        if (!pawnStillOnBoard && !move.captured) {
          setIsFail(true);
          setMessage('Провалено. Король должен был съесть ферзя.');
          return;
        }
      }

      setGame(new Chess(g1.fen()));
      setSelectedSquare(null);
      

      // If black king captured a piece → success
      if (move.captured) {
        setIsComplete(true);
        setMessage('Король съел ферзя! Правило квадрата: король внутри квадрата — догнал.');
        onComplete();
        return;
      }

      // After user moves black king, schedule auto white pawn move in 1 second
      const t = setTimeout(() => {
        if (!mountedRef.current || isCompleteRef.current) return;
        doAutoWhitePawnMove('king', g1);
      }, 1000);
      timersRef.current.push(t);
    } catch {}
  }, [isFail, promotionPending, doAutoWhitePawnMove, onComplete, ex2Mode]);

  // ═══════════════════════════════════════════════════════════════
  // EXERCISE 2: PAWN RUN MODE (user white pawn, auto black king)
  // ═══════════════════════════════════════════════════════════════
  const startEx2PawnRun = useCallback(() => {
    setEx2Mode('pawn');
    setGame(new Chess(START_FEN_2));
    setMessage('Ведите белую пешку h4 к последней горизонтали. Король преследует…');
  }, []);

  const processWhiteMoveEx2 = useCallback((from: string, to: string) => {
    if (isCompleteRef.current || isFail || promotionPending) return;
    try {
      // Check if this is a promotion move
      const toRank = parseInt(to[1]);
      if (toRank === 8) {
        setPromotionPending({ mode: 'pawn', from, to, afterGameFen: gameRef.current.fen() });
        return;
      }

      const m = gameRef.current.move({ from, to });
      if (!m) return;
      setGame(new Chess(gameRef.current.fen()));
      setSelectedSquare(null);
    

      if (toRank === 8) {
        setIsComplete(true);
        setMessage('Пешка прошла! Король не догнал.');
        onComplete();
        return;
      }

      setTimeout(() => {
        if (!mountedRef.current) return;
        const g2 = new Chess(gameRef.current.fen());
        const ps = getPawnSquare(g2);
        if (ps) {
          const bk = getBlackKingMoveTowards(g2, ps);
          if (bk) {
            g2.move({ from: bk.from, to: bk.to });
            setGame(new Chess(g2.fen()));
            if (!getPawnSquare(g2)) {
              setIsFail(true);
              setMessage('Провалено. Король съел пешку.');
            }
          }
        }
      }, 500);
    } catch {}
  }, [isFail, promotionPending, onComplete]);

  // ═══════════════════════════════════════════════════════════════
  // INTERACTION HANDLERS
  // ═══════════════════════════════════════════════════════════════
  const handleSquareClick = useCallback((sq: string) => {
    if (isCompleteRef.current || isFail) return;
    // If this click is the end of a drag, ignore it (move already processed in handleUp)
    if (justDraggedRef.current) { justDraggedRef.current = false; return; }
    if (exercise === 1) return;

    if (exercise === 2 && ex2Mode === 'pawn') {
      if (gameRef.current.turn() !== 'w') return;
      const piece = gameRef.current.get(sq as any);
      if (selectedSquare) {
        if (selectedSquare === sq) { setSelectedSquare(null); return; }
        processWhiteMoveEx2(selectedSquare, sq);
        if (piece && piece.color === 'w' && piece.type === 'p') setSelectedSquare(sq);
      } else {
        if (piece && piece.color === 'w' && piece.type === 'p') setSelectedSquare(sq);
      }
      return;
    }

    if (exercise === 2 && ex2Mode === 'king') {
      if (gameRef.current.turn() !== 'b') return;
      const piece = gameRef.current.get(sq as any);
      if (selectedSquare) {
        if (selectedSquare === sq) { setSelectedSquare(null); return; }
        processBlackMoveEx2(selectedSquare, sq);
        if (piece && piece.color === 'b' && piece.type === 'k') setSelectedSquare(sq);
      } else {
        if (piece && piece.color === 'b' && piece.type === 'k') setSelectedSquare(sq);
      }
    }
  }, [exercise, ex2Mode, selectedSquare, processWhiteMoveEx2, processBlackMoveEx2, isFail]);

  const handlePointerDown = useCallback((e: React.PointerEvent, sq: string) => {
    if (isCompleteRef.current || isFail) return;
    if (exercise === 1) return;
    let targetColor: 'w'|'b' = 'w';
    let targetType = 'p';
    if (exercise === 2 && ex2Mode === 'king') { targetColor = 'b'; targetType = 'k'; }
    if (gameRef.current.turn() !== targetColor) return;
    const piece = gameRef.current.get(sq as any);
    if (!piece || piece.color !== targetColor || piece.type !== targetType) return;
    ptrStart.current = { square: sq, moved: false, pointerId: e.pointerId, x: e.clientX, y: e.clientY };
  }, [exercise, ex2Mode, isFail]);

  useEffect(() => {
    if (exercise === 1) return;
    const handleMove = (e: PointerEvent) => {
      const s = ptrStart.current; if (!s || e.pointerId !== s.pointerId) return;
      const dx = e.clientX - s.x, dy = e.clientY - s.y;
      if (!s.moved && (Math.abs(dx) > 20 || Math.abs(dy) > 20)) {
        s.moved = true;
        const p = gameRef.current.get(s.square as any);
        if (p) { setDragPiece({ square: s.square, type: p.type.toUpperCase(), color: p.color as 'w'|'b' }); }
      }
      if (s.moved) setDragPos({ x: e.clientX, y: e.clientY });
    };
    const handleUp = (e: PointerEvent) => {
      const s = ptrStart.current; if (!s || e.pointerId !== s.pointerId) return;
      if (s.moved) {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const cell = el?.closest('[data-square]') as HTMLElement|null;
        const ts = cell?.dataset.square;
        if (ts && ts !== s.square) {
          if (exercise === 2 && ex2Mode === 'king') processBlackMoveEx2(s.square, ts);
          else if (exercise === 2 && ex2Mode === 'pawn') processWhiteMoveEx2(s.square, ts);
        }
        setDragPiece(null);
        setSelectedSquare(null);
        
      }
      ptrStart.current = null;
    };
    const handleCancel = (e: PointerEvent) => {
      if (ptrStart.current && e.pointerId === ptrStart.current.pointerId) { setDragPiece(null); ptrStart.current = null;  }
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleCancel);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleCancel);
    };
  }, [exercise, ex2Mode, processBlackMoveEx2, processWhiteMoveEx2]);

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  const getPieceAt = (sq: string) => {
    const p = game.get(sq as any);
    if (!p) return null;
    return { type: p.type.toUpperCase(), color: p.color as 'w'|'b' };
  };

  const isLight = (f: number, r: number) => (f + r) % 2 === 0;

  const validMoves = selectedSquare
    ? (game.moves({ square: selectedSquare as any, verbose: true }).map(m => m.to) as string[])
    : [];

  const pawnSq = getPawnSquare(game);
  const squareCells = pawnSq ? getSquareBorder(pawnSq) : [];

  const turnText = exercise === 1 ? (demoMode ? 'Демонстрация…' : 'Ваш ход (белые)') :
    exercise === 2 && ex2Mode === 'king' ? 'Ваш ход чёрным королём' :
    exercise === 2 && ex2Mode === 'pawn' ? 'Ваш ход белой пешкой' :
    'Выберите режим';

  return (
    <div className="flex flex-col lg:flex-row gap-4 w-full min-h-[500px]">
      {/* LEFT */}
      <div className="w-full lg:w-[140px] flex-shrink-0 space-y-2">
        <div className="hidden lg:flex flex-col rounded overflow-hidden border border-[#c5b5d8]">
          <button
            onClick={() => switchExercise(1)}
            className={`flex items-center justify-center px-2 py-1.5 text-xs font-medium cursor-pointer ${exercise === 1 ? 'bg-blue-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            Упражнение 1
          </button>
          <button
            onClick={() => switchExercise(2)}
            className={`flex items-center justify-center px-2 py-1.5 text-xs font-medium cursor-pointer ${exercise === 2 ? 'bg-blue-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            Упражнение 2
          </button>
        </div>
        <button
          onClick={reset}
          className="hidden lg:flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition w-full justify-center"
        >
          <RotateCcw size={14} /> Заново
        </button>
      </div>

      {/* CENTER */}
      <div className="flex-1 flex flex-col items-center gap-3 relative">
        <div className="text-[#2b2b2b] text-[15px] font-medium mb-2 text-center leading-snug w-full">
          Правило квадрата — успеет ли король догнать пешку?
        </div>

        {/* EXERCISE 1 controls */}
        {exercise === 1 && !demoMode && !isComplete && !isFail && (
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

        {/* EXERCISE 2 controls */}
        {exercise === 2 && !ex2Mode && !isComplete && !isFail && (
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={startEx2KingChase}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Король догонит
            </button>
            <button
              onClick={startEx2PawnRun}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Пешка пройдёт
            </button>
          </div>
        )}

        <div className="text-center font-bold text-slate-700 text-lg">{turnText}</div>

        {message && (
          <div className={`px-4 py-2 rounded-lg text-sm text-center max-w-sm ${isComplete ? 'bg-green-50 border border-green-200 text-green-800' : isFail ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-blue-50 border border-blue-200 text-blue-800'}`}>
            {message}
          </div>
        )}

        {isComplete && exercise === 1 && (
          <div className="flex flex-col items-center gap-3">
            <div className="px-6 py-3 rounded-xl text-center font-bold text-white bg-green-500">
              <Trophy className="w-5 h-5 inline-block mr-2" />
              {message || 'Правило квадрата сработало!'}
            </div>
            <button
              onClick={() => switchExercise(2)}
              className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-bold transition-colors shadow"
            >
              Перейти к Упражнению 2 →
            </button>
          </div>
        )}

        {isComplete && exercise === 2 && (
          <div className="px-6 py-3 rounded-xl text-center font-bold text-white bg-green-500">
            <Trophy className="w-5 h-5 inline-block mr-2" />
            {message || 'Правило квадрата сработало!'}
          </div>
        )}

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

        {/* PROMOTION MODAL */}
        {promotionPending && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 rounded-lg">
            <div className="bg-white rounded-lg p-4 shadow-xl text-center space-y-3 max-w-[260px]">
              <p className="font-bold text-sm">Превращение пешки!</p>
              <p className="text-xs text-gray-500">Ваша пешка достигла края доски</p>
              <div className="flex gap-2 justify-center">
                {PROMOTION_PIECES.map(({ code, name }) => (
                  <button
                    key={code}
                    onClick={() => handlePromotion(code)}
                    className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition border border-gray-300"
                    title={name}
                  >
                    <img src={`/pieces/cburnett/w${code.toUpperCase()}.svg`} className="w-8 h-8" draggable={false} alt={name} />
                  </button>
                ))}
              </div>
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
                const canInteract = exercise === 2 && ex2Mode !== null && !isComplete && !isFail && !promotionPending;

                return (
                  <div
                    key={sq}
                    data-square={sq}
                    className="flex items-center justify-center relative select-none"
                    style={{
                      width: sqSize,
                      height: sqSize,
                      cursor: canInteract ? 'grab' : 'default',
                      touchAction: 'none',
                      backgroundColor: light ? '#f0d9b5' : '#b58863',
                      opacity: isDragSource ? 0.3 : 1,
                    }}
                    onClick={() => handleSquareClick(sq)}
                    onPointerDown={(e) => handlePointerDown(e, sq)}
                    onDragStart={(e) => e.preventDefault()}
                  >
                    {isSquareBorder && (
                      <div className="absolute inset-0 pointer-events-none z-[5]" style={{ backgroundColor: SQUARE_FILL }} />
                    )}
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
                      <div className="relative pointer-events-none z-[15]" style={{ width: Math.round(sqSize * 0.85), height: Math.round(sqSize * 0.85) }}>
                        <PieceImg type={pieceObj.type} color={pieceObj.color} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

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

        <button
          onClick={reset}
          className="flex lg:hidden items-center gap-1 px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition"
        >
          <RotateCcw size={14} /> Заново
        </button>

        <div className="text-center text-sm text-slate-600 max-w-sm px-4">
          <p>Квадрат от пешки до последней горизонтали. Король внутри — догонит, снаружи — пешка проходит.</p>
        </div>
      </div>
    </div>
  );
}
