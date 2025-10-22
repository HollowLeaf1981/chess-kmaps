import { Chess } from "chess.js";
import { getMaterialBoth } from "./metrics/material.js";
import { getKingSafety } from "./metrics/kingSafety.js";
import { getPieceActivity } from "./metrics/activity.js";
import { getPawnStructureForColor } from "./metrics/pawnStructure.js";
import { getSpaceForColor } from "./metrics/space.js";

/**
 * Compute normalized K-MAPS metrics for both sides.
 */
export function computeKMAPS(fen) {
  if (!fen || typeof fen !== "string") return [];

  let game;
  try {
    game = new Chess(fen);
  } catch {
    return [];
  }

  const { whiteMaterialScore, blackMaterialScore } = getMaterialBoth(game);
  const kingW = getKingSafety(game, "w");
  const kingB = getKingSafety(game, "b");
  const actW = getPieceActivity(game, "w");
  const actB = getPieceActivity(game, "b");
  const pawnW = getPawnStructureForColor(game, "w");
  const pawnB = getPawnStructureForColor(game, "b");
  const spaceW = getSpaceForColor(game, "w");
  const spaceB = getSpaceForColor(game, "b");

  return [
    {
      metric: "Material",
      White: whiteMaterialScore,
      Black: blackMaterialScore,
    },
    { metric: "King Safety", White: kingW, Black: kingB },
    { metric: "Activity", White: actW, Black: actB },
    { metric: "Pawn Structure", White: pawnW, Black: pawnB },
    { metric: "Space", White: spaceW, Black: spaceB },
  ];
}
