'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { RotateCcw, ChevronRight, Star, Trophy } from 'lucide-react';

const FILES = ['a','b','c','d','e','f','g','h'];
const RANKS = ['8','7','6','5','4','3','2','1'];

type Piece = { type: string; color: 'w' | 'b' };
type Difficulty = 'easy' | 'medium' | 'hard';

function parseFen(fen: string): Record<string, Piece> {
  const squares: Record<string, Piece> = {};
  const parts = fen.split(' ');
  const rows = parts[0].split('/');
  for (let ri = 0; ri < 8; ri++) {
    let fi = 0;
    for (const ch of rows[ri]) {
      if (ch >= '1' && ch <= '8') {
        fi += parseInt(ch);
      } else {
        const color = ch === ch.toUpperCase() ? 'w' : 'b';
        squares[`${FILES[fi]}${RANKS[ri]}`] = { type: ch.toLowerCase(), color };
        fi++;
      }
    }
  }
  return squares;
}

function squaresToFen(squares: Record<string, Piece>): string {
  let rows = '';
  for (let ri = 0; ri < 8; ri++) {
    let empty = 0;
    for (let fi = 0; fi < 8; fi++) {
      const sq = `${FILES[fi]}${RANKS[ri]}`;
      const p = squares[sq];
      if (p) {
        if (empty > 0) { rows += empty; empty = 0; }
        rows += p.color === 'w' ? p.type.toUpperCase() : p.type.toLowerCase();
      } else {
        empty++;
      }
    }
    if (empty > 0) rows += empty;
    if (ri < 7) rows += '/';
  }
  return rows + ' w - - 0 1';
}

function getPawnMoves(square: string, squares: Record<string, Piece>, color: 'w' | 'b', enPassant: string | null): string[] {
  const ff = FILES.indexOf(square[0]);
  const fr = RANKS.indexOf(square[1]);
  const dir = color === 'w' ? -1 : 1;
  const valid: string[] = [];

  const r1 = fr + dir;
  if (r1 >= 0 && r1 < 8) {
    const f1 = `${FILES[ff]}${RANKS[r1]}`;
    if (!squares[f1]) valid.push(f1);
  }

  const startRank = color === 'w' ? 6 : 1;
  if (fr === startRank) {
    const r2 = fr + 2 * dir;
    if (r2 >= 0 && r2 < 8) {
      const f1 = `${FILES[ff]}${RANKS[r1]}`;
      const f2 = `${FILES[ff]}${RANKS[r2]}`;
      if (!squares[f1] && !squares[f2]) valid.push(f2);
    }
  }

  for (const df of [-1, 1]) {
    const fd = ff + df;
    if (fd >= 0 && fd < 8 && r1 >= 0 && r1 < 8) {
      const sq = `${FILES[fd]}${RANKS[r1]}`;
      const target = squares[sq];
      if (target && target.color !== color) valid.push(sq);
      if (enPassant && sq === enPassant) valid.push(sq);
    }
  }

  return valid;
}

function makePawnMove(squares: Record<string, Piece>, enPassant: string | null, from: string, to: string): {
  squares: Record<string, Piece>;
  enPassant: string | null;
  captured: Piece | null;
  promoted: boolean;
} {
  const p = squares[from];
  if (!p) return { squares, enPassant: null, captured: null, promoted: false };

  const next: Record<string, Piece> = { ...squares };
  delete next[from];
  let captured = next[to] || null;

  if (p.type === 'p' && to === enPassant) {
    const ff = FILES.indexOf(from[0]);
    const tf = FILES.indexOf(to[0]);
    if (ff !== tf) {
      const captureSq = `${FILES[tf]}${from[1]}`;
      captured = next[captureSq] || captured;
      delete next[captureSq];
    }
  }

  delete next[to];

  const rank = to[1];
  if (p.type === 'p' && (rank === '8' || rank === '1')) {
    next[to] = { type: 'q', color: p.color };
  } else {
    next[to] = p;
  }

  let newEnPassant: string | null = null;
  if (p.type === 'p') {
    const fromRank = parseInt(from[1]);
    const toRank = parseInt(to[1]);
    if (Math.abs(toRank - fromRank) === 2) {
      const epRank = p.color === 'w' ? (fromRank + 1).toString() : (fromRank - 1).toString();
      newEnPassant = `${from[0]}${epRank}`;
    }
  }

  return { squares: next, enPassant: newEnPassant, captured, promoted: p.type === 'p' && (rank === '8' || rank === '1') };
}

function countPawns(squares: Record<string, Piece>, color: 'w' | 'b'): number {
  return Object.values(squares).filter(p => p.type === 'p' && p.color === color).length;
}

function hasQueen(squares: Record<string, Piece>, color: 'w' | 'b'): boolean {
  return Object.values(squares).some(p => p.type === 'q' && p.color === color);
}

function getAllPawnMoves(squares: Record<string, Piece>, color: 'w' | 'b', enPassant: string | null): { from: string; to: string }[] {
  const moves: { from: string; to: string }[] = [];
  for (const sq in squares) {
    const p = squares[sq];
    if (p.type === 'p' && p.color === color) {
      const mvs = getPawnMoves(sq, squares, color, enPassant);
      for (const to of mvs) moves.push({ from: sq, to });
    }
  }
  return moves;
}

/* ═════════════════════════════════════════════════════════════════
   AI ENGINE — minimax with alpha-beta pruning for pawn race
   Score is from BLACK's perspective (positive = good for black)
   ═════════════════════════════════════════════════════════════════ */

function evaluatePosition(squares: Record<string, Piece>, whiteCaptured: number, blackCaptured: number): number {
  // Terminal states
  if (hasQueen(squares, 'w') || blackCaptured >= 5) return -10000;
  if (hasQueen(squares, 'b') || whiteCaptured >= 5) return 10000;
  if (countPawns(squares, 'w') === 0) return 10000;
  if (countPawns(squares, 'b') === 0) return -10000;

  let score = 0;

  for (const sq in squares) {
    const p = squares[sq];
    if (p.type !== 'p') continue;
    const rank = parseInt(sq[1]);
    const file = FILES.indexOf(sq[0]);

    if (p.color === 'w') {
      // Distance from promotion: closer = more dangerous for black
      score -= (rank - 1) * 40;

      // Central pawns are dangerous
      const centrality = Math.abs(file - 3.5);
      if (centrality <= 1.5) score -= 30;

      // Passed pawn = major threat
      let passed = true;
      for (let r = rank + 1; r <= 8; r++) {
        const left = file > 0 ? `${FILES[file - 1]}${r}` : null;
        const center = `${FILES[file]}${r}`;
        const right = file < 7 ? `${FILES[file + 1]}${r}` : null;
        if ((left && squares[left]?.color === 'b' && squares[left]?.type === 'p') ||
            (center && squares[center]?.color === 'b' && squares[center]?.type === 'p') ||
            (right && squares[right]?.color === 'b' && squares[right]?.type === 'p')) {
          passed = false;
          break;
        }
      }
      if (passed) score -= 200;
    } else {
      // Distance from promotion: closer = good for black
      score += (8 - rank) * 40;

      // Central pawns = good for black
      const centrality = Math.abs(file - 3.5);
      if (centrality <= 1.5) score += 30;

      // Passed pawn = excellent for black
      let passed = true;
      for (let r = rank - 1; r >= 1; r--) {
        const left = file > 0 ? `${FILES[file - 1]}${r}` : null;
        const center = `${FILES[file]}${r}`;
        const right = file < 7 ? `${FILES[file + 1]}${r}` : null;
        if ((left && squares[left]?.color === 'w' && squares[left]?.type === 'p') ||
            (center && squares[center]?.color === 'w' && squares[center]?.type === 'p') ||
            (right && squares[right]?.color === 'w' && squares[right]?.type === 'p')) {
          passed = false;
          break;
        }
      }
      if (passed) score += 200;

      // CRITICAL: penalty for pawns that can be immediately captured
      // After black moves, white gets a turn. If white can capture this pawn on the next move,
      // it's a blunder unless the capture leads to something good for black.
      const immediateCaptures = getAllPawnMoves(squares, 'w', null).filter(m => {
        const target = squares[m.to];
        return target && target.color === 'b' && target.type === 'p';
      });
      for (const cap of immediateCaptures) {
        if (cap.to === sq) score -= 300; // THIS pawn can be captured next turn
      }

      // Connected pawns bonus (same rank, adjacent files = support each other)
      const leftFile = file > 0 ? `${FILES[file - 1]}${rank}` : null;
      const rightFile = file < 7 ? `${FILES[file + 1]}${rank}` : null;
      if ((leftFile && squares[leftFile]?.color === 'b' && squares[leftFile]?.type === 'p') ||
          (rightFile && squares[rightFile]?.color === 'b' && squares[rightFile]?.type === 'p')) {
        score += 25;
      }
    }
  }

  // Mobility
  const blackMoves = getAllPawnMoves(squares, 'b', null).length;
  const whiteMoves = getAllPawnMoves(squares, 'w', null).length;
  score += blackMoves * 8;
  score -= whiteMoves * 8;

  // Pawn count
  score += countPawns(squares, 'b') * 100;
  score -= countPawns(squares, 'w') * 100;

  // Captures
  score += blackCaptured * 80;
  score -= whiteCaptured * 80;

  return score;
}

function minimax(
  squares: Record<string, Piece>,
  enPassant: string | null,
  whiteCaptured: number,
  blackCaptured: number,
  depth: number,
  isMaximizing: boolean,
  alpha: number,
  beta: number
): number {
  const evalScore = evaluatePosition(squares, whiteCaptured, blackCaptured);
  if (Math.abs(evalScore) >= 9000 || depth === 0) return evalScore;

  const color = isMaximizing ? 'b' : 'w';
  const moves = getAllPawnMoves(squares, color, enPassant);

  if (moves.length === 0) {
    return isMaximizing ? -10000 : 10000;
  }

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const result = makePawnMove(squares, enPassant, move.from, move.to);
      let wCap = whiteCaptured;
      let bCap = blackCaptured;
      if (result.captured?.color === 'w') wCap++;
      if (result.captured?.color === 'b') bCap++;
      const eval_ = minimax(result.squares, result.enPassant, wCap, bCap, depth - 1, false, alpha, beta);
      maxEval = Math.max(maxEval, eval_);
      alpha = Math.max(alpha, eval_);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const result = makePawnMove(squares, enPassant, move.from, move.to);
      let wCap = whiteCaptured;
      let bCap = blackCaptured;
      if (result.captured?.color === 'w') wCap++;
      if (result.captured?.color === 'b') bCap++;
      const eval_ = minimax(result.squares, result.enPassant, wCap, bCap, depth - 1, true, alpha, beta);
      minEval = Math.min(minEval, eval_);
      beta = Math.min(beta, eval_);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

function getBestMove(
  squares: Record<string, Piece>,
  enPassant: string | null,
  whiteCaptured: number,
  blackCaptured: number,
  difficulty: Difficulty
): { from: string; to: string } | null {
  const moves = getAllPawnMoves(squares, 'b', enPassant);
  if (moves.length === 0) return null;

  const scored = moves.map(move => {
    const result = makePawnMove(squares, enPassant, move.from, move.to);
    let wCap = whiteCaptured;
    let bCap = blackCaptured;
    if (result.captured?.color === 'w') wCap++;
    if (result.captured?.color === 'b') bCap++;

    let score: number;
    if (difficulty === 'easy') {
      // Depth 0: only evaluate immediate result
      score = evaluatePosition(result.squares, wCap, bCap);
    } else if (difficulty === 'medium') {
      // Depth 4: black move + white response + black move + white response
      // This sees if white can capture the pawn immediately
      score = minimax(result.squares, result.enPassant, wCap, bCap, 4, false, -Infinity, Infinity);
    } else {
      // Depth 6: deeper lookahead for advanced
      score = minimax(result.squares, result.enPassant, wCap, bCap, 6, false, -Infinity, Infinity);
    }

    return { ...move, score };
  });

  scored.sort((a, b) => b.score - a.score);

  if (difficulty === 'easy') {
    const rand = Math.random();
    if (rand < 0.5 && scored.length >= 3) {
      return scored[Math.floor(Math.random() * 3)];
    } else if (rand < 0.8 && scored.length >= 5) {
      return scored[Math.floor(Math.random() * 5)];
    } else {
      return scored[Math.floor(Math.random() * scored.length)];
    }
  } else if (difficulty === 'medium') {
    // 95% best move, 5% from top 2 (very rare mistake)
    if (Math.random() < 0.95 || scored.length < 2) {
      return scored[0];
    } else {
      return scored[Math.floor(Math.random() * Math.min(2, scored.length))];
    }
  } else {
    return scored[0];
  }
}

/* ═════════════════════════════════════════════════════════════════
   UI COMPONENTS
   ═════════════════════════════════════════════════════════════════ */

function PieceImg({ type, color }: { type: string; color: 'w' | 'b' }) {
  const pieceKey = `${color}${type.toUpperCase()}`;
  return (
    <img
      src={`/pieces/cburnett/${pieceKey}.svg`}
      alt=""
      className="w-full h-full"
      draggable={false}
      style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }}
    />
  );
}

const START_FEN = '8/pppppppp/8/8/8/8/PPPPPPPP/8 w - - 0 1';

const LEVELS: { id: Difficulty; label: string; description: string; color: string; stars: number }[] = [
  { id: 'easy', label: 'Лёгкий', description: 'Чёрные часто ошибаются', color: 'bg-green-500', stars: 1 },
  { id: 'medium', label: 'Средний', description: 'Чёрные играют осторожно', color: 'bg-yellow-500', stars: 2 },
  { id: 'hard', label: 'Продвинутый', description: 'Чёрные почти не ошибаются', color: 'bg-red-500', stars: 3 },
];

export default function PawnRaceBoard({ onComplete, lessonId }: { onComplete: () => void; lessonId?: string }) {
  const savedKey = lessonId ? `pawnrace_progress_${lessonId}` : 'pawnrace_progress';
  const savedProgress = useMemo(() => {
    if (typeof window === 'undefined') return {} as Record<Difficulty, boolean>;
    try { return JSON.parse(localStorage.getItem(savedKey) || '{}'); } catch { return {}; }
  }, [savedKey]);

  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [completedLevels, setCompletedLevels] = useState<Record<Difficulty, boolean>>(savedProgress);
  const [squares, setSquares] = useState<Record<string, Piece>>(() => parseFen(START_FEN));
  const [whiteCaptured, setWhiteCaptured] = useState(0);
  const [blackCaptured, setBlackCaptured] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);
  const [computerThinking, setComputerThinking] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [validSquares, setValidSquares] = useState<string[]>([]);
  const [enPassant, setEnPassant] = useState<string | null>(null);
  const [turn, setTurn] = useState<'w' | 'b'>('w');
  const [sqSize, setSqSize] = useState(44);

  // Drag state
  const [dragPiece, setDragPiece] = useState<{ square: string; type: string; color: string } | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const pointerStartRef = useRef<{ x: number; y: number; square: string; moved: boolean; pointerId: number } | null>(null);
  const processLockRef = useRef(false);
  const squaresRef = useRef(squares);
  const clickRef = useRef<(square: string) => void>(() => {});
  const selectedSquareRef = useRef<string | null>(null);
  const validSquaresRef = useRef<string[]>([]);
  const enPassantRef = useRef(enPassant);
  const turnRef = useRef(turn);
  const whiteCapturedRef = useRef(0);
  const blackCapturedRef = useRef(0);
  const winnerRef = useRef<string | null>(null);
  const difficultyRef = useRef<Difficulty | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  useEffect(() => { squaresRef.current = squares; }, [squares]);
  useEffect(() => { selectedSquareRef.current = selectedSquare; }, [selectedSquare]);
  useEffect(() => { validSquaresRef.current = validSquares; }, [validSquares]);
  useEffect(() => { enPassantRef.current = enPassant; }, [enPassant]);
  useEffect(() => { turnRef.current = turn; }, [turn]);
  useEffect(() => { whiteCapturedRef.current = whiteCaptured; }, [whiteCaptured]);
  useEffect(() => { blackCapturedRef.current = blackCaptured; }, [blackCaptured]);
  useEffect(() => { winnerRef.current = winner; }, [winner]);
  useEffect(() => { difficultyRef.current = difficulty; }, [difficulty]);

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

  const reset = useCallback(() => {
    setSquares(parseFen(START_FEN));
    setWhiteCaptured(0);
    setBlackCaptured(0);
    setWinner(null);
    setComputerThinking(false);
    setSelectedSquare(null);
    setValidSquares([]);
    setEnPassant(null);
    setTurn('w');
  }, []);

  const startLevel = useCallback((diff: Difficulty) => {
    setDifficulty(diff);
    reset();
  }, [reset]);

  const checkWin = useCallback((sqs: Record<string, Piece>, wCap: number, bCap: number): string | null => {
    if (hasQueen(sqs, 'w') || bCap >= 5) return 'white';
    if (hasQueen(sqs, 'b') || wCap >= 5) return 'black';
    if (countPawns(sqs, 'w') === 0) return 'black';
    if (countPawns(sqs, 'b') === 0) return 'white';
    return null;
  }, []);

  // Computer move
  useEffect(() => {
    if (winnerRef.current || turnRef.current !== 'b' || !difficultyRef.current) return;
    setComputerThinking(true);

    const timer = setTimeout(() => {
      if (!mountedRef.current) return;
      const sqs = squaresRef.current;
      const diff = difficultyRef.current!;

      const chosen = getBestMove(sqs, enPassantRef.current, whiteCapturedRef.current, blackCapturedRef.current, diff);

      if (!chosen) {
        setWinner('Белые победили!');
        setComputerThinking(false);
        return;
      }

      const result = makePawnMove(sqs, enPassantRef.current, chosen.from, chosen.to);
      let wCap = whiteCapturedRef.current;
      if (result.captured && result.captured.color === 'w') {
        wCap = whiteCapturedRef.current + 1;
        setWhiteCaptured(wCap);
      }

      const win = checkWin(result.squares, wCap, blackCapturedRef.current);
      if (win) {
        const winMsg = win === 'white' ? 'Белые победили!' : 'Чёрные победили!';
        setWinner(winMsg);
        setSquares(result.squares);
        setEnPassant(result.enPassant);
        setTurn('w');
        setComputerThinking(false);
        if (win === 'white' && difficultyRef.current) {
          const diff = difficultyRef.current;
          setCompletedLevels(prev => {
            const next = { ...prev, [diff]: true };
            localStorage.setItem(savedKey, JSON.stringify(next));
            return next;
          });
          onComplete();
        }
        return;
      }

      setSquares(result.squares);
      setEnPassant(result.enPassant);
      setTurn('w');
      setComputerThinking(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [turn, winner, checkWin, onComplete, savedKey]);

  // Click logic
  const click = useCallback((square: string) => {
    const sqs = squaresRef.current;
    const sel = selectedSquareRef.current;
    const piece = sqs[square];

    if (sel) {
      if (sel === square) {
        selectedSquareRef.current = null;
        setSelectedSquare(null);
        setValidSquares([]);
        return;
      }

      if (validSquaresRef.current.includes(square)) {
        const result = makePawnMove(sqs, enPassantRef.current, sel, square);
        let bCap = blackCapturedRef.current;
        if (result.captured && result.captured.color === 'b') {
          bCap = blackCapturedRef.current + 1;
          setBlackCaptured(bCap);
        }

        const win = checkWin(result.squares, whiteCapturedRef.current, bCap);
        if (win) {
          const winMsg = win === 'white' ? 'Белые победили!' : 'Чёрные победили!';
          setWinner(winMsg);
          setSquares(result.squares);
          setEnPassant(result.enPassant);
          setSelectedSquare(null);
          setValidSquares([]);
          selectedSquareRef.current = null;
          if (win === 'white' && difficultyRef.current) {
            const diff = difficultyRef.current;
            setCompletedLevels(prev => {
              const next = { ...prev, [diff]: true };
              localStorage.setItem(savedKey, JSON.stringify(next));
              return next;
            });
            onComplete();
          }
          return;
        }

        setSquares(result.squares);
        setEnPassant(result.enPassant);
        setTurn('b');
        setSelectedSquare(null);
        setValidSquares([]);
        selectedSquareRef.current = null;
        return;
      }

      if (piece && piece.color === 'w' && piece.type === 'p') {
        selectedSquareRef.current = square;
        setSelectedSquare(square);
        setValidSquares(getPawnMoves(square, sqs, 'w', enPassantRef.current));
      } else {
        selectedSquareRef.current = null;
        setSelectedSquare(null);
        setValidSquares([]);
      }
    } else {
      if (piece && piece.color === 'w' && piece.type === 'p') {
        selectedSquareRef.current = square;
        setSelectedSquare(square);
        setValidSquares(getPawnMoves(square, sqs, 'w', enPassantRef.current));
      }
    }
  }, [checkWin, onComplete, savedKey]);

  useEffect(() => { clickRef.current = click; }, [click]);

  // Drag and drop
  const handlePointerDown = useCallback((e: React.PointerEvent, square: string) => {
    if (processLockRef.current) return;
    if (e.pointerType === 'touch' && e.isPrimary === false) return;
    e.preventDefault();
    const sqs = squaresRef.current;
    const piece = sqs[square];
    if (piece && piece.color === 'w') {
      pointerStartRef.current = { x: e.clientX, y: e.clientY, square, moved: false, pointerId: e.pointerId };
      setSelectedSquare(square);
      setValidSquares(getPawnMoves(square, sqs, 'w', enPassantRef.current));
    }
  }, []);

  useEffect(() => {
    const handleGlobalMove = (e: PointerEvent) => {
      const start = pointerStartRef.current;
      if (!start) return;
      if (e.pointerId !== start.pointerId) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (!start.moved && (Math.abs(dx) > 20 || Math.abs(dy) > 20)) {
        start.moved = true;
        const sqs = squaresRef.current;
        const piece = sqs[start.square];
        if (piece && piece.color === 'w') {
          setDragPiece({ square: start.square, type: piece.type, color: piece.color });
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
      if (!start.moved) {
        clickRef.current(start.square);
      } else {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const cell = el?.closest('[data-square]') as HTMLElement | null;
        const targetSquare = cell?.dataset.square || null;
        if (targetSquare && targetSquare !== start.square) {
          const valid = getPawnMoves(start.square, squaresRef.current, 'w', enPassantRef.current);
          if (valid.includes(targetSquare)) {
            const result = makePawnMove(squaresRef.current, enPassantRef.current, start.square, targetSquare);
            let bCap = blackCapturedRef.current;
            if (result.captured && result.captured.color === 'b') {
              bCap = blackCapturedRef.current + 1;
              setBlackCaptured(bCap);
            }
            const win = checkWin(result.squares, whiteCapturedRef.current, bCap);
            if (win) {
              const winMsg = win === 'white' ? 'Белые победили!' : 'Чёрные победили!';
              setWinner(winMsg);
              setSquares(result.squares);
              setEnPassant(result.enPassant);
              setSelectedSquare(null);
              setValidSquares([]);
              selectedSquareRef.current = null;
              if (win === 'white' && difficultyRef.current) {
                const diff = difficultyRef.current;
                setCompletedLevels(prev => {
                  const next = { ...prev, [diff]: true };
                  localStorage.setItem(savedKey, JSON.stringify(next));
                  return next;
                });
                onComplete();
              }
            } else {
              setSquares(result.squares);
              setEnPassant(result.enPassant);
              setTurn('b');
              setSelectedSquare(null);
              setValidSquares([]);
              selectedSquareRef.current = null;
            }
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
  }, [checkWin, onComplete, savedKey]);

  const isLight = (f: number, r: number) => (f + r) % 2 === 0;
  const validMoves = selectedSquare
    ? getPawnMoves(selectedSquare, squares, 'w', enPassant)
    : dragPiece
      ? getPawnMoves(dragPiece.square, squares, 'w', enPassant)
      : [];

  // ═══════════════════════════════════════════════════════════════
  // LEVEL SELECTOR
  // ═══════════════════════════════════════════════════════════════
  if (!difficulty) {
    const allCompleted = LEVELS.every(l => completedLevels[l.id]);
    return (
      <div className="flex flex-col items-center gap-6 w-full px-4 py-6">
        <h3 className="text-xl font-bold text-slate-800">Выберите уровень сложности</h3>
        <div className="flex flex-col gap-3 w-full max-w-sm">
          {LEVELS.map(level => {
            const isCompleted = completedLevels[level.id];
            return (
              <button
                key={level.id}
                onClick={() => startLevel(level.id)}
                className={`flex items-center gap-4 px-5 py-4 rounded-xl border-2 transition text-left ${
                  isCompleted
                    ? 'border-green-300 bg-green-50 hover:bg-green-100'
                    : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${level.color}`}>
                  {isCompleted ? <Trophy size={20} /> : level.stars}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-slate-800">{level.label}</div>
                  <div className="text-sm text-slate-500">{level.description}</div>
                </div>
                <ChevronRight size={20} className="text-slate-400" />
              </button>
            );
          })}
        </div>
        {allCompleted && (
          <div className="mt-4 px-6 py-3 bg-green-100 border border-green-300 rounded-xl text-green-800 font-bold flex items-center gap-2">
            <Trophy size={20} /> Все уровни пройдены!
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // GAME BOARD
  // ═══════════════════════════════════════════════════════════════
  const currentLevel = LEVELS.find(l => l.id === difficulty)!;

  return (
    <div className="flex flex-col items-center gap-4 w-full select-none" style={{ touchAction: 'none' }}>
      {/* Level badge */}
      <div className="flex items-center gap-2">
        <span className={`px-3 py-1 rounded-full text-white text-sm font-bold ${currentLevel.color}`}>
          {currentLevel.label}
        </span>
        {completedLevels[difficulty] && (
          <span className="flex items-center gap-1 text-green-600 text-sm font-bold">
            <Star size={14} fill="currentColor" /> Пройдено
          </span>
        )}
      </div>

      {/* Status */}
      <div className="flex items-center justify-between w-full max-w-sm gap-4 px-2">
        <div className="text-sm font-medium">
          Белые съели: <span className="text-red-600 font-bold">{blackCaptured}</span>/5
        </div>
        <div className={`text-sm font-bold ${turn === 'w' ? 'text-blue-600' : 'text-slate-400'}`}>
          {computerThinking ? 'Ход компьютера...' : 'Ваш ход'}
        </div>
        <div className="text-sm font-medium">
          Чёрные съели: <span className="text-red-600 font-bold">{whiteCaptured}</span>/5
        </div>
      </div>

      {winner && (
        <div className="px-6 py-3 bg-green-50 border border-green-200 rounded-xl text-green-700 font-bold text-lg text-center">
          {winner}
        </div>
      )}

      {/* Board */}
      <div className="flex justify-center w-full">
        <div
          className="grid border-[3px] border-[#2b2b2b] rounded-sm relative select-none"
          style={{
            gridTemplateColumns: `repeat(8, ${sqSize}px)`,
            gridTemplateRows: `repeat(8, ${sqSize}px)`,
            touchAction: 'none',
          }}
        >
          {RANKS.map((rank, ri) =>
            FILES.map((file, fi) => {
              const sq = `${file}${rank}`;
              const pieceObj = squares[sq];
              const light = isLight(fi, ri);
              const sel = selectedSquare === sq;
              const isSource = dragPiece?.square === sq;
              const isValidMove = validMoves.includes(sq);

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
                  onDragStart={(e) => e.preventDefault()}
                >
                  {/* Selected square highlight */}
                  {sel && (
                    <div className="absolute inset-[1px] rounded-[5px] bg-[rgba(100,160,60,0.45)] pointer-events-none z-10" />
                  )}
                  {/* Coordinates */}
                  {fi === 0 && (
                    <span className={`absolute top-0.5 left-1 text-[10px] font-bold ${light ? 'text-[#b58863]' : 'text-[#f0d9b5]'}`}>
                      {rank}
                    </span>
                  )}
                  {ri === 7 && (
                    <span className={`absolute bottom-0.5 right-1 text-[10px] font-bold ${light ? 'text-[#b58863]' : 'text-[#f0d9b5]'}`}>
                      {file}
                    </span>
                  )}
                  {/* Green move indicator dots */}
                  {isValidMove && (
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
                  {/* Piece */}
                  {pieceObj && !isSource && (
                    <div className="relative pointer-events-none" style={{ width: Math.round(sqSize * 0.85), height: Math.round(sqSize * 0.85) }}>
                      <PieceImg type={pieceObj.type} color={pieceObj.color as 'w' | 'b'} />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Drag overlay */}
      {dragPiece && (
        <div
          className="fixed pointer-events-none z-50"
          style={{
            left: dragPos.x - Math.round(sqSize / 2),
            top: dragPos.y - Math.round(sqSize / 2),
            width: Math.round(sqSize * 0.85),
            height: Math.round(sqSize * 0.85),
          }}
        >
          <PieceImg type={dragPiece.type} color={dragPiece.color as 'w' | 'b'} />
        </div>
      )}

      {/* Info */}
      <div className="text-center text-sm text-slate-600 max-w-sm px-4">
        <p className="font-medium mb-1">Цель игры:</p>
        <p>Съешь 5 пешек соперника или проведи пешку до последней линии.</p>
        <p className="text-xs text-slate-400 mt-1">Взятие на проходе работает!</p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={reset}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
        >
          <RotateCcw size={16} /> Начать заново
        </button>
        <button
          onClick={() => setDifficulty(null)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
        >
          <ChevronRight size={16} className="rotate-180" /> Уровни
        </button>
      </div>
    </div>
  );
}
