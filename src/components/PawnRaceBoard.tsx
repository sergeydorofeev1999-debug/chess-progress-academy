'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { RotateCcw } from 'lucide-react';

const START_FEN = '8/pppppppp/8/8/8/8/PPPPPPPP/8 w - - 0 1';

export default function PawnRaceBoard({ onComplete }: { onComplete: () => void }) {
  const [isClient, setIsClient] = useState(false);
  const [Chessboard, setChessboard] = useState<any>(null);

  useEffect(() => {
    setIsClient(true);
    import('react-chessboard').then((mod) => {
      setChessboard(() => mod.Chessboard);
    });
  }, []);

  if (!isClient || !Chessboard) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-slate-500">Загрузка доски...</p>
      </div>
    );
  }

  return <PawnRaceGame Chessboard={Chessboard} onComplete={onComplete} />;
}

function PawnRaceGame({ Chessboard, onComplete }: { Chessboard: any; onComplete: () => void }) {
  const [game, setGame] = useState(() => new Chess(START_FEN));
  const [whiteCaptured, setWhiteCaptured] = useState(0);
  const [blackCaptured, setBlackCaptured] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);
  const [computerThinking, setComputerThinking] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const reset = useCallback(() => {
    setGame(new Chess(START_FEN));
    setWhiteCaptured(0);
    setBlackCaptured(0);
    setWinner(null);
    setComputerThinking(false);
    setSelectedSquare(null);
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

  /* ---- Computer move (black) ---- */
  useEffect(() => {
    if (winner || game.turn() !== 'b') return;

    setComputerThinking(true);
    setSelectedSquare(null);

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

      const g = new Chess(game.fen());
      g.move({ from: chosen.from, to: chosen.to, promotion: 'q' });

      let wCap = whiteCaptured;
      if (chosen.captured === 'p') {
        wCap = whiteCaptured + 1;
        setWhiteCaptured(wCap);
      }

      const win = checkWin(g, wCap, blackCaptured);
      if (win) {
        setWinner(win === 'white' ? 'Белые победили!' : 'Чёрные победили!');
        setGame(g);
        setComputerThinking(false);
        if (win === 'white') onComplete();
        return;
      }

      setGame(g);
      setComputerThinking(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [game, winner, checkWin, whiteCaptured, blackCaptured, onComplete]);

  /* ---- Click handler ---- */
  const handleSquareClick = useCallback(
    (square: string) => {
      if (winner || computerThinking || game.turn() !== 'w') return;

      const piece = game.get(square as any);

      if (selectedSquare) {
        if (selectedSquare === square) {
          setSelectedSquare(null);
          return;
        }

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
            if (win === 'white') onComplete();
            return;
          }

          setGame(g);
          setSelectedSquare(null);
        } else {
          if (piece && piece.type === 'p' && piece.color === 'w') {
            setSelectedSquare(square);
          } else {
            setSelectedSquare(null);
          }
        }
      } else {
        if (piece && piece.type === 'p' && piece.color === 'w') {
          setSelectedSquare(square);
        }
      }
    },
    [game, selectedSquare, winner, computerThinking, checkWin, whiteCaptured, blackCaptured, onComplete]
  );

  /* ---- Square styles (highlight selected + legal moves) ---- */
  const customSquareStyles: Record<string, React.CSSProperties> = {};
  if (selectedSquare) {
    customSquareStyles[selectedSquare] = { backgroundColor: 'rgba(59,130,246,0.45)' };

    const moves = game.moves({ verbose: true, square: selectedSquare });
    for (const m of moves) {
      if (m.piece === 'p' && m.color === 'w') {
        const target = game.get(m.to as any);
        if (target) {
          customSquareStyles[m.to] = { background: 'radial-gradient(circle, rgba(255,0,0,0.5) 30%, transparent 70%)' };
        } else {
          customSquareStyles[m.to] = { background: 'radial-gradient(circle, rgba(74,222,128,0.6) 25%, transparent 70%)' };
        }
      }
    }
  }

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

      {/* Board — responsive, no fixed width */}
      <div className="w-full max-w-[480px]">
        <Chessboard
          position={game.fen()}
          onSquareClick={handleSquareClick}
          customDarkSquareStyle={{ backgroundColor: '#b58863' }}
          customLightSquareStyle={{ backgroundColor: '#f0d9b5' }}
          customSquareStyles={customSquareStyles}
          arePiecesDraggable={false}
          animationDuration={200}
        />
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
