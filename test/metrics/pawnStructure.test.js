// Import chess.js for board setup and FEN parsing
import { Chess } from "chess.js";

// Import the Pawn Structure metric from the K-MAPS system
import { getPawnStructureForColor } from "../../src/metrics/pawnStructure.js";

// ----------------------------
// Test Suite: Pawn Structure Metric
// ----------------------------
// The "Pawn Structure" metric evaluates the health of a side’s pawn formation.
// It considers factors such as isolated, doubled, or backward pawns,
// as well as positive traits like connected chains and passed pawns.
describe("Pawn Structure metric", () => {
  // ----------------------------
  // Test 1 — Healthy Starting Structure
  // ----------------------------
  test("healthy structure in starting position", () => {
    // Initialize the standard starting position
    const game = new Chess();

    // Compute the pawn structure score for White
    const score = getPawnStructureForColor(game, "w");

    // Expect a healthy structure to yield a solid score above 0.5
    expect(score).toBeGreaterThan(0.5);
  });

  // ----------------------------
  // Test 2 — Damaged Structure (Isolated/Doubled Pawns)
  // ----------------------------
  test("isolated doubled pawns reduce score", () => {
    // FEN: Black has structural weaknesses (isolated and doubled pawns)
    const fen = "rnbqkbnr/pppp1ppp/5p2/8/8/8/PPP1PPPP/RNBQKBNR w KQkq - 0 1";
    const game = new Chess(fen);

    // Compute structure scores for both sides
    const scoreW = getPawnStructureForColor(game, "w");
    const scoreB = getPawnStructureForColor(game, "b");

    // Expect Black's score to be lower due to pawn weaknesses
    expect(scoreB).toBeLessThan(scoreW);
  });
});
