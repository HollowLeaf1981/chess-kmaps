import { Chess } from "chess.js";
import { getMaterialBoth } from "../../src/metrics/material.js";

describe("Material metric", () => {
  test("equal material at start", () => {
    const game = new Chess();
    const { whiteMaterialScore, blackMaterialScore } = getMaterialBoth(game);
    expect(whiteMaterialScore).toBeCloseTo(blackMaterialScore, 5);
  });

  test("white up a queen", () => {
    const game = new Chess(
      "rnb1kbnr/pppppppp/8/8/8/8/PPPPPPP1/RNBQKBNR w KQkq - 0 1"
    );
    const { whiteMaterialScore, blackMaterialScore } = getMaterialBoth(game);
    expect(whiteMaterialScore).toBeGreaterThan(blackMaterialScore);
  });
});
