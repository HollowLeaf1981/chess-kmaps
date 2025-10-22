import { Chess } from "chess.js";
import { clamp } from "../utils/mathUtils.js";

export function getPieceActivity(game, color) {
  const fenParts = game.fen().split(" ");
  fenParts[1] = color;
  const temp = new Chess(fenParts.join(" "));

  const moves = temp.moves({ verbose: true });
  const nonPawn = moves.filter((m) => m.piece !== "p").length;
  let score = Math.min(nonPawn / 40, 1);

  game.board().forEach((row, r) =>
    row.forEach((sq, f) => {
      if (!sq || sq.color !== color || sq.type === "p") return;
      const square = `${String.fromCharCode(97 + f)}${8 - r}`;
      if (isCentralSquare(square) && ["n", "b"].includes(sq.type)) score += 0.1;
    })
  );

  return clamp(score);
}

function isCentralSquare(sq) {
  const f = sq.charCodeAt(0) - 97;
  const r = parseInt(sq[1], 10) - 1;
  return f >= 3 && f <= 4 && r >= 3 && r <= 4;
}
