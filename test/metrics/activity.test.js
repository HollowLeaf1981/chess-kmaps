import { Chess } from "chess.js";
import { getPieceActivity } from "../../src/metrics/activity.js";

describe("Piece Activity metric", () => {
  test("closed position has low activity", () => {
    const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const game = new Chess(fen);
    const act = getPieceActivity(game, "w");
    expect(act).toBeGreaterThan(0);
    expect(act).toBeLessThan(0.5);
  });

  test("open position (after e4 e5 Nf3 Nc6 Bb5) has higher activity", () => {
    const fen =
      "r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4";
    const game = new Chess(fen);
    const act = getPieceActivity(game, "w");
    expect(act).toBeGreaterThan(0.3);
  });
});
