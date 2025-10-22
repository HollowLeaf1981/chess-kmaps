import { Chess } from "chess.js";
import { clamp } from "../utils/mathUtils.js";

export function getSpaceForColor(game, color) {
  const fenParts = game.fen().split(" ");
  fenParts[1] = color;
  const temp = new Chess(fenParts.join(" "));

  const oppHalfRankMin = color === "w" ? 5 : 1;
  const oppHalfRankMax = color === "w" ? 8 : 4;

  const moves = temp.moves({ verbose: true });
  const reachSquares = new Set(
    moves
      .filter((m) => m.piece !== "k")
      .filter((m) => {
        const r = parseInt(m.to[1], 10);
        return r >= oppHalfRankMin && r <= oppHalfRankMax;
      })
      .map((m) => m.to)
  );
  const reachScore = Math.min(reachSquares.size / 28, 1);

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

  return clamp(0.55 * reachScore + 0.3 * presenceScore + 0.15 * footholdScore);
}
