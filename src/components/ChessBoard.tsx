'use client';

import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { useState, useCallback, useEffect } from 'react';

interface Props {
  fen?: string;
  interactive?: boolean;
}

export default function ChessBoardComponent({
  fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  interactive = true,
}: Props) {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="w-full max-w-[480px] mx-auto aspect-square bg-slate-100 rounded-lg flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }
  const [game] = useState(new Chess(fen));
  const [boardFen, setBoardFen] = useState(fen);

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
