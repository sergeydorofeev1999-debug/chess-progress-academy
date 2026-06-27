const { Chess } = require('chess.js');

// Exercise 6 initial FEN
const FEN = '8/8/5R2/7k/5K2/8/8/8 w - - 0 1';

// Simulate processWhiteMove logic
function simulateExercise6() {
  const g = new Chess(FEN);
  console.log('=== Initial position ===');
  console.log('FEN:', g.fen());
  console.log('White to move:', g.turn() === 'w');
  
  const FILES = ['a','b','c','d','e','f','g','h'];
  const RANKS = ['8','7','6','5','4','3','2','1'];
  
  // Step 1: White plays Rf6-e6
  console.log('\n=== Step 1: White Rf6-e6 ===');
  const move1 = g.move({ from: 'f6', to: 'e6' });
  if (!move1) {
    console.log('ERROR: Move f6-e6 rejected by chess.js!');
    return;
  }
  console.log('Move 1 accepted:', move1.from, '->', move1.to);
  console.log('FEN after:', g.fen());
  
  // Check if checkmate
  if (g.isCheckmate()) {
    console.log('RESULT: Checkmate after move 1!');
    return;
  }
  if (g.isStalemate()) {
    console.log('RESULT: Stalemate after move 1!');
    return;
  }
  if (g.isDraw()) {
    console.log('RESULT: Draw after move 1!');
    return;
  }
  
  // Check if black king can capture rook
  const squaresAfter = g.board();
  let rookSquare = '';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = squaresAfter[r][c];
      if (p && p.type === 'r' && p.color === 'w') {
        rookSquare = FILES[c] + RANKS[r];
      }
    }
  }
  console.log('Rook now on:', rookSquare);
  
  const blackMoves = g.moves({ verbose: true });
  const canCaptureRook = blackMoves.some(m => m.piece === 'k' && m.to === rookSquare);
  console.log('Black king can capture rook:', canCaptureRook);
  
  if (canCaptureRook) {
    console.log('FAIL: Rook can be captured!');
    return;
  }
  
  // Step 2: Black moves (simulate getBlackKingMove)
  console.log('\n=== Step 2: Black King move ===');
  const kingMoves = blackMoves.filter(m => m.piece === 'k');
  console.log('King moves:', kingMoves.map(m => m.from + '->' + m.to));
  
  // Black should play Kg4 or Kh4
  const bestMove = kingMoves[0]; // first available
  console.log('Black plays:', bestMove.from, '->', bestMove.to);
  g.move({ from: bestMove.from, to: bestMove.to });
  console.log('FEN after black:', g.fen());
  
  // Step 3: White plays Re6-h6#
  console.log('\n=== Step 3: White Re6-h6 ===');
  const move3 = g.move({ from: 'e6', to: 'h6' });
  if (!move3) {
    console.log('ERROR: Move e6-h6 rejected!');
    return;
  }
  console.log('Move 3 accepted:', move3.from, '->', move3.to);
  console.log('FEN after:', g.fen());
  
  if (g.isCheckmate()) {
    console.log('SUCCESS: Checkmate!');
  } else {
    console.log('FAIL: Not checkmate after Rh6');
    console.log('isCheck:', g.isCheck());
    console.log('isCheckmate:', g.isCheckmate());
  }
}

simulateExercise6();
