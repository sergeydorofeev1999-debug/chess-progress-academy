'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { RotateCcw } from 'lucide-react';

const FILES = ['a','b','c','d','e','f','g','h'];
const RANKS = ['8','7','6','5','4','3','2','1'];

type Piece = { type: string; color: 'w' | 'b' };

function fenToSquares(fen: string): Record<string, Piece> {
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
  const dir = color === 'w' ? -1 : 1; // white moves up (decreasing rank index), black down
  const valid: string[] = [];

  // Forward 1
  const r1 = fr + dir;
  if (r1 >= 0 && r1 < 8) {
    const f1 = `${FILES[ff]}${RANKS[r1]}`;
    if (!squares[f1]) valid.push(f1);
  }

  // Forward 2 from start
  const startRank = color === 'w' ? 6 : 1; // rank '2' is index 6, rank '7' is index 1
  if (fr === startRank) {
    const r2 = fr + 2 * dir;
    const f1 = `${FILES[ff]}${RANKS[r1]}`;
    const f2 = `${FILES[ff]}${RANKS[r2]}`;
    if (!squares[f1] && !squares[f2]) valid.push(f2);
  }

  // Diagonal captures
  for (const df of [-1, 1]) {
    const fd = ff + df;
    if (fd >= 0 && fd < 8 && r1 >= 0 && r1 < 8) {
      const sq = `${FILES[fd]}${RANKS[r1]}`;
      const target = squares[sq];
      if (target && target.color !== color) valid.push(sq);
      // En passant
      if (enPassant && sq === enPassant) valid.push(sq);
    }
  }

  return valid;
}

function makeMove(squares: Record<string, Piece>, currentEnPassant: string | null, from: string, to: string): { squares: Record<string, Piece>; enPassant: string | null; captured: Piece | null; promoted: boolean } {
  const p = squares[from];
  if (!p) return { squares, enPassant: null, captured: null, promoted: false };

  const next: Record<string, Piece> = { ...squares };
  delete next[from];
  let captured = next[to] || null;

  // En passant capture
  if (p.type === 'p' && to === currentEnPassant) {
    const ff = FILES.indexOf(from[0]);
    const tf = FILES.indexOf(to[0]);
    if (ff !== tf) {
      const captureSq = `${FILES[tf]}${from[1]}`;
      captured = next[captureSq] || captured;
      delete next[captureSq];
    }
  }

  delete next[to];

  // Promotion
  const rank = to[1];
  if (p.type === 'p' && (rank === '8' || rank === '1')) {
    next[to] = { type: 'q', color: p.color };
  } else {
    next[to] = p;
  }

  // Set en passant target
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

const START_FEN = '8/pppppppp/8/8/8/8/PPPPPPPP/8 w - - 0 1';

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

export default function PawnRaceBoard({ onComplete }: { onComplete: () => void }) {
  const [squares, setSquares] = useState<Record<string, Piece>>(() => fenToSquares(START_FEN));
  const [whiteCaptured, setWhiteCaptured] = useState(0);
  const [blackCaptured, setBlackCaptured] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);
  const [computerThinking, setComputerThinking] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [validSquares, setValidSquares] = useState<string[]>([]);
  const [enPassant, setEnPassant] = useState<string | null>(null);
  const [turn, setTurn] = useState<'w' | 'b'>('w');

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const reset = useCallback(() => {
    setSquares(fenToSquares(START_FEN));
    setWhiteCaptured(0);
    setBlackCaptured(0);
    setWinner(null);
    setComputerThinking(false);
    setSelectedSquare(null);
    setValidSquares([]);
    setEnPassant(null);
    setTurn('w');
  }, []);

  const checkWin = useCallback((sqs: Record<string, Piece>, wCap: number, bCap: number): string | null => {
    if (hasQueen(sqs, 'w') || bCap >= 5) return 'white';
    if (hasQueen(sqs, 'b') || wCap >= 5) return 'black';
    if (countPawns(sqs, 'w') === 0) return 'black';
    if (countPawns(sqs, 'b') === 0) return 'white';
    return null;
  }, []);

  /* ---- Computer move (black) ---- */
  useEffect(() => {
    if (winner || turn !== 'b') return;
    setComputerThinking(true);

    const timer = setTimeout(() => {
      if (!mountedRef.current) return;

      const blackPawns: string[] = [];
      for (const sq in squares) {
        if (squares[sq].type === 'p' && squares[sq].color === 'b') blackPawns.push(sq);
      }

      if (blackPawns.length === 0) {
        setWinner('Белые победили!');
        setComputerThinking(false);
        return;
      }

      let allMoves: { from: string; to: string; score: number }[] = [];
      for (const from of blackPawns) {
        const moves = getPawnMoves(from, squares, 'b', enPassant);
        for (const to of moves) {
          let score = 0;
          const target = squares[to];
          if (target && target.color === 'w') score += 100; // capture
          if (to[1] === '1') score += 200; // promotion
          if (to[1] === '2') score += 10; // close to promotion
          allMoves.push({ from, to, score });
        }
      }

      if (allMoves.length === 0) {
        setWinner('Белые победили!');
        setComputerThinking(false);
        return;
      }

      allMoves.sort((a, b) => b.score - a.score);
      const chosen = allMoves[0];

      const result = makeMove(squares, enPassant, chosen.from, chosen.to);
      let wCap = whiteCaptured;
      if (result.captured && result.captured.color === 'w') {
        wCap = whiteCaptured + 1;
        setWhiteCaptured(wCap);
      }

      const win = checkWin(result.squares, wCap, blackCaptured);
      if (win) {
        setWinner(win === 'white' ? 'Белые победили!' : 'Чёрные победили!');
        setSquares(result.squares);
        setEnPassant(result.enPassant);
        setTurn('w');
        setComputerThinking(false);
        if (win === 'white') onComplete();
        return;
      }

      setSquares(result.squares);
      setEnPassant(result.enPassant);
      setTurn('w');
      setComputerThinking(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [turn, winner, squares, enPassant, whiteCaptured, blackCaptured, checkWin, onComplete]);

  const handleSquareClick = useCallback(
    (square: string) => {
      if (winner || computerThinking || turn !== 'w') return;

      const piece = squares[square];

      if (selectedSquare) {
        if (selectedSquare === square) {
          setSelectedSquare(null);
          setValidSquares([]);
          return;
        }

        if (validSquares.includes(square)) {
          const result = makeMove(squares, enPassant, selectedSquare, square);
          let bCap = blackCaptured;
          if (result.captured && result.captured.color === 'b') {
            bCap = blackCaptured + 1;
            setBlackCaptured(bCap);
          }

          const win = checkWin(result.squares, whiteCaptured, bCap);
          if (win) {
            setWinner(win === 'white' ? 'Белые победили!' : 'Чёрные победили!');
            setSquares(result.squares);
            setEnPassant(result.enPassant);
            setSelectedSquare(null);
            setValidSquares([]);
            if (win === 'white') onComplete();
            return;
          }

          setSquares(result.squares);
          setEnPassant(result.enPassant);
          setTurn('b');
          setSelectedSquare(null);
          setValidSquares([]);
          return;
        }

        // If clicked another white pawn, select it
        if (piece && piece.color === 'w' && piece.type === 'p') {
          setSelectedSquare(square);
          setValidSquares(getPawnMoves(square, squares, 'w', enPassant));
          return;
        }

        setSelectedSquare(null);
        setValidSquares([]);
      } else {
        if (piece && piece.color === 'w' && piece.type === 'p') {
          setSelectedSquare(square);
          setValidSquares(getPawnMoves(square, squares, 'w', enPassant));
        }
      }
    },
    [squares, turn, winner, computerThinking, selectedSquare, validSquares, enPassant, whiteCaptured, blackCaptured, checkWin, onComplete]
  );

  return (
    <div className="flex flex-col items-center gap-4 w-full">
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
        <div className="px-6 py-3 bg-green-50 border border-green-200 rounded-xl text-green-700 font-bold text-lg">
          {winner}
        </div>
      )}

      {/* Board */}
      <div className="flex justify-center w-full">
        <div
          className="grid grid-cols-8 border-2 border-slate-800 rounded-lg overflow-hidden"
          style={{ width: 'min(100%, 480px)', aspectRatio: '1' }}
        >
          {RANKS.map((rank) =>
            FILES.map((file, fi) => {
              const sq = `${file}${rank}`;
              const piece = squares[sq];
              const isLight = ((fi + RANKS.indexOf(rank)) % 2 === 0);
              const isSelected = selectedSquare === sq;
              const isValid = validSquares.includes(sq);

              return (
                <button
                  key={sq}
                  onClick={() => handleSquareClick(sq)}
                  className={`relative flex items-center justify-center transition ${
                    isSelected
                      ? 'ring-2 ring-amber-400 z-10'
                      : isValid
                        ? 'ring-2 ring-green-400 z-10'
                        : ''
                  }`}
                  style={{
                    backgroundColor: isLight ? '#f0d9b5' : '#b58863',
                    cursor: 'pointer',
                  }}
                >
                  {piece && <PieceImg type={piece.type} color={piece.color} />}
                  {isValid && !piece && (
                    <div className="w-3 h-3 rounded-full bg-green-500/50" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Info */}
      <div className="text-center text-sm text-slate-600 max-w-sm px-4">
        <p className="font-medium mb-1">Цель игры:</p>
        <p>Съешь 5 пешек соперника или проведи пешку до последней линии.</p>
        <p className="text-xs text-slate-400 mt-1">Взятие на проходе работает!</p>
      </div>

      <button
        onClick={reset}
        className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
      >
        <RotateCcw size={16} /> Начать заново
      </button>
    </div>
  );
}
