import { clamp } from "../utils/mathUtils.js";

/**
 * Calculates normalized Material scores for both White and Black.
 */
export function getMaterialBoth(game) {
  const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  let w = 0,
    b = 0;

  game
    .board()
    .flat()
    .forEach((sq) => {
      if (!sq) return;
      const v = pieceValues[sq.type] || 0;
      sq.color === "w" ? (w += v) : (b += v);
    });

  const diff = w - b;
  return {
    whiteMaterialScore: clamp((diff + 39) / 78),
    blackMaterialScore: clamp((-diff + 39) / 78),
  };
}
