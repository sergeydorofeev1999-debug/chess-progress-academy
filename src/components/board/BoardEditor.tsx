'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { FILES, RANKS, RANKS_REVERSED, STARTING_FEN, EMPTY_FEN, PIECE_TYPES, PIECE_NAMES } from './constants';
import type { BoardMap, BoardPiece, BoardOrientation, FenMeta, PaletteTool, Square } from './types';
import { parseFenFull, boardToFen, getStartingFenMeta, getEmptyFenMeta, normalizeCastling, countKings, hasPawnsOnBackRank } from './fen';
import PieceImage from './PieceImage';
import { Copy, RotateCcw, Trash2, FlipHorizontal, Crown } from 'lucide-react';

const LIGHT = '#f0d9b5';
const DARK = '#b58863';
const BORDER = '#2b2b2b';

const ALL_PIECES: BoardPiece[] = [
  ...PIECE_TYPES.map((t) => ({ type: t, color: 'w' as const })),
  ...PIECE_TYPES.map((t) => ({ type: t, color: 'b' as const })),
];

export default function BoardEditor() {
  const [board, setBoard] = useState<BoardMap>({});
  const [meta, setMeta] = useState<FenMeta>(getStartingFenMeta());
  const [orientation, setOrientation] = useState<BoardOrientation>('white');
  const [tool, setTool] = useState<PaletteTool>({ kind: 'pointer' });
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [fen, setFen] = useState(STARTING_FEN);
  const [validation, setValidation] = useState<{ ok: boolean; error?: string; warnings: string[] }>({ ok: true, warnings: [] });
  const [copied, setCopied] = useState(false);
  const [sqSize, setSqSize] = useState(64);

  const boardRef = useRef<HTMLDivElement>(null);

  // Initialize
  useEffect(() => {
    const parsed = parseFenFull(STARTING_FEN);
    if (parsed) {
      setBoard(parsed.board);
      setMeta(parsed.meta);
      updateFen(parsed.board, parsed.meta);
    }
  }, []);

  // Responsive square size
  useEffect(() => {
    const update = () => {
      const isMobile = window.innerWidth < 640;
      if (isMobile) {
        setSqSize(Math.min(64, Math.max(36, Math.floor((window.innerWidth - 32) / 8))));
      } else {
        setSqSize(Math.min(72, Math.max(48, Math.floor((Math.min(window.innerWidth - 400, 600)) / 8))));
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const updateFen = useCallback((b: BoardMap, m: FenMeta) => {
    const newFen = boardToFen(b, m);
    setFen(newFen);

    // Validation
    const warnings: string[] = [];
    const kings = countKings(b);
    if (kings.w !== 1) warnings.push(`Белых королей: ${kings.w} (нужен 1)`);
    if (kings.b !== 1) warnings.push(`Чёрных королей: ${kings.b} (нужен 1)`);
    if (hasPawnsOnBackRank(b)) warnings.push('Пешки на первом/восьмом ряду');

    // Lazy validate with chess.js
    try {
      const { validateFen } = require('chess.js');
      const result = validateFen(newFen);
      setValidation({ ...result, warnings });
    } catch {
      setValidation({ ok: warnings.length === 0, warnings });
    }
  }, []);

  const handleSquareClick = useCallback((sq: Square) => {
    if (tool.kind === 'pointer') {
      setSelectedSquare(selectedSquare === sq ? null : sq);
      return;
    }

    if (tool.kind === 'erase') {
      const newBoard = { ...board };
      delete newBoard[sq];
      setBoard(newBoard);
      updateFen(newBoard, meta);
      return;
    }

    if (tool.kind === 'piece') {
      const newBoard = { ...board, [sq]: tool.piece };
      setBoard(newBoard);
      updateFen(newBoard, meta);
    }
  }, [board, meta, tool, selectedSquare, updateFen]);

  const handlePointerDown = useCallback((e: React.PointerEvent, sq: Square) => {
    if (tool.kind !== 'pointer') return;
    const piece = board[sq];
    if (!piece) return;

    // Start drag
    const startX = e.clientX;
    const startY = e.clientY;
    let moved = false;

    const handleMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!moved && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
        moved = true;
      }
    };

    const handleUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      if (!moved) return;

      // Find target square
      const boardEl = boardRef.current;
      if (!boardEl) return;
      const rect = boardEl.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;
      const fi = Math.floor(x / sqSize);
      const ri = Math.floor(y / sqSize);
      if (fi >= 0 && fi < 8 && ri >= 0 && ri < 8) {
        const displayRanks = orientation === 'white' ? RANKS : RANKS_REVERSED;
        const displayFiles = orientation === 'white' ? FILES : [...FILES].reverse();
        const targetSq: Square = `${displayFiles[fi]}${displayRanks[ri]}`;
        if (targetSq !== sq) {
          const newBoard = { ...board };
          delete newBoard[sq];
          newBoard[targetSq] = piece;
          setBoard(newBoard);
          updateFen(newBoard, meta);
        }
      }
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  }, [board, meta, tool, orientation, sqSize, updateFen]);

  const clearBoard = () => {
    setBoard({});
    setMeta(getEmptyFenMeta());
    updateFen({}, getEmptyFenMeta());
  };

  const loadStartingPosition = () => {
    const parsed = parseFenFull(STARTING_FEN);
    if (parsed) {
      setBoard(parsed.board);
      setMeta(parsed.meta);
      updateFen(parsed.board, parsed.meta);
    }
  };

  const flipBoard = () => {
    setOrientation((prev) => (prev === 'white' ? 'black' : 'white'));
  };

  const copyFen = async () => {
    try {
      await navigator.clipboard.writeText(fen);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = fen;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleCastling = (right: string) => {
    const current = meta.castling === '-' ? '' : meta.castling;
    let next: string;
    if (current.includes(right)) {
      next = current.replace(right, '');
    } else {
      next = current + right;
      // Sort to standard order
      next = ['K', 'Q', 'k', 'q'].filter((r) => next.includes(r)).join('');
    }
    const newMeta = { ...meta, castling: next || '-' };
    setMeta(newMeta);
    updateFen(board, newMeta);
  };

  const displayRanks = orientation === 'white' ? RANKS : RANKS_REVERSED;
  const displayFiles = orientation === 'white' ? FILES : [...FILES].reverse();

  const isLight = (fi: number, ri: number) => (fi + ri) % 2 === 0;

  return (
    <div className="flex flex-col gap-4 w-full max-w-4xl mx-auto">
      {/* FEN Display */}
      <div className="bg-slate-900 rounded-lg p-3 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <input
            value={fen}
            onChange={(e) => {
              const newFen = e.target.value;
              setFen(newFen);
              const parsed = parseFenFull(newFen);
              if (parsed) {
                setBoard(parsed.board);
                setMeta(parsed.meta);
                updateFen(parsed.board, parsed.meta);
              }
            }}
            className="flex-1 bg-slate-800 text-slate-200 text-sm font-mono px-3 py-2 rounded border border-slate-700 focus:border-amber-500 outline-none"
          />
          <button
            onClick={copyFen}
            className={`flex items-center gap-1 px-3 py-2 rounded text-sm font-medium transition ${
              copied
                ? 'bg-green-600 text-white'
                : 'bg-amber-500 hover:bg-amber-600 text-slate-900'
            }`}
          >
            <Copy size={14} />
            {copied ? 'Скопировано!' : 'Копировать'}
          </button>
        </div>
        <div className="flex items-center gap-2">
          {validation.ok && validation.warnings.length === 0 && (
            <span className="text-green-400 text-xs">✓ FEN валиден</span>
          )}
          {!validation.ok && (
            <span className="text-red-400 text-xs">✗ {validation.error || 'Невалидный FEN'}</span>
          )}
          {validation.warnings.map((w, i) => (
            <span key={i} className="text-yellow-400 text-xs">⚠ {w}</span>
          ))}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left: Palette */}
        <div className="flex flex-col gap-3 lg:w-48">
          {/* Tool: Pointer */}
          <button
            onClick={() => setTool({ kind: 'pointer' })}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
              tool.kind === 'pointer'
                ? 'bg-blue-500 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span className="text-lg">👆</span> Выбор
          </button>

          {/* Tool: Erase */}
          <button
            onClick={() => setTool({ kind: 'erase' })}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
              tool.kind === 'erase'
                ? 'bg-red-500 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Trash2 size={16} /> Ластик
          </button>

          <div className="border-t border-slate-200 my-1" />

          {/* White pieces */}
          <div className="text-xs font-medium text-slate-500 mb-1">Белые фигуры</div>
          <div className="grid grid-cols-3 gap-1">
            {ALL_PIECES.filter((p) => p.color === 'w').map((p) => (
              <button
                key={`w-${p.type}`}
                onClick={() => setTool({ kind: 'piece', piece: p })}
                className={`flex items-center justify-center p-1 rounded-lg transition ${
                  tool.kind === 'piece' && tool.piece.color === 'w' && tool.piece.type === p.type
                    ? 'bg-blue-500'
                    : 'bg-slate-100 hover:bg-slate-200'
                }`}
                title={PIECE_NAMES[p.type]}
              >
                <PieceImage piece={p} size={36} />
              </button>
            ))}
          </div>

          {/* Black pieces */}
          <div className="text-xs font-medium text-slate-500 mb-1 mt-2">Чёрные фигуры</div>
          <div className="grid grid-cols-3 gap-1">
            {ALL_PIECES.filter((p) => p.color === 'b').map((p) => (
              <button
                key={`b-${p.type}`}
                onClick={() => setTool({ kind: 'piece', piece: p })}
                className={`flex items-center justify-center p-1 rounded-lg transition ${
                  tool.kind === 'piece' && tool.piece.color === 'b' && tool.piece.type === p.type
                    ? 'bg-blue-500'
                    : 'bg-slate-100 hover:bg-slate-200'
                }`}
                title={PIECE_NAMES[p.type]}
              >
                <PieceImage piece={p} size={36} />
              </button>
            ))}
          </div>

          <div className="border-t border-slate-200 my-1" />

          {/* Controls */}
          <button
            onClick={clearBoard}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
          >
            <RotateCcw size={14} /> Очистить доску
          </button>

          <button
            onClick={loadStartingPosition}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
          >
            <Crown size={14} /> Начальная позиция
          </button>

          <button
            onClick={flipBoard}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
          >
            <FlipHorizontal size={14} /> Перевернуть
          </button>

          {/* Side to move */}
          <div className="text-xs font-medium text-slate-500 mt-2 mb-1">Кто ходит</div>
          <div className="flex gap-1">
            <button
              onClick={() => {
                const newMeta = { ...meta, turn: 'w' as const };
                setMeta(newMeta);
                updateFen(board, newMeta);
              }}
              className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition ${
                meta.turn === 'w' ? 'bg-white border border-slate-300 text-slate-900' : 'bg-slate-100 text-slate-500'
              }`}
            >
              Белые
            </button>
            <button
              onClick={() => {
                const newMeta = { ...meta, turn: 'b' as const };
                setMeta(newMeta);
                updateFen(board, newMeta);
              }}
              className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition ${
                meta.turn === 'b' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              Чёрные
            </button>
          </div>

          {/* Castling */}
          <div className="text-xs font-medium text-slate-500 mt-2 mb-1">Рокировка</div>
          <div className="grid grid-cols-2 gap-1">
            {[
              { key: 'K', label: 'Белые O-O' },
              { key: 'Q', label: 'Белые O-O-O' },
              { key: 'k', label: 'Чёрные O-O' },
              { key: 'q', label: 'Чёрные O-O-O' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => toggleCastling(key)}
                className={`px-2 py-1.5 rounded text-xs font-medium transition text-left ${
                  meta.castling.includes(key)
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : 'bg-slate-50 text-slate-400 border border-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Center: Board */}
        <div className="flex-1 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>{orientation === 'white' ? 'Белые снизу' : 'Чёрные снизу'}</span>
            {tool.kind === 'piece' && (
              <span className="text-blue-600">
                → Кликните по клетке для {PIECE_NAMES[tool.piece.type]} {tool.piece.color === 'w' ? 'белых' : 'чёрных'}
              </span>
            )}
            {tool.kind === 'erase' && (
              <span className="text-red-600">→ Кликните по фигуре для удаления</span>
            )}
          </div>

          <div
            ref={boardRef}
            className="grid border-[3px] rounded-sm relative select-none"
            style={{
              gridTemplateColumns: `repeat(8, ${sqSize}px)`,
              gridTemplateRows: `repeat(8, ${sqSize}px)`,
              borderColor: BORDER,
              touchAction: 'none',
            }}
          >
            {displayRanks.map((rank, ri) =>
              displayFiles.map((file, fi) => {
                const sq: Square = `${file}${rank}`;
                const piece = board[sq];
                const light = isLight(fi, ri);
                const sel = selectedSquare === sq;

                return (
                  <div
                    key={sq}
                    data-square={sq}
                    className="flex items-center justify-center relative select-none"
                    style={{
                      width: sqSize,
                      height: sqSize,
                      cursor:
                        tool.kind === 'piece' || tool.kind === 'erase'
                          ? 'pointer'
                          : piece
                          ? 'grab'
                          : 'default',
                      touchAction: 'none',
                      backgroundColor: light ? LIGHT : DARK,
                    }}
                    onClick={() => handleSquareClick(sq)}
                    onPointerDown={(e) => handlePointerDown(e, sq)}
                    onDragStart={(e) => e.preventDefault()}
                  >
                    {sel && (
                      <div className="absolute inset-[1px] rounded-[5px] bg-[rgba(100,160,60,0.45)] pointer-events-none z-10" />
                    )}
                    {/* File/rank labels */}
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
                    {piece && (
                      <div
                        className="relative pointer-events-none"
                        style={{ width: Math.round(sqSize * 0.85), height: Math.round(sqSize * 0.85) }}
                      >
                        <PieceImage piece={piece} size={Math.round(sqSize * 0.85)} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
