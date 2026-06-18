'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { CheckCircle, ArrowLeft, ArrowRight, Star, RotateCcw } from 'lucide-react';
import { markLessonComplete } from '@/lib/data';
import { Chess } from 'chess.js';

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

/* ====== ВСТРОЕННАЯ ШАХМАТНАЯ ДОСКА (избегаем tree-shaking) ====== */
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];
const PIECE_SYMBOLS: Record<string, string> = {
  wP: '♙', wN: '♘', wB: '♗', wR: '♖', wQ: '♕', wK: '♔',
  bP: '♟', bN: '♞', bB: '♝', bR: '♜', bQ: '♛', bK: '♚',
};

function InlineChessBoard({
  fen,
  stars = [],
  onMove,
}: {
  fen: string;
  stars?: string[];
  onMove?: (from: string, to: string) => boolean;
}) {
  const [ready, setReady] = useState(false);
  const gameRef = useRef<Chess | null>(null);
  const [position, setPosition] = useState(fen);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [collectedStars, setCollectedStars] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState('');

  useEffect(() => {
    gameRef.current = new Chess(fen);
    setPosition(fen);
    setSelectedSquare(null);
    setCollectedStars(new Set());
    setMsg('');
    setReady(true);
  }, [fen]);

  const getPiece = (sq: string) => {
    if (!gameRef.current) return null;
    const p = gameRef.current.get(sq as any);
    if (!p) return null;
    return PIECE_SYMBOLS[`${p.color === 'w' ? 'w' : 'b'}${p.type.toUpperCase()}`] || null;
  };

  const isLight = (f: number, r: number) => (f + r) % 2 === 0;

  const click = useCallback(
    (square: string) => {
      const game = gameRef.current;
      if (!game || !ready) return;
      const piece = game.get(square as any);
      if (selectedSquare) {
        try {
          const move = game.move({ from: selectedSquare, to: square });
          if (move && onMove?.(selectedSquare, square)) {
            setPosition(game.fen());
            if (stars.includes(square)) {
              setCollectedStars((prev) => new Set([...prev, square]));
            }
            setSelectedSquare(null);
            setMsg('');
            return;
          }
        } catch {}
        if (piece && piece.color === game.turn()) {
          setSelectedSquare(square);
          setMsg('');
        } else {
          setSelectedSquare(null);
          setMsg('Недопустимый ход');
        }
      } else {
        if (piece && piece.color === game.turn()) {
          setSelectedSquare(square);
        }
      }
    },
    [selectedSquare, ready, stars, onMove]
  );

  // SSR + hydration first render: MUST match server HTML
  if (!ready || !gameRef.current) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="w-full" style={{ width: 352, height: 352 }}>
          <div className="w-full h-full bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200">
            <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="grid border-2 border-amber-800 rounded" style={{ gridTemplateColumns: 'repeat(8, 44px)', gridTemplateRows: 'repeat(8, 44px)' }}>
        {RANKS.map((rank, ri) =>
          FILES.map((file, fi) => {
            const sq = `${file}${rank}`;
            const piece = getPiece(sq);
            const light = isLight(fi, ri);
            const sel = selectedSquare === sq;
            const hasStar = stars.includes(sq) && !collectedStars.has(sq);
            return (
              <div
                key={sq}
                onClick={() => click(sq)}
                className={`flex items-center justify-center relative cursor-pointer select-none text-2xl ${
                  light ? 'bg-amber-100' : 'bg-amber-700'
                } ${sel ? 'ring-2 ring-blue-500 ring-inset' : ''} hover:opacity-90 transition`}
                style={{ width: 44, height: 44 }}
              >
                {fi === 0 && <span className={`absolute top-0.5 left-1 text-[9px] font-bold ${light ? 'text-amber-800' : 'text-amber-100'}`}>{rank}</span>}
                {ri === 7 && <span className={`absolute bottom-0.5 right-1 text-[9px] font-bold ${light ? 'text-amber-800' : 'text-amber-100'}`}>{file}</span>}
                {hasStar && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg animate-pulse"><span className="text-yellow-800 text-xs">★</span></div>
                  </div>
                )}
                {piece && <span className={`relative z-10 ${'wR wQ wK wB wN wP'.includes(piece) ? 'text-white drop-shadow' : 'text-slate-900 drop-shadow'}`}>{piece}</span>}
              </div>
            );
          })
        )}
      </div>
      {msg && <p className="text-red-500 text-xs">{msg}</p>}
    </div>
  );
}

function InlineStarBoard({
  config,
  onComplete,
}: {
  config: any;
  onComplete?: () => void;
}) {
  const [ready, setReady] = useState(false);
  const gameRef = useRef<Chess | null>(null);
  const [position, setPosition] = useState(config.initialFen);
  const [collected, setCollected] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState(0);
  const [complete, setComplete] = useState(false);
  const [msg, setMsg] = useState('');

  const stars = config.stars?.map((s: any) => s.square) || [];
  const allowed = config.allowedPieces || [];

  useEffect(() => {
    gameRef.current = new Chess(config.initialFen);
    setPosition(config.initialFen);
    setCollected(new Set());
    setMoves(0);
    setComplete(false);
    setMsg('');
    setReady(true);
  }, [config.initialFen]);

  const handleMove = useCallback(
    (from: string, to: string) => {
      const game = gameRef.current;
      if (!game || !ready || complete) return false;
      const piece = game.get(from as any);
      if (!piece) return false;
      if (allowed.length > 0 && !allowed.includes(piece.type)) {
        setMsg(`Используйте ${pieceName(allowed[0])}!`);
        return false;
      }
      try {
        const move = game.move({ from, to });
        if (move) {
          setPosition(game.fen());
          setMoves((c) => c + 1);
          setMsg('');
          if (stars.includes(to) && !collected.has(to)) {
            setCollected((prev) => new Set([...prev, to]));
            const still = stars.length - (collected.size + 1);
            if (still <= 0) {
              setComplete(true);
              setMsg('🎉 Все звёзды собраны! Урок пройден!');
              onComplete?.();
            } else {
              setMsg(`⭐ Осталось ${still} звёзд`);
            }
          }
          return true;
        }
      } catch {}
      setMsg('Недопустимый ход');
      return false;
    },
    [ready, stars, collected, allowed, complete, onComplete]
  );

  const reset = () => {
    if (!gameRef.current) return;
    gameRef.current.load(config.initialFen);
    setPosition(config.initialFen);
    setCollected(new Set());
    setMoves(0);
    setComplete(false);
    setMsg('');
  };

  if (!ready) {
    return (
      <div className="space-y-3 w-full">
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 bg-gray-200 rounded-full" />
        </div>
        <div className="w-full" style={{ width: 352, height: 352 }}>
          <div className="w-full h-full bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200">
            <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  const remaining = stars.filter((s: string) => !collected.has(s)).length;

  return (
    <div className="space-y-3 w-full">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1">
          <Star size={16} fill="#fbbf24" color="#f59e0b" />
          <span className="text-sm font-medium">{collected.size} / {stars.length} звёзд</span>
        </div>
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-yellow-400 transition-all" style={{ width: `${(collected.size / stars.length) * 100}%` }} />
        </div>
        {complete && <span className="text-green-600 text-sm font-medium">✓ Готово!</span>}
      </div>
      {msg && <div className={`text-center py-1.5 px-3 rounded text-sm font-medium ${complete ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>{msg}</div>}
      <div className="flex justify-center">
        <InlineChessBoard fen={position} stars={stars.filter((s: string) => !collected.has(s))} onMove={handleMove} />
      </div>
      <div className="flex items-center justify-between">
        <button onClick={reset} className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition">
          <RotateCcw size={14} /> Начать заново
        </button>
        <span className="text-xs text-gray-500">Ходов: {moves}</span>
      </div>
    </div>
  );
}

function pieceName(p: string) {
  const n: Record<string, string> = { r: 'ладью', n: 'коня', b: 'слона', q: 'ферзя', k: 'короля', p: 'пешку' };
  return n[p] || p;
}
/* ====== /ВСТРОЕННАЯ ШАХМАТНАЯ ДОСКА ====== */

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
          <p className="text-blue-800 font-medium mb-2">{interactiveConfig.instructions || 'Интерактивный урок'}</p>
          {interactiveConfig.hint && (
            <p className="text-sm text-blue-600 mb-2">💡 {interactiveConfig.hint}</p>
          )}
          {lesson.chess_board_fen && (
            <div className="mt-4 flex justify-center">
              <InlineStarBoard
                config={interactiveConfig}
                onComplete={handleInteractiveComplete}
              />
            </div>
          )}
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
