'use client';

import { useState, useCallback, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Star, CheckCircle, RotateCcw } from 'lucide-react';

interface StarData {
  square: string;
  collected?: boolean;
}

interface InteractiveConfig {
  type: string;
  instructions: string;
  initialFen: string;
  stars: StarData[];
  allowedPieces?: string[];
  hint?: string;
  successMessage: string;
}

interface Props {
  config: InteractiveConfig;
  onComplete: () => void;
}

export default function InteractiveCollectStars({ config, onComplete }: Props) {
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
      <div className="text-center py-12 bg-slate-50 rounded-lg">
        <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-slate-500">Загрузка интерактивной доски...</p>
      </div>
    );
  }

  return <InteractiveBoard Chessboard={Chessboard} config={config} onComplete={onComplete} />;
}

function InteractiveBoard({ Chessboard, config, onComplete }: Props & { Chessboard: any }) {
  const [game, setGame] = useState(() => new Chess(config.initialFen));
  const [stars, setStars] = useState<StarData[]>(
    config.stars.map(s => ({ ...s, collected: false }))
  );
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [message, setMessage] = useState(config.instructions);

  const getSquareStyles = useCallback(() => {
    const styles: Record<string, React.CSSProperties> = {};
    stars.forEach(star => {
      if (!star.collected) {
        styles[star.square] = {
          background: 'radial-gradient(circle, rgba(251,191,36,0.6) 30%, transparent 70%)',
          borderRadius: '4px',
        };
      }
    });
    return styles;
  }, [stars]);

  const handlePieceDrop = useCallback(
    ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) => {
      if (isComplete || !targetSquare) return false;

      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      if (move === null) return false;

      if (config.allowedPieces && config.allowedPieces.length > 0) {
        const piece = move.piece;
        if (!config.allowedPieces.includes(piece)) {
          game.undo();
          setMessage(
            `Используйте только ${getPieceName(config.allowedPieces[0])}! ${config.hint || ''}`
          );
          return false;
        }
      }

      const newStars = stars.map(star => {
        if (star.square === targetSquare && !star.collected) {
          return { ...star, collected: true };
        }
        return star;
      });
      setStars(newStars);
      setMoveHistory(prev => [...prev, `${sourceSquare}-${targetSquare}`]);

      const remainingStars = newStars.filter(s => !s.collected).length;
      if (remainingStars === 0) {
        setIsComplete(true);
        setMessage(config.successMessage);
        onComplete();
      } else {
        setMessage(`Осталось звёзд: ${remainingStars}`);
      }

      setGame(new Chess(game.fen()));
      return true;
    },
    [game, stars, isComplete, config, onComplete]
  );

  const reset = () => {
    setGame(new Chess(config.initialFen));
    setStars(config.stars.map(s => ({ ...s, collected: false })));
    setMoveHistory([]);
    setIsComplete(false);
    setMessage(config.instructions);
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-800 font-medium">{message}</p>
        {config.hint && !isComplete && (
          <p className="text-blue-600 text-sm mt-1">💡 {config.hint}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Star size={16} fill="gold" color="#f59e0b" />
          <span className="text-sm text-gray-600">
            Собрано: {stars.filter(s => s.collected).length} / {stars.length}
          </span>
        </div>
        {isComplete && (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle size={18} />
            <span className="font-medium">Урок пройден!</span>
          </div>
        )}
      </div>

      <div className="flex justify-center">
        <div className="relative inline-block">
          <Chessboard
            options={{
              position: game.fen(),
              onPieceDrop: handlePieceDrop,
              squareStyles: getSquareStyles(),
              boardStyle: { borderRadius: '8px' },
              animationDurationInMs: 200,
            }}
          />
          {stars.filter(s => !s.collected).map(star => (
            <StarOverlay key={star.square} square={star.square} />
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={reset}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
        >
          <RotateCcw size={16} />
          Начать заново
        </button>
      </div>

      {moveHistory.length > 0 && (
        <div className="text-xs text-gray-500">
          Ходы: {moveHistory.join(', ')}
        </div>
      )}
    </div>
  );
}

function StarOverlay({ square }: { square: string }) {
  const file = square.charCodeAt(0) - 97;
  const rank = 8 - parseInt(square[1]);
  const left = `${(file / 8) * 100 + 50}%`;
  const top = `${(rank / 8) * 100 + 15}%`;

  return (
    <div
      className="pointer-events-none absolute z-10"
      style={{ left, top, transform: 'translate(-50%, -50%)' }}
    >
      <Star size={28} fill="#fbbf24" color="#f59e0b" strokeWidth={2} className="animate-pulse drop-shadow-md" />
    </div>
  );
}

function getPieceName(piece: string): string {
  const names: Record<string, string> = {
    r: 'ладью',
    n: 'коня',
    b: 'слона',
    q: 'ферзя',
    k: 'короля',
    p: 'пешку',
  };
  return names[piece] || piece;
}
