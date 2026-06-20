'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RotateCcw } from 'lucide-react';

/* ====== Shared chess utils (copied from LessonClient) ====== */
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

function parseFen(fen: string) {
  const squares: Record<string, { type: string; color: 'w' | 'b' }> = {};
  const [placement] = fen.split(' ');
  const rows = placement.split('/');
  for (let ri = 0; ri < 8; ri++) {
    let fi = 0;
    for (const ch of rows[ri]) {
      if (ch >= '1' && ch <= '8') {
        fi += parseInt(ch);
      } else {
        const color = ch === ch.toUpperCase() ? 'w' : 'b';
        const type = ch.toLowerCase();
        squares[`${FILES[fi]}${RANKS[ri]}`] = { type, color };
        fi++;
      }
    }
  }
  return { squares, turn: fen.includes(' w ') ? 'w' : 'b' };
}

function squaresToFen(squares: Record<string, { type: string; color: 'w' | 'b' }>, turn: 'w' | 'b' = 'w') {
  const rows: string[] = [];
  for (let ri = 0; ri < 8; ri++) {
    let row = '';
    let empty = 0;
    for (let fi = 0; fi < 8; fi++) {
      const sq = `${FILES[fi]}${RANKS[ri]}`;
      const p = squares[sq];
      if (p) {
        if (empty > 0) { row += empty; empty = 0; }
        const ch = p.type;
        row += p.color === 'w' ? ch.toUpperCase() : ch;
      } else {
        empty++;
      }
    }
    if (empty > 0) row += empty;
    rows.push(row);
  }
  return `${rows.join('/')} ${turn} - - 0 1`;
}

function isValidMove(
  pieceType: string,
  from: string,
  to: string,
  squares: Record<string, any>,
  movingColor: 'w' | 'b',
  starSquares: string[] = []
) {
  if (squares[from]?.color !== movingColor) return false;
  if (squares[to]?.color === movingColor) return false;
  if (from === to) return false;

  const ff = FILES.indexOf(from[0]);
  const tf = FILES.indexOf(to[0]);
  const fr = RANKS.indexOf(from[1]);
  const tr = RANKS.indexOf(to[1]);
  const df = tf - ff;
  const dr = tr - fr;

  switch (pieceType) {
    case 'r': {
      if (ff !== tf && fr !== tr) return false;
      if (ff === tf) {
        const min = Math.min(fr, tr);
        const max = Math.max(fr, tr);
        for (let r = min + 1; r < max; r++) {
          const sq = `${FILES[ff]}${RANKS[r]}`;
          if (squares[sq]) return false;
          if (starSquares.includes(sq)) return false;
        }
      } else {
        const min = Math.min(ff, tf);
        const max = Math.max(ff, tf);
        for (let f = min + 1; f < max; f++) {
          const sq = `${FILES[f]}${RANKS[fr]}`;
          if (squares[sq]) return false;
          if (starSquares.includes(sq)) return false;
        }
      }
      return true;
    }
    case 'b': {
      if (Math.abs(df) !== Math.abs(dr)) return false;
      const sf = df > 0 ? 1 : -1;
      const sr = dr > 0 ? 1 : -1;
      for (let step = 1; step < Math.abs(df); step++) {
        const sq = `${FILES[ff + sf * step]}${RANKS[fr + sr * step]}`;
        if (squares[sq]) return false;
        if (starSquares.includes(sq)) return false;
      }
      return true;
    }
    case 'q': {
      const isRookLike = ff === tf || fr === tr;
      const isBishopLike = Math.abs(df) === Math.abs(dr);
      if (!isRookLike && !isBishopLike) return false;
      if (isRookLike) {
        if (ff === tf) {
          const min = Math.min(fr, tr);
          const max = Math.max(fr, tr);
          for (let r = min + 1; r < max; r++) {
            const sq = `${FILES[ff]}${RANKS[r]}`;
            if (squares[sq]) return false;
            if (starSquares.includes(sq)) return false;
          }
        } else {
          const min = Math.min(ff, tf);
          const max = Math.max(ff, tf);
          for (let f = min + 1; f < max; f++) {
            const sq = `${FILES[f]}${RANKS[fr]}`;
            if (squares[sq]) return false;
            if (starSquares.includes(sq)) return false;
          }
        }
      } else {
        const sf = df > 0 ? 1 : -1;
        const sr = dr > 0 ? 1 : -1;
        for (let step = 1; step < Math.abs(df); step++) {
          const sq = `${FILES[ff + sf * step]}${RANKS[fr + sr * step]}`;
          if (squares[sq]) return false;
          if (starSquares.includes(sq)) return false;
        }
      }
      return true;
    }
    case 'k': {
      return Math.abs(df) <= 1 && Math.abs(dr) <= 1;
    }
    case 'n': {
      return (
        (Math.abs(df) === 2 && Math.abs(dr) === 1) ||
        (Math.abs(df) === 1 && Math.abs(dr) === 2)
      );
    }
    case 'p': {
      const forwardDir = movingColor === 'w' ? -1 : 1;
      // Forward 1 — blocked by piece OR star
      if (df === 0 && dr === forwardDir) return !squares[to] && !starSquares.includes(to);
      // Forward 2 from start — blocked if star on middle or destination
      if (df === 0 && dr === 2 * forwardDir) {
        const startRank = movingColor === 'w' ? '2' : '7';
        if (from[1] !== startRank) return false;
        const middleSq = `${FILES[ff]}${RANKS[fr + forwardDir]}`;
        if (squares[middleSq] || starSquares.includes(middleSq)) return false;
        return !squares[to] && !starSquares.includes(to);
      }
      // Diagonal capture
      if (Math.abs(df) === 1 && dr === forwardDir) {
        if (squares[to] && squares[to].color !== movingColor) return true;
        if (starSquares.includes(to)) return true;
        return false;
      }
      return false;
    }
    default:
      return false;
  }
}

function getValidSquares(
  pieceType: string,
  from: string,
  squares: Record<string, any>,
  movingColor: 'w' | 'b',
  starSquares: string[] = []
): string[] {
  if (squares[from]?.color !== movingColor) return [];
  const ff = FILES.indexOf(from[0]);
  const fr = RANKS.indexOf(from[1]);
  const valid: string[] = [];

  const tryAdd = (f: number, r: number): boolean => {
    if (f < 0 || f >= 8 || r < 0 || r >= 8) return false;
    const sq = `${FILES[f]}${RANKS[r]}`;
    const p = squares[sq];
    if (p && p.color === movingColor) return false;
    if (starSquares.includes(sq)) {
      valid.push(sq);
      return false;
    }
    valid.push(sq);
    if (p && p.color !== movingColor) return false; // enemy piece blocks further
    return true;
  };

  switch (pieceType) {
    case 'r': {
      const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
      for (const [df, dr] of dirs) {
        let f = ff + df, r = fr + dr;
        while (f >= 0 && f < 8 && r >= 0 && r < 8) {
          if (!tryAdd(f, r)) break;
          f += df; r += dr;
        }
      }
      break;
    }
    case 'b': {
      const dirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
      for (const [df, dr] of dirs) {
        let f = ff + df, r = fr + dr;
        while (f >= 0 && f < 8 && r >= 0 && r < 8) {
          if (!tryAdd(f, r)) break;
          f += df; r += dr;
        }
      }
      break;
    }
    case 'q': {
      const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [-1, 1], [1, -1], [1, 1]];
      for (const [df, dr] of dirs) {
        let f = ff + df, r = fr + dr;
        while (f >= 0 && f < 8 && r >= 0 && r < 8) {
          if (!tryAdd(f, r)) break;
          f += df; r += dr;
        }
      }
      break;
    }
    case 'k': {
      for (let df = -1; df <= 1; df++) {
        for (let dr = -1; dr <= 1; dr++) {
          if (df === 0 && dr === 0) continue;
          const f = ff + df, r = fr + dr;
          if (f >= 0 && f < 8 && r >= 0 && r < 8) {
            const sq = `${FILES[f]}${RANKS[r]}`;
            const p = squares[sq];
            if (!p || p.color !== movingColor) valid.push(sq);
          }
        }
      }
      break;
    }
    case 'n': {
      const jumps = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
      for (const [df, dr] of jumps) {
        const f = ff + df, r = fr + dr;
        if (f >= 0 && f < 8 && r >= 0 && r < 8) {
          const sq = `${FILES[f]}${RANKS[r]}`;
          const p = squares[sq];
          if (!p || p.color !== movingColor) valid.push(sq);
        }
      }
      break;
    }
    case 'p': {
      const forwardDir = movingColor === 'w' ? -1 : 1;
      const r1 = fr + forwardDir;
      if (r1 >= 0 && r1 < 8) {
        const sq = `${FILES[ff]}${RANKS[r1]}`;
        if (!squares[sq] && !starSquares.includes(sq)) {
          valid.push(sq);
          const startRank = movingColor === 'w' ? '2' : '7';
          if (from[1] === startRank) {
            const r2 = fr + 2 * forwardDir;
            if (r2 >= 0 && r2 < 8) {
              const sq2 = `${FILES[ff]}${RANKS[r2]}`;
              if (!squares[sq2] && !starSquares.includes(sq2)) valid.push(sq2);
            }
          }
        }
      }
      for (const df of [-1, 1]) {
        const fd = ff + df;
        const rd = fr + forwardDir;
        if (fd >= 0 && fd < 8 && rd >= 0 && rd < 8) {
          const sq = `${FILES[fd]}${RANKS[rd]}`;
          const p = squares[sq];
          if ((p && p.color !== movingColor) || starSquares.includes(sq)) valid.push(sq);
        }
      }
      break;
    }
  }
  return valid;
}

/* ====== Check if a black piece attacks a square ====== */
function isSquareAttackedByBlack(square: string, squares: Record<string, any>) {
  for (const sq in squares) {
    const p = squares[sq];
    if (!p || p.color !== 'b') continue;
    if (isValidMove(p.type, sq, square, squares, 'b')) return true;
  }
  return false;
}

/* ====== SVG Chess Pieces ====== */
function PieceImg({ type, color }: { type: string; color: 'w' | 'b' }) {
  const pieceKey = `${color}${type.toUpperCase()}`;
  const src = `/pieces/cburnett/${pieceKey}.svg`;
  return (
    <div className="w-full h-full" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }}>
      <img src={src} alt="" className="w-full h-full" draggable={false} />
    </div>
  );
}

function isLight(fi: number, ri: number) {
  return (fi + ri) % 2 === 1;
}

/* ====== Inline Chess Board (white + black pieces, click & drag) ====== */
function InlineChessBoard({
  fen,
  onMove,
  whitePieceTypes,
  msg,
  setMsg,
}: {
  fen: string;
  onMove: (from: string, to: string) => boolean;
  whitePieceTypes?: string[];
  msg: string;
  setMsg: (s: string) => void;
}) {
  const parsed = parseFen(fen);
  const [squares, setSquares] = useState(parsed.squares);
  const squaresRef = useRef(squares);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const selectedSquareRef = useRef(selectedSquare);
  const [hoveredSquare, setHoveredSquare] = useState<string | null>(null);
  const [dragPiece, setDragPiece] = useState<{ square: string; type: string } | null>(null);
  const dragPieceRef = useRef(dragPiece);
  const pointerStartRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const justDraggedRef = useRef(false);
  const onMoveRef = useRef(onMove);
  const [sqSize, setSqSize] = useState(44);

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

  useEffect(() => {
    const p = parseFen(fen);
    setSquares(p.squares);
    squaresRef.current = p.squares;
  }, [fen]);

  useEffect(() => {
    selectedSquareRef.current = selectedSquare;
  }, [selectedSquare]);
  useEffect(() => {
    dragPieceRef.current = dragPiece;
  }, [dragPiece]);
  useEffect(() => {
    onMoveRef.current = onMove;
  }, [onMove]);

  const validMoves = selectedSquare
    ? getValidSquares(
        squares[selectedSquare]?.type || 'p',
        selectedSquare,
        squares,
        'w'
      )
    : dragPiece
    ? getValidSquares(
        squares[dragPiece.square]?.type || 'p',
        dragPiece.square,
        squares,
        'w'
      )
    : [];

  const click = useCallback(
    (square: string) => {
      if (justDraggedRef.current) { justDraggedRef.current = false; return; }
      const sqs = squaresRef.current;
      const sel = selectedSquareRef.current;
      const piece = sqs[square];
      if (sel) {
        if (sel === square) {
          selectedSquareRef.current = null;
          setSelectedSquare(null);
          return;
        }
        const fromType = sqs[sel]?.type || 'p';
        if (isValidMove(fromType, sel, square, sqs, 'w')) {
          const accepted = onMoveRef.current?.(sel, square);
          if (accepted !== false) {
            selectedSquareRef.current = null;
            setSelectedSquare(null);
            setMsg('');
          }
        } else {
          if (piece && piece.color === 'w') {
            selectedSquareRef.current = square;
            setSelectedSquare(square);
            setMsg('');
          } else {
            selectedSquareRef.current = null;
            setSelectedSquare(null);
            setMsg('Недопустимый ход.');
          }
        }
      } else {
        if (piece && piece.color === 'w') {
          selectedSquareRef.current = square;
          setSelectedSquare(square);
        }
      }
    },
    [setMsg]
  );

  // Drag handlers
  const handlePointerDown = (e: React.PointerEvent, sq: string) => {
    if (!containerRef.current) return;
    const piece = squares[sq];
    if (!piece || piece.color !== 'w') return;
    pointerStartRef.current = sq;
    justDraggedRef.current = false;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handleGlobalMove = (e: PointerEvent) => {
    if (!pointerStartRef.current) return;
    justDraggedRef.current = true;
    setDragPiece({ square: pointerStartRef.current, type: squares[pointerStartRef.current]?.type || 'p' });
    dragPieceRef.current = { square: pointerStartRef.current, type: squares[pointerStartRef.current]?.type || 'p' };
  };

  const handleGlobalUp = (e: PointerEvent) => {
    if (!pointerStartRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const fi = Math.floor(x / sqSize);
    const ri = Math.floor(y / sqSize);
    if (fi >= 0 && fi < 8 && ri >= 0 && ri < 8) {
      const targetSquare = `${FILES[fi]}${RANKS[ri]}`;
      const start = pointerStartRef.current;
      if (start && targetSquare !== start) {
        const sqs = squaresRef.current;
        const fromType = sqs[start]?.type || 'p';
        if (isValidMove(fromType, start, targetSquare, sqs, 'w')) {
          onMoveRef.current?.(start, targetSquare);
        }
      }
    }
    pointerStartRef.current = null;
    setDragPiece(null);
    dragPieceRef.current = null;
  };

  const handleGlobalCancel = () => {
    pointerStartRef.current = null;
    setDragPiece(null);
    dragPieceRef.current = null;
  };

  useEffect(() => {
    window.addEventListener('pointermove', handleGlobalMove);
    window.addEventListener('pointerup', handleGlobalUp);
    window.addEventListener('pointercancel', handleGlobalCancel);
    return () => {
      window.removeEventListener('pointermove', handleGlobalMove);
      window.removeEventListener('pointerup', handleGlobalUp);
      window.removeEventListener('pointercancel', handleGlobalCancel);
    };
  }, []);

  const preventDrag = (e: React.DragEvent) => e.preventDefault();

  return (
    <div className="flex flex-col items-center gap-2 select-none" style={{ touchAction: 'none' }}>
      <div
        className="grid border-[3px] border-[#2b2b2b] rounded-sm relative select-none"
        style={{
          gridTemplateColumns: `repeat(8, ${sqSize}px)`,
          gridTemplateRows: `repeat(8, ${sqSize}px)`,
          touchAction: 'none',
        }}
        ref={containerRef}
      >
        {RANKS.map((rank, ri) =>
          FILES.map((file, fi) => {
            const sq = `${file}${rank}`;
            const pieceObj = squares[sq];
            const light = isLight(fi, ri);
            const sel = selectedSquare === sq;
            const isSource = dragPiece?.square === sq;
            const isValid = validMoves.includes(sq);
            const hover = hoveredSquare === sq;
            return (
              <div
                key={sq}
                data-square={sq}
                className={`flex items-center justify-center relative select-none ${
                  light ? 'bg-[#f0d9b5]' : 'bg-[#b58863]'
                } ${isSource ? 'opacity-50' : ''}`}
                style={{
                  width: sqSize,
                  height: sqSize,
                  cursor: pieceObj && pieceObj.color === 'w' ? 'grab' : 'default',
                  touchAction: 'none',
                }}
                onPointerDown={(e) => handlePointerDown(e, sq)}
                onClick={() => click(sq)}
                onDragStart={preventDrag}
                onMouseEnter={() => setHoveredSquare(sq)}
                onMouseLeave={() => setHoveredSquare(null)}
              >
                {sel && (
                  <div className="absolute inset-[1px] rounded-[5px] bg-[rgba(100,160,60,0.45)] pointer-events-none z-10" />
                )}
                {hover && !sel && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      backgroundColor: light ? 'rgba(0,0,0,0.10)' : 'rgba(0,0,0,0.15)',
                      zIndex: 5,
                    }}
                  />
                )}
                {fi === 0 && (
                  <span
                    className={`absolute top-0.5 left-1 text-[10px] font-bold ${
                      light ? 'text-[#b58863]' : 'text-[#f0d9b5]'
                    }`}
                  >
                    {rank}
                  </span>
                )}
                {ri === 7 && (
                  <span
                    className={`absolute bottom-0.5 right-1 text-[10px] font-bold ${
                      light ? 'text-[#b58863]' : 'text-[#f0d9b5]'
                    }`}
                  >
                    {file}
                  </span>
                )}
                {/* Green dot on valid squares */}
                {isValid && !squares[sq] && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                    <div
                      style={{
                        width: Math.round(sqSize * 0.3),
                        height: Math.round(sqSize * 0.3),
                        backgroundColor: '#5d9040',
                        borderRadius: '50%',
                        opacity: 0.85,
                      }}
                    />
                  </div>
                )}
                {pieceObj && <PieceImg type={pieceObj.type} color={pieceObj.color} />}
              </div>
            );
          })
        )}
      </div>
      {msg && <div className="text-red-500 text-sm mt-1">{msg}</div>}
    </div>
  );
}

/* ====== CaptureBoard main component ====== */
interface CaptureLevel {
  initialFen: string;
  stars: string[]; // target squares to capture (contains black pieces)
  instructions: string;
  hint: string;
  maxMoves: number;
  movingPiece?: string; // if set, only this white piece type can be moved (e.g. "r")
}

interface Props {
  lessonId: string;
  levels: CaptureLevel[];
  successMessage: string;
  onAllComplete?: () => void;
  onLevelComplete?: (level: number, earned: number) => void;
  currentLessonId?: string;
}

export default function CaptureBoard({
  lessonId,
  levels,
  successMessage,
  onAllComplete,
  onLevelComplete,
}: Props) {
  const router = useRouter();
  const savedKey = `lesson_capture_${lessonId}`;

  const [currentLevel, setCurrentLevel] = useState(0);
  const [collected, setCollected] = useState<string[]>([]);
  const [levelStars, setLevelStars] = useState<Record<number, number>>({});
  const [position, setPosition] = useState(levels[0].initialFen);
  const [allDone, setAllDone] = useState(false);
  const [msg, setMsg] = useState('');
  const [moves, setMoves] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const positionRef = useRef(position);
  const movesRef = useRef(moves);

  const level = levels[currentLevel];
  const stars = level.stars;
  const totalLevels = levels.length;

  useEffect(() => {
    positionRef.current = position;
  }, [position]);
  useEffect(() => {
    movesRef.current = moves;
  }, [moves]);

  // Load progress
  useEffect(() => {
    try {
      const saved = localStorage.getItem(savedKey);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.levelStars) setLevelStars(data.levelStars);
        if (typeof data.currentLevel === 'number') setCurrentLevel(data.currentLevel);
      }
    } catch {}
  }, [savedKey]);

  // Reset on level change
  useEffect(() => {
    const lvl = levels[currentLevel];
    setPosition(lvl.initialFen);
    setCollected([]);
    setMoves(0);
    setAllDone(false);
    setGameOver(false);
    setMsg('');
    movesRef.current = 0;
    positionRef.current = lvl.initialFen;
  }, [currentLevel, levels]);

  const handleMove = useCallback(
    (from: string, to: string) => {
      if (gameOver) return false;
      const parsed = parseFen(positionRef.current);
      if (parsed.squares[from]?.color !== 'w') {
        return false;
      }
      const fromType = parsed.squares[from]?.type || 'p';
      if (!isValidMove(fromType, from, to, parsed.squares, 'w')) {
        setMsg('Недопустимый ход');
        return false;
      }

      const newSquares = { ...parsed.squares };
      const movedPiece = parsed.squares[from];
      delete newSquares[from];
      newSquares[to] = movedPiece;

      const captured = parsed.squares[to]?.color === 'b';

      const newFen = squaresToFen(newSquares, 'w');
      positionRef.current = newFen;
      setPosition(newFen);
      setMoves((c) => c + 1);
      setMsg('');

      // Auto-capture check: any white piece still under attack by any black piece?
      // If a white piece defends the target, black cannot capture it.
      function isDefended(squares: Record<string, { type: string; color: 'w' | 'b' }>, targetSq: string) {
        // Temporarily treat target as black so isValidMove allows the attack path
        const testSquares = { ...squares };
        if (testSquares[targetSq]) {
          testSquares[targetSq] = { ...testSquares[targetSq], color: 'b' };
        }
        for (const sq in squares) {
          const p = squares[sq];
          if (p.color !== 'w') continue;
          if (sq === targetSq) continue;
          if (isValidMove(p.type, sq, targetSq, testSquares, 'w')) return true;
        }
        return false;
      }

      for (const wsq in newSquares) {
        const wp = newSquares[wsq];
        if (wp.color !== 'w') continue;
        for (const bsq in newSquares) {
          const bp = newSquares[bsq];
          if (bp.color !== 'b') continue;
          if (isValidMove(bp.type, bsq, wsq, newSquares, 'b')) {
            if (isDefended(newSquares, wsq)) continue; // defended, skip
            const attacker = { ...newSquares[bsq] };
            delete newSquares[bsq];
            newSquares[wsq] = attacker;
            const captureFen = squaresToFen(newSquares, 'w');
            positionRef.current = captureFen;
            setPosition(captureFen);
            setGameOver(true);
            setMsg(`💀 ${bp.type === 'r' ? 'Ладья' : bp.type === 'b' ? 'Слон' : bp.type === 'q' ? 'Ферзь' : bp.type === 'n' ? 'Конь' : bp.type === 'p' ? 'Пешка' : 'Фигура'} съела ${wp.type === 'r' ? 'ладью' : wp.type === 'b' ? 'слона' : wp.type === 'q' ? 'ферзя' : wp.type === 'n' ? 'коня' : wp.type === 'p' ? 'пешку' : wp.type === 'k' ? 'короля' : 'фигуру'}! Попробуйте снова.`);
            return true;
          }
        }
      }

      // Collect star if target square (only if no auto-capture happened)
      if (stars.includes(to) && !collected.includes(to)) {
        setCollected((prev) => {
          const next = [...prev, to];
          const allTargets = stars.every((s: string) => next.includes(s));
          if (allTargets) {
            const max = level.maxMoves || stars.length + 1;
            const m = movesRef.current + 1;
            let earned = 3;
            if (m <= max) earned = 3;
            else if (m <= max + 1) earned = 2;
            else earned = 1;
            setLevelStars((prevStars) => {
              const nextStars = { ...prevStars, [currentLevel]: earned };
              localStorage.setItem(savedKey, JSON.stringify({ levelStars: nextStars, currentLevel }));
              return nextStars;
            });
            onLevelComplete?.(currentLevel, earned);
            setTimeout(() => {
              if (currentLevel + 1 < totalLevels) {
                setCurrentLevel((l) => l + 1);
                setMsg('');
              } else {
                setAllDone(true);
                setMsg(`🎉 ${successMessage}`);
                onAllComplete?.();
              }
            }, 600);
          }
          return next;
        });
      }

      return true;
    },
    [stars, collected, currentLevel, totalLevels, onAllComplete, gameOver, level.maxMoves, successMessage]
  );

  const collectedCount = stars.filter((s: string) => collected.includes(s)).length;
  const remainingBlack = Object.values(parseFen(position).squares).filter((p) => p.color === 'b').length;

  const resetLevel = () => {
    const lvl = levels[currentLevel];
    setPosition(lvl.initialFen);
    setCollected([]);
    setMoves(0);
    setAllDone(false);
    setGameOver(false);
    setMsg('');
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 w-full min-h-[500px]">
      {/* LEFT COLUMN: Stars + Figure menu + reset */}
      <div className="w-full lg:w-[140px] flex-shrink-0 space-y-2">
        <div className="hidden lg:flex flex-col rounded overflow-hidden border border-gray-200">
          {levels.map((_l: any, i: number) => {
            const earned = levelStars[i];
            const isCurrent = i === currentLevel;
            const isDone = earned != null;
            const isFuture = !isCurrent && !isDone && i > currentLevel;
            return (
              <button
                key={i}
                onClick={() => {
                  if (isFuture) return;
                  if (i !== currentLevel) {
                    setCurrentLevel(i);
                  }
                }}
                disabled={isFuture}
                className={`flex items-center justify-center px-2 py-1.5 transition ${
                  isCurrent
                    ? 'bg-blue-500 text-white'
                    : isDone
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                } ${isFuture ? 'cursor-not-allowed' : 'cursor-pointer hover:brightness-110'}`}
              >
                <div className="flex gap-0.5">
                  {[1, 2, 3].map((s) => (
                    <img
                      key={s}
                      src="/images/learn/star.png"
                      alt=""
                      className="w-3.5 h-3.5"
                      style={{
                        filter:
                          earned != null && s <= earned
                            ? 'brightness(1.2) drop-shadow(0 0 1px rgba(255,255,255,0.6))'
                            : 'grayscale(100%) brightness(0.4)',
                      }}
                      draggable={false}
                    />
                  ))}
                </div>
                <span className="ml-2 text-xs font-medium">{i + 1}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={resetLevel}
          className="hidden lg:flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition w-full justify-center"
        >
          <RotateCcw size={14} /> Заново
        </button>

        {level.hint && (
          <div className="hidden lg:block text-[12px] text-[#444] bg-[#f8f8f8] p-2 rounded border border-[#ddd] leading-relaxed">
            <strong>Подсказка:</strong> {level.hint}
          </div>
        )}
      </div>

      {/* CENTER COLUMN: Chess board + stats */}
      <div className="flex-1 flex flex-col items-center gap-3">
        <div className="text-[#2b2b2b] text-[15px] font-medium mb-2 text-center leading-snug w-full">
          {level.instructions}
        </div>

        <InlineChessBoard fen={position} onMove={handleMove} msg={msg} setMsg={setMsg} />

        {/* Mobile level stars bar */}
        <div className="flex lg:hidden gap-1 justify-center w-full overflow-x-auto">
          {levels.map((_l: any, i: number) => {
            const earned = levelStars[i];
            const isCurrent = i === currentLevel;
            const isDone = earned != null;
            const isFuture = !isCurrent && !isDone && i > currentLevel;
            return (
              <button
                key={i}
                onClick={() => {
                  if (isFuture) return;
                  if (i !== currentLevel) {
                    setCurrentLevel(i);
                    setAllDone(false);
                    setGameOver(false);
                  }
                }}
                disabled={isFuture}
                className={`flex items-center gap-0.5 px-1.5 py-1 rounded text-xs transition ${
                  isCurrent ? 'bg-blue-500 text-white' : isDone ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'
                } ${isFuture ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex gap-0.5">
                  {[1, 2, 3].map((s) => (
                    <img
                      key={s}
                      src="/images/learn/star.png"
                      className={`w-3 h-3 ${
                        isFuture ? 'opacity-30 grayscale' : s <= (earned || 0) ? '' : 'opacity-40 grayscale'
                      }`}
                      draggable={false}
                      alt=""
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* Mobile hint */}
        {level.hint && (
          <div className="lg:hidden text-[12px] text-[#444] bg-[#f8f8f8] p-2 rounded border border-[#ddd] leading-relaxed w-full">
            <strong>Подсказка:</strong> {level.hint}
          </div>
        )}

        <div className="mt-1 text-sm text-gray-600">
          🎯 Целей: {collectedCount} / {stars.length} | Ходов: {moves} / {level.maxMoves || '-'} | Чёрных: {remainingBlack}
        </div>

        {allDone && (
          <div className="mt-2 text-emerald-700 font-bold text-lg">{successMessage}</div>
        )}
      </div>
    </div>
  );
}
