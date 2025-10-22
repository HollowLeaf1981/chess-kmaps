// Import chess.js for position creation and move generation
import { Chess } from "chess.js";

// Import the specific K-MAPS submetric under test — piece activity
import { getPieceActivity } from "../../src/metrics/activity.js";

// ----------------------------
// Test Suite: Piece Activity Metric
// ----------------------------
// The "Piece Activity" metric measures how freely each side’s pieces can move,
// reflecting open lines, piece mobility, and control of space.
// These tests verify that the metric correctly distinguishes between
// closed and open positions.
describe("Piece Activity metric", () => {
  // ----------------------------
  // 💤 Test 1 — Closed Position
  // ----------------------------
  test("closed position has low activity", () => {
    // FEN for the standard chess starting position (completely closed)
    const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

    // Initialize the position in chess.js
    const game = new Chess(fen);

    // Compute the activity score for White
    const act = getPieceActivity(game, "w");

    // Expect some minimal activity (pieces can move a bit, but mostly blocked)
    expect(act).toBeGreaterThan(0);

    // Upper bound: should remain low, since the position is closed
    expect(act).toBeLessThan(0.5);
  });

  // ----------------------------
  // Test 2 — Open Position
  // ----------------------------
  test("open position (after e4 e5 Nf3 Nc6 Bb5) has higher activity", () => {
    // A classical Ruy Lopez opening — more open center and piece development
    const fen =
      "r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4";

    // Initialize this more open position
    const game = new Chess(fen);

    // Compute White’s piece activity
    const act = getPieceActivity(game, "w");

    // Expect higher activity than the closed start (pieces are developed)
    expect(act).toBeGreaterThan(0.3);
  });
});
