import { Chess } from "chess.js";
import { clamp } from "../utils/mathUtils.js";

/**
 * -------------------------------------------------------------
 * getPieceActivity(game, color)
 * -------------------------------------------------------------
 * Evaluates the "Activity" metric for a given color — a measure
 * of how freely that side’s pieces can move and how active
 * they are, particularly in central areas.
 *
 * Activity is based on:
 *   1. Number of available non-pawn moves.
 *   2. Small bonus for knights and bishops occupying central squares.
 *
 * The score is normalized to the [0,1] range using clamp().
 *
 * @param {Chess} game - A chess.js instance representing the position.
 * @param {"w"|"b"} color - The side to evaluate ("w" for White, "b" for Black).
 * @returns {number} Normalized activity score in [0,1].
 */
export function getPieceActivity(game, color) {
  // Clone the position and set the side to move to the target color
  // so that generated moves reflect that color’s mobility.
  const fenParts = game.fen().split(" ");
  fenParts[1] = color;
  const temp = new Chess(fenParts.join(" "));

  // Generate all legal moves for this side
  const moves = temp.moves({ verbose: true });

  // Count only non-pawn moves (pawns are excluded from activity metric)
  const nonPawn = moves.filter((m) => m.piece !== "p").length;

  // Normalize raw mobility — 40 is a practical cap for open positions
  let score = Math.min(nonPawn / 40, 1);

  // -------------------------------------------------------------
  // Positional Bonus: Add small increments for knights and bishops
  // occupying central squares (d4, d5, e4, e5). This favors
  // active, well-placed minor pieces.
  // -------------------------------------------------------------
  game.board().forEach((row, r) =>
    row.forEach((sq, f) => {
      if (!sq || sq.color !== color || sq.type === "p") return;
      const square = `${String.fromCharCode(97 + f)}${8 - r}`;
      if (isCentralSquare(square) && ["n", "b"].includes(sq.type)) score += 0.1;
    })
  );

  // Clamp ensures final score stays within valid [0,1] range
  return clamp(score);
}

/**
 * -------------------------------------------------------------
 * isCentralSquare(sq)
 * -------------------------------------------------------------
 * Determines whether a given square (e.g., "d4") lies within the
 * central 4x4 region of the chessboard (c4–f5 area).
 *
 * @param {string} sq - Square in algebraic format (e.g., "e4").
 * @returns {boolean} True if square is one of the 16 central squares.
 */
function isCentralSquare(sq) {
  const f = sq.charCodeAt(0) - 97; // convert file letter to 0–7 index
  const r = parseInt(sq[1], 10) - 1; // convert rank to 0–7 index
  return f >= 3 && f <= 4 && r >= 3 && r <= 4;
}
