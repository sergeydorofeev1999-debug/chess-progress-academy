export type Color = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type Square = string;

export interface BoardPiece {
  type: PieceType;
  color: Color;
}

export type BoardMap = Partial<Record<Square, BoardPiece>>;

export interface FenMeta {
  turn: Color;
  castling: string; // KQkq or - or subset
  enPassant: string; // e3, -, etc.
  halfmove: number;
  fullmove: number;
}

export interface FullFen {
  placement: string;
  meta: FenMeta;
}

export type BoardOrientation = 'white' | 'black';

export type PaletteTool = 
  | { kind: 'pointer' }
  | { kind: 'piece'; piece: BoardPiece }
  | { kind: 'erase' };
