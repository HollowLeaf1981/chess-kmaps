import { computeKMAPS } from "../src/computeKMAPS.js";
import { Chess } from "chess.js";
import { printResults } from "./util.js";

describe("Chess K-MAPS Evaluation", () => {
  test("evaluates starting position correctly", () => {
    const fen = new Chess().fen();
    const results = computeKMAPS(fen);

    // sanity checks
    expect(results.length).toBe(5);
    for (const { White, Black } of results) {
      expect(White).toBeGreaterThanOrEqual(0);
      expect(White).toBeLessThanOrEqual(1);
      expect(Black).toBeGreaterThanOrEqual(0);
      expect(Black).toBeLessThanOrEqual(1);
    }
  });

  test("detects material imbalance", () => {
    const fen = "rnb1kbnr/pppppppp/8/8/8/8/PPPPPPP1/RNBQKBNR b KQkq - 0 1";
    const results = computeKMAPS(fen);
    const material = results.find((r) => r.metric === "Material");
    expect(material.White).toBeGreaterThan(material.Black);
  });

  test("evaluates king safety after castling", () => {
    // simple castled position
    const fen = "r1bq1rk1/pppp1ppp/2n2n2/8/8/2N2N2/PPPP1PPP/R1BQ1RK1 w - - 0 8";
    const results = computeKMAPS(fen);

    const ks = results.find((r) => r.metric === "King Safety");
    expect(ks.White).toBeGreaterThan(0.4);
  });

  test("handles invalid FEN gracefully", () => {
    const results = computeKMAPS("invalid-fen");
    expect(results).toEqual([]);
  });
});
