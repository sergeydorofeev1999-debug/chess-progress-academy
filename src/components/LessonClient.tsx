'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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
  // Must have a white piece on 'from'
  if (squares[from]?.color !== 'w') return false;
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

function getValidRookSquares(from: string, squares: Record<string, any>, starSquares: string[]): string[] {
  if (squares[from]?.color !== 'w') return [];
  const ff = FILES.indexOf(from[0]);
  const fr = RANKS.indexOf(from[1]);
  const valid: string[] = [];
  const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
  for (const [df, dr] of dirs) {
    let f = ff + df, r = fr + dr;
    while (f >= 0 && f < 8 && r >= 0 && r < 8) {
      const sq = `${FILES[f]}${RANKS[r]}`;
      const p = squares[sq];
      // Blocked by own piece
      if (p && p.color === 'w') break;
      // Uncollected star blocks further moves (like an obstacle)
      if (starSquares.includes(sq)) {
        valid.push(sq); // star is a valid destination
        break; // but blocks beyond it
      }
      valid.push(sq);
      f += df; r += dr;
    }
  }
  return valid;
}

// ─── SVG Chess Pieces ───────────────────────────
function PieceImg({ type, color }: { type: string; color: 'w' | 'b' }) {
  const pieceKey = `${color}${type.toUpperCase()}`;
  const src = `/pieces/cburnett/${pieceKey}.svg`;
  return (
    <div className="w-full h-full" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}>
      <img src={src} alt="" className="w-full h-full" draggable={false} />
    </div>
  );
}

function StarSvg() {
  return (
    <img
      src="/images/learn/star.png"
      alt="Star"
      className="star-animate"
      draggable={false}
      style={{
        width: '85%',
        height: '85%',
        objectFit: 'contain',
        filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.3))',
      }}
    />
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
  const [msg, setMsg] = useState('');
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [dragPiece, setDragPiece] = useState<{ square: string; type: string; color: string } | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const pointerStartRef = useRef<{ x: number; y: number; square: string; moved: boolean; pointerId: number } | null>(null);
  const processLockRef = useRef(false);
  const [sqSize, setSqSize] = useState(44);

  // Stable refs to avoid re-subscribing window events on every state change
  const squaresRef = useRef<Record<string, any>>({});
  const clickRef = useRef<(square: string) => void>(() => {});
  const onMoveRef = useRef<((from: string, to: string) => boolean) | undefined>(undefined);
  const selectedSquareRef = useRef<string | null>(null);

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

  const parsed = parseFen(fen);
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
      const sqs = squaresRef.current;
      const sel = selectedSquareRef.current;
      const piece = sqs[square];
      if (sel) {
        if (sel === square) {
          selectedSquareRef.current = null;
          setSelectedSquare(null);
          return;
        }
        if (isValidRookMove(sel, square, sqs)) {
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
            setMsg('Недопустимый ход. Ладья ходит только прямо!');
          }
        }
      } else {
        if (piece && piece.color === 'w') {
          selectedSquareRef.current = square;
          setSelectedSquare(square);
        }
      }
    },
    []
  );

  // Sync refs after click is defined
  useEffect(() => {
    squaresRef.current = squares;
  }, [squares]);
  useEffect(() => {
    clickRef.current = click;
  }, [click]);
  useEffect(() => {
    onMoveRef.current = onMove;
  }, [onMove]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, square: string) => {
      // Ignore new pointer if processing a move
      if (processLockRef.current) return;
      // Ignore secondary pointers (multi-touch)
      if (e.pointerType === 'touch' && e.isPrimary === false) return;
      e.preventDefault();
      pointerStartRef.current = { x: e.clientX, y: e.clientY, square, moved: false, pointerId: e.pointerId };
      setMsg('');
      // Show valid moves immediately when picking up a piece (no drag delay)
      const piece = squaresRef.current[square];
      if (piece && piece.color === 'w') {
        setSelectedSquare(square);

      }
    },
    []
  );

  useEffect(() => {
    const handleGlobalMove = (e: PointerEvent) => {
      const start = pointerStartRef.current;
      if (!start) return;
      if (e.pointerId !== start.pointerId) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (!start.moved && (Math.abs(dx) > 20 || Math.abs(dy) > 20)) {
        start.moved = true;
        const piece = squaresRef.current[start.square];
        if (piece && piece.color === 'w') {
          setDragPiece({ square: start.square, type: piece.type, color: piece.color });
          setSelectedSquare(null); // remove click-selection outline during drag
        }
      }
      if (start.moved) {
        setDragPos({ x: e.clientX, y: e.clientY });

      }
    };
    const handleGlobalUp = (e: PointerEvent) => {
      const start = pointerStartRef.current;
      if (!start) return;
      if (e.pointerId !== start.pointerId) return;
      if (!start.moved) {
        clickRef.current(start.square);
      } else {
        // Drag drop
        const targetSquare = getSquareFromPoint(e.clientX, e.clientY);
        if (targetSquare && targetSquare !== start.square) {
          if (isValidRookMove(start.square, targetSquare, squaresRef.current)) {
            onMoveRef.current?.(start.square, targetSquare);
          } else {
            setMsg('Недопустимый ход. Ладья ходит только прямо!');
          }
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
  }, []);

  const preventDrag = (e: React.DragEvent) => e.preventDefault();

  // Valid move indicators (green dots like Lichess)
  const validMoves = selectedSquare
    ? getValidRookSquares(selectedSquare, squares, stars)
    : dragPiece
      ? getValidRookSquares(dragPiece.square, squares, stars)
      : [];

  return (
    <div className="flex flex-col items-center gap-2 select-none" style={{ touchAction: 'none' }}>
      <div className="grid border-[3px] border-[#2b2b2b] rounded-sm relative select-none" style={{ gridTemplateColumns: `repeat(8, ${sqSize}px)`, gridTemplateRows: `repeat(8, ${sqSize}px)`, touchAction: 'none' }}>
        {RANKS.map((rank, ri) =>
          FILES.map((file, fi) => {
            const sq = `${file}${rank}`;
            const pieceObj = squares[sq];
            const light = isLight(fi, ri);
            const sel = selectedSquare === sq;
            const isSource = dragPiece?.square === sq;
            const hasStar = stars.includes(sq);
            const isValidMove = validMoves.includes(sq);
            return (
              <div
                key={sq}
                data-square={sq}
                className={`flex items-center justify-center relative select-none ${
                  light ? 'bg-[#f0d9b5]' : 'bg-[#b58863]'
                } ${isSource ? 'opacity-50' : ''}`}
                style={{ width: sqSize, height: sqSize, cursor: pieceObj && pieceObj.color === 'w' ? 'grab' : 'default', touchAction: 'none' }}
                onPointerDown={(e) => handlePointerDown(e, sq)}
                onDragStart={preventDrag}
              >
                {/* Selected square highlight */}
                {sel && !hasStar && (
                  <div className="absolute inset-[1px] rounded-[5px] bg-[rgba(100,160,60,0.45)] pointer-events-none z-10" />
                )}
                {fi === 0 && <span className={`absolute top-0.5 left-1 text-[10px] font-bold ${light ? 'text-[#b58863]' : 'text-[#f0d9b5]'}`}>{rank}</span>}
                {ri === 7 && <span className={`absolute bottom-0.5 right-1 text-[10px] font-bold ${light ? 'text-[#b58863]' : 'text-[#f0d9b5]'}`}>{file}</span>}
                {/* Green move indicator dots (like Lichess) — only on empty squares (no star) */}
                {isValidMove && !hasStar && (
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
                {/* Star icon (collected/uncollected) */}
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  style={{ zIndex: 25, opacity: hasStar ? 1 : 0, visibility: hasStar ? 'visible' : 'hidden' }}
                >
                  <StarSvg />
                </div>
                {pieceObj && !isSource && (
                  <div className="relative pointer-events-none" style={{ width: Math.round(sqSize*0.85), height: Math.round(sqSize*0.85) }}>
                    <PieceImg type={pieceObj.type} color={pieceObj.color as 'w' | 'b'} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      {dragPiece && (
        <div className="fixed pointer-events-none z-50" style={{ left: dragPos.x - Math.round(sqSize/2), top: dragPos.y - Math.round(sqSize/2), width: Math.round(sqSize*0.85), height: Math.round(sqSize*0.85) }}>
          <PieceImg type={dragPiece.type} color={dragPiece.color as 'w' | 'b'} />
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
  const [levels] = useState(() => config.levels || [
    { initialFen: config.initialFen, stars: config.stars, instructions: config.instructions, hint: config.hint }
  ]);

  const [currentLevel, setCurrentLevel] = useState(0);
  const [position, setPosition] = useState(levels[0].initialFen);
  const positionRef = useRef(position);
  useEffect(() => { positionRef.current = position; }, [position]);
  const [collected, setCollected] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [msg, setMsg] = useState('');
  const [allDone, setAllDone] = useState(false);
  const [levelStars, setLevelStars] = useState<Record<number, number>>({});
  const movesRef = useRef(moves);
  useEffect(() => { movesRef.current = moves; }, [moves]);

  const level = levels[currentLevel];
  const stars = useMemo(() => level.stars?.map((s: any) => typeof s === 'string' ? s : s?.square).filter(Boolean) || [], [level.stars]);
  const visibleStars = useMemo(() => stars.filter((s: string) => !collected.includes(s)), [stars, collected]);
  const totalLevels = levels.length;

  const reset = useCallback(() => {
    setPosition(level.initialFen);
    setCollected([]);
    setMoves(0);
    setMsg('');
  }, [level]);

  useEffect(() => {
    setPosition(levels[currentLevel].initialFen);
    setCollected([]);
    setMoves(0);
    setMsg('');
  }, [currentLevel, levels]);

  const handleMove = useCallback(
    (from: string, to: string) => {
      // Read current position from ref to avoid dependency churn
      const parsed = parseFen(positionRef.current);
      if (parsed.squares[from]?.color !== 'w') {
        return false;
      }
      if (!isValidRookMove(from, to, parsed.squares)) {
        setMsg('Недопустимый ход');
        return false;
      }
      const newSquares = { ...parsed.squares };
      const movedPiece = parsed.squares[from];
      delete newSquares[from];
      newSquares[to] = { type: movedPiece?.type || 'r', color: 'w' };
      const newFen = squaresToFen(newSquares, 'w');
      positionRef.current = newFen;
      setPosition(newFen);
      setMoves((c) => c + 1);
      setMsg('');

      if (stars.includes(to) && !collected.includes(to)) {
        setCollected((prev) => {
          const next = [...prev, to];
          const allCollected = stars.every((s: string) => next.includes(s));
          if (allCollected) {
            const max = level.maxMoves || stars.length + 1;
            const m = movesRef.current + 1;
            let earned = 3;
            if (m <= max) earned = 3;
            else if (m <= max + 1) earned = 2;
            else earned = 1;
            setLevelStars((prev) => ({ ...prev, [currentLevel]: earned }));
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
            setMsg(`⭐ ${next.length} / ${stars.length} звёзд`);
          }
          return next;
        });
      }
      return true;
    },
    [stars, collected, currentLevel, totalLevels, onAllComplete]
  );

  const collectedCount = stars.filter((s: string) => collected.includes(s)).length;
  const allCollected = stars.every((s: string) => collected.includes(s));

  return (
    <div className="flex flex-col lg:flex-row gap-4 w-full min-h-[500px]">
      {/* LEFT COLUMN: Figure menu + level progress */}
      <div className="w-full lg:w-[140px] flex-shrink-0 space-y-2">
        {/* Piece menu — Lichess style (hidden on mobile) */}
        <div className="hidden lg:block border border-gray-200 rounded overflow-hidden">
          <div className="bg-blue-500 text-white text-[11px] font-bold px-2 py-1">
            Шахматные фигуры
          </div>
          {[
            { name: 'Ладья', code: 'wR', active: true },
            { name: 'Слон', code: 'wB', active: false },
            { name: 'Ферзь', code: 'wQ', active: false },
            { name: 'Король', code: 'wK', active: false },
            { name: 'Конь', code: 'wN', active: false },
            { name: 'Пешка', code: 'wP', active: false },
          ].map((p, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 px-2 py-1.5 text-xs cursor-default ${
                p.active
                  ? 'bg-blue-50 text-blue-900 font-semibold'
                  : i % 2 === 0
                    ? 'bg-white text-gray-600'
                    : 'bg-gray-50 text-gray-600'
              }`}
            >
              <img src={`/pieces/cburnett/${p.code}.svg`} className="w-5 h-5" draggable={false} alt="" />
              <span>{p.name}</span>
            </div>
          ))}
        </div>

        <button onClick={reset} className="hidden lg:flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition w-full justify-center">
          <RotateCcw size={14} /> Заново
        </button>
      </div>

      {/* CENTER COLUMN: Chess board */}
      <div className="flex-1 flex flex-col items-center gap-3">
        <InlineChessBoard fen={position} stars={visibleStars} onMove={handleMove} />
        <span className="text-xs text-gray-500">Ходов: {moves}</span>
      </div>

      {/* RIGHT COLUMN: Exercise info */}
      <div className="w-full lg:w-[180px] flex-shrink-0 space-y-3">
        {/* Figure name header — Lichess style */}
        <div className="bg-blue-500 text-white rounded-t-lg p-2.5">
          <div className="flex items-center gap-2">
            <img src="/pieces/cburnett/wR.svg" className="w-6 h-6" draggable={false} alt="" />
            <div className="text-sm font-bold leading-tight">
              <div>Ладья</div>
              <div className="text-[11px] font-normal opacity-90">Движется по прямой</div>
            </div>
          </div>
        </div>

        {/* Instructions — single clean block */}
        <div className="bg-white rounded-b-lg p-3 text-sm text-gray-800 leading-relaxed">
          {level.instructions}
        </div>

        {/* Message */}
        {msg && (
          <div className={`text-center py-1.5 px-2 rounded text-xs font-medium ${msg.includes('Все позиции') ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
            {msg}
          </div>
        )}

        {/* Next lesson button */}
        {allDone && nextLessonUrl && (
          <button
            onClick={() => router.push(nextLessonUrl)}
            className="w-full flex items-center justify-center gap-1 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 transition"
          >
            Дальше <ArrowRight size={16} />
          </button>
        )}

        {/* Level progress stars — Lichess style clickable blocks */}
        <div className="flex rounded overflow-hidden border border-gray-200">
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
                  }
                }}
                disabled={isFuture}
                className={`flex-1 py-1.5 flex justify-center gap-0.5 transition ${
                  isCurrent ? 'bg-blue-500' : isDone ? 'bg-emerald-500' : 'bg-gray-200'
                } ${isFuture ? 'cursor-not-allowed' : 'cursor-pointer hover:brightness-110'}`}
              >
                {[1, 2, 3].map((s) => (
                  <img
                    key={s}
                    src="/images/learn/star.png"
                    className={`w-3.5 h-3.5 ${
                      isFuture ? 'opacity-30 grayscale' : s <= (earned || 0) ? '' : 'opacity-40 grayscale'
                    }`}
                    draggable={false}
                    alt=""
                  />
                ))}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LessonClient — main component
// ═══════════════════════════════════════════════════════════════════════════════
export default function LessonClient({ lesson, allLessons, courseId, isCompletedInit, userId }: Props) {
  const [isCompleted, setIsCompleted] = useState(isCompletedInit);

  const lessonIndex = allLessons.findIndex((l) => l.id === lesson.id);
  const prevLesson = lessonIndex > 0 ? allLessons[lessonIndex - 1] : null;
  const nextLesson = lessonIndex < allLessons.length - 1 ? allLessons[lessonIndex + 1] : null;

  const interactiveConfig = parseInteractiveConfig(lesson.video_url);

  const handleInteractiveComplete = async () => {
    if (userId) {
      await markLessonComplete(userId, lesson.id);
      setIsCompleted(true);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-2 py-4">
      <Link href={`/courses/${courseId}`} className="text-sm text-slate-500 hover:text-slate-800 mb-4 inline-block">
        ← Назад к курсу
      </Link>

      <h1 className="text-2xl font-bold mb-2">{lesson.title}</h1>
      <p className="text-sm text-slate-500 mb-6">{lesson.duration_minutes} мин</p>

      {/* Interactive Lesson */}
      {interactiveConfig ? (
        <div className="mb-8">
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
