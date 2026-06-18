'use client';

import { useState, useCallback, useEffect } from 'react';
import { Chess } from 'chess.js';

interface Props {
  fen?: string;
  interactive?: boolean;
}

export default function ChessBoardComponent({
  fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  interactive = true,
}: Props) {
  // SSR guard — never import react-chessboard on server
  if (typeof window === 'undefined') {
    return (
      <div className="w-full max-w-[480px] mx-auto aspect-square bg-slate-100 rounded-lg flex items-center justify-center">
        <p className="text-slate-400 text-sm">Шахматная доска загружается...</p>
      </div>
    );
  }

  const [Chessboard, setChessboard] = useState<any>(null);
  const [game] = useState(new Chess(fen));
  const [boardFen, setBoardFen] = useState(fen);

  useEffect(() => {
    import('react-chessboard').then((mod) => {
      setChessboard(() => mod.Chessboard);
    });
  }, []);

  const onDrop = useCallback(
    ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) => {
      if (!interactive || !targetSquare) return false;
      try {
        const move = game.move({ from: sourceSquare, to: targetSquare });
        if (move) {
          setBoardFen(game.fen());
          return true;
        }
      } catch {
        return false;
      }
      return false;
    },
    [game, interactive]
  );

  return (
    <div className="w-full max-w-[480px] mx-auto">
      <Chessboard
        options={{
          position: boardFen,
          onPieceDrop: onDrop,
          boardOrientation: 'white',
          showNotation: true,
        }}
      />
      {!interactive && (
        <p className="text-xs text-slate-500 mt-2 text-center">Позиция для разбора</p>
      )}
    </div>
  );
}
