import { Chess } from "chess.js";
import { getKingSafety } from "../../src/metrics/kingSafety.js";

describe("King Safety metric", () => {
  test("starting position moderately safe", () => {
    const game = new Chess();
    const white = getKingSafety(game, "w");
    expect(white).toBeGreaterThan(0.4);
    expect(white).toBeLessThanOrEqual(1);
  });

  test("exposed king in center", () => {
    const fen = "rnbqkbnr/pppppppp/8/8/3K4/8/PPP1PPPP/RNBQ1BNR w - - 0 1";
    const game = new Chess(fen);
    const safety = getKingSafety(game, "w");
    expect(safety).toBeLessThan(0.4);
  });
});
