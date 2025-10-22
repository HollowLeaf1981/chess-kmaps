import { clamp } from "../utils/mathUtils.js";

/**
 * -------------------------------------------------------------
 * getMaterialBoth(game)
 * -------------------------------------------------------------
 * Calculates the normalized Material metric for both sides.
 *
 * Material is based on the summed standard piece values:
 *   Pawn = 1, Knight = 3, Bishop = 3, Rook = 5, Queen = 9, King = 0
 *
 * The resulting scores are normalized to the [0,1] range
 * relative to a total material scale of 78 points:
 *   - 39 points maximum per side (all pieces on board)
 *   - 78 total across both sides
 *
 * @param {Chess} game - A chess.js instance representing the position.
 * @returns {{ whiteMaterialScore: number, blackMaterialScore: number }}
 *          Normalized scores for both White and Black.
 */
export function getMaterialBoth(game) {
  // Base piece values
  const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

  // Accumulators for total material of each side
  let w = 0,
    b = 0;

  // Traverse all board squares and sum piece values
  game
    .board()
    .flat()
    .forEach((sq) => {
      if (!sq) return;
      const v = pieceValues[sq.type] || 0;
      sq.color === "w" ? (w += v) : (b += v);
    });

  // Difference: positive if White leads, negative if Black leads
  const diff = w - b;

  // Normalize to [0,1] range:
  //   - Add 39 to center the difference on zero
  //   - Divide by total (78) to map full material range
  //   - Clamp ensures scores stay bounded
  return {
    whiteMaterialScore: clamp((diff + 39) / 78),
    blackMaterialScore: clamp((-diff + 39) / 78),
  };
}
