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
  const parts = fen.split(' ');
  const placement = parts[0];
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
  const turn = parts[1] === 'b' ? 'b' : 'w';
  const enPassant = parts[3] !== '-' ? parts[3] : null;
  return { squares, turn, enPassant };
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
  starSquares: string[] = [],
  ignoreTargetOccupant: boolean = false,
  enPassantTarget: string | null = null
) {
  if (squares[from]?.color !== movingColor) return false;
  if (!ignoreTargetOccupant && squares[to]?.color === movingColor) return false;
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
      if (!(Math.abs(df) <= 1 && Math.abs(dr) <= 1)) return false;
      // Basic king validation only (distance). Safety checks are after move apply.
      return true;
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
      // Diagonal capture + en passant
      if (Math.abs(df) === 1 && dr === forwardDir) {
        if (squares[to] && squares[to].color !== movingColor) return true;
        if (starSquares.includes(to)) return true;
        if (enPassantTarget && to === enPassantTarget && movingColor === 'w') return true;
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
  starSquares: string[] = [],
  enPassantTarget: string | null = null
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
          if (enPassantTarget && sq === enPassantTarget && movingColor === 'w') valid.push(sq);
        }
      }
      break;
    }
  }
  return valid;
}

/* ====== Check if a piece attacks a square ====== */
function isSquareAttackedByBlack(square: string, squares: Record<string, any>) {
  for (const sq in squares) {
    const p = squares[sq];
    if (!p || p.color !== 'b') continue;
    if (isValidMove(p.type, sq, square, squares, 'b')) return true;
  }
  return false;
}

function isSquareAttackedBy(square: string, squares: Record<string, any>, attackerColor: 'w' | 'b', ignoreTarget: boolean = false) {
  for (const sq in squares) {
    const p = squares[sq];
    if (!p || p.color !== attackerColor) continue;
    if (isValidMove(p.type, sq, square, squares, attackerColor, [], ignoreTarget)) return true;
  }
  return false;
}

function isCheckmate(squares: Record<string, any>, side: 'w' | 'b') {
  // Find king
  let kingSq = '';
  for (const sq in squares) {
    if (squares[sq].type === 'k' && squares[sq].color === side) {
      kingSq = sq;
      break;
    }
  }
  if (!kingSq) return false;

  const attackerColor = side === 'w' ? 'b' : 'w';

  // 1. King must be in check
  if (!isSquareAttackedBy(kingSq, squares, attackerColor, true)) return false;

  // 2. King must have no legal escape squares
  const squaresWithoutKing = { ...squares };
  delete squaresWithoutKing[kingSq];
  const fi = FILES.indexOf(kingSq[0]);
  const ri = RANKS.indexOf(kingSq[1]);
  for (let df = -1; df <= 1; df++) {
    for (let dr = -1; dr <= 1; dr++) {
      if (df === 0 && dr === 0) continue;
      const nf = fi + df;
      const nr = ri + dr;
      if (nf < 0 || nf >= 8 || nr < 0 || nr >= 8) continue;
      const sq = `${FILES[nf]}${RANKS[nr]}`;
      const p = squares[sq];
      if (p && p.color === side) continue; // own piece blocks
      if (!isSquareAttackedBy(sq, squaresWithoutKing, attackerColor, true)) return false; // king can escape
    }
  }

  // 3. Can any piece capture the attacker or block the attack?
  const attackers: string[] = [];
  for (const sq in squares) {
    const p = squares[sq];
    if (!p || p.color === side) continue;
    if (isValidMove(p.type, sq, kingSq, squares, p.color)) attackers.push(sq);
  }

  // If exactly 1 attacker, check capture or block
  if (attackers.length === 1) {
    const attackerSq = attackers[0];
    const attacker = squares[attackerSq];
    const af = FILES.indexOf(attackerSq[0]);
    const ar = RANKS.indexOf(attackerSq[1]);
    const kf = fi;
    const kr = ri;

    // Can any defender capture the attacker?
    for (const sq in squares) {
      const p = squares[sq];
      if (!p || p.color !== side) continue;
      if (p.type === 'k') continue;
      if (isValidMove(p.type, sq, attackerSq, squares, side)) {
        // Simulate capture and verify king is safe after capture (pinned defenders can't save)
        const sim = { ...squares };
        delete sim[sq];
        sim[attackerSq] = p;
        if (!isSquareAttackedBy(kingSq, sim, attackerColor, true)) return false;
      }
    }

    // Can any defender block (for sliding pieces only: r, b, q)?
    if (attacker.type === 'r' || attacker.type === 'b' || attacker.type === 'q') {
      const df = af === kf ? 0 : (af > kf ? -1 : 1);
      const dr = ar === kr ? 0 : (ar > kr ? -1 : 1);
      let bf = af + df;
      let br = ar + dr;
      while (bf !== kf || br !== kr) {
        const blockSq = `${FILES[bf]}${RANKS[br]}`;
        for (const sq in squares) {
          const p = squares[sq];
          if (!p || p.color !== side) continue;
          if (p.type === 'k') continue; // king cannot block an attack on itself
          if (isValidMove(p.type, sq, blockSq, squares, side)) {
            // Simulate block and verify king is safe after block (pinned defenders can't save)
            const sim = { ...squares };
            delete sim[sq];
            sim[blockSq] = p;
            if (!isSquareAttackedBy(kingSq, sim, attackerColor, true)) return false;
          }
        }
        bf += df;
        br += dr;
      }
    }
  }

  return true;
}

function findKingEscape(squares: Record<string, any>, side: 'w' | 'b'): string | null {
  let kingSq = '';
  for (const sq in squares) {
    if (squares[sq].type === 'k' && squares[sq].color === side) {
      kingSq = sq;
      break;
    }
  }
  if (!kingSq) return null;
  const fi = FILES.indexOf(kingSq[0]);
  const ri = RANKS.indexOf(kingSq[1]);
  const attackerColor = side === 'w' ? 'b' : 'w';
  // Temporarily remove king so attackers can "see" through its old square
  const squaresWithoutKing = { ...squares };
  delete squaresWithoutKing[kingSq];
  for (let df = -1; df <= 1; df++) {
    for (let dr = -1; dr <= 1; dr++) {
      if (df === 0 && dr === 0) continue;
      const nf = fi + df;
      const nr = ri + dr;
      if (nf < 0 || nf >= 8 || nr < 0 || nr >= 8) continue;
      const sq = `${FILES[nf]}${RANKS[nr]}`;
      const p = squares[sq];
      if (p && p.color === side) continue;
      if (isSquareAttackedBy(sq, squaresWithoutKing, attackerColor, true)) continue;
      return sq;
    }
  }
  return null;
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
  return (fi + ri) % 2 === 0;
}

/* ====== Inline Chess Board (white + black pieces, click & drag) ====== */
function InlineChessBoard({
  fen,
  onMove,
  whitePieceTypes,
  msg,
  setMsg,
  forbiddenSquares = [],
}: {
  fen: string;
  onMove: (from: string, to: string) => boolean;
  whitePieceTypes?: string[];
  msg: string;
  setMsg: (s: string) => void;
  forbiddenSquares?: string[];
}) {
  const parsed = parseFen(fen);
  const [squares, setSquares] = useState(parsed.squares);
  const squaresRef = useRef(squares);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const selectedSquareRef = useRef(selectedSquare);
  const [hoveredSquare, setHoveredSquare] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{
    square: string;
    type: string;
    color: string;
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const dragStateRef = useRef(dragState);
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
    dragStateRef.current = dragState;
  }, [dragState]);
  useEffect(() => {
    onMoveRef.current = onMove;
  }, [onMove]);

  const validMoves = selectedSquare
    ? getValidSquares(
        squares[selectedSquare]?.type || 'p',
        selectedSquare,
        squares,
        'w',
        [],
        parsed.enPassant
      ).filter(sq => !forbiddenSquares.includes(sq))
    : dragState
    ? getValidSquares(
        squares[dragState.square]?.type || 'p',
        dragState.square,
        squares,
        'w',
        [],
        parsed.enPassant
      ).filter(sq => !forbiddenSquares.includes(sq))
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
        if (piece && piece.color === 'w') {
          selectedSquareRef.current = square;
          setSelectedSquare(square);
          return;
        }
        if (forbiddenSquares.includes(square)) {
          selectedSquareRef.current = null;
          setSelectedSquare(null);
          return;
        }
        const accepted = onMoveRef.current?.(sel, square);
        if (accepted !== false) {
          selectedSquareRef.current = null;
          setSelectedSquare(null);
          setMsg('');
        } else {
          selectedSquareRef.current = null;
          setSelectedSquare(null);
        }
      } else {
        if (piece && piece.color === 'w') {
          selectedSquareRef.current = square;
          setSelectedSquare(square);
        }
      }
    },
    [setMsg, forbiddenSquares]
  );

  const handlePointerDown = (e: React.PointerEvent, sq: string) => {
    if (!containerRef.current) return;
    const piece = squares[sq];
    if (!piece || piece.color !== 'w') return;
    pointerStartRef.current = sq;
    justDraggedRef.current = false;
    const rect = containerRef.current.getBoundingClientRect();
    const fi = FILES.indexOf(sq[0]);
    const ri = RANKS.indexOf(sq[1]);
    const centerX = fi * sqSize + sqSize / 2;
    const centerY = ri * sqSize + sqSize / 2;
    // Offset = where inside the square the finger is (relative to center)
    const offsetX = e.clientX - rect.left - centerX;
    const offsetY = e.clientY - rect.top - centerY;
    const initState = {
      square: sq,
      type: piece.type,
      color: piece.color,
      x: centerX,
      y: centerY,
      offsetX,
      offsetY,
    };
    setDragState(initState);
    dragStateRef.current = initState;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handleGlobalMove = (e: PointerEvent) => {
    if (!dragStateRef.current) return;
    justDraggedRef.current = true;
    selectedSquareRef.current = dragStateRef.current.square;
    setSelectedSquare(dragStateRef.current.square);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Use the fixed grab offset recorded at pointerDown
    const x = e.clientX - rect.left - dragStateRef.current.offsetX;
    const y = e.clientY - rect.top - dragStateRef.current.offsetY;
    const newState = { ...dragStateRef.current, x, y };
    setDragState(newState);
    dragStateRef.current = newState;
  };

  const handleGlobalUp = (e: PointerEvent) => {
    if (!dragStateRef.current || !containerRef.current) {
      pointerStartRef.current = null;
      setDragState(null);
      dragStateRef.current = null;
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const fi = Math.floor(x / sqSize);
    const ri = Math.floor(y / sqSize);
    if (fi >= 0 && fi < 8 && ri >= 0 && ri < 8) {
      const targetSquare = `${FILES[fi]}${RANKS[ri]}`;
      const start = dragStateRef.current.square;
      if (start && targetSquare !== start) {
        onMoveRef.current?.(start, targetSquare);
      }
    }
    pointerStartRef.current = null;
    setDragState(null);
    dragStateRef.current = null;
  };

  const handleGlobalCancel = () => {
    pointerStartRef.current = null;
    setDragState(null);
    dragStateRef.current = null;
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
            const isSource = dragState?.square === sq;
            const isValid = validMoves.includes(sq);
            const hover = hoveredSquare === sq;
            return (
              <div
                key={sq}
                data-square={sq}
                className={`flex items-center justify-center relative select-none ${isSource ? 'opacity-50' : ''}`}
                style={{
                  width: sqSize,
                  height: sqSize,
                  cursor: pieceObj && pieceObj.color === 'w' ? 'grab' : 'default',
                  touchAction: 'none',
                  backgroundColor: light ? '#f0d9b5' : '#b58863',
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
                {pieceObj && !isSource && <PieceImg type={pieceObj.type} color={pieceObj.color} />}
              </div>
            );
          })
        )}
        {/* Floating dragged piece */}
        {dragState && (
          <div
            className="absolute pointer-events-none z-50"
            style={{
              width: sqSize,
              height: sqSize,
              left: dragState.x - sqSize / 2,
              top: dragState.y - sqSize / 2,
            }}
          >
            <PieceImg type={dragState.type} color={dragState.color as 'w' | 'b'} />
          </div>
        )}
      </div>
      {msg && <div className="text-red-500 text-sm mt-1">{msg}</div>}
    </div>
  );
}

/* ====== CaptureBoard main component ====== */
interface CaptureLevel {
  initialFen: string;
  stars?: string[];
  targets?: string[];
  instructions: string;
  hint: string;
  maxMoves: number;
  requireAll?: boolean;
  requireCheck?: boolean;
  requireMate?: boolean;
  requireSafeKing?: boolean;
  autoCaptures?: { blackFrom: string; captureSquare: string }[];
  forbiddenSquares?: string[];
  blackAutoCapture?: boolean; // default true; set false to disable universal black auto-capture
  autoMove?: { from: string; to: string; delayMs: number };
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
  const [gameOver, setGameOver] = useState(false);
  const [failed, setFailed] = useState(false);
  const [msg, setMsg] = useState('');
  const [moves, setMoves] = useState(0);
  const [allDone, setAllDone] = useState(false);

  const positionRef = useRef(position);
  const movesRef = useRef(moves);

  const level = levels[currentLevel];
  const stars = level.stars || level.targets || [];
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
    setFailed(false);
    setMsg('');
    movesRef.current = 0;
    positionRef.current = lvl.initialFen;
  }, [currentLevel, levels]);

  // Auto black move (e.g. pawn g7→g5) after delay on level start
  useEffect(() => {
    const lvl = levels[currentLevel];
    if (!lvl.autoMove) return;
    const { from, to, delayMs } = lvl.autoMove;
    const timer = setTimeout(() => {
      if (gameOver) return;
      const parsed = parseFen(positionRef.current);
      const piece = parsed.squares[from];
      if (!piece) return;
      const newSquares = { ...parsed.squares };
      delete newSquares[from];
      newSquares[to] = piece;
      // If pawn moved two squares, set en passant target
      let nextEnPassant: string | null = null;
      if (piece.type === 'p' && from[1] === '7' && to[1] === '5') {
        nextEnPassant = `${from[0]}6`;
      }
      let newFen = squaresToFen(newSquares, 'w');
      if (nextEnPassant) {
        const fenParts = newFen.split(' ');
        fenParts[3] = nextEnPassant;
        newFen = fenParts.join(' ');
      }
      positionRef.current = newFen;
      setPosition(newFen);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [currentLevel, levels, gameOver]);

  const handleMove = useCallback(
    (from: string, to: string) => {
      if (gameOver) return false;
      const parsed = parseFen(positionRef.current);
      if (parsed.squares[from]?.color !== 'w') return false;
      const fromType = parsed.squares[from]?.type || 'p';
      // Only reject obviously illegal moves (wrong piece mechanics, self-capture)
      if (!isValidMove(fromType, from, to, parsed.squares, 'w', [], false, parsed.enPassant)) return false;

      const movedPiece = parsed.squares[from];

      // Apply move immediately (visual first, like Lichess)
      const newSquares = { ...parsed.squares };
      delete newSquares[from];
      newSquares[to] = movedPiece;
      // En passant capture: remove the passed pawn
      if (fromType === 'p' && parsed.enPassant && to === parsed.enPassant) {
        const capturedFile = to[0];
        const capturedRank = from[1];
        const capturedSq = `${capturedFile}${capturedRank}`;
        delete newSquares[capturedSq];
      }
      // Track en passant after pawn double-step
      let nextEnPassant: string | null = null;
      if (fromType === 'p' && from[1] === '2' && to[1] === '4') {
        nextEnPassant = `${from[0]}3`;
      }
      let newFen = squaresToFen(newSquares, 'w');
      if (nextEnPassant) {
        const fenParts = newFen.split(' ');
        fenParts[3] = nextEnPassant;
        newFen = fenParts.join(' ');
      }
      positionRef.current = newFen;
      setPosition(newFen);
      setMoves((c) => c + 1);
      setMsg('');

      // Guard: if requireSafeKing and king is in check after move → immediate fail
      if (level.requireSafeKing) {
        let whiteKingSq = '';
        for (const sq in newSquares) {
          if (newSquares[sq].type === 'k' && newSquares[sq].color === 'w') {
            whiteKingSq = sq;
            break;
          }
        }
        if (whiteKingSq && isSquareAttackedBy(whiteKingSq, newSquares, 'b')) {
          setFailed(true);
          setGameOver(true);
          return false;
        }
      }

      // Auto-capture: specified black pieces eat white pieces that land on certain squares
      if (level.autoCaptures && level.autoCaptures.length > 0) {
        for (const ac of level.autoCaptures) {
          const victim = newSquares[ac.captureSquare];
          if (victim && victim.color === 'w') {
            if (victim.type === 'k') {
              // King cannot be auto-captured; just fail
              setFailed(true);
              setGameOver(true);
              return false;
            }
            delete newSquares[ac.captureSquare];
            // Move the black attacker to the capture square
            newSquares[ac.captureSquare] = newSquares[ac.blackFrom];
            delete newSquares[ac.blackFrom];
            const fenAfterCapture = squaresToFen(newSquares, 'w');
            positionRef.current = fenAfterCapture;
            setPosition(fenAfterCapture);
            setFailed(true);
            setGameOver(true);
            return false;
          }
        }
      }

      // Universal auto-capture: collect all undefended white pieces under attack,
      // pick the most valuable one, then capture it.
      // Skip if level has explicit autoCaptures config (e.g. Lesson 10 ex4 escape check)
      // Skip if level is requireCheck (king reaction takes priority)
      if ((!level.autoCaptures || level.autoCaptures.length === 0) && !level.requireCheck && level.blackAutoCapture !== false) {
        // For requireMate levels: skip auto-capture if black king is in check — king must react first
        let skipAutoCapture = false;
        if (level.requireMate) {
          let bkSq = '';
          for (const sq in newSquares) {
            if (newSquares[sq].type === 'k' && newSquares[sq].color === 'b') { bkSq = sq; break; }
          }
          if (bkSq) {
            for (const sq in newSquares) {
              const p = newSquares[sq];
              if (p && p.color === 'w' && isValidMove(p.type, sq, bkSq, newSquares, 'w', [], true)) {
                skipAutoCapture = true; break;
              }
            }
          }
        }

        if (!skipAutoCapture) {
      function isDefended(squares: Record<string, { type: string; color: 'w' | 'b' }>, targetSq: string) {
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

      const pieceValues: Record<string, number> = { q: 9, r: 5, b: 3, n: 3, p: 1, k: 0 };
      const candidates: { wsq: string; wp: { type: string; color: string }; bsq: string; bp: { type: string; color: string } }[] = [];

      for (const wsq in newSquares) {
        const wp = newSquares[wsq];
        if (wp.color !== 'w') continue;
        if (wp.type === 'k') continue; // King cannot be captured
        if (isDefended(newSquares, wsq)) continue;
        for (const bsq in newSquares) {
          const bp = newSquares[bsq];
          if (bp.color !== 'b') continue;
          if (isValidMove(bp.type, bsq, wsq, newSquares, 'b')) {
            candidates.push({ wsq, wp, bsq, bp });
            break; // one black attacker is enough per white piece
          }
        }
      }

      if (candidates.length > 0) {
        // Sort by value descending (highest value first)
        candidates.sort((a, b) => (pieceValues[b.wp.type] || 0) - (pieceValues[a.wp.type] || 0));
        const { wsq, wp, bsq, bp } = candidates[0];
        const attacker = { ...newSquares[bsq] };
        delete newSquares[bsq];
        newSquares[wsq] = attacker;
        const captureFen = squaresToFen(newSquares, 'w');
        positionRef.current = captureFen;
        setPosition(captureFen);
        setGameOver(true);
        setFailed(true);
        setMsg(`💀 ${bp.type === 'r' ? 'Ладья' : bp.type === 'b' ? 'Слон' : bp.type === 'q' ? 'Ферзь' : bp.type === 'n' ? 'Конь' : bp.type === 'p' ? 'Пешка' : 'Фигура'} съела ${wp.type === 'r' ? 'ладью' : wp.type === 'b' ? 'слона' : wp.type === 'q' ? 'ферзя' : wp.type === 'n' ? 'коня' : wp.type === 'p' ? 'пешку' : wp.type === 'k' ? 'короля' : 'фигуру'}!`);
        return true;
      }
      } // end if (!skipAutoCapture)
      } // end if (!level.autoCaptures || level.autoCaptures.length === 0) && !level.requireCheck

      if (level.requireCheck) {
        let blackKingSq = '';
        for (const sq in newSquares) {
          if (newSquares[sq].type === 'k' && newSquares[sq].color === 'b') {
            blackKingSq = sq;
            break;
          }
        }
        let isCheck = false;
        if (blackKingSq) {
          for (const sq in newSquares) {
            const p = newSquares[sq];
            if (p.color !== 'w') continue;
            if (isValidMove(p.type, sq, blackKingSq, newSquares, 'w')) {
              isCheck = true;
              break;
            }
          }
        }
        if (!isCheck) {
          setFailed(true);
          setGameOver(true);
          return false;
        }
        // Success path for requireCheck
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
        return true;
      }

      if (level.requireMate) {
        if (!isCheckmate(newSquares, 'b')) {
          // Not checkmate — check if it's at least a check (show king escape then fail)
          let blackKingSq = '';
          for (const sq in newSquares) {
            if (newSquares[sq].type === 'k' && newSquares[sq].color === 'b') {
              blackKingSq = sq;
              break;
            }
          }
          let isCheck = false;
          if (blackKingSq && isSquareAttackedBy(blackKingSq, newSquares, 'w', true)) {
            isCheck = true;
          }
          if (isCheck) {
            // Find the attacker(s) of the black king
            const attackers: string[] = [];
            for (const sq in newSquares) {
              const p = newSquares[sq];
              if (!p || p.color !== 'w') continue;
              if (isValidMove(p.type, sq, blackKingSq, newSquares, 'w', [], true)) attackers.push(sq);
            }
            // If a black piece can capture the attacker — capture it!
            if (attackers.length === 1) {
              const attackerSq = attackers[0];
              let defenderSq = '';
              for (const sq in newSquares) {
                const p = newSquares[sq];
                if (!p || p.color !== 'b') continue;
                if (p.type === 'k') {
                  // King can capture only if destination is not attacked
                  if (isSquareAttackedBy(attackerSq, newSquares, 'w', true)) continue;
                }
                if (isValidMove(p.type, sq, attackerSq, newSquares, 'b')) {
                  defenderSq = sq;
                  break;
                }
              }
              if (defenderSq) {
                const defender = { ...newSquares[defenderSq] };
                delete newSquares[defenderSq];
                newSquares[attackerSq] = defender;
                const captureFen = squaresToFen(newSquares, 'w');
                positionRef.current = captureFen;
                setPosition(captureFen);
                setFailed(true);
                setGameOver(true);
                return false;
              }
            }
            // Can't capture — try king escape
            const escapeSq = findKingEscape(newSquares, 'b');
            if (escapeSq) {
              newSquares[escapeSq] = newSquares[blackKingSq];
              delete newSquares[blackKingSq];
              const escapeFen = squaresToFen(newSquares, 'w');
              positionRef.current = escapeFen;
              setPosition(escapeFen);
            }
          }
          setFailed(true);
          setGameOver(true);
          return false;
        }
        // Success path for requireMate
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
        return true;
      }

      // Collect star if target square
      if (stars.includes(to) && !collected.includes(to)) {
        setCollected((prev) => {
          const next = [...prev, to];
          const allTargets = level.requireAll === true
            ? stars.every((s: string) => next.includes(s))
            : true; // any target completes
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
    [stars, collected, currentLevel, totalLevels, onAllComplete, gameOver, level.maxMoves, successMessage, setFailed, setGameOver]
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
    setFailed(false);
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
            const isFuture = false;
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

      </div>

      {/* CENTER COLUMN: Chess board + stats */}
      <div className="flex-1 flex flex-col items-center gap-3">
        <div className="text-[#2b2b2b] text-[15px] font-medium mb-2 text-center leading-snug w-full">
          {level.instructions}
        </div>

        <InlineChessBoard fen={position} onMove={handleMove} msg={msg} setMsg={setMsg} forbiddenSquares={level.forbiddenSquares || []} />

        {/* Red fail banner */}
        {failed && (
          <div className="w-full">
            <div className="bg-[#c62828] rounded-lg p-4 flex flex-col items-center gap-2 shadow-lg">
              <p className="text-white font-bold text-lg">Задание провалено!</p>
              <button
                onClick={resetLevel}
                className="bg-white text-[#c62828] font-bold text-base px-6 py-2 rounded shadow hover:bg-gray-100 transition"
              >
                ЕЩЁ РАЗ
              </button>
            </div>
          </div>
        )}

        {/* Mobile level stars bar */}
        <div className="flex lg:hidden gap-1 justify-center w-full overflow-x-auto">
          {levels.map((_l: any, i: number) => {
            const earned = levelStars[i];
            const isCurrent = i === currentLevel;
            const isDone = earned != null;
            const isFuture = false;
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



        {allDone && (
          <div className="mt-2 text-emerald-700 font-bold text-lg">{successMessage}</div>
        )}
      </div>
    </div>
  );
}
