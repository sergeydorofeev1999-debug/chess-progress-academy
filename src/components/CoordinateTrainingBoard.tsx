'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ArrowLeft, RotateCcw, Trophy } from 'lucide-react';

const FILES = ['a','b','c','d','e','f','g','h'];
const RANKS   = ['8','7','6','5','4','3','2','1'];
const LIGHT_SQ = '#f0d9b5';
const DARK_SQ  = '#b58863';

/* ═══ Piece image (cburnett PNGs, same as lesson 38) ═══ */
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

/* ═══ Helpers ═══ */
const START_POS: Record<string, {t:string;c:'w'|'b'}> = {};
for (let f = 0; f < 8; f++) {
  START_POS[`${FILES[f]}2`] = { t: 'p', c: 'w' };
  START_POS[`${FILES[f]}7`] = { t: 'p', c: 'b' };
}
const BACK = ['r','n','b','q','k','b','n','r'];
BACK.forEach((t, i) => { START_POS[`${FILES[i]}1`] = { t, c: 'w' }; });
BACK.forEach((t, i) => { START_POS[`${FILES[i]}8`] = { t, c: 'b' }; });

function randomSquare(): string {
  return `${FILES[Math.floor(Math.random() * 8)]}${RANKS[Math.floor(Math.random() * 8)]}`;
}
function randomOpts(count: number, exclude: string): string[] {
  const set = new Set<string>([exclude]);
  while (set.size < count + 1) set.add(randomSquare());
  const arr = Array.from(set);
  arr.splice(arr.indexOf(exclude), 1);
  return arr.slice(0, count);
}

/* ═══ Types ═══ */
type Mode = 'find' | 'name';
type Time = '30' | 'unlimited';
type Side = 'white' | 'black' | 'random';

interface Props {
  onComplete?: () => void;
  lessonId?: string;
}

/* ═══ Component ═══ */
export default function CoordinateTrainingBoard({ onComplete }: Props) {
  const [mode, setMode]       = useState<Mode>('find');
  const [timeMode, setTime]   = useState<Time>('30');
  const [side, setSide]       = useState<Side>('random');
  const [effectiveSide, setEffectiveSide] = useState<'white'|'black'>('white');
  const [showCoords, setCoords] = useState(true);
  const [showPieces, setPieces] = useState(true);

  const [phase, setPhase]     = useState<'settings' | 'playing' | 'result'>('settings');
  const [score, setScore]     = useState(0);
  const [errors, setErrors]   = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [target, setTarget]   = useState('');
  const [nameOpts, setNameOpts] = useState<string[]>([]);
  const [flashSq, setFlashSq] = useState<string | null>(null);
  const [flashOk, setFlashOk] = useState<boolean | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [sqSize, setSqSize] = useState(52);

  /* board order based on effectiveSide */
  const dFiles = effectiveSide === 'white' ? FILES : [...FILES].reverse(); // white: a→h, black: h→a
  const dRanks = effectiveSide === 'black' ? [...RANKS].reverse() : RANKS; // white: 8..1 top (white bottom), black: 1..8 top (black bottom)

  useEffect(() => {
    const upd = () => {
      const mob = window.innerWidth < 1024;
      setSqSize(mob
        ? Math.min(64, Math.max(36, Math.floor((window.innerWidth - 24) / 8)))
        : Math.min(64, Math.max(48, Math.floor((window.innerWidth - 340) / 8)))
      );
    };
    upd();
    window.addEventListener('resize', upd);
    return () => window.removeEventListener('resize', upd);
  }, []);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const nextQuestion = useCallback(() => {
    const sq = randomSquare();
    setTarget(sq);
    setFlashSq(null);
    setFlashOk(null);
    if (mode === 'name') {
      const opts = randomOpts(3, sq);
      opts.push(sq);
      setNameOpts(opts.sort(() => Math.random() - 0.5));
    }
  }, [mode]);

  const startGame = useCallback(() => {
    setScore(0);
    setErrors(0);
    setTimeLeft(timeMode === '30' ? 30 : 0);
    const chosen = side === 'random' ? (Math.random() < 0.5 ? 'white' : 'black') : side;
    setEffectiveSide(chosen);
    setPhase('playing');
    nextQuestion();
    if (timeMode === '30') {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 0.1) {
            if (timerRef.current) clearInterval(timerRef.current);
            setPhase('result');
            return 0;
          }
          return Math.max(0, t - 1);
        });
      }, 1000);
    }
  }, [timeMode, nextQuestion]);

  const stopGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('result');
  }, []);

  const handleClick = useCallback((square: string) => {
    if (phase !== 'playing') return;
    if (mode === 'find') {
      if (square === target) {
        setScore(s => s + 1);
        setFlashSq(square);
        setFlashOk(true);
        setTimeout(() => nextQuestion(), 350);
      } else {
        setErrors(e => e + 1);
        setFlashSq(square);
        setFlashOk(false);
        setTimeout(() => { setFlashSq(null); setFlashOk(null); }, 450);
      }
    }
  }, [phase, mode, target, nextQuestion]);

  const handleName = useCallback((ans: string) => {
    if (phase !== 'playing') return;
    if (ans === target) {
      setScore(s => s + 1);
      setFlashSq(target);
      setFlashOk(true);
      setTimeout(() => nextQuestion(), 350);
    } else {
      setErrors(e => e + 1);
      setFlashSq(target);
      setFlashOk(false);
      setTimeout(() => { setFlashSq(null); setFlashOk(null); }, 450);
    }
  }, [phase, target, nextQuestion]);

  const isLight = (fi: number, ri: number) => (fi + ri) % 2 === 0;

  /* ═══════════════════════════ SETTINGS ═══════════════════════════ */
  if (phase === 'settings') {
    return (
      <div className="flex flex-col items-center gap-4 w-full max-w-lg mx-auto">
        <div className="bg-white rounded-xl shadow p-4 w-full">
          <h2 className="text-xl font-light text-slate-800 mb-2">Координаты</h2>
          <p className="text-sm text-slate-600 mb-2">
            Знание координат на шахматной доске — очень важный навык для шахматиста:
          </p>
          <ul className="text-sm text-slate-600 list-disc pl-5 space-y-1 mb-3">
            <li>В большинстве шахматных курсов и упражнений широко используется шахматная нотация.</li>
            <li>Вам будет проще общаться с другом-шахматистом, если вы оба будете понимать «язык шахмат».</li>
            <li>Анализировать игры гораздо проще, когда не тратится время на поиск полей по их координатам.</li>
          </ul>
          <h3 className="font-bold text-slate-800 mb-1">{mode === 'find' ? 'Найти поле' : 'Обозначить поле'}</h3>
          <p className="text-sm text-slate-600">
            {mode === 'find'
              ? 'Координаты появляются на доске, и вам нужно отметить соответствующее им поле.'
              : 'Поля подсвечиваются на доске, и вам нужно выбрать правильную координату.'}
          </p>
          <p className="text-sm text-slate-600 mt-1">
            {timeMode === '30' ? 'У вас есть 30 секунд на то, чтобы правильно ответить как можно больше раз!' : 'Тренируйтесь без ограничения по времени.'}
          </p>
        </div>

        <div className="flex w-full gap-2">
          <button onClick={() => setMode('find')} className={`flex-1 py-2 rounded-lg font-medium text-sm transition ${mode==='find'?'bg-[#c75b2a] text-white':'bg-white text-slate-700 border'}`}>Найти поле</button>
          <button onClick={() => setMode('name')} className={`flex-1 py-2 rounded-lg font-medium text-sm transition ${mode==='name'?'bg-[#c75b2a] text-white':'bg-white text-slate-700 border'}`}>Обозначить поле</button>
        </div>

        <div className="flex w-full gap-2">
          <button onClick={() => setTime('unlimited')} className={`flex-1 py-2 rounded-lg font-medium text-sm transition ${timeMode==='unlimited'?'bg-[#c75b2a] text-white':'bg-white text-slate-700 border'}`}>∞ Без ограничения</button>
          <button onClick={() => setTime('30')} className={`flex-1 py-2 rounded-lg font-medium text-sm transition ${timeMode==='30'?'bg-[#c75b2a] text-white':'bg-white text-slate-700 border'}`}>0:30</button>
        </div>

        <div className="flex w-full gap-2 justify-center">
          <button onClick={() => setSide('white')} className={`w-14 h-14 rounded-lg flex items-center justify-center border transition ${side==='white'?'bg-[#c75b2a] border-[#c75b2a]':'bg-white border-slate-300'}`}>
            <div className="w-8 h-8"><PieceImg type="k" color="w" size={32} /></div>
          </button>
          <button onClick={() => setSide('random')} className={`w-14 h-14 rounded-lg flex items-center justify-center border transition ${side==='random'?'bg-[#c75b2a] border-[#c75b2a]':'bg-white border-slate-300'}`}>
            <div className="flex -space-x-1">
              <div className="w-5 h-5"><PieceImg type="k" color="b" size={20} /></div>
              <div className="w-5 h-5"><PieceImg type="k" color="w" size={20} /></div>
            </div>
          </button>
          <button onClick={() => setSide('black')} className={`w-14 h-14 rounded-lg flex items-center justify-center border transition ${side==='black'?'bg-[#c75b2a] border-[#c75b2a]':'bg-white border-slate-300'}`}>
            <div className="w-8 h-8"><PieceImg type="k" color="b" size={32} /></div>
          </button>
        </div>

        <div className="flex flex-col w-full gap-2 bg-white rounded-xl p-3 shadow">
          <label className="flex items-center justify-between text-sm text-slate-700">
            <span>Показывать координаты</span>
            <button onClick={() => setCoords(v => !v)} className={`w-12 h-6 rounded-full transition ${showCoords ? 'bg-green-500' : 'bg-slate-300'}`}>
              <span className={`block w-5 h-5 bg-white rounded-full mt-0.5 ml-0.5 transition ${showCoords ? 'translate-x-6' : ''}`} />
            </button>
          </label>
          <label className="flex items-center justify-between text-sm text-slate-700">
            <span>Показывать фигуры</span>
            <button onClick={() => setPieces(v => !v)} className={`w-12 h-6 rounded-full transition ${showPieces ? 'bg-green-500' : 'bg-slate-300'}`}>
              <span className={`block w-5 h-5 bg-white rounded-full mt-0.5 ml-0.5 transition ${showPieces ? 'translate-x-6' : ''}`} />
            </button>
          </label>
        </div>

        <button onClick={startGame} className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg uppercase tracking-wide transition">
          Начать тренировку
        </button>
      </div>
    );
  }

  /* ═══════════════════════════ RESULT ═══════════════════════════ */
  if (phase === 'result') {
    return (
      <div className="flex flex-col items-center gap-4 w-full max-w-lg mx-auto">
        <div className="bg-white rounded-xl shadow p-6 w-full text-center">
          <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-2" />
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Результат</h2>
          <div className="text-5xl font-mono font-bold text-slate-800 mb-2">{score}</div>
          <div className="text-sm text-slate-500 mb-4">правильных ответов</div>
          {errors > 0 && <div className="text-sm text-red-500 mb-4">Ошибок: {errors}</div>}
          <div className="flex gap-3 justify-center">
            <button onClick={() => setPhase('settings')} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium text-sm flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Настройки
            </button>
            <button onClick={startGame} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium text-sm flex items-center gap-1">
              <RotateCcw className="w-4 h-4" /> Заново
            </button>
          </div>
        </div>
        {onComplete && score >= 5 && (
          <button onClick={onComplete} className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg uppercase transition">
            Урок пройден ✓
          </button>
        )}
      </div>
    );
  }

  /* ═══════════════════════════ PLAYING ═══════════════════════════ */
  return (
    <div className="flex flex-col items-center gap-2 w-full">
      {/* progress */}
      {timeMode === '30' && (
        <div className="w-full h-1 bg-slate-200 rounded">
          <div
            className="h-full bg-green-500 rounded"
            style={{
              width: `${((30 - timeLeft) / 30) * 100}%`,
              transition: 'width 1s linear',
            }}
          />
        </div>
      )}

      {/* score / time */}
      <div className="flex w-full justify-between px-2 text-sm text-slate-600">
        <span>Результат: <span className="font-bold text-slate-800">{score}</span></span>
        {timeMode === '30' && <span>Время: <span className="font-mono font-bold text-slate-800">{timeLeft.toFixed(1)}</span></span>}
      </div>

      {/* prompt (find mode) */}
      {mode === 'find' && target && (
        <div className="text-center py-2">
          <span className="text-5xl font-bold text-slate-800 drop-shadow-sm">{target}</span>
        </div>
      )}

      {/* BOARD — same style as lesson 38 */}
      <div className="flex justify-center w-full">
        <div
          className="grid border-[3px] border-[#2b2b2b] rounded-sm relative select-none"
          style={{
            gridTemplateColumns: `repeat(8, ${sqSize}px)`,
            gridTemplateRows: `repeat(8, ${sqSize}px)`,
          }}
        >
          {dRanks.map((rank, ri) =>
            dFiles.map((file, fi) => {
              const sq = `${file}${rank}`;
              const piece = showPieces ? START_POS[sq] : null;
              const light = isLight(fi, ri);
              const isFlash = flashSq === sq;
              const flashBg = isFlash
                ? flashOk === true
                  ? 'rgba(34,197,94,0.55)'
                  : 'rgba(239,68,68,0.55)'
                : null;
              const isTarget = mode === 'name' && target === sq;

              return (
                <div
                  key={sq}
                  data-square={sq}
                  className="flex items-center justify-center relative select-none"
                  style={{
                    width: sqSize,
                    height: sqSize,
                    backgroundColor: flashBg || (light ? LIGHT_SQ : DARK_SQ),
                    cursor: mode === 'find' ? 'pointer' : 'default',
                  }}
                  onClick={() => handleClick(sq)}
                >
                  {/* coords */}
                  {showCoords && fi === 0 && (
                    <span className={`absolute top-0.5 left-1 text-[10px] font-bold ${light ? 'text-[#b58863]' : 'text-[#f0d9b5]'}`}>{rank}</span>
                  )}
                  {showCoords && ri === 7 && (
                    <span className={`absolute bottom-0.5 right-1 text-[10px] font-bold ${light ? 'text-[#b58863]' : 'text-[#f0d9b5]'}`}>{file}</span>
                  )}

                  {/* name-mode target highlight */}
                  {isTarget && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-3/4 h-3/4 rounded-full bg-green-500/40 animate-pulse" />
                    </div>
                  )}

                  {/* piece */}
                  {piece && (
                    <div className="relative pointer-events-none z-10">
                      <PieceImg type={piece.t} color={piece.c} size={sqSize} />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* name mode options */}
      {mode === 'name' && (
        <div className="grid grid-cols-2 gap-2 w-full max-w-sm mt-2">
          {nameOpts.map(opt => (
            <button key={opt} onClick={() => handleName(opt)}
              className="py-3 bg-white border-2 border-slate-200 rounded-lg font-bold text-lg text-slate-800 hover:bg-slate-50 active:bg-slate-100 transition"
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {/* stop */}
      <div className="flex gap-2 mt-2 w-full max-w-sm">
        <button onClick={stopGame} className="flex-1 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium">Стоп</button>
      </div>
    </div>
  );
}
