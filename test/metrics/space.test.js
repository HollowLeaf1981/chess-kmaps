// Import chess.js for position handling and move generation
import { Chess } from "chess.js";

// Import the Space metric from the K-MAPS system
import { getSpaceForColor } from "../../src/metrics/space.js";

// ----------------------------
// Test Suite: Space Metric
// ----------------------------
// The "Space" metric measures how much territory each side controls,
// typically based on pawn advancement and the number of safe squares
// available for pieces in the opponent’s half of the board.
describe("Space metric", () => {
  // ----------------------------
  // Test 1 — Equal Space at Start
  // ----------------------------
  test("equal space in starting position", () => {
    // Initialize the standard starting position
    const game = new Chess();

    // Compute space scores for both sides
    const white = getSpaceForColor(game, "w");
    const black = getSpaceForColor(game, "b");

    // Expect space to be roughly equal (symmetric position)
    expect(Math.abs(white - black)).toBeLessThan(0.1);
  });

  // ----------------------------
  // Test 2 — White Gains Space After e4
  // ----------------------------
  test("after e4, white gains space", () => {
    // FEN after 1.e4: White controls more central squares
    const fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
    const game = new Chess(fen);

    // Compute space metrics for both sides
    const white = getSpaceForColor(game, "w");
    const black = getSpaceForColor(game, "b");

    // Expect White to have gained a measurable space advantage
    expect(white).toBeGreaterThan(black);
  });
});
