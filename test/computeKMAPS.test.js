// Import the main K-MAPS evaluation function (the core logic under test)
import { computeKMAPS } from "../src/computeKMAPS.js";

// Import the Chess.js library for generating and manipulating FEN positions
import { Chess } from "chess.js";

// Optional utility for printing results (used in manual debugging, not required for tests)
import { printResults } from "./util.js";

// ----------------------------
// ✅ Test Suite: Chess K-MAPS Evaluation
// ----------------------------
// This suite validates that the K-MAPS evaluation system works as expected across
// various chess positions, including balanced, imbalanced, and invalid cases.
// Each K-MAPS metric (Material, King Safety, Activity, Pawn Structure, Space)
// should output normalized values between 0 and 1 for both sides.
describe("Chess K-MAPS Evaluation", () => {
  // ----------------------------
  // Test 1 — Starting Position
  // ----------------------------
  test("evaluates starting position correctly", () => {
    // Create the default starting position using chess.js
    const fen = new Chess().fen();

    // Run K-MAPS computation on the starting FEN
    const results = computeKMAPS(fen);

    // Sanity check: ensure all 5 metrics are returned
    expect(results.length).toBe(5);

    // Verify that each metric produces normalized [0,1] scores for both sides
    for (const { White, Black } of results) {
      expect(White).toBeGreaterThanOrEqual(0);
      expect(White).toBeLessThanOrEqual(1);
      expect(Black).toBeGreaterThanOrEqual(0);
      expect(Black).toBeLessThanOrEqual(1);
    }
  });

  // ----------------------------
  // Test 2 — Material Imbalance
  // ----------------------------
  test("detects material imbalance", () => {
    // This FEN removes White’s h2 pawn, creating a slight material imbalance
    const fen = "rnb1kbnr/pppppppp/8/8/8/8/PPPPPPP1/RNBQKBNR b KQkq - 0 1";

    // Compute metrics for this position
    const results = computeKMAPS(fen);

    // Find the 'Material' metric in the results
    const material = results.find((r) => r.metric === "Material");

    // Expect White’s material score to be higher (since Black is missing a pawn)
    expect(material.White).toBeGreaterThan(material.Black);
  });

  // ----------------------------
  // Test 3 — King Safety (after castling)
  // ----------------------------
  test("evaluates king safety after castling", () => {
    // A simple midgame FEN where both sides have castled kingside
    const fen = "r1bq1rk1/pppp1ppp/2n2n2/8/8/2N2N2/PPPP1PPP/R1BQ1RK1 w - - 0 8";

    // Run evaluation
    const results = computeKMAPS(fen);

    // Extract the King Safety metric
    const ks = results.find((r) => r.metric === "King Safety");

    // The castled king should have a reasonably high safety score
    expect(ks.White).toBeGreaterThan(0.4);
  });

  // ----------------------------
  // Test 4 — Invalid FEN Handling
  // ----------------------------
  test("handles invalid FEN gracefully", () => {
    // An invalid FEN string should not cause crashes
    const results = computeKMAPS("invalid-fen");

    // The expected behavior is to return an empty array
    expect(results).toEqual([]);
  });
});
