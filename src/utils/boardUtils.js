// -------------------------------------------------------------
// Chessboard Utility Functions
// -------------------------------------------------------------

/**
 * squareFromRF(fileIdx, rank)
 * -----------------------------------------
 * Converts a file index (0–7) and rank (1–8) into
 * standard algebraic chess notation (e.g., "e4").
 *
 * @param {number} fileIdx - Zero-based file index (0 = 'a', 7 = 'h').
 * @param {number} rank - Rank number (1–8).
 * @returns {string} The corresponding square name, e.g., "e4".
 *
 * Example:
 *   squareFromRF(4, 4) → "e4"
 */
export function squareFromRF(fileIdx, rank) {
  return `${String.fromCharCode(97 + fileIdx)}${rank}`;
}

/**
 * isOnBoard(file, rank)
 * -----------------------------------------
 * Determines whether a given (file, rank) coordinate
 * lies within the valid chessboard boundaries.
 *
 * @param {number} file - Zero-based file index (0–7).
 * @param {number} rank - Rank number (1–8).
 * @returns {boolean} True if the coordinates are on the board.
 *
 * Example:
 *   isOnBoard(0, 1) → true   // a1
 *   isOnBoard(7, 8) → true   // h8
 *   isOnBoard(-1, 5) → false // off-board
 */
export function isOnBoard(file, rank) {
  return file >= 0 && file <= 7 && rank >= 1 && rank <= 8;
}
