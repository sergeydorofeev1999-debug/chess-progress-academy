'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { RotateCcw } from 'lucide-react';

/* ====== cburnett SVG pieces ====== */
function PieceImg({ type, color }: { type: string; color: 'w' | 'b' }) {
  const pieceKey = `${color}${type.toUpperCase()}`;
  const src = `/pieces/cburnett/${pieceKey}.svg`;
  return (
    <div className="w-full h-full" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }}>
      <img src={src} alt="" className="w-full h-full" draggable={false} />
    </div>
  );
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

interface Piece {
  type: string;
  color: 'w' | 'b';
}

/* ====== Pawn Race Board ====== */
export default function PawnRaceBoard({ onComplete }: { onComplete: () => void }) {
  const [position, setPosition] = useState<Record<string, Piece | null>>(() => {
    const pos: Record<string, Piece | null> = {};
    for (const f of FILES) {
      pos[`${f}2`] = { type: 'p', color: 'w' };
      pos[`${f}7`] = { type: 'p', color: 'b' };
    }
    return pos;
  });
  const [turn, setTurn] = useState<'w' | 'b'>('w');
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [whiteCaptured, setWhiteCaptured] = useState(0);
  const [blackCaptured, setBlackCaptured] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [enPassant, setEnPassant] = useState<string | null>(null);

  const positionRef = useRef(position);
  const enPassantRef = useRef(enPassant);
  const whiteCapturedRef = useRef(whiteCaptured);
  const blackCapturedRef = useRef(blackCaptured);

  positionRef.current = position;
  enPassantRef.current = enPassant;
  whiteCapturedRef.current = whiteCaptured;
  blackCapturedRef.current = blackCaptured;

  /* ---- Legal moves ---- */
  const getLegalMoves = useCallback(
    (square: string, pos: Record<string, Piece | null>, currentTurn: 'w' | 'b', ep: string | null): string[] => {
      const piece = pos[square];
      if (!piece || piece.color !== currentTurn) return [];

      const file = square[0];
      const rank = parseInt(square[1]);
      const moves: string[] = [];
      const fileIdx = FILES.indexOf(file);

      if (piece.color === 'w') {
        const nextRank = rank + 1;
        const nextSquare = `${file}${nextRank}`;
        if (nextRank <= 8 && !pos[nextSquare]) {
          moves.push(nextSquare);
          if (rank === 2) {
            const twoSquare = `${file}${rank + 2}`;
            if (!pos[twoSquare]) moves.push(twoSquare);
          }
        }
        for (const df of [-1, 1]) {
          const newFileIdx = fileIdx + df;
          if (newFileIdx >= 0 && newFileIdx < 8) {
            const captureSquare = `${FILES[newFileIdx]}${nextRank}`;
            const target = pos[captureSquare];
            if ((target && target.color === 'b') || ep === captureSquare) {
              moves.push(captureSquare);
            }
          }
        }
      } else {
        const nextRank = rank - 1;
        const nextSquare = `${file}${nextRank}`;
        if (nextRank >= 1 && !pos[nextSquare]) {
          moves.push(nextSquare);
          if (rank === 7) {
            const twoSquare = `${file}${rank - 2}`;
            if (!pos[twoSquare]) moves.push(twoSquare);
          }
        }
        for (const df of [-1, 1]) {
          const newFileIdx = fileIdx + df;
          if (newFileIdx >= 0 && newFileIdx < 8) {
            const captureSquare = `${FILES[newFileIdx]}${nextRank}`;
            const target = pos[captureSquare];
            if ((target && target.color === 'w') || ep === captureSquare) {
              moves.push(captureSquare);
            }
          }
        }
      }
      return moves;
    },
    []
  );

  /* ---- Execute move ---- */
  const makeMove = useCallback(
    (from: string, to: string, pos: Record<string, Piece | null>, currentTurn: 'w' | 'b', ep: string | null) => {
      const newPos = { ...pos };
      const piece = newPos[from];
      if (!piece) return null;

      let newEp: string | null = null;
      let whiteCap = 0;
      let blackCap = 0;
      const fromRank = parseInt(from[1]);
      const toRank = parseInt(to[1]);

      // Two-square: set en-passant target
      if (piece.type === 'p') {
        if (piece.color === 'w' && fromRank === 2 && toRank === 4) {
          newEp = `${from[0]}3`;
        } else if (piece.color === 'b' && fromRank === 7 && toRank === 5) {
          newEp = `${from[0]}6`;
        }
      }

      // En passant capture
      if (ep && to === ep) {
        if (piece.color === 'w') {
          newPos[`${to[0]}${parseInt(to[1]) - 1}`] = null;
          blackCap = 1;
        } else {
          newPos[`${to[0]}${parseInt(to[1]) + 1}`] = null;
          whiteCap = 1;
        }
      }

      // Normal capture
      const captured = newPos[to];
      if (captured) {
        if (captured.color === 'w') whiteCap = 1;
        else blackCap = 1;
      }

      // Move
      newPos[to] = piece;
      newPos[from] = null;

      // Promotion
      if (toRank === 8 && piece.color === 'w') newPos[to] = { type: 'q', color: 'w' };
      if (toRank === 1 && piece.color === 'b') newPos[to] = { type: 'q', color: 'b' };

      return { newPos, newEp, whiteCap, blackCap };
    },
    []
  );

  /* ---- Win check ---- */
  const checkWin = useCallback(
    (pos: Record<string, Piece | null>, wCap: number, bCap: number): string | null => {
      let whiteQueen = false;
      let blackQueen = false;
      let blackPawns = 0;
      let whitePawns = 0;

      for (const [, p] of Object.entries(pos)) {
        if (!p) continue;
        if (p.color === 'w' && p.type === 'q') whiteQueen = true;
        if (p.color === 'b' && p.type === 'q') blackQueen = true;
        if (p.color === 'b' && p.type === 'p') blackPawns++;
        if (p.color === 'w' && p.type === 'p') whitePawns++;
      }

      if (whiteQueen || bCap >= 5) return 'white';
      if (blackQueen || wCap >= 5) return 'black';
      return null;
    },
    []
  );

  /* ---- Reset ---- */
  const reset = useCallback(() => {
    const pos: Record<string, Piece | null> = {};
    for (const f of FILES) {
      pos[`${f}2`] = { type: 'p', color: 'w' };
      pos[`${f}7`] = { type: 'p', color: 'b' };
    }
    setPosition(pos);
    setTurn('w');
    setSelectedSquare(null);
    setWhiteCaptured(0);
    setBlackCaptured(0);
    setWinner(null);
    setMessage('');
    setEnPassant(null);
  }, []);

  /* ---- Computer move (black) ---- */
  useEffect(() => {
    if (turn !== 'b' || winner) return;

    const timer = setTimeout(() => {
      const pos = positionRef.current;
      const ep = enPassantRef.current;

      const blackPieces: string[] = [];
      for (const [sq, p] of Object.entries(pos)) {
        if (p && p.color === 'b') blackPieces.push(sq);
      }

      const allMoves: { from: string; to: string }[] = [];
      for (const from of blackPieces) {
        for (const to of getLegalMoves(from, pos, 'b', ep)) {
          allMoves.push({ from, to });
        }
      }

      if (allMoves.length === 0) {
        setWinner('white');
        setMessage('Белые победили! У чёрных нет ходов.');
        return;
      }

      // Prioritize: promotion > capture > random
      const promo = allMoves.filter((m) => m.to[1] === '1');
      const cap = allMoves.filter((m) => pos[m.to] && pos[m.to]?.color === 'w');
      const chosen = promo.length > 0
        ? promo[Math.floor(Math.random() * promo.length)]
        : cap.length > 0
          ? cap[Math.floor(Math.random() * cap.length)]
          : allMoves[Math.floor(Math.random() * allMoves.length)];

      const result = makeMove(chosen.from, chosen.to, pos, 'b', ep);
      if (!result) return;

      const { newPos, newEp, whiteCap } = result;
      if (whiteCap > 0) setWhiteCaptured((prev) => prev + whiteCap);

      const win = checkWin(newPos, whiteCapturedRef.current + whiteCap, blackCapturedRef.current);
      if (win) {
        setWinner(win === 'white' ? 'Белые победили!' : 'Чёрные победили!');
        setMessage(win === 'white' ? 'Белые победили!' : 'Чёрные победили!');
        setPosition(newPos);
        if (win === 'white') onComplete();
        return;
      }

      setPosition(newPos);
      setTurn('w');
      setEnPassant(newEp);
    }, 1000);

    return () => clearTimeout(timer);
  }, [turn, winner, getLegalMoves, makeMove, checkWin, onComplete]);

  /* ---- Click handler ---- */
  const handleSquareClick = useCallback(
    (square: string) => {
      if (winner || turn !== 'w') return;

      const piece = position[square];

      if (selectedSquare) {
        const legal = getLegalMoves(selectedSquare, position, 'w', enPassant);
        if (legal.includes(square)) {
          const result = makeMove(selectedSquare, square, position, 'w', enPassant);
          if (!result) return;

          const { newPos, newEp, blackCap } = result;
          if (blackCap > 0) setBlackCaptured((prev) => prev + blackCap);

          setSelectedSquare(null);
          setMessage('');

          const win = checkWin(newPos, whiteCaptured, blackCaptured + blackCap);
          if (win) {
            setWinner(win === 'white' ? 'Белые победили!' : 'Чёрные победили!');
            setMessage(win === 'white' ? 'Белые победили!' : 'Чёрные победили!');
            setPosition(newPos);
            if (win === 'white') onComplete();
            return;
          }

          setPosition(newPos);
          setTurn('b');
          setEnPassant(newEp);
        } else {
          if (piece && piece.color === 'w') {
            setSelectedSquare(square);
            setMessage('');
          } else {
            setSelectedSquare(null);
            setMessage('Недопустимый ход');
          }
        }
      } else {
        if (piece && piece.color === 'w' && piece.type === 'p') {
          setSelectedSquare(square);
          setMessage('');
        }
      }
    },
    [position, turn, winner, selectedSquare, enPassant, getLegalMoves, makeMove, checkWin, whiteCaptured, blackCaptured, onComplete]
  );

  const isLightSquare = (f: number, r: number) => (f + r) % 2 === 0;
  const legalMoves = selectedSquare ? getLegalMoves(selectedSquare, position, 'w', enPassant) : [];

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Status */}
      <div className="flex items-center justify-between w-full max-w-sm gap-4 px-2">
        <div className="text-sm font-medium">
          Белые съели: <span className="text-red-600 font-bold">{blackCaptured}</span>/5
        </div>
        <div className={`text-sm font-bold ${turn === 'w' ? 'text-blue-600' : 'text-slate-400'}`}>
          {turn === 'w' ? 'Ваш ход' : 'Ход компьютера...'}
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
      <div className="grid grid-cols-8 border-2 border-slate-700 rounded overflow-hidden w-full max-w-[420px] aspect-square">
        {RANKS.map((rank, rankIdx) =>
          FILES.map((file, fileIdx) => {
            const square = `${file}${rank}`;
            const piece = position[square];
            const isLight = isLightSquare(fileIdx, rankIdx);
            const isSel = selectedSquare === square;
            const isLegal = legalMoves.includes(square);
            const hasPiece = !!piece;

            return (
              <div
                key={square}
                onClick={() => handleSquareClick(square)}
                className={`
                  relative flex items-center justify-center cursor-pointer select-none
                  ${isSel ? 'ring-2 ring-blue-500 ring-inset z-10' : ''}
                  ${isLegal && !hasPiece ? 'ring-2 ring-green-400 ring-inset z-10' : ''}
                  ${isLegal && hasPiece ? 'ring-2 ring-red-400 ring-inset z-10' : ''}
                `}
                style={{ backgroundColor: isLight ? '#f0d9b5' : '#b58863' }}
              >
                {/* Coordinates */}
                {fileIdx === 0 && (
                  <span className={`absolute top-0.5 left-1 text-[10px] font-bold ${isLight ? 'text-[#b58863]' : 'text-[#f0d9b5]'}`}>
                    {rank}
                  </span>
                )}
                {rankIdx === 7 && (
                  <span className={`absolute bottom-0.5 right-1 text-[10px] font-bold ${isLight ? 'text-[#b58863]' : 'text-[#f0d9b5]'}`}>
                    {file}
                  </span>
                )}

                {/* Piece */}
                {piece && <div className="w-[80%] h-[80%]"><PieceImg type={piece.type} color={piece.color} /></div>}

                {/* Legal-move dot */}
                {isLegal && !hasPiece && (
                  <div className="absolute w-3 h-3 rounded-full bg-green-500 opacity-60" />
                )}
              </div>
            );
          })
        )}
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

      {message && !winner && <p className="text-red-500 text-sm">{message}</p>}
    </div>
  );
}
