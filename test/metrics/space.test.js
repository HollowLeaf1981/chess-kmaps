import { Chess } from "chess.js";
import { getSpaceForColor } from "../../src/metrics/space.js";

describe("Space metric", () => {
  test("equal space in starting position", () => {
    const game = new Chess();
    const white = getSpaceForColor(game, "w");
    const black = getSpaceForColor(game, "b");
    expect(Math.abs(white - black)).toBeLessThan(0.1);
  });

  test("after e4, white gains space", () => {
    const fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
    const game = new Chess(fen);
    const white = getSpaceForColor(game, "w");
    const black = getSpaceForColor(game, "b");
    expect(white).toBeGreaterThan(black);
  });
});
