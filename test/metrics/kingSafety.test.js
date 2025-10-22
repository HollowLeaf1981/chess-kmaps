// Import chess.js for creating and analyzing positions
import { Chess } from "chess.js";

// Import the King Safety metric from the K-MAPS system
import { getKingSafety } from "../../src/metrics/kingSafety.js";

// ----------------------------
// 👑 Test Suite: King Safety Metric
// ----------------------------
// The "King Safety" metric evaluates how well-protected each side’s king is,
// taking into account factors such as castling, pawn shelter, exposure,
// and proximity to enemy pieces.
// These tests confirm that safer king positions yield higher scores.
describe("King Safety metric", () => {
  // ----------------------------
  // Test 1 — Starting Position
  // ----------------------------
  test("starting position moderately safe", () => {
    // Initialize the standard chess starting position
    const game = new Chess();

    // Evaluate king safety for White
    const white = getKingSafety(game, "w");

    // Expect the king to have moderate safety (pawns intact, not yet castled)
    expect(white).toBeGreaterThan(0.4);

    // Safety scores should always be capped at 1.0
    expect(white).toBeLessThanOrEqual(1);
  });

  // ----------------------------
  // Test 2 — Exposed Central King
  // ----------------------------
  test("exposed king in center", () => {
    // FEN: White king placed on d4, no pawn cover — highly unsafe
    const fen = "rnbqkbnr/pppppppp/8/8/3K4/8/PPP1PPPP/RNBQ1BNR w - - 0 1";

    // Load position into chess.js
    const game = new Chess(fen);

    // Compute White’s king safety score
    const safety = getKingSafety(game, "w");

    // Expect a low score since the king is exposed in the center
    expect(safety).toBeLessThan(0.4);
  });
});
