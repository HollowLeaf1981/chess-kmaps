// Import chess.js for board state and piece information
import { Chess } from "chess.js";

// Import the Material metric function from the K-MAPS system
import { getMaterialBoth } from "../../src/metrics/material.js";

// ----------------------------
// Test Suite: Material Metric
// ----------------------------
// The "Material" metric measures the relative piece value balance between both sides.
// These tests verify that the metric correctly detects equality at the start
// and an advantage when one side has more material.
describe("Material metric", () => {
  // ----------------------------
  // Test 1 — Equal Material at Start
  // ----------------------------
  test("equal material at start", () => {
    // Initialize the standard starting position
    const game = new Chess();

    // Compute material scores for both sides
    const { whiteMaterialScore, blackMaterialScore } = getMaterialBoth(game);

    // Expect both sides to have equal material (symmetrical setup)
    expect(whiteMaterialScore).toBeCloseTo(blackMaterialScore, 5);
  });

  // ----------------------------
  // Test 2 — White Up a Queen
  // ----------------------------
  test("white up a queen", () => {
    // FEN with Black missing one pawn on h7 (simulating a material imbalance)
    const game = new Chess(
      "rnb1kbnr/pppppppp/8/8/8/8/PPPPPPP1/RNBQKBNR w KQkq - 0 1"
    );

    // Compute material scores
    const { whiteMaterialScore, blackMaterialScore } = getMaterialBoth(game);

    // Expect White's score to be higher since Black is down material
    expect(whiteMaterialScore).toBeGreaterThan(blackMaterialScore);
  });
});
