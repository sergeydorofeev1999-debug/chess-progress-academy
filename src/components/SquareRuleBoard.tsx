'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { RotateCcw, Eye, Trophy } from 'lucide-react';

const FILES = ['a','b','c','d','e','f','g','h'];
const RANKS = ['8','7','6','5','4','3','2','1'];

const LIGHT_SQ = '#f0d9b5';
const DARK_SQ = '#b58863';
const SQUARE_FILL = 'rgba(255, 200, 0, 0.35)';

function sqColor(file: string, rank: string): string {
  const f = FILES.indexOf(file);
  const r = parseInt(rank);
  return (f + r) % 2 === 0 ? DARK_SQ : LIGHT_SQ;
}

type Piece = { type: 'p' | 'k'; color: 'w' | 'b' };
type Phase = 'intro' | 'square-shown' | 'playing' | 'animating' | 'success';

function parseFen(fen: string): Record<string, Piece> {
  const squares: Record<string, Piece> = {};
  const rows = fen.split(' ')[0].split('/');
  for (let ri = 0; ri < 8; ri++) {
    let fi = 0;
    for (const ch of rows[ri]) {
      if (ch >= '1' && ch <= '8') {
        fi += parseInt(ch);
      } else {
        const color = ch === ch.toUpperCase() ? 'w' : 'b';
        squares[`${FILES[fi]}${RANKS[ri]}`] = { type: ch.toLowerCase() as 'p' | 'k', color };
        fi++;
      }
    }
  }
  return squares;
}

const START_FEN = '8/8/8/8/P3k3/8/8/7K w - - 0 1';

function getPawnSquare(squares: Record<string, Piece>): string | null {
  for (const [sq, p] of Object.entries(squares)) {
    if (p.type === 'p' && p.color === 'w') return sq;
  }
  return null;
}

function getBlackKingSquare(squares: Record<string, Piece>): string | null {
  for (const [sq, p] of Object.entries(squares)) {
    if (p.type === 'k' && p.color === 'b') return sq;
  }
  return null;
}

function getSquareCells(pawnSq: string): string[] {
  const pf = FILES.indexOf(pawnSq[0]);
  const pr = parseInt(pawnSq[1]);
  const side = 8 - pr + 1;
  const cells: string[] = [];
  for (let r = pr; r <= 8; r++) {
    for (let c = pf; c < pf + side && c < 8; c++) {
      cells.push(`${FILES[c]}${r}`);
    }
  }
  return cells;
}

function isInsideSquare(kingSq: string, squareCells: string[]): boolean {
  return squareCells.includes(kingSq);
}

function kingStepTowards(kingSq: string, targetSq: string): string {
  const kf = FILES.indexOf(kingSq[0]);
  const kr = parseInt(kingSq[1]);
  const tf = FILES.indexOf(targetSq[0]);
  const tr = parseInt(targetSq[1]);
  let nf = kf;
  let nr = kr;
  if (tf > kf) nf++;
  else if (tf < kf) nf--;
  if (tr > kr) nr++;
  else if (tr < kr) nr--;
  if (nf >= 0 && nf < 8 && nr >= 1 && nr <= 8) return `${FILES[nf]}${nr}`;
  return kingSq;
}

export default function SquareRuleBoard({ onComplete, lessonId }: { onComplete: () => void; lessonId?: string }) {
  const [squares, setSquares] = useState<Record<string, Piece>>(() => parseFen(START_FEN));
  const [phase, setPhase] = useState<Phase>('intro');
  const [message, setMessage] = useState('');
  const [showSquare, setShowSquare] = useState(false);
  const [highlightSquare, setHighlightSquare] = useState(false);
  const animRef = useRef<NodeJS.Timeout | null>(null);
  const [sqSize, setSqSize] = useState(52);
  const boardRef = useRef<HTMLDivElement>(null);

  const pawnSq = getPawnSquare(squares);
  const kingSq = getBlackKingSquare(squares);
  const squareCells = pawnSq ? getSquareCells(pawnSq) : [];

  // Responsive square size
  useEffect(() => {
    function updateSize() {
      const w = boardRef.current?.offsetWidth || 416;
      setSqSize(Math.floor(w / 8));
    }
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const clearAnim = useCallback(() => {
    if (animRef.current) { clearTimeout(animRef.current); animRef.current = null; }
  }, []);

  const resetBoard = useCallback(() => {
    clearAnim();
    setSquares(parseFen(START_FEN));
    setPhase('intro');
    setMessage('');
    setShowSquare(false);
    setHighlightSquare(false);
  }, [clearAnim]);

  const handleShowSquare = useCallback(() => {
    setShowSquare(true);
    setHighlightSquare(true);
    setPhase('square-shown');
    setMessage('Квадрат от пешки a4 до 8-й горизонтали. Король на e4 — на границе.');
  }, []);

  const playAutoSequence = useCallback((initialSquares: Record<string, Piece>) => {
    let current = { ...initialSquares };
    const steps: { squares: Record<string, Piece>; msg: string }[] = [];

    // Step 1: pawn a5
    let ps = getPawnSquare(current)!;
    let ks = getBlackKingSquare(current)!;
    let nextPs = `${ps[0]}${parseInt(ps[1]) + 1}`;
    current = { ...current };
    delete current[ps];
    current[nextPs] = { type: 'p', color: 'w' };
    ps = nextPs;
    steps.push({ squares: { ...current }, msg: 'Пешка идёт на a5. Квадрат сужается…' });

    // Step 2: king d4, pawn a6
    ks = kingStepTowards(ks, ps);
    current = { ...current };
    delete current[getBlackKingSquare(current)!];
    current[ks] = { type: 'k', color: 'b' };
    nextPs = `${ps[0]}${parseInt(ps[1]) + 1}`;
    delete current[ps];
    current[nextPs] = { type: 'p', color: 'w' };
    ps = nextPs;
    steps.push({ squares: { ...current }, msg: 'Король идёт к пешке, но пешка убегает на a6.' });

    // Step 3: king c5, pawn a7
    ks = kingStepTowards(ks, ps);
    current = { ...current };
    delete current[getBlackKingSquare(current)!];
    current[ks] = { type: 'k', color: 'b' };
    nextPs = `${ps[0]}${parseInt(ps[1]) + 1}`;
    delete current[ps];
    current[nextPs] = { type: 'p', color: 'w' };
    ps = nextPs;
    steps.push({ squares: { ...current }, msg: 'Король на c5. Пешка на a7.' });

    // Step 4: king b6, pawn a8
    ks = kingStepTowards(ks, ps);
    current = { ...current };
    delete current[getBlackKingSquare(current)!];
    current[ks] = { type: 'k', color: 'b' };
    nextPs = `${ps[0]}${parseInt(ps[1]) + 1}`;
    delete current[ps];
    current[nextPs] = { type: 'p', color: 'w' }; // stays pawn for simplicity
    ps = nextPs;
    steps.push({ squares: { ...current }, msg: 'Король на b6. Пешка на a8 — прошла!' });

    let i = 0;
    function next() {
      if (i >= steps.length) {
        setPhase('success');
        setMessage('Пешка прошла! Король на b6 — не догнал. Правило квадрата сработало.');
        return;
      }
      const step = steps[i];
      setSquares(step.squares);
      setMessage(step.msg);
      i++;
      animRef.current = setTimeout(next, 900);
    }
    setPhase('animating');
    next();
  }, []);

  const handlePlay = useCallback(() => {
    // Start from initial position, animate a5 then auto-sequence
    const initial = parseFen(START_FEN);
    setSquares(initial);
    setShowSquare(false);
    setHighlightSquare(false);
    setPhase('playing');
    setMessage('Пешка идёт на a5…');

    // First move a4→a5 instantly, then animate rest
    const ps = 'a4';
    const next = 'a5';
    const afterFirst = { ...initial };
    delete afterFirst[ps];
    afterFirst[next] = { type: 'p', color: 'w' };
    setSquares(afterFirst);

    animRef.current = setTimeout(() => {
      playAutoSequence(afterFirst);
    }, 600);
  }, [playAutoSequence]);

  useEffect(() => { return () => clearAnim(); }, [clearAnim]);

  function getPiece(sq: string): Piece | null {
    return squares[sq] || null;
  }

  return (
    <div className="w-full max-w-[480px] mx-auto">
      {/* Message */}
      {message && (
        <div className={`mb-4 rounded-lg px-4 py-3 text-sm text-center ${phase === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-blue-50 text-blue-800 border border-blue-200'}`}>
          {message}
        </div>
      )}

      {/* Board */}
      <div ref={boardRef} className="relative w-full aspect-square rounded-lg overflow-hidden border border-slate-300 shadow-md">
        {/* Rank labels */}
        <div className="absolute left-0 top-0 bottom-0 w-5 flex flex-col justify-between py-1 z-10">
          {RANKS.map(r => (
            <div key={r} className="text-[10px] text-center leading-none" style={{ color: sqColor('a', r) === LIGHT_SQ ? '#5c3a21' : '#f0d9b5' }}>
              {r}
            </div>
          ))}
        </div>
        {/* File labels */}
        <div className="absolute bottom-0 left-5 right-0 h-5 flex justify-between px-1 z-10">
          {FILES.map(f => (
            <div key={f} className="text-[10px] flex items-center justify-center" style={{ color: sqColor(f, '1') === LIGHT_SQ ? '#5c3a21' : '#f0d9b5' }}>
              {f}
            </div>
          ))}
        </div>
        {/* Squares */}
        <div className="absolute inset-0 left-5 bottom-5">
          {RANKS.map(r =>
            FILES.map(f => {
              const sq = `${f}${r}`;
              const isSquare = showSquare && squareCells.includes(sq);
              const piece = getPiece(sq);
              return (
                <div
                  key={sq}
                  className="absolute flex items-center justify-center"
                  style={{
                    left: `${FILES.indexOf(f) * 12.5}%`,
                    top: `${RANKS.indexOf(r) * 12.5}%`,
                    width: '12.5%',
                    height: '12.5%',
                    backgroundColor: isSquare ? SQUARE_FILL : sqColor(f, r),
                  }}
                >
                  {piece && (
                    <img
                      src={`/pieces/cburnett/${piece.color === 'w' ? 'w' : 'b'}${piece.type === 'p' ? 'P' : 'K'}.svg`}
                      alt=""
                      className="w-[85%] h-[85%]"
                      draggable={false}
                      style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }}
                    />
                  )}
                  {isSquare && highlightSquare && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-[30%] h-[30%] rounded-full bg-yellow-500 opacity-40" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="mt-4 flex flex-col gap-2">
        {phase === 'intro' && (
          <div className="text-center">
            <p className="text-sm text-slate-600 mb-3">
              От пешки до последней горизонтали строится воображаемый квадрат.
              Если король внутри квадрата — догонит. Если вне — пешка проходит.
            </p>
            <button
              onClick={handleShowSquare}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Eye className="w-4 h-4" />
              Показать квадрат
            </button>
          </div>
        )}

        {phase === 'square-shown' && (
          <div className="text-center">
            <p className="text-sm text-slate-600 mb-3">
              Король на e4 стоит на границе квадрата. После хода пешкой квадрат сожмётся. Успеет ли король?
            </p>
            <button
              onClick={handlePlay}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Сыграть a5
            </button>
          </div>
        )}

        {(phase === 'playing' || phase === 'animating') && (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg text-sm text-slate-600">
              <span className="animate-pulse">⏳ Авто-ходы…</span>
            </div>
          </div>
        )}

        {phase === 'success' && (
          <div className="text-center">
            <button
              onClick={onComplete}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              <Trophy className="w-4 h-4" />
              Завершить урок
            </button>
          </div>
        )}

        <button
          onClick={resetBoard}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Начать заново
        </button>
      </div>
    </div>
  );
}
