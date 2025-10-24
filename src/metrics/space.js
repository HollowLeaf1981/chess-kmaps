// -------------------------------------------------------------
// Space Metric
// -------------------------------------------------------------
// Evaluates how much "space" a given side controls on the board.
// The metric combines three weighted components:
//   1. Reach Score   – number of reachable squares in the opponent’s half
//   2. Presence Score – how many of own pieces physically occupy that half
//   3. Foothold Score – control and occupation of central files in enemy half
//
// The result is normalized to [0,1] using clamp().
// -------------------------------------------------------------

import { Chess } from "chess.js";
import { clamp } from "../utils/mathUtils.js";

/**
 * getSpaceForColor(game, color)
 * -----------------------------------------
 * Computes the normalized space control score for a given color.
 *
 * @param {Chess} game - A chess.js instance representing the current position.
 * @param {"w"|"b"} color - The color to evaluate.
 * @returns {number} A value between 0 and 1, representing relative space control.
 */
export function getSpaceForColor(game, color) {
  // Clone the position but set the side to move to the target color
  // so move generation is done from that perspective
  const fenParts = game.fen().split(" ");
  fenParts[1] = color;
  fenParts[3] = "-"; // clear EP square when changing side-to-move
  const temp = new Chess(fenParts.join(" "));

  // Define opponent’s half of the board depending on color
  const oppHalfRankMin = color === "w" ? 5 : 1;
  const oppHalfRankMax = color === "w" ? 8 : 4;

  // -------------------------------------------------------------
  // 1. Reach Score — count how many unique squares this side’s
  // non-king pieces can reach in the opponent’s half.
  // -------------------------------------------------------------
  const moves = temp.moves({ verbose: true });
  const reachSquares = new Set(
    moves
      .filter((m) => m.piece !== "k") // ignore king moves
      .filter((m) => {
        const r = parseInt(m.to[1], 10);
        return r >= oppHalfRankMin && r <= oppHalfRankMax;
      })
      .map((m) => m.to)
  );
  // Max possible coverage of 28 squares (approx half board)
  const reachScore = Math.min(reachSquares.size / 28, 1);

  // -------------------------------------------------------------
  // 2. Presence Score — proportion of own piece weight
  // physically occupying the opponent’s half.
  // -------------------------------------------------------------
  let presence = 0,
    maxPresence = 0;
  const weights = { p: 1, n: 0.8, b: 0.8, r: 0.6, q: 0.5, k: 0.2 };
  game.board().forEach((row, rankIdx) =>
    row.forEach((sq, fileIdx) => {
      if (!sq || sq.color !== color) return;
      const rank = 8 - rankIdx;
      const inOppHalf = color === "w" ? rank >= 5 : rank <= 4;
      const w = weights[sq.type] || 0.5;
      maxPresence += w;
      if (inOppHalf) presence += w;
    })
  );
  const presenceScore = maxPresence > 0 ? presence / maxPresence : 0;

  // -------------------------------------------------------------
  // 3. Foothold Score — measures how many of the player’s pieces
  // occupy or control central files (c–f) in the opponent’s half.
  // -------------------------------------------------------------
  const centralFiles = new Set(["c", "d", "e", "f"]);
  let foothold = 0,
    footholdDen = 0;
  game.board().forEach((row, rankIdx) =>
    row.forEach((sq, fileIdx) => {
      if (!sq || sq.color !== color) return;
      const rank = 8 - rankIdx;
      const fileChar = String.fromCharCode(97 + fileIdx);
      const inOppHalf = color === "w" ? rank >= 5 : rank <= 4;
      if (inOppHalf && centralFiles.has(fileChar)) foothold++;
      if (centralFiles.has(fileChar)) footholdDen++;
    })
  );
  const footholdScore = footholdDen > 0 ? foothold / footholdDen : 0;

  // -------------------------------------------------------------
  // Combine all components with tuned weights:
  //   55% reach + 30% presence + 15% foothold
  // -------------------------------------------------------------
  return clamp(0.55 * reachScore + 0.3 * presenceScore + 0.15 * footholdScore);
}
