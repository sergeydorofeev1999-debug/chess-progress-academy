'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle, ArrowLeft, ArrowRight, Star, RotateCcw, ChevronRight } from 'lucide-react';
import { markLessonComplete } from '@/lib/data';

interface Lesson {
  id: string;
  title: string;
  content: string;
  duration_minutes: number;
  chess_board_fen: string | null;
  video_url: string | null;
  course_id: string;
}

interface Props {
  lesson: Lesson;
  allLessons: Lesson[];
  courseId: string;
  isCompletedInit: boolean;
  userId: string | null;
}

function parseInteractiveConfig(videoUrl: string | null) {
  if (!videoUrl) return null;
  if (!videoUrl.startsWith('{')) return null;
  try {
    return JSON.parse(videoUrl);
  } catch {
    return null;
  }
}

/* ====== ВСТРОЕННАЯ ШАХМАТНАЯ ДОСКА (без chess.js — pure JS) ====== */
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

function isValidRookMove(from: string, to: string, squares: Record<string, any>) {
  const ff = FILES.indexOf(from[0]);
  const tf = FILES.indexOf(to[0]);
  const fr = RANKS.indexOf(from[1]);
  const tr = RANKS.indexOf(to[1]);

  if (ff !== tf && fr !== tr) return false;
  if (squares[to]?.color === 'w') return false;

  if (ff === tf) {
    const min = Math.min(fr, tr);
    const max = Math.max(fr, tr);
    for (let r = min + 1; r < max; r++) {
      if (squares[`${FILES[ff]}${RANKS[r]}`]) return false;
    }
  } else {
    const min = Math.min(ff, tf);
    const max = Math.max(ff, tf);
    for (let f = min + 1; f < max; f++) {
      if (squares[`${FILES[f]}${RANKS[fr]}`]) return false;
    }
  }
  return true;
}

// ─── SVG Chess Pieces ───────────────────────────
function PieceSvg({ type, color }: { type: string; color: 'w' | 'b' }) {
  const fill = color === 'w' ? '#fff' : '#333';
  const stroke = '#1a1a1a';
  const sw = color === 'w' ? 2 : 1.2;

  const svgs: Record<string, React.ReactNode> = {
    K: (
      <svg viewBox="0 0 45 45" className="w-full h-full">
        <g fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <path d="M22.5 11.63V6M20 8h5" fill="none" strokeLinejoin="miter"/>
          <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill={fill}/>
          <path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-1-5.5 2.5-9 3.5C29 25.5 23 25.5 18 26c-3.5-1-5-4.5-9-3.5-3 6 6 10.5 6 10.5v7z" fill={fill}/>
          <path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-3c-5.5 3.5-15.5 3.5-21 0v3z" fill="none" strokeWidth={1}/>
        </g>
      </svg>
    ),
    Q: (
      <svg viewBox="0 0 45 45" className="w-full h-full">
        <g fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 12l5.5 3L12 18l-7-2zM37 12l-5.5 3L33 18l7-2zM16 8.5l6.5 2 6.5-2-3-4.5h-7z" fill={fill}/>
          <path d="M9 26c8.5-1.5 18.5-1.5 27 0l2.5-12.5L34 19l-3-3-3.5 2.7L24 14l-3.5 4.7L17 16l-3 3-4.5-5.5L6.5 13.5 9 26z" fill={fill}/>
          <path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-1-5.5 2.5-9 3.5C23 25.5 17 25.5 13 26c-3.5-1-5-4.5-9-3.5-3 6 6 10.5 6 10.5v7z" fill={fill}/>
          <path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-3c-5.5 3.5-15.5 3.5-21 0v3z" fill="none" strokeWidth={1}/>
        </g>
      </svg>
    ),
    R: (
      <svg viewBox="0 0 45 45" className="w-full h-full">
        <g fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
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
        <g fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.43-13.5 2-3.39-2.43-10.11-1.03-13.5-2-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2z" fill={fill}/>
          <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z" fill={fill}/>
          <path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z" fill={fill}/>
        </g>
      </svg>
    ),
    N: (
      <svg viewBox="0 0 45 45" className="w-full h-full">
        <g fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill={fill}/>
          <path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0-5 1.99-5 1.99l3.5-7c2.91-1.96 7.56-4.47 14.5-4.95z" fill={fill}/>
          <path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0z" fill={stroke} stroke="none"/>
          <path d="M15 15.5a.5 1.5 0 1 1-1 0 .5 1.5 0 1 1 1 0z" fill={stroke} transform="matrix(.866.5-.5.866 9.693-5.173)" stroke="none"/>
        </g>
      </svg>
    ),
    P: (
      <svg viewBox="0 0 45 45" className="w-full h-full">
        <g fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill={fill}/>
        </g>
      </svg>
    ),
  };

  const svg = svgs[type.toUpperCase()];
  if (!svg) return null;
  return <div style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}>{svg}</div>;
}

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

function InlineChessBoard({
  fen,
  stars = [],
  onMove,
}: {
  fen: string;
  stars?: string[];
  onMove?: (from: string, to: string) => boolean;
}) {
  const [position, setPosition] = useState(fen);
  const [collectedStars, setCollectedStars] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState('');
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [dragPiece, setDragPiece] = useState<{ square: string; type: string; color: string } | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [hoverSquare, setHoverSquare] = useState<string | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number; square: string; moved: boolean } | null>(null);
  const [sqSize, setSqSize] = useState(44);

  // Stable refs to avoid re-subscribing window events on every state change
  const squaresRef = useRef<Record<string, any>>({});
  const clickRef = useRef<(square: string) => void>(() => {});
  const starsRef = useRef<string[]>([]);
  const onMoveRef = useRef<((from: string, to: string) => boolean) | undefined>(undefined);

  useEffect(() => {
    const update = () => setSqSize(Math.min(44, Math.max(36, Math.floor((window.innerWidth - 32) / 8))));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const parsed = parseFen(position);
  const squares = parsed.squares;
  const isLight = (f: number, r: number) => (f + r) % 2 === 0;

  const getSquareFromPoint = (clientX: number, clientY: number): string | null => {
    const el = document.elementFromPoint(clientX, clientY);
    if (!el) return null;
    const cell = el.closest('[data-square]') as HTMLElement | null;
    return cell?.dataset.square || null;
  };

  const click = useCallback(
    (square: string) => {
      const piece = squares[square];
      if (selectedSquare) {
        if (isValidRookMove(selectedSquare, square, squares)) {
          const newSquares = { ...squares };
          delete newSquares[selectedSquare];
          newSquares[square] = { type: 'r', color: 'w' };
          const newFen = squaresToFen(newSquares, 'w');
          setPosition(newFen);
          if (stars.includes(square)) {
            setCollectedStars((prev) => new Set([...prev, square]));
          }
          setSelectedSquare(null);
          setMsg('');
          onMove?.(selectedSquare, square);
        } else {
          if (piece && piece.color === 'w') {
            setSelectedSquare(square);
            setMsg('');
          } else {
            setSelectedSquare(null);
            setMsg('Недопустимый ход. Ладья ходит только прямо!');
          }
        }
      } else {
        if (piece && piece.color === 'w') {
          setSelectedSquare(square);
        }
      }
    },
    [selectedSquare, squares, stars, onMove]
  );

  // Sync refs after click is defined
  useEffect(() => {
    squaresRef.current = squares;
  }, [squares]);
  useEffect(() => {
    clickRef.current = click;
  }, [click]);
  useEffect(() => {
    starsRef.current = stars;
  }, [stars]);
  useEffect(() => {
    onMoveRef.current = onMove;
  }, [onMove]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, square: string) => {
      pointerStartRef.current = { x: e.clientX, y: e.clientY, square, moved: false };
      setMsg('');
    },
    []
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const start = pointerStartRef.current;
      if (!start) return;
      if (start.moved) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (Math.abs(dx) <= 20 && Math.abs(dy) <= 20) {
        clickRef.current(start.square);
      }
      pointerStartRef.current = null;
    },
    []
  );

  useEffect(() => {
    const handleGlobalMove = (e: PointerEvent) => {
      const start = pointerStartRef.current;
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (!start.moved && (Math.abs(dx) > 20 || Math.abs(dy) > 20)) {
        start.moved = true;
        const piece = squaresRef.current[start.square];
        if (piece && piece.color === 'w') {
          setDragPiece({ square: start.square, type: piece.type, color: piece.color });
          setSelectedSquare(null);
        }
      }
      if (start.moved) {
        setDragPos({ x: e.clientX, y: e.clientY });
        setHoverSquare(getSquareFromPoint(e.clientX, e.clientY));
      }
    };
    const handleGlobalUp = (e: PointerEvent) => {
      const start = pointerStartRef.current;
      if (!start) return;
      if (!start.moved) {
        clickRef.current(start.square);
      } else {
        // Drag drop
        const targetSquare = getSquareFromPoint(e.clientX, e.clientY);
        if (targetSquare && targetSquare !== start.square) {
          if (isValidRookMove(start.square, targetSquare, squaresRef.current)) {
            const newSquares = { ...squaresRef.current };
            delete newSquares[start.square];
            newSquares[targetSquare] = { type: 'r', color: 'w' };
            const newFen = squaresToFen(newSquares, 'w');
            setPosition(newFen);
            if (starsRef.current.includes(targetSquare)) {
              setCollectedStars((prev) => new Set([...prev, targetSquare]));
            }
            setMsg('');
            onMoveRef.current?.(start.square, targetSquare);
          } else {
            setMsg('Недопустимый ход. Ладья ходит только прямо!');
          }
        }
        setDragPiece(null);
        setHoverSquare(null);
      }
      pointerStartRef.current = null;
    };
    window.addEventListener('pointermove', handleGlobalMove);
    window.addEventListener('pointerup', handleGlobalUp);
    return () => {
      window.removeEventListener('pointermove', handleGlobalMove);
      window.removeEventListener('pointerup', handleGlobalUp);
    };
  }, []);

  const preventDrag = (e: React.DragEvent) => e.preventDefault();

  return (
    <div className="flex flex-col items-center gap-2 select-none" style={{ touchAction: 'none' }}>
      <div className="grid border-2 border-slate-700 rounded relative select-none" style={{ gridTemplateColumns: `repeat(8, ${sqSize}px)`, gridTemplateRows: `repeat(8, ${sqSize}px)`, touchAction: 'none' }}>
        {RANKS.map((rank, ri) =>
          FILES.map((file, fi) => {
            const sq = `${file}${rank}`;
            const pieceObj = squares[sq];
            const light = isLight(fi, ri);
            const sel = selectedSquare === sq;
            const isHover = hoverSquare === sq;
            const isSource = dragPiece?.square === sq;
            const hasStar = stars.includes(sq) && !collectedStars.has(sq);
            return (
              <div
                key={sq}
                data-square={sq}
                className={`flex items-center justify-center relative select-none ${
                  light ? 'bg-[#f0d9b5]' : 'bg-[#b58863]'
                } ${sel ? 'outline outline-2 outline-blue-500 outline-offset-[-2px]' : ''} ${isHover && dragPiece ? 'outline outline-2 outline-blue-400 outline-offset-[-2px]' : ''} ${isSource ? 'opacity-50' : ''}`}
                style={{ width: sqSize, height: sqSize, cursor: pieceObj && pieceObj.color === 'w' ? 'grab' : 'default', touchAction: 'none' }}
                onPointerDown={(e) => handlePointerDown(e, sq)}
                onPointerUp={handlePointerUp}
                onDragStart={preventDrag}
              >
                {fi === 0 && <span className={`absolute top-0.5 left-1 text-[10px] font-bold ${light ? 'text-[#b58863]' : 'text-[#f0d9b5]'}`}>{rank}</span>}
                {ri === 7 && <span className={`absolute bottom-0.5 right-1 text-[10px] font-bold ${light ? 'text-[#b58863]' : 'text-[#f0d9b5]'}`}>{file}</span>}
                {(
                  <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 transition-opacity duration-300"
                    style={{ opacity: hasStar ? 1 : 0 }}
                  >
                    <StarSvg />
                  </div>
                )}
                {pieceObj && !isSource && (
                  <div className="relative pointer-events-none" style={{ width: Math.round(sqSize*0.85), height: Math.round(sqSize*0.85) }}>
                    <PieceSvg type={pieceObj.type.toUpperCase()} color={pieceObj.color as 'w' | 'b'} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      {dragPiece && (
        <div className="fixed pointer-events-none z-50" style={{ left: dragPos.x - Math.round(sqSize/2), top: dragPos.y - Math.round(sqSize/2), width: Math.round(sqSize*0.85), height: Math.round(sqSize*0.85) }}>
          <PieceSvg type={dragPiece.type.toUpperCase()} color={dragPiece.color as 'w' | 'b'} />
        </div>
      )}
      {msg && <p className="text-red-500 text-xs">{msg}</p>}
    </div>
  );
}

function squaresToFen(squares: Record<string, any>, turn: string) {
  let rows = [];
  for (let ri = 0; ri < 8; ri++) {
    let row = '';
    let empty = 0;
    for (let fi = 0; fi < 8; fi++) {
      const sq = `${FILES[fi]}${RANKS[ri]}`;
      const p = squares[sq];
      if (p) {
        if (empty > 0) { row += empty; empty = 0; }
        const ch = p.type === p.type.toUpperCase() ? p.type : p.type.toUpperCase();
        row += p.color === 'w' ? ch.toUpperCase() : ch.toLowerCase();
      } else {
        empty++;
      }
    }
    if (empty > 0) row += empty;
    rows.push(row);
  }
  return `${rows.join('/')} ${turn} - - 0 1`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Multi-level interactive star board (like Lichess learn)
// ═══════════════════════════════════════════════════════════════════════════════
function MultiLevelStarBoard({
  config,
  onComplete,
  onAllComplete,
  nextLessonUrl,
}: {
  config: any;
  onComplete?: () => void;
  onAllComplete?: () => void;
  nextLessonUrl?: string;
}) {
  const router = useRouter();
  const levels = config.levels || [
    { initialFen: config.initialFen, stars: config.stars, instructions: config.instructions, hint: config.hint }
  ];

  const [currentLevel, setCurrentLevel] = useState(0);
  const [position, setPosition] = useState(levels[0].initialFen);
  const [collected, setCollected] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState(0);
  const [msg, setMsg] = useState('');
  const [allDone, setAllDone] = useState(false);

  const level = levels[currentLevel];
  const stars = level.stars?.map((s: any) => s.square) || [];
  const totalLevels = levels.length;

  const reset = useCallback(() => {
    setPosition(level.initialFen);
    setCollected(new Set());
    setMoves(0);
    setMsg('');
  }, [level]);

  useEffect(() => {
    setPosition(level.initialFen);
    setCollected(new Set());
    setMoves(0);
    setMsg('');
  }, [currentLevel, level]);

  const handleMove = useCallback(
    (from: string, to: string) => {
      const parsed = parseFen(position);
      if (!isValidRookMove(from, to, parsed.squares)) {
        setMsg('Недопустимый ход');
        return false;
      }
      const newSquares = { ...parsed.squares };
      delete newSquares[from];
      newSquares[to] = { type: 'r', color: 'w' };
      const newFen = squaresToFen(newSquares, 'w');
      setPosition(newFen);
      setMoves((c) => c + 1);
      setMsg('');

      if (stars.includes(to) && !collected.has(to)) {
        setCollected((prev) => {
          const next = new Set([...prev, to]);
          const allCollected = stars.every((s: string) => next.has(s));
          if (allCollected) {
            setTimeout(() => {
              if (currentLevel + 1 < totalLevels) {
                setCurrentLevel((l) => l + 1);
                setMsg('');
              } else {
                setAllDone(true);
                setMsg('🎉 Все позиции пройдены! Урок завершён!');
                onAllComplete?.();
              }
            }, 600);
          } else {
            setMsg(`⭐ ${next.size} / ${stars.length} звёзд`);
          }
          return next;
        });
      }
      return true;
    },
    [position, stars, collected, currentLevel, totalLevels, onAllComplete]
  );

  const collectedCount = stars.filter((s: string) => collected.has(s)).length;
  const allCollected = stars.every((s: string) => collected.has(s));

  return (
    <div className="space-y-3 w-full">
      {/* Level progress bar */}
      <div className="flex items-center gap-2">
        {levels.map((_l: any, i: number) => (
          <div
            key={i}
            className={`flex-1 h-2 rounded-full transition-all ${
              i < currentLevel ? 'bg-green-500' : i === currentLevel ? 'bg-blue-500' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Star size={16} fill="#fbbf24" color="#f59e0b" />
          <span className="text-sm font-medium">
            Позиция {currentLevel + 1} / {totalLevels}
          </span>
        </div>
        {allDone && <span className="text-green-600 text-sm font-medium">✓ Все позиции пройдены!</span>}
      </div>

      {/* Stars progress for current level */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-yellow-400 transition-all" style={{ width: `${stars.length > 0 ? (collectedCount / stars.length) * 100 : 0}%` }} />
        </div>
        <span className="text-xs text-gray-500">⭐ {collectedCount} / {stars.length}</span>
      </div>

      {/* Instructions */}
      {level.instructions && <p className="text-blue-800 font-medium">{level.instructions}</p>}
      {level.hint && <p className="text-sm text-blue-600">💡 {level.hint}</p>}

      {/* Message */}
      {msg && (
        <div className={`text-center py-1.5 px-3 rounded text-sm font-medium ${msg.includes('Все позиции') ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
          {msg}
        </div>
      )}

      {/* Auto-advance message */}
      {allCollected && currentLevel + 1 < totalLevels && (
        <div className="flex items-center justify-center gap-2 text-blue-600 text-sm animate-pulse">
          <ChevronRight size={16} /> Переход к следующей позиции...
        </div>
      )}

      <div className="flex justify-center">
        <InlineChessBoard fen={position} stars={stars.filter((s: string) => !collected.has(s))} onMove={handleMove} />
      </div>

      <div className="flex items-center justify-between">
        <button onClick={reset} className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition">
          <RotateCcw size={14} /> Начать заново
        </button>
        <span className="text-xs text-gray-500">Ходов: {moves}</span>
      </div>

      {/* Next lesson button when all done */}
      {allDone && nextLessonUrl && (
        <div className="pt-4">
          <button
            onClick={() => router.push(nextLessonUrl)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
          >
            Следующий урок <ArrowRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LessonClient — main component
// ═══════════════════════════════════════════════════════════════════════════════
export default function LessonClient({ lesson, allLessons, courseId, isCompletedInit, userId }: Props) {
  const [isCompleted, setIsCompleted] = useState(isCompletedInit);
  const [completing, setCompleting] = useState(false);

  const lessonIndex = allLessons.findIndex((l) => l.id === lesson.id);
  const prevLesson = lessonIndex > 0 ? allLessons[lessonIndex - 1] : null;
  const nextLesson = lessonIndex < allLessons.length - 1 ? allLessons[lessonIndex + 1] : null;

  const interactiveConfig = parseInteractiveConfig(lesson.video_url);

  const handleComplete = async () => {
    if (!userId) {
      alert('Войдите, чтобы сохранить прогресс');
      return;
    }
    setCompleting(true);
    try {
      await markLessonComplete(userId, lesson.id);
      setIsCompleted(true);
    } catch (e) {
      alert('Ошибка сохранения прогресса');
    } finally {
      setCompleting(false);
    }
  };

  const handleInteractiveComplete = async () => {
    if (userId) {
      await markLessonComplete(userId, lesson.id);
      setIsCompleted(true);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href={`/courses/${courseId}`} className="text-sm text-slate-500 hover:text-slate-800 mb-4 inline-block">
        ← Назад к курсу
      </Link>

      <h1 className="text-2xl font-bold mb-2">{lesson.title}</h1>
      <p className="text-sm text-slate-500 mb-6">{lesson.duration_minutes} мин</p>

      {/* Interactive Lesson */}
      {interactiveConfig ? (
        <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <MultiLevelStarBoard
            config={interactiveConfig}
            onAllComplete={handleInteractiveComplete}
            nextLessonUrl={nextLesson ? `/lessons/${nextLesson.id}?course=${courseId}` : undefined}
          />
        </div>
      ) : (
        /* Regular video placeholder */
        <div className="bg-slate-900 rounded-xl aspect-video flex items-center justify-center mb-6">
          <div className="text-center text-white">
            <div className="text-5xl mb-2">▶️</div>
            <p className="text-sm text-slate-300">Видео будет здесь</p>
          </div>
        </div>
      )}

      {/* Regular text content */}
      {lesson.content && !interactiveConfig && (
        <div className="prose max-w-none mb-8">
          <p className="text-slate-700 leading-relaxed whitespace-pre-line">{lesson.content}</p>
        </div>
      )}

      {lesson.chess_board_fen && !interactiveConfig && (
        <div className="mb-8">
          <h3 className="font-semibold mb-4">Позиция на доске</h3>
          <div className="w-full max-w-[480px] mx-auto aspect-square bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200">
            <p className="text-slate-400 text-sm text-center px-4">♟️ Шахматная доска скоро будет здесь</p>
          </div>
        </div>
      )}

      {!isCompleted && (
        <button
          onClick={handleComplete}
          disabled={completing}
          className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold py-3 rounded-lg transition mb-6 disabled:opacity-50"
        >
          {completing ? 'Сохранение...' : 'Отметить урок пройденным ✓'}
        </button>
      )}

      {isCompleted && (
        <div className="flex items-center gap-2 text-green-600 font-medium mb-6">
          <CheckCircle size={20} /> Урок пройден!
        </div>
      )}

      <div className="flex gap-3 pt-4 border-t border-slate-200">
        {prevLesson && (
          <Link
            href={`/lessons/${prevLesson.id}?course=${courseId}`}
            className="flex-1 flex items-center justify-center gap-2 py-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
          >
            <ArrowLeft size={18} /> Предыдущий
          </Link>
        )}
        {nextLesson && (
          <Link
            href={`/lessons/${nextLesson.id}?course=${courseId}`}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
          >
            Следующий <ArrowRight size={18} />
          </Link>
        )}
      </div>
    </div>
  );
}
