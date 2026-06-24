'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { RotateCcw } from 'lucide-react';

const START_FEN = '8/pppppppp/8/8/8/8/PPPPPPPP/8 w - - 0 1';

function parseFen(fen: string) {
  const squares: Record<string, { type: string; color: 'w' | 'b' }> = {};
  const parts = fen.split(' ');
  const placement = parts[0];
  const rows = placement.split('/');
  const FILES = ['a','b','c','d','e','f','g','h'];
  const RANKS = ['8','7','6','5','4','3','2','1'];
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
  return squares;
}

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
  const [game, setGame] = useState(() => new Chess(START_FEN));
  const [whiteCaptured, setWhiteCaptured] = useState(0);
  const [blackCaptured, setBlackCaptured] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);
  const [computerThinking, setComputerThinking] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [validSquares, setValidSquares] = useState<string[]>([]);

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const reset = useCallback(() => {
    setGame(new Chess(START_FEN));
    setWhiteCaptured(0);
    setBlackCaptured(0);
    setWinner(null);
    setComputerThinking(false);
    setSelectedSquare(null);
    setValidSquares([]);
  }, []);

  const checkWin = useCallback((g: Chess, wCap: number, bCap: number): string | null => {
    const board = g.board();
    let whiteQueen = false;
    let blackQueen = false;
    let blackPawns = 0;
    let whitePawns = 0;

    for (const row of board) {
      for (const sq of row) {
        if (!sq) continue;
        if (sq.type === 'q') {
          if (sq.color === 'w') whiteQueen = true;
          else blackQueen = true;
        }
        if (sq.type === 'p') {
          if (sq.color === 'b') blackPawns++;
          else whitePawns++;
        }
      }
    }

    if (whiteQueen || bCap >= 5) return 'white';
    if (blackQueen || wCap >= 5) return 'black';
    if (whitePawns === 0) return 'black';
    if (blackPawns === 0) return 'white';
    return null;
  }, []);

  function getValidSquaresForPawn(from: string, g: Chess): string[] {
    const moves = g.moves({ verbose: true }).filter((m: any) => m.from === from);
    return moves.map((m: any) => m.to);
  }

  /* ---- Computer move (black) ---- */
  useEffect(() => {
    if (winner || game.turn() !== 'b') return;
    setComputerThinking(true);

    const timer = setTimeout(() => {
      if (!mountedRef.current) return;

      const moves = game.moves({ verbose: true }).filter((m: any) => m.piece === 'p' && m.color === 'b');
      if (moves.length === 0) {
        setWinner('Белые победили!');
        setComputerThinking(false);
        return;
      }

      const promo = moves.filter((m: any) => m.to[1] === '1');
      const captures = moves.filter((m: any) => {
        const target = game.get(m.to as any);
        return target && target.color === 'w';
      });

      let chosen;
      if (promo.length > 0) chosen = promo[Math.floor(Math.random() * promo.length)];
      else if (captures.length > 0) chosen = captures[Math.floor(Math.random() * captures.length)];
      else chosen = moves[Math.floor(Math.random() * moves.length)];

      const newGame = new Chess(game.fen());
      newGame.move({ from: chosen.from, to: chosen.to, promotion: 'q' });

      let wCap = whiteCaptured;
      if (chosen.captured === 'p') {
        wCap = whiteCaptured + 1;
        setWhiteCaptured(wCap);
      }

      const win = checkWin(newGame, wCap, blackCaptured);
      if (win) {
        setWinner(win === 'white' ? 'Белые победили!' : 'Чёрные победили!');
        setGame(newGame);
        setComputerThinking(false);
        if (win === 'white') onComplete();
        return;
      }

      setGame(newGame);
      setComputerThinking(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [game, winner, checkWin, whiteCaptured, blackCaptured, onComplete]);

  const handleSquareClick = useCallback(
    (square: string) => {
      if (winner || computerThinking || game.turn() !== 'w') return;

      const piece = game.get(square as any);

      if (selectedSquare) {
        if (selectedSquare === square) {
          setSelectedSquare(null);
          setValidSquares([]);
          return;
        }

        // Try move
        const g = new Chess(game.fen());
        const move = g.move({ from: selectedSquare, to: square, promotion: 'q' });

        if (move && move.piece === 'p' && move.color === 'w') {
          let bCap = blackCaptured;
          if (move.captured === 'p') {
            bCap = blackCaptured + 1;
            setBlackCaptured(bCap);
          }

          const win = checkWin(g, whiteCaptured, bCap);
          if (win) {
            setWinner(win === 'white' ? 'Белые победили!' : 'Чёрные победили!');
            setGame(g);
            setSelectedSquare(null);
            setValidSquares([]);
            if (win === 'white') onComplete();
            return;
          }

          setGame(g);
          setSelectedSquare(null);
          setValidSquares([]);
          return;
        }

        // If clicked another white pawn, select it
        if (piece && piece.color === 'w' && piece.type === 'p') {
          setSelectedSquare(square);
          setValidSquares(getValidSquaresForPawn(square, game));
          return;
        }

        setSelectedSquare(null);
        setValidSquares([]);
      } else {
        if (piece && piece.color === 'w' && piece.type === 'p') {
          setSelectedSquare(square);
          setValidSquares(getValidSquaresForPawn(square, game));
        }
      }
    },
    [game, winner, computerThinking, checkWin, whiteCaptured, blackCaptured, onComplete, selectedSquare]
  );

  const squares = parseFen(game.fen());
  const FILES = ['a','b','c','d','e','f','g','h'];
  const RANKS = ['8','7','6','5','4','3','2','1'];

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Status */}
      <div className="flex items-center justify-between w-full max-w-sm gap-4 px-2">
        <div className="text-sm font-medium">
          Белые съели: <span className="text-red-600 font-bold">{blackCaptured}</span>/5
        </div>
        <div className={`text-sm font-bold ${game.turn() === 'w' ? 'text-blue-600' : 'text-slate-400'}`}>
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
              const isLight = ((FILES.indexOf(file) + RANKS.indexOf(rank)) % 2 === 0);
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
