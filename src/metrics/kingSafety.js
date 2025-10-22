import { clamp } from "../utils/mathUtils.js";

/**
 * Evaluates King Safety for a given color.
 */
export function getKingSafety(game, color) {
  const board = game.board();
  let king = null;

  // locate king
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const sq = board[r][f];
      if (sq?.type === "k" && sq.color === color)
        king = { file: f, rank: 8 - r };
    }
  }
  if (!king) return 0.5;

  let score = 0;

  // pawn shield
  const frontRank = color === "w" ? king.rank + 1 : king.rank - 1;
  let shield = 0;
  for (let df = -1; df <= 1; df++) {
    const file = Math.max(0, Math.min(7, king.file + df));
    const sq = `${String.fromCharCode(97 + file)}${frontRank}`;
    const p = game.get(sq);
    if (p?.type === "p" && p.color === color) shield++;
  }
  const shieldScore = shield / 3;
  score += shieldScore * 0.45;

  // castling / placement
  const kingSquare = `${String.fromCharCode(97 + king.file)}${king.rank}`;
  const castled = color === "w" ? ["g1", "c1"] : ["g8", "c8"];
  const isCastled = castled.includes(kingSquare);
  const rankSafety =
    color === "w" ? 1 - (king.rank - 1) / 7 : 1 - (8 - king.rank) / 7;
  let placement = rankSafety * 0.3;
  if (isCastled && shieldScore >= 0.66) placement = 0.35;
  score += placement;

  // mobility
  let mobility = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let df = -1; df <= 1; df++) {
      if (dr === 0 && df === 0) continue;
      const nr = king.rank + dr,
        nf = king.file + df;
      if (nr < 1 || nr > 8 || nf < 0 || nf > 7) continue;
      const sq = `${String.fromCharCode(97 + nf)}${nr}`;
      if (!game.get(sq)) mobility++;
    }
  }
  score += (mobility / 8) * 0.05;

  // enemy pressure
  const enemy = color === "w" ? "b" : "w";
  let pressure = 0;
  for (let dr = -3; dr <= 3; dr++) {
    for (let df = -3; df <= 3; df++) {
      if (dr === 0 && df === 0) continue;
      const nr = king.rank + dr;
      const nf = king.file + df;
      if (nr < 1 || nr > 8 || nf < 0 || nf > 7) continue;
      const sq = `${String.fromCharCode(97 + nf)}${nr}`;
      const p = game.get(sq);
      if (p?.color === enemy) {
        const val = { q: 3, r: 2, b: 1.5, n: 1.2, p: 0.8 }[p.type] || 1;
        pressure += val / (Math.abs(dr) + Math.abs(df));
      }
    }
  }

  score -= Math.min(pressure / 10, 0.25);
  const finalScore = clamp(score);
  return clamp(0.7 * finalScore + 0.3 * finalScore * finalScore);
}
