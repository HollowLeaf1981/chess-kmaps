// Import chess.js for FEN parsing and position validation
import { Chess } from "chess.js";

// Import each K-MAPS submetric module
import { getMaterialBoth } from "./metrics/material.js";
import { getKingSafety } from "./metrics/kingSafety.js";
import { getPieceActivity } from "./metrics/activity.js";
import { getPawnStructureForColor } from "./metrics/pawnStructure.js";
import { getSpaceForColor } from "./metrics/space.js";

/**
 * -----------------------------------------
 * Function: computeKMAPS(fen)
 * -----------------------------------------
 * Computes the five K-MAPS metrics — Material, King Safety, Activity,
 * Pawn Structure, and Space — for both White and Black based on a given FEN.
 *
 * Each metric returns a normalized value between 0 and 1,
 * allowing easy comparison across different positions.
 *
 * @param {string} fen - A valid FEN string representing a chess position.
 * @returns {Array<Object>} A list of metric objects in the form:
 *   [
 *     { metric: "Material", White: 0.5, Black: 0.5 },
 *     { metric: "King Safety", White: 0.7, Black: 0.6 },
 *     ...
 *   ]
 *   Returns an empty array [] if the FEN is invalid.
 */
export function computeKMAPS(fen) {
  // Validate input type
  if (!fen || typeof fen !== "string") return [];

  let game;
  try {
    // Attempt to load the position using chess.js
    // This ensures FEN validity and initializes piece data
    game = new Chess(fen);
  } catch {
    // If the FEN is invalid or unparsable, return an empty result set
    return [];
  }

  // --- Compute individual submetrics for both sides ---

  // Material balance
  const { whiteMaterialScore, blackMaterialScore } = getMaterialBoth(game);

  // King safety evaluation
  const kingW = getKingSafety(game, "w");
  const kingB = getKingSafety(game, "b");

  // Piece activity / mobility
  const actW = getPieceActivity(game, "w");
  const actB = getPieceActivity(game, "b");

  // Pawn structure quality
  const pawnW = getPawnStructureForColor(game, "w");
  const pawnB = getPawnStructureForColor(game, "b");

  // Spatial control (territory)
  const spaceW = getSpaceForColor(game, "w");
  const spaceB = getSpaceForColor(game, "b");

  // --- Aggregate and return normalized K-MAPS results ---
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
