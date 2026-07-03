import type { BoardPiece } from './types';

interface PieceImageProps {
  piece: BoardPiece;
  size?: number;
  className?: string;
}

export default function PieceImage({ piece, size = 40, className = '' }: PieceImageProps) {
  const pieceKey = `${piece.color}${piece.type.toUpperCase()}`;
  return (
    <img
      src={`/pieces/cburnett/${pieceKey}.svg`}
      alt=""
      className={`select-none pointer-events-none ${className}`}
      style={{
        width: size,
        height: size,
        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))',
      }}
      draggable={false}
    />
  );
}
