export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
export const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'] as const;
export const RANKS_REVERSED = ['1', '2', '3', '4', '5', '6', '7', '8'] as const;

export const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
export const EMPTY_FEN = '8/8/8/8/8/8/8/8 w - - 0 1';

export const PIECE_TYPES = ['p', 'n', 'b', 'r', 'q', 'k'] as const;
export const COLORS = ['w', 'b'] as const;

export const PIECE_NAMES: Record<string, string> = {
  p: 'Пешка',
  n: 'Конь',
  b: 'Слон',
  r: 'Ладья',
  q: 'Ферзь',
  k: 'Король',
};

export const SQUARES = FILES.flatMap((f) => RANKS.map((r) => `${f}${r}`));
