import { clamp } from "../utils/mathUtils.js";

/**
 * -------------------------------------------------------------
 * getKingSafety(game, color)
 * -------------------------------------------------------------
 * Evaluates King Safety for a given side by combining several
 * strategic subfactors into a normalized [0,1] score.
 *
 * Components:
 *   1. Pawn Shield      – protection from pawns directly in front
 *   2. Castling/Placement – rank safety and castled positioning
 *   3. Mobility         – number of safe adjacent squares
 *   4. Enemy Pressure   – nearby opposing pieces and their threat potential
 *
 * The final score is lightly smoothed toward higher values for stability,
 * and clamped to ensure it stays in [0,1].
 *
 * @param {Chess} game - A chess.js instance representing the position.
 * @param {"w"|"b"} color - The color whose king safety to evaluate.
 * @returns {number} Normalized safety score between 0 and 1.
 */
export function getKingSafety(game, color) {
  const board = game.board();
  let king = null;

  // -------------------------------------------------------------
  // Locate the king’s coordinates (file 0–7, rank 1–8)
  // -------------------------------------------------------------
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const sq = board[r][f];
      if (sq?.type === "k" && sq.color === color)
        king = { file: f, rank: 8 - r };
    }
  }

  // If the king cannot be found (invalid FEN), return a neutral score
  if (!king) return 0.5;

  let score = 0;

  // -------------------------------------------------------------
  // 1. Pawn Shield — number of pawns directly in front of the king
  // -------------------------------------------------------------
  const frontRank = color === "w" ? king.rank + 1 : king.rank - 1;
  let shield = 0;
  for (let df = -1; df <= 1; df++) {
    const file = Math.max(0, Math.min(7, king.file + df));
    const sq = `${String.fromCharCode(97 + file)}${frontRank}`;
    const p = game.get(sq);
    if (p?.type === "p" && p.color === color) shield++;
  }

  // Normalize shield (0–3 pawns) and weight contribution
  const shieldScore = shield / 3;
  score += shieldScore * 0.45;

  // -------------------------------------------------------------
  // 2. Castling / Placement — evaluates how exposed the king is
  // -------------------------------------------------------------
  const kingSquare = `${String.fromCharCode(97 + king.file)}${king.rank}`;
  const castledSquares = color === "w" ? ["g1", "c1"] : ["g8", "c8"];
  const isCastled = castledSquares.includes(kingSquare);

  // Rank safety: kings deeper in own territory score higher
  const rankSafety =
    color === "w" ? 1 - (king.rank - 1) / 7 : 1 - (8 - king.rank) / 7;

  // Default placement weight
  let placement = rankSafety * 0.3;

  // Bonus for being castled with an intact pawn shield
  if (isCastled && shieldScore >= 0.66) placement = 0.35;

  score += placement;

  // -------------------------------------------------------------
  // 3. Mobility — empty adjacent squares the king can move to
  // -------------------------------------------------------------
  let mobility = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let df = -1; df <= 1; df++) {
      if (dr === 0 && df === 0) continue;
      const nr = king.rank + dr;
      const nf = king.file + df;
      if (nr < 1 || nr > 8 || nf < 0 || nf > 7) continue;
      const sq = `${String.fromCharCode(97 + nf)}${nr}`;
      if (!game.get(sq)) mobility++;
    }
  }

  // Weight mobility modestly (at most +0.05)
  score += (mobility / 8) * 0.05;

  // -------------------------------------------------------------
  // 4. Enemy Pressure — detect nearby enemy pieces and estimate threat
  // -------------------------------------------------------------
  const enemy = color === "w" ? "b" : "w";
  let pressure = 0;

  // Look in a 7×7 zone around the king (3 squares in each direction)
  for (let dr = -3; dr <= 3; dr++) {
    for (let df = -3; df <= 3; df++) {
      if (dr === 0 && df === 0) continue;
      const nr = king.rank + dr;
      const nf = king.file + df;
      if (nr < 1 || nr > 8 || nf < 0 || nf > 7) continue;
      const sq = `${String.fromCharCode(97 + nf)}${nr}`;
      const p = game.get(sq);

      if (p?.color === enemy) {
        // Each piece contributes pressure inversely proportional to distance
        const val = { q: 3, r: 2, b: 1.5, n: 1.2, p: 0.8 }[p.type] || 1;
        pressure += val / (Math.abs(dr) + Math.abs(df));
      }
    }
  }

  // Reduce safety based on total nearby enemy activity
  // Cap reduction to a max of -0.25
  score -= Math.min(pressure / 10, 0.25);

  // -------------------------------------------------------------
  // Final normalization and smoothing
  // -------------------------------------------------------------
  const finalScore = clamp(score);

  // Blend linear and quadratic terms for smoother gradient
  // (slightly rewards strong safety, dampens extremes)
  return clamp(0.7 * finalScore + 0.3 * finalScore * finalScore);
}
