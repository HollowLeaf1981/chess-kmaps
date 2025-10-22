export function squareFromRF(fileIdx, rank) {
  return `${String.fromCharCode(97 + fileIdx)}${rank}`;
}

export function isOnBoard(file, rank) {
  return file >= 0 && file <= 7 && rank >= 1 && rank <= 8;
}
