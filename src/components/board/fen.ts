import { FILES, RANKS } from './constants';
import type { BoardMap, FenMeta, FullFen, Color, PieceType, Square } from './types';

export function parseFenFull(fen: string): { board: BoardMap; meta: FenMeta } | null {
  const parts = fen.trim().split(/\s+/);
  if (parts.length < 6) return null;

  const [placement, turnStr, castling, enPassant, halfmoveStr, fullmoveStr] = parts;

  const board: BoardMap = {};
  const rows = placement.split('/');
  if (rows.length !== 8) return null;

  for (let ri = 0; ri < 8; ri++) {
    let fi = 0;
    for (const ch of rows[ri]) {
      if (ch >= '1' && ch <= '8') {
        fi += parseInt(ch, 10);
      } else {
        const color: Color = ch === ch.toUpperCase() ? 'w' : 'b';
        const type = ch.toLowerCase() as PieceType;
        const sq: Square = `${FILES[fi]}${RANKS[ri]}`;
        board[sq] = { type, color };
        fi++;
      }
    }
  }

  return {
    board,
    meta: {
      turn: (turnStr === 'b' ? 'b' : 'w') as Color,
      castling: castling || '-',
      enPassant: enPassant || '-',
      halfmove: parseInt(halfmoveStr, 10) || 0,
      fullmove: parseInt(fullmoveStr, 10) || 1,
    },
  };
}

export function boardToFen(board: BoardMap, meta: FenMeta): string {
  const rows: string[] = [];
  for (let ri = 0; ri < 8; ri++) {
    let row = '';
    let empty = 0;
    for (let fi = 0; fi < 8; fi++) {
      const sq: Square = `${FILES[fi]}${RANKS[ri]}`;
      const p = board[sq];
      if (p) {
        if (empty > 0) { row += empty; empty = 0; }
        const ch = p.type;
        row += p.color === 'w' ? ch.toUpperCase() : ch;
      } else {
        empty++;
      }
    }
    if (empty > 0) row += empty;
    rows.push(row);
  }

  const {
    turn,
    castling,
    enPassant,
    halfmove,
    fullmove,
  } = meta;

  return `${rows.join('/')} ${turn} ${castling || '-'} ${enPassant || '-'} ${halfmove} ${fullmove}`;
}

import { validateFen } from 'chess.js';

export function validateBoardFen(fen: string): { ok: boolean; error?: string } {
  try {
    return validateFen(fen);
  } catch {
    return { ok: false, error: 'validation failed' };
  }
}

export function getStartingFenMeta(): FenMeta {
  return {
    turn: 'w',
    castling: 'KQkq',
    enPassant: '-',
    halfmove: 0,
    fullmove: 1,
  };
}

export function getEmptyFenMeta(): FenMeta {
  return {
    turn: 'w',
    castling: '-',
    enPassant: '-',
    halfmove: 0,
    fullmove: 1,
  };
}

export function normalizeCastling(board: BoardMap, castling: string): string {
  // Remove castling rights if king or rook not on starting squares
  let result = '';
  const hasPiece = (sq: Square, type: PieceType, color: Color) => {
    const p = board[sq];
    return p && p.type === type && p.color === color;
  };

  if (castling.includes('K') && hasPiece('e1', 'k', 'w') && hasPiece('h1', 'r', 'w')) result += 'K';
  if (castling.includes('Q') && hasPiece('e1', 'k', 'w') && hasPiece('a1', 'r', 'w')) result += 'Q';
  if (castling.includes('k') && hasPiece('e8', 'k', 'b') && hasPiece('h8', 'r', 'b')) result += 'k';
  if (castling.includes('q') && hasPiece('e8', 'k', 'b') && hasPiece('a8', 'r', 'b')) result += 'q';

  return result || '-';
}

export function countKings(board: BoardMap): { w: number; b: number } {
  let w = 0, b = 0;
  for (const p of Object.values(board)) {
    if (p && p.type === 'k') {
      if (p.color === 'w') w++;
      else b++;
    }
  }
  return { w, b };
}

export function hasPawnsOnBackRank(board: BoardMap): boolean {
  for (const [sq, p] of Object.entries(board)) {
    if (p && p.type === 'p') {
      const rank = sq[1];
      if (rank === '1' || rank === '8') return true;
    }
  }
  return false;
}
