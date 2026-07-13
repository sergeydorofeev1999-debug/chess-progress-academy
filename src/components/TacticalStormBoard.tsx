'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { Trophy, Zap, Timer, RotateCcw, ArrowLeft, Flame, Heart, X, Check, ChevronLeft, ChevronRight } from 'lucide-react';

const FILES = ['a','b','c','d','e','f','g','h'];
const REVERSED_FILES = ['h','g','f','e','d','c','b','a'];
const DISPLAY_RANKS = ['8','7','6','5','4','3','2','1'];
const REVERSED_DISPLAY_RANKS = ['1','2','3','4','5','6','7','8'];
const LIGHT_SQ = '#f0d9b5';
const DARK_SQ  = '#b58863';

/* ═══ Piece image (cburnett SVGs) ═══ */
function PieceImg({ type, color, size }: { type: string; color: 'w' | 'b'; size?: number }) {
  const pieceKey = `${color}${type.toUpperCase()}`;
  return (
    <img
      src={`/pieces/cburnett/${pieceKey}.svg`}
      alt=""
      draggable={false}
      style={size ? { width: size, height: size, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' } : { filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }}
    />
  );
}

/* ═══ Types ═══ */
interface Puzzle {
  fen: string;
  moves: string[];
  theme: string;
  rating: number;
}

interface PuzzleResult {
  puzzle: Puzzle;
  status: 'correct' | 'wrong';
  index: number;
  timeSpent: number;
}

interface Props {
  onComplete?: () => void;
  lessonId?: string;
}

type Phase = 'idle' | 'playing' | 'result' | 'review';
type Mode = 'rush5' | 'rush3' | 'survival';

/* ═══ Component ═══ */
export default function TacticalStormBoard({ onComplete }: Props) {
  /* ── State ── */
  const [phase, setPhase] = useState<Phase>('idle');
  const [mode, setMode] = useState<Mode>('rush5');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(300);
  const [showCorrect, setShowCorrect] = useState(false);
  const [moveIndex, setMoveIndex] = useState(0);

  const moveIndexRef = useRef(0);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'none' | 'correct' | 'wrong'>('none');
  const [lives, setLives] = useState(3);
  const [puzzleHistory, setPuzzleHistory] = useState<PuzzleResult[]>([]);
  const [activeTab, setActiveTab] = useState<'summary' | 'tasks'>('tasks');
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);

  const [isBlack, setIsBlack] = useState(false);

  const [game, setGame] = useState<Chess | null>(null);
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle | null>(null);
  const [puzzleIndex, setPuzzleIndex] = useState(0);

  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [sqSize, setSqSize] = useState(56);

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

  const [dragPiece, setDragPiece] = useState<DragState | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const pointerStartRef = useRef<PointerStart | null>(null);

  /* ── Refs ── */
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const puzzleListRef = useRef<Puzzle[]>([]);
  const usedPuzzlesRef = useRef<Set<number>>(new Set());
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opponentTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const livesRef = useRef(3);
  const streakRef = useRef(0);
  const puzzleIndexRef = useRef(0);
  const puzzleStartTimeRef = useRef(Date.now());
  const currentPuzzleRef = useRef<Puzzle | null>(null);
  const timeLeftRef = useRef(300);
  const timerStartRef = useRef(0);
  const scoreRef = useRef(0);

  /* ── Resize ── */
  useEffect(() => {
    const upd = () => {
      const mob = window.innerWidth < 1024;
      setSqSize(mob
        ? Math.min(64, Math.max(38, Math.floor((window.innerWidth - 32) / 8)))
        : Math.min(72, Math.max(52, Math.floor((Math.min(window.innerWidth, 900) - 340) / 8)))
      );
    };
    upd();
    window.addEventListener('resize', upd);
    return () => window.removeEventListener('resize', upd);
  }, []);

  /* ── Load puzzle DB ── */
  useEffect(() => {
    if (puzzleListRef.current.length > 0) return;
    fetch('/puzzles/tactical-storm.json?v=2')
      .then(r => r.json())
      .then(data => {
        const puzzles = (data.puzzles || []) as Puzzle[];
        puzzles.sort((a, b) => a.rating - b.rating);
        puzzleListRef.current = puzzles;
      })
      .catch(() => {
        puzzleListRef.current = getFallbackPuzzles().sort((a, b) => a.rating - b.rating);
      });
  }, []);

  /* ── Cleanup on unmount ── */
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      if (opponentTimeoutRef.current) clearTimeout(opponentTimeoutRef.current);
    };
  }, []);

  /* ── Helpers ── */
  const BIN_SIZE = 50;
  const BIN_COUNT = 20;

  const pickPuzzle = useCallback((score: number): Puzzle => {
    const list = puzzleListRef.current;
    if (!list.length) return getFallbackPuzzles()[0];

    const bin = Math.min(Math.floor(score / 5), BIN_COUNT - 1);
    const binStart = bin * BIN_SIZE;
    const binEnd = Math.min(binStart + BIN_SIZE, list.length);

    const candidates: number[] = [];
    for (let i = binStart; i < binEnd; i++) {
      if (!usedPuzzlesRef.current.has(i)) candidates.push(i);
    }

    let searchBin = bin + 1;
    while (candidates.length === 0 && searchBin < BIN_COUNT) {
      const s = searchBin * BIN_SIZE;
      const e = Math.min(s + BIN_SIZE, list.length);
      for (let i = s; i < e; i++) {
        if (!usedPuzzlesRef.current.has(i)) candidates.push(i);
      }
      searchBin++;
    }

    if (candidates.length === 0) {
      usedPuzzlesRef.current.clear();
      for (let i = binStart; i < binEnd; i++) candidates.push(i);
    }

    const idx = candidates[Math.floor(Math.random() * candidates.length)];
    usedPuzzlesRef.current.add(idx);
    return list[idx];
  }, []);

  const loadPuzzle = useCallback((puzzle: Puzzle) => {
    if (opponentTimeoutRef.current) clearTimeout(opponentTimeoutRef.current);
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    
    currentPuzzleRef.current = puzzle;
    setCurrentPuzzle(puzzle);
    const ng = new Chess(puzzle.fen);
    setIsBlack(ng.turn() === 'b');
    setGame(ng);
    setSelectedSquare(null);
    setDragPiece(null);
    setMoveIndex(0);
    moveIndexRef.current = 0;
    puzzleStartTimeRef.current = Date.now();
  }, []);

  const startGame = useCallback(() => {
    const totalTime = mode === 'rush3' ? 180 : mode === 'rush5' ? 300 : 0;
    setScore(0);
    scoreRef.current = 0;
    setStreak(0);
    streakRef.current = 0;
    setBestStreak(0);
    setLives(3);
    livesRef.current = 3;
    setPuzzleIndex(0);
    puzzleIndexRef.current = 0;
    setShowCorrect(false);
    setTimeLeft(totalTime);
    timeLeftRef.current = totalTime;
    setMessage('');
    setMessageType('none');
    setPuzzleHistory([]);
    setActiveTab('tasks');
    setReviewIndex(null);
    usedPuzzlesRef.current.clear();

    const first = pickPuzzle(0);
    loadPuzzle(first);
    setPhase('playing');

    if (timerRef.current) clearInterval(timerRef.current);
    if (mode !== 'survival') {
      timerStartRef.current = Date.now();
      timeLeftRef.current = totalTime;
      setTimeLeft(totalTime);
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - timerStartRef.current) / 1000);
        timeLeftRef.current = totalTime - elapsed;
        setTimeLeft(timeLeftRef.current);
        if (timeLeftRef.current <= 0) {
          clearInterval(timerRef.current!);
          setPhase('result');
        }
      }, 500); // 500ms for smoother updates after tab switch
    }
  }, [mode, pickPuzzle, loadPuzzle]);

  const nextPuzzle = useCallback((wasCorrect: boolean) => {
    if (wasCorrect) {
      streakRef.current += 1;
      setStreak(streakRef.current);
      setBestStreak(s => Math.max(s, streakRef.current));
      scoreRef.current += 1;
      setScore(scoreRef.current);
    } else {
      streakRef.current = 0;
      setStreak(0);
      setMessageType('wrong');
      setMessage('Неверно!');
    }

    if (currentPuzzleRef.current) {
      const timeSpent = Math.round((Date.now() - puzzleStartTimeRef.current) / 1000);
      setPuzzleHistory(prev => [...prev, {
        puzzle: currentPuzzleRef.current!,
        status: wasCorrect ? 'correct' : 'wrong',
        index: prev.length,
        timeSpent
      }]);
    }

    if (!wasCorrect && mode === 'survival') {
      if (timerRef.current) clearInterval(timerRef.current);
      setPhase('result');
      flashTimeoutRef.current = setTimeout(() => {
        setMessage('');
        setMessageType('none');
      }, 800);
      return;
    }

    if (!wasCorrect) {
      livesRef.current -= 1;
      setLives(livesRef.current);
      if (livesRef.current <= 0 && mode !== 'survival') {
        if (timerRef.current) clearInterval(timerRef.current);
        setPhase('result');
        flashTimeoutRef.current = setTimeout(() => {
          setMessage('');
          setMessageType('none');
        }, 800);
        return;
      }
    }

    // Load next puzzle after brief delay
    const delay = wasCorrect ? 0 : 800;
    
    flashTimeoutRef.current = setTimeout(() => {
      setShowCorrect(false);
      setMessage('');
      setMessageType('none');
      
      puzzleIndexRef.current += 1;
      setPuzzleIndex(puzzleIndexRef.current);
      const next = pickPuzzle(wasCorrect ? scoreRef.current : scoreRef.current);
      currentPuzzleRef.current = next;
      setCurrentPuzzle(next);
      const ng = new Chess(next.fen);
      setIsBlack(ng.turn() === 'b');
      setGame(ng);
      setSelectedSquare(null);
      setDragPiece(null);
      setMoveIndex(0);
      moveIndexRef.current = 0;
      puzzleStartTimeRef.current = Date.now();
    }, delay);
  }, [streak, puzzleIndex, pickPuzzle, mode]);

  /* ─── Move logic ─── */
  const processMove = useCallback((from: string, to: string) => {
    if (!game || !currentPuzzleRef.current) return;

    const testGame = new Chess(game.fen());
    let move;
    try {
      move = testGame.move({ from, to, promotion: 'q' });
    } catch {
      move = null;
    }

    if (!move) {
      setSelectedSquare(null);
      return;
    }

    // Apply the move to the actual game state so the piece stays on target square
    const newGame = new Chess(game.fen());
    newGame.move({ from, to, promotion: 'q' });

    // Build UCI from move result (handles promotions correctly)
    const userUci = move.from + move.to + (move.promotion || '');
    const expected = currentPuzzleRef.current.moves[moveIndexRef.current]?.replace(/[+#]/g, '');

    if (userUci !== expected) {
      // Wrong move — puzzle failed
      setGame(newGame);
      nextPuzzle(false);
      return;
    }

    // Correct move
    moveIndexRef.current += 1;
    setMoveIndex(moveIndexRef.current);

    if (moveIndexRef.current >= currentPuzzleRef.current.moves.length) {
      // All moves solved — puzzle complete
      setGame(newGame);
      setShowCorrect(true);
      flashTimeoutRef.current = setTimeout(() => {
        setShowCorrect(false);
        nextPuzzle(true);
      }, 1200);
      return;
    }

    // More moves needed — apply opponent's move after delay
    setGame(newGame);
    setSelectedSquare(null);

    opponentTimeoutRef.current = setTimeout(() => {
      if (!currentPuzzleRef.current || moveIndexRef.current >= currentPuzzleRef.current.moves.length) return;
      
      const oppMove = currentPuzzleRef.current.moves[moveIndexRef.current];
      const oppFrom = oppMove.slice(0, 2);
      const oppTo = oppMove.slice(2, 4);
      
      const afterOpp = new Chess(newGame.fen());
      afterOpp.move({ from: oppFrom, to: oppTo, promotion: 'q' });
      
      moveIndexRef.current += 1;
      setMoveIndex(moveIndexRef.current);
      setGame(afterOpp);
      setIsBlack(afterOpp.turn() === 'b');
    }, 800);
  }, [game, nextPuzzle]);

  /* ─── CLICK ─── */
  const handleSquareClick = useCallback((square: string) => {
    if (!game) return;
    const piece = game.get(square as any);

    if (selectedSquare === square) {
      setSelectedSquare(null);
    } else if (selectedSquare) {
      processMove(selectedSquare, square);
    } else {
      if (piece && piece.color === game.turn()) {
        setSelectedSquare(square);
      }
    }
  }, [game, selectedSquare, processMove]);

  /* ─── DRAG & DROP ─── */
  const handlePointerDown = useCallback((e: React.PointerEvent, sq: string) => {
    if (!game) return;
    const piece = game.get(sq as any);
    if (!piece || piece.color !== game.turn()) return;
    if (e.pointerType === 'touch' && !(e as any).isPrimary) return;

    pointerStartRef.current = { x: e.clientX, y: e.clientY, square: sq, moved: false, pointerId: e.pointerId };
  }, [game]);

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
      if (start.moved) {
        setDragPos({ x: e.clientX, y: e.clientY });
      }
    };

    const handleGlobalUp = (e: PointerEvent) => {
      const start = pointerStartRef.current;
      if (!start) return;
      if (e.pointerId !== start.pointerId) return;
      if (start.moved) {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const cell = el?.closest('[data-square]') as HTMLElement | null;
        const targetSq = cell?.dataset.square || null;
        if (targetSq && targetSq !== start.square) {
          processMove(start.square, targetSq);
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
  }, [game, processMove]);

  /* ─── Helpers ─── */
  const getPieceAt = (sq: string) => {
    if (!game) return null;
    const p = game.get(sq as any);
    if (!p) return null;
    return { type: p.type.toUpperCase(), color: p.color as 'w' | 'b' };
  };

  const isLight = (fi: number, ri: number) => (fi + ri) % 2 === 0;

  const validMoves = selectedSquare && game
    ? (game.moves({ square: selectedSquare as any, verbose: true }).map(m => m.to) as string[])
    : dragPiece && game
      ? (game.moves({ square: dragPiece.square as any, verbose: true }).map(m => m.to) as string[])
      : [];

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };


  /* ═══════════════════════════ IDLE ═══════════════════════════ */
  if (phase === 'idle') {
    return (
      <div className="flex flex-col items-center gap-5 w-full max-w-lg mx-auto">
        <div className="rounded-xl p-6 w-full text-center" style={{ background: '#312e2b' }}>
          <h2 className="text-2xl font-bold text-white mb-2">Тактический штурм</h2>
          <p className="text-sm text-gray-400">
            Решайте задачи на скорость. 3 жизни — нарастающая сложность!
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 w-full">
          <button onClick={() => setMode('rush5')} className={`p-4 rounded-xl border-2 transition ${mode==='rush5'?'border-[#81b64c] bg-[#3a3a3a]':'border-[#555] bg-[#2b2b2b] hover:bg-[#333]'}`}>
            <div className="font-bold text-white">5 мин</div>
            <div className="text-xs text-gray-400">Классика</div>
          </button>
          <button onClick={() => setMode('rush3')} className={`p-4 rounded-xl border-2 transition ${mode==='rush3'?'border-[#81b64c] bg-[#3a3a3a]':'border-[#555] bg-[#2b2b2b] hover:bg-[#333]'}`}>
            <div className="font-bold text-white">3 мин</div>
            <div className="text-xs text-gray-400">Блиц</div>
          </button>
          <button onClick={() => setMode('survival')} className={`p-4 rounded-xl border-2 transition ${mode==='survival'?'border-[#81b64c] bg-[#3a3a3a]':'border-[#555] bg-[#2b2b2b] hover:bg-[#333]'}`}>
            <div className="font-bold text-white">Выживание</div>
            <div className="text-xs text-gray-400">1 ошибка = конец</div>
          </button>
        </div>

        <button onClick={startGame} className="w-full py-4 bg-[#81b64c] hover:bg-[#6a9a3d] text-white font-bold rounded-xl text-lg uppercase tracking-wide transition shadow-lg">
          Начать штурм
        </button>
      </div>
    );
  }


  /* ═══════════════════════════ RESULT ═══════════════════════════ */
  if (phase === 'result') {
    const correctCount = puzzleHistory.filter(p => p.status === 'correct').length;
    const wrongCount = puzzleHistory.filter(p => p.status === 'wrong').length;
    const avgTime = correctCount > 0
      ? Math.round(puzzleHistory.filter(p => p.status === 'correct').reduce((a, b) => a + b.timeSpent, 0) / correctCount)
      : 0;

    return (
      <div className="flex flex-col items-center gap-4 w-full max-w-lg mx-auto">
        {/* Score */}
        <div className="w-full bg-[#312e2b] rounded-xl p-6 text-center">
          <div className="text-6xl font-bold text-white mb-1">{score}</div>
          <div className="text-sm text-gray-400">задач решено</div>
        </div>

        {/* Tabs */}
        <div className="w-full flex bg-[#312e2b] rounded-xl overflow-hidden">
          <button onClick={() => setActiveTab('summary')} className={`flex-1 py-3 text-sm font-bold transition ${activeTab==='summary'?'text-white border-b-2 border-[#81b64c]':'text-gray-500 hover:text-gray-300'}`}>
            Краткое описание
          </button>
          <button onClick={() => setActiveTab('tasks')} className={`flex-1 py-3 text-sm font-bold transition ${activeTab==='tasks'?'text-white border-b-2 border-[#81b64c]':'text-gray-500 hover:text-gray-300'}`}>
            Задачи
          </button>
        </div>

        {activeTab === 'summary' && (
          <div className="w-full bg-[#312e2b] rounded-xl p-5 text-sm">
            <div className="flex items-center justify-between py-2 border-b border-[#444]">
              <div className="flex items-center gap-2 text-gray-400">
                <Flame className="w-4 h-4" /> Рекордная серия
              </div>
              <div className="text-white font-bold">{bestStreak}</div>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-[#444]">
              <div className="flex items-center gap-2 text-gray-400">
                <Trophy className="w-4 h-4" /> Труднейшая задача
              </div>
              <div className="text-white font-bold">
                {puzzleHistory.length > 0 ? Math.max(...puzzleHistory.map(p => p.puzzle.rating)) : 0}
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-[#444]">
              <div className="flex items-center gap-2 text-gray-400">
                <Timer className="w-4 h-4" /> В среднем на задачу
              </div>
              <div className="text-white font-bold">{avgTime}s</div>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-[#444]">
              <div className="flex items-center gap-2 text-gray-400">
                <Check className="w-4 h-4" /> Верно
              </div>
              <div className="text-[#81b64c] font-bold">{correctCount}</div>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2 text-gray-400">
                <X className="w-4 h-4" /> Ошибок
              </div>
              <div className="text-red-500 font-bold">{wrongCount}</div>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="grid grid-cols-5 gap-2">
            {puzzleHistory.map((r, i) => (
              <button
                key={i}
                onClick={() => {
                  setReviewIndex(i);
                  setPhase('review');
                }}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition hover:scale-105 ${
                  r.status === 'correct'
                    ? 'bg-[#2d4a1e] hover:bg-[#3a5c26]'
                    : 'bg-[#4a1e1e] hover:bg-[#5c2626]'
                }`}
              >
                {r.status === 'correct' ? (
                  <Check className="w-4 h-4 text-[#81b64c]" />
                ) : (
                  <X className="w-4 h-4 text-red-400" />
                )}
                <span className="text-[10px] text-gray-300">{r.puzzle.rating}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex w-full gap-3">
          <button onClick={() => setPhase('idle')} className="flex-1 py-3 bg-[#444] hover:bg-[#555] text-white rounded-xl font-bold flex items-center justify-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Назад
          </button>
          <button onClick={startGame} className="flex-1 py-3 bg-[#81b64c] hover:bg-[#6a9a3d] text-white rounded-xl font-bold flex items-center justify-center gap-1">
            <RotateCcw className="w-4 h-4" /> Играть снова
          </button>
        </div>
      </div>
    );
  }


  /* ═══════════════════════════ REVIEW ═══════════════════════════ */
  if (phase === 'review' && reviewIndex !== null && puzzleHistory[reviewIndex]) {
    const result = puzzleHistory[reviewIndex];
    const reviewGame = new Chess(result.puzzle.fen);
    const moveFrom = result.puzzle.moves[0]?.substring(0, 2);
    const moveTo = result.puzzle.moves[0]?.substring(2, 4);
    const reviewIsBlack = reviewGame.turn() === 'b';

    const rFiles = reviewIsBlack ? REVERSED_FILES : FILES;
    const rRanks = reviewIsBlack ? REVERSED_DISPLAY_RANKS : DISPLAY_RANKS;

    return (
      <div className="flex flex-col items-center gap-4 w-full max-w-lg mx-auto">
        <div className="w-full bg-[#312e2b] rounded-xl p-4 flex items-center justify-between">
          <button
            onClick={() => {
              setReviewIndex(null);
              setPhase('result');
            }}
            className="text-white hover:text-gray-300 flex items-center gap-1 text-sm"
          >
            <ChevronLeft className="w-4 h-4" /> К результатам
          </button>
          <span className="text-white font-bold text-sm">
            Задача {reviewIndex + 1} / {puzzleHistory.length}
          </span>
        </div>

        <div className="w-full bg-[#312e2b] rounded-xl p-3 text-center">
          <div className={`text-sm font-bold mb-1 ${result.status === 'correct' ? 'text-[#81b64c]' : 'text-red-400'}`}>
            {result.status === 'correct' ? '✓ Верно' : '✗ Ошибка'}
          </div>
          <div className="text-gray-400 text-xs">
            Рейтинг: {result.puzzle.rating} | Время: {result.timeSpent}с
          </div>
          {result.puzzle.moves[0] && (
            <div className="text-white text-sm mt-1">
              Правильный ход: <span className="font-bold text-[#81b64c]">{moveFrom} → {moveTo}</span>
            </div>
          )}
        </div>

        <div className="flex justify-center w-full">
          <div className="relative select-none" style={{ width: sqSize * 8, height: sqSize * 8 }}>
            {rRanks.map((rank, ri) =>
              rFiles.map((file, fi) => {
                const sq = file + rank;
                const pieceObj = reviewGame.get(sq as any);
                const isLight = (ri + fi) % 2 === 0;
                const isFrom = sq === moveFrom;
                const isTo = sq === moveTo;

                return (
                  <div
                    key={sq}
                    data-square={sq}
                    className="absolute flex items-center justify-center"
                    style={{
                      left: fi * sqSize,
                      top: ri * sqSize,
                      width: sqSize,
                      height: sqSize,
                      backgroundColor: isFrom || isTo ? '#7ed321' : (isLight ? LIGHT_SQ : DARK_SQ),
                      opacity: isFrom ? 0.5 : 1,
                    }}
                  >
                    {pieceObj && (
                      <div style={{ width: sqSize * 0.82, height: sqSize * 0.82 }}>
                        <PieceImg type={pieceObj.type.toUpperCase()} color={pieceObj.color as 'w' | 'b'} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="flex w-full gap-3">
          <button
            onClick={() => setReviewIndex(prev => (prev !== null && prev > 0 ? prev - 1 : prev))}
            disabled={reviewIndex === 0}
            className={`flex-1 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-1 transition ${reviewIndex > 0 ? 'bg-[#444] text-white hover:bg-[#555]' : 'bg-[#333] text-gray-600 cursor-not-allowed'}`}
          >
            <ChevronLeft className="w-4 h-4" /> Предыдущая
          </button>
          <button
            onClick={() => setReviewIndex(prev => (prev !== null && prev < puzzleHistory.length - 1 ? prev + 1 : prev))}
            disabled={reviewIndex >= puzzleHistory.length - 1}
            className={`flex-1 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-1 transition ${reviewIndex < puzzleHistory.length - 1 ? 'bg-[#444] text-white hover:bg-[#555]' : 'bg-[#333] text-gray-600 cursor-not-allowed'}`}
          >
            Следующая <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════ PLAYING ═══════════════════════════ */
  const turnText = game ? (game.turn() === 'w' ? 'Ход белых' : 'Ход чёрных') : '';

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-lg mx-auto">
      {/* Top bar */}
      <div className="flex w-full justify-between items-center bg-white rounded-xl p-3 shadow">
        <div className="flex flex-col">
          <span className="text-xs text-slate-500 uppercase">Очки</span>
          <span className="text-2xl font-bold text-slate-800">{score}</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1 text-orange-500">
            <Flame className="w-4 h-4" />
            <span className="text-sm font-bold">{streak}</span>
          </div>
          {mode !== 'survival' && (
            <span className="text-lg font-mono font-bold text-slate-800">{formatTime(Math.ceil(timeLeft))}</span>
          )}
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs text-slate-500 uppercase">Задача</span>
          <span className="text-2xl font-bold text-slate-800">{puzzleIndex + 1}</span>
        </div>
      </div>

      {/* Timer bar */}
      {mode !== 'survival' && (
        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#c75b2a] rounded-full"
            style={{
              width: `${(timeLeft / (mode === 'rush3' ? 180 : 300)) * 100}%`,
              transition: 'width 1s linear',
            }}
          />
        </div>
      )}

      {/* Turn / Theme hint */}
      <div className="flex w-full justify-between items-center px-1">
        <span className="text-sm font-medium text-slate-600">{turnText}</span>
        {currentPuzzle && (
          <span className="text-xs text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded">
            {currentPuzzle.theme}
          </span>
        )}
      </div>

      {/* Feedback flash - wrong only */}
      {messageType === 'wrong' && (
        <div className="w-full text-center py-2 rounded-lg font-bold text-lg bg-red-500 text-white">
          {message}
        </div>
      )}

      {/* Fixed toast — top of screen, doesn't affect layout */}
      {showCorrect && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100]">
          <div className="bg-green-500 text-white px-6 py-2 rounded-lg font-bold text-base shadow-lg flex items-center gap-2">
            <Check className="w-5 h-5" />
            Правильно
          </div>
        </div>
      )}

      {/* Board */}
      <div className="flex justify-center w-full relative">
        <div
          data-board
          className="grid border-[3px] border-[#2b2b2b] rounded-sm relative select-none"
          style={{
            gridTemplateColumns: `repeat(8, ${sqSize}px)`,
            gridTemplateRows: `repeat(8, ${sqSize}px)`,
            touchAction: 'none',
          }}
        >
          {(isBlack ? REVERSED_DISPLAY_RANKS : DISPLAY_RANKS).map((rank, ri) =>
            (isBlack ? REVERSED_FILES : FILES).map((file, fi) => {
              const sq = `${file}${rank}`;
              const pieceObj = getPieceAt(sq);
              const light = isLight(isBlack ? 7-fi : fi, isBlack ? 7-ri : ri);
              const sel = selectedSquare === sq || dragPiece?.square === sq;
              const isValidMove = validMoves.includes(sq);
              const isDragSource = dragPiece?.square === sq;

              return (
                <div
                  key={sq}
                  data-square={sq}
                  className="flex items-center justify-center relative select-none"
                  style={{
                    width: sqSize,
                    height: sqSize,
                    cursor: pieceObj && pieceObj.color === game?.turn() ? 'grab' : 'default',
                    touchAction: 'none',
                    backgroundColor: light ? LIGHT_SQ : DARK_SQ,
                    opacity: isDragSource ? 0.3 : 1,
                  }}
                  onClick={() => handleSquareClick(sq)}
                  onPointerDown={(e) => handlePointerDown(e, sq)}
                  onDragStart={(e) => e.preventDefault()}
                >
                  {/* Selection highlight */}
                  {sel && (
                    <div className="absolute inset-[1px] rounded-[5px] bg-[rgba(100,160,60,0.45)] pointer-events-none z-10" />
                  )}

                  {/* Coordinates */}
                  {fi === 0 && (
                    <span className={`absolute top-0.5 left-1 text-[10px] font-bold ${light ? 'text-[#b58863]' : 'text-[#f0d9b5]'}`}>{rank}</span>
                  )}
                  {ri === 7 && (
                    <span className={`absolute bottom-0.5 right-1 text-[10px] font-bold ${light ? 'text-[#b58863]' : 'text-[#f0d9b5]'}`}>{file}</span>
                  )}

                  {/* Valid move indicator */}
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

                  {/* Piece */}
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

        {/* Floating dragged piece */}
        {dragPiece && (
          <div
            className="fixed pointer-events-none z-50"
            style={{
              left: dragPos.x - Math.round(sqSize * 0.425),
              top: dragPos.y - Math.round(sqSize * 0.425),
              width: Math.round(sqSize * 0.85),
              height: Math.round(sqSize * 0.85),
            }}
          >
            <PieceImg type={dragPiece.type} color={dragPiece.color} size={Math.round(sqSize * 0.85)} />
          </div>
        )}
      </div>

      {/* Error indicators + Difficulty */}
      <div className="flex w-full justify-between items-center mt-1">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`w-6 h-6 rounded flex items-center justify-center ${
                i < (3 - lives)
                  ? 'bg-red-500 text-white'
                  : 'bg-slate-200 text-slate-400'
              }`}
            >
              <X className="w-3.5 h-3.5" />
            </div>
          ))}
        </div>
        {currentPuzzle && (
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-400 uppercase">Сложность</span>
            <span className="text-sm font-bold text-slate-600">{currentPuzzle.rating}</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex w-full gap-2 mt-1">
        <button onClick={() => setPhase('idle')} className="w-full py-2.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium text-sm transition">
          Стоп
        </button>
      </div>
    </div>
  );
}

/* ═══ Fallback puzzles if JSON fails ═══ */
function getFallbackPuzzles(): Puzzle[] {
  return [
    { fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 1', moves: ['Qxf7#'], theme: 'mate-in-1', rating: 400 },
    { fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1', moves: ['Nxe5'], theme: 'fork', rating: 500 },
    { fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', moves: ['Qh4'], theme: 'attack', rating: 600 },
    { fen: 'rnbqkb1r/pppp1ppp/5n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1', moves: ['Nxe5'], theme: 'fork', rating: 700 },
    { fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1', moves: ['Nxe5'], theme: 'fork', rating: 800 },
  ];
}
