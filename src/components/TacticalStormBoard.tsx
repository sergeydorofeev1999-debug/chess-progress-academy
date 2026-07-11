'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Chess } from 'chess.js';
import { Trophy, Zap, Timer, RotateCcw, ArrowLeft, ChevronRight, Flame, SkipForward } from 'lucide-react';

const FILES = ['a','b','c','d','e','f','g','h'];
const RANKS   = ['8','7','6','5','4','3','2','1'];
const LIGHT_SQ = '#f0d9b5';
const DARK_SQ  = '#b58863';

/* ═══ Piece image (cburnett SVGs) ═══ */
function PieceImg({ type, color, size }: { type: string; color: 'w' | 'b'; size: number }) {
  const pieceKey = `${color}${type.toUpperCase()}`;
  return (
    <img
      src={`/pieces/cburnett/${pieceKey}.svg`}
      alt=""
      draggable={false}
      style={{
        width: Math.round(size * 0.85),
        height: Math.round(size * 0.85),
        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))',
      }}
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

interface Props {
  onComplete?: () => void;
  lessonId?: string;
}

type Phase = 'settings' | 'playing' | 'result';
type Mode = 'rush5' | 'rush3' | 'survival';

/* ═══ Component ═══ */
export default function TacticalStormBoard({ onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>('settings');
  const [mode, setMode] = useState<Mode>('rush5');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(300);
  const [skips, setSkips] = useState(3);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'none' | 'correct' | 'wrong'>('none');

  const [game, setGame] = useState<Chess | null>(null);
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle | null>(null);
  const [puzzleIndex, setPuzzleIndex] = useState(0);

  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [validMoves, setValidMoves] = useState<string[]>([]);
  const [sqSize, setSqSize] = useState(56);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const puzzleListRef = useRef<Puzzle[]>([]);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ─── Resize ─── */
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

  /* ─── Load puzzle DB ─── */
  useEffect(() => {
    if (puzzleListRef.current.length > 0) return;
    fetch('/puzzles/tactical-storm.json')
      .then(r => r.json())
      .then(data => { puzzleListRef.current = (data.puzzles || []) as Puzzle[]; })
      .catch(() => { puzzleListRef.current = getFallbackPuzzles(); });
  }, []);

  /* ─── Helpers ─── */
  const pickPuzzle = useCallback((index: number): Puzzle => {
    const list = puzzleListRef.current;
    if (!list.length) return getFallbackPuzzles()[0];
    return list[index % list.length];
  }, []);

  const startGame = useCallback(() => {
    const totalTime = mode === 'rush3' ? 180 : mode === 'rush5' ? 300 : 0;
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setTimeLeft(totalTime);
    setSkips(mode === 'survival' ? 999 : 3);
    setMessage('');
    setMessageType('none');
    setPuzzleIndex(0);

    const first = pickPuzzle(0);
    setCurrentPuzzle(first);
    setGame(new Chess(first.fen));
    setSelectedSquare(null);
    setValidMoves([]);
    setPhase('playing');

    if (timerRef.current) clearInterval(timerRef.current);
    if (mode !== 'survival') {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 0.5) {
            if (timerRef.current) clearInterval(timerRef.current);
            setPhase('result');
            return 0;
          }
          return Math.max(0, t - 1);
        });
      }, 1000);
    }
  }, [mode, pickPuzzle]);

  const stopGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('result');
  }, []);

  const nextPuzzle = useCallback((wasCorrect: boolean) => {
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);

    if (wasCorrect) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setBestStreak(prev => Math.max(prev, newStreak));
      setScore(s => s + 1 + Math.floor(newStreak / 3)); // bonus every 3 streak
      setMessage('Верно!');
      setMessageType('correct');
    } else {
      setStreak(0);
      setScore(s => Math.max(0, s - 1));
      setMessage('Неверно!');
      setMessageType('wrong');
    }

    const idx = puzzleIndex + 1;
    setPuzzleIndex(idx);
    const next = pickPuzzle(idx);
    setCurrentPuzzle(next);
    setGame(new Chess(next.fen));
    setSelectedSquare(null);
    setValidMoves([]);

    flashTimeoutRef.current = setTimeout(() => {
      setMessage('');
      setMessageType('none');
    }, 800);
  }, [streak, puzzleIndex, pickPuzzle]);

  const handleSkip = useCallback(() => {
    if (mode !== 'survival' && skips <= 0) return;
    if (mode !== 'survival') setSkips(s => s - 1);
    setStreak(0);
    nextPuzzle(false);
    if (mode !== 'survival') {
      setTimeLeft(t => Math.max(0, t - 5)); // penalty
    }
  }, [mode, skips, nextPuzzle]);

  /* ─── Move logic ─── */
  const processMove = useCallback((from: string, to: string) => {
    if (!game || !currentPuzzle) return;

    const moveStr = `${from}${to}`;
    const expected = currentPuzzle.moves[0].replace(/[+#]/g, '');

    if (moveStr === expected) {
      nextPuzzle(true);
    } else {
      nextPuzzle(false);
    }
  }, [game, currentPuzzle, nextPuzzle]);

  const handleSquareClick = useCallback((square: string) => {
    if (!game) return;
    const piece = game.get(square as any);

    if (selectedSquare === square) {
      setSelectedSquare(null);
      setValidMoves([]);
    } else if (selectedSquare) {
      processMove(selectedSquare, square);
    } else {
      if (piece && piece.color === game.turn()) {
        setSelectedSquare(square);
        const moves = game.moves({ square: square as any, verbose: true }).map(m => m.to);
        setValidMoves(moves);
      }
    }
  }, [game, selectedSquare, processMove]);

  const isLight = (fi: number, ri: number) => (fi + ri) % 2 === 0;
  const getPieceAt = (sq: string) => {
    if (!game) return null;
    const p = game.get(sq as any);
    if (!p) return null;
    return { type: p.type.toUpperCase(), color: p.color as 'w' | 'b' };
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  /* ═══════════════════════════ SETTINGS ═══════════════════════════ */
  if (phase === 'settings') {
    return (
      <div className="flex flex-col items-center gap-5 w-full max-w-lg mx-auto">
        <div className="bg-white rounded-xl shadow p-5 w-full text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Zap className="w-8 h-8 text-yellow-500" />
            <h2 className="text-2xl font-bold text-slate-800">Тактический штурм</h2>
          </div>
          <p className="text-sm text-slate-600">
            Решайте тактические задачи на скорость. Чем быстрее и точнее — тем выше результат!
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 w-full">
          <button onClick={() => setMode('rush5')} className={`flex items-center gap-3 p-4 rounded-xl border-2 transition ${mode==='rush5'?'border-[#c75b2a] bg-orange-50':'border-slate-200 bg-white hover:bg-slate-50'}`}>
            <Timer className={`w-6 h-6 ${mode==='rush5'?'text-[#c75b2a]':'text-slate-400'}`} />
            <div className="text-left">
              <div className="font-bold text-slate-800">Штурм — 5 минут</div>
              <div className="text-xs text-slate-500">Решайте задачи за 5 минут. 3 пропуска.</div>
            </div>
          </button>

          <button onClick={() => setMode('rush3')} className={`flex items-center gap-3 p-4 rounded-xl border-2 transition ${mode==='rush3'?'border-[#c75b2a] bg-orange-50':'border-slate-200 bg-white hover:bg-slate-50'}`}>
            <Zap className={`w-6 h-6 ${mode==='rush3'?'text-[#c75b2a]':'text-slate-400'}`} />
            <div className="text-left">
              <div className="font-bold text-slate-800">Блиц — 3 минуты</div>
              <div className="text-xs text-slate-500">Экстремальная скорость. 3 пропуска.</div>
            </div>
          </button>

          <button onClick={() => setMode('survival')} className={`flex items-center gap-3 p-4 rounded-xl border-2 transition ${mode==='survival'?'border-[#c75b2a] bg-orange-50':'border-slate-200 bg-white hover:bg-slate-50'}`}>
            <Flame className={`w-6 h-6 ${mode==='survival'?'text-[#c75b2a]':'text-slate-400'}`} />
            <div className="text-left">
              <div className="font-bold text-slate-800">Выживание</div>
              <div className="text-xs text-slate-500">Без ограничения времени. Ошибка — конец.</div>
            </div>
          </button>
        </div>

        <button onClick={startGame} className="w-full py-4 bg-[#c75b2a] hover:bg-[#a84a22] text-white font-bold rounded-xl text-lg uppercase tracking-wide transition shadow-lg">
          Начать штурм
        </button>
      </div>
    );
  }

  /* ═══════════════════════════ RESULT ═══════════════════════════ */
  if (phase === 'result') {
    return (
      <div className="flex flex-col items-center gap-5 w-full max-w-lg mx-auto">
        <div className="bg-white rounded-xl shadow p-6 w-full text-center">
          <Trophy className="w-14 h-14 text-yellow-500 mx-auto mb-3" />
          <h2 className="text-3xl font-bold text-slate-800 mb-1">Результат</h2>
          <div className="text-6xl font-mono font-bold text-[#c75b2a] mb-2">{score}</div>
          <div className="text-sm text-slate-500 mb-4">очков</div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs text-slate-500 uppercase">Лучшая серия</div>
              <div className="text-xl font-bold text-slate-800 flex items-center justify-center gap-1">
                <Flame className="w-4 h-4 text-orange-500" /> {bestStreak}
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs text-slate-500 uppercase">Решено</div>
              <div className="text-xl font-bold text-slate-800">{puzzleIndex}</div>
            </div>
          </div>

          {score >= 5 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <p className="text-green-700 font-bold">Отличный результат!</p>
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <button onClick={() => setPhase('settings')} className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium text-sm flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Настройки
            </button>
            <button onClick={startGame} className="px-5 py-2.5 bg-[#c75b2a] hover:bg-[#a84a22] text-white rounded-lg font-medium text-sm flex items-center gap-1">
              <RotateCcw className="w-4 h-4" /> Заново
            </button>
          </div>
        </div>

        {onComplete && score >= 3 && (
          <button onClick={onComplete} className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg uppercase transition">
            Урок пройден ✓
          </button>
        )}
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
          <span className="text-xs text-slate-500 uppercase">Пропуски</span>
          <span className="text-2xl font-bold text-slate-800">{skips}</span>
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

      {/* Feedback flash */}
      {messageType !== 'none' && (
        <div className={`w-full text-center py-2 rounded-lg font-bold text-lg ${
          messageType === 'correct' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
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
          }}
        >
          {RANKS.map((rank, ri) =>
            FILES.map((file, fi) => {
              const sq = `${file}${rank}`;
              const piece = getPieceAt(sq);
              const light = isLight(fi, ri);
              const isSelected = selectedSquare === sq;
              const isValidTarget = validMoves.includes(sq);

              return (
                <div
                  key={sq}
                  data-square={sq}
                  className="flex items-center justify-center relative select-none"
                  style={{
                    width: sqSize,
                    height: sqSize,
                    backgroundColor: isSelected
                      ? 'rgba(234,179,8,0.55)'
                      : isValidTarget
                        ? 'rgba(34,197,94,0.35)'
                        : light
                          ? LIGHT_SQ
                          : DARK_SQ,
                    cursor: 'pointer',
                  }}
                  onClick={() => handleSquareClick(sq)}
                >
                  {/* Coordinates */}
                  {fi === 0 && (
                    <span className={`absolute top-0.5 left-1 text-[10px] font-bold ${light ? 'text-[#b58863]' : 'text-[#f0d9b5]'}`}>{rank}</span>
                  )}
                  {ri === 7 && (
                    <span className={`absolute bottom-0.5 right-1 text-[10px] font-bold ${light ? 'text-[#b58863]' : 'text-[#f0d9b5]'}`}>{file}</span>
                  )}

                  {/* Piece */}
                  {piece && (
                    <div className="relative pointer-events-none z-10">
                      <PieceImg type={piece.type} color={piece.color} size={sqSize} />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex w-full gap-2 mt-1">
        {mode !== 'survival' && (
          <button
            onClick={handleSkip}
            disabled={skips <= 0}
            className={`flex-1 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-1 transition ${
              skips > 0
                ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <SkipForward className="w-4 h-4" /> Пропуск ({skips})
          </button>
        )}
        <button onClick={stopGame} className="flex-1 py-2.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium text-sm transition">
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
