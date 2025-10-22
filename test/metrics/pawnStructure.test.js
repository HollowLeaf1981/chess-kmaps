import { Chess } from "chess.js";
import { getPawnStructureForColor } from "../../src/metrics/pawnStructure.js";

describe("Pawn Structure metric", () => {
  test("healthy structure in starting position", () => {
    const game = new Chess();
    const score = getPawnStructureForColor(game, "w");
    expect(score).toBeGreaterThan(0.5);
  });

  test("isolated doubled pawns reduce score", () => {
    const fen = "rnbqkbnr/pppp1ppp/5p2/8/8/8/PPP1PPPP/RNBQKBNR w KQkq - 0 1";
    const game = new Chess(fen);
    const scoreW = getPawnStructureForColor(game, "w");
    const scoreB = getPawnStructureForColor(game, "b");
    expect(scoreB).toBeLessThan(scoreW);
  });
});
