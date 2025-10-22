import { clamp } from "../utils/mathUtils.js";

/**
 * -------------------------------------------------------------
 * Pawn Structure Evaluation
 * -------------------------------------------------------------
 * Evaluates the overall quality of a given side’s pawn structure
 * using a broad set of positional heuristics (19 categories total).
 *
 * The system detects both static and dynamic features:
 *   - Weaknesses: isolated, doubled, backward, over-advanced pawns
 *   - Strengths: passed pawns, chains, levers, flank majorities
 *   - Board context: pawn islands, rams, weak squares, hanging pawns
 *
 * Each factor is weighted, aggregated, normalized to [0,1],
 * and cached for reuse to optimize performance.
 */

// =============================================================
// Core Board Utilities
// =============================================================

function squareFromRF(fileIdx, rank) {
  // Convert file index (0–7) and rank (1–8) into algebraic notation (e.g., "e4")
  return `${String.fromCharCode(97 + fileIdx)}${rank}`;
}

function listPawns(game, color) {
  // Return a list of all pawns belonging to a given color with their coordinates
  const pawns = [];
  game.board().forEach((row, rIdx) => {
    const rank = 8 - rIdx;
    row.forEach((sq, fIdx) => {
      if (sq?.type === "p" && sq.color === color) {
        pawns.push({ file: fIdx, rank, square: squareFromRF(fIdx, rank) });
      }
    });
  });
  return pawns;
}

function listEnemyPawns(game, color) {
  return listPawns(game, color === "w" ? "b" : "w");
}

function filesWithPawns(game, color) {
  // Return sorted list of file indices containing at least one pawn
  return Array.from(new Set(listPawns(game, color).map((p) => p.file))).sort(
    (a, b) => a - b
  );
}

function forwardStep(color) {
  return color === "w" ? +1 : -1;
}

function enemy(color) {
  return color === "w" ? "b" : "w";
}

function pawnCaptureDeltas(color) {
  // Relative capture directions for pawns (±1 file, ±1 rank)
  return color === "w"
    ? [+1, -1].map((df) => ({ df, dr: +1 }))
    : [+1, -1].map((df) => ({ df, dr: -1 }));
}

function isOnBoard(file, rank) {
  return file >= 0 && file <= 7 && rank >= 1 && rank <= 8;
}

function squareHasPawn(game, color, file, rank) {
  if (!isOnBoard(file, rank)) return false;
  const sq = squareFromRF(file, rank);
  const p = game.get(sq);
  return p?.type === "p" && p.color === color;
}

function countPawns(game, color) {
  return listPawns(game, color).length;
}

// =============================================================
// Pawn Structure Feature Detectors
// =============================================================

// 1) Isolated Pawns — no friendly pawns on adjacent files
function countIsolatedPawns(game, color) {
  const pawns = listPawns(game, color);
  const filesSet = new Set(filesWithPawns(game, color));
  let isolated = 0;
  for (const p of pawns) {
    const hasLeft = filesSet.has(p.file - 1);
    const hasRight = filesSet.has(p.file + 1);
    if (!hasLeft && !hasRight) isolated++;
  }
  return isolated;
}

// 2) Doubled/Tripled Pawns — multiple pawns on same file
function countDoubledPawns(game, color) {
  const pawns = listPawns(game, color);
  const byFile = new Map();
  for (const p of pawns) byFile.set(p.file, (byFile.get(p.file) || 0) + 1);
  let doubled = 0;
  for (const [, n] of byFile) if (n >= 2) doubled += n - 1;
  return doubled;
}

// 3) Pawn Islands — contiguous clusters of pawn files
function countPawnIslands(game, color) {
  const files = filesWithPawns(game, color);
  if (files.length === 0) return 0;
  let islands = 1;
  for (let i = 1; i < files.length; i++) {
    if (files[i] !== files[i - 1] + 1) islands++;
  }
  return islands;
}

// 4) Passed Pawns — no opposing pawns ahead on adjacent files
function countPassedPawns(game, color) {
  const my = listPawns(game, color);
  const opp = listEnemyPawns(game, color);

  const oppByFile = new Map();
  for (const p of opp) {
    if (!oppByFile.has(p.file)) oppByFile.set(p.file, []);
    oppByFile.get(p.file).push(p.rank);
  }
  for (const ranks of oppByFile.values()) ranks.sort((a, b) => a - b);

  const myByFile = new Map();
  for (const p of my) {
    if (!myByFile.has(p.file)) myByFile.set(p.file, []);
    myByFile.get(p.file).push(p.rank);
  }
  for (const ranks of myByFile.values()) ranks.sort((a, b) => a - b);

  function enemyPawnAheadOnFile(file, fromRank) {
    const ranks = oppByFile.get(file);
    if (!ranks || ranks.length === 0) return false;
    return color === "w"
      ? ranks.some((r) => r > fromRank)
      : ranks.some((r) => r < fromRank);
  }

  function friendAheadOnFile(file, fromRank) {
    const ranks = myByFile.get(file);
    if (!ranks) return false;
    return color === "w"
      ? ranks.some((r) => r > fromRank)
      : ranks.some((r) => r < fromRank);
  }

  let passers = 0;
  for (const p of my) {
    const filesToCheck = [p.file, p.file - 1, p.file + 1].filter(
      (f) => f >= 0 && f <= 7
    );
    const hasEnemyAhead = filesToCheck.some((f) =>
      enemyPawnAheadOnFile(f, p.rank)
    );
    if (hasEnemyAhead) continue;
    if (friendAheadOnFile(p.file, p.rank)) continue; // skip back twins
    passers++;
  }
  return passers;
}

// 5) Candidate Passed Pawns — near-passed conditions
function countCandidatePassedPawns(game, color) {
  const my = listPawns(game, color);
  const filesHalfOpenForColor = classifyFiles(game).halfOpen[color];

  function isBlockedByEnemyAhead(file, rank) {
    const r1 = rank + forwardStep(color);
    if (!isOnBoard(file, r1)) return true;
    const piece = game.get(squareFromRF(file, r1));
    return !!piece;
  }

  function hasFriendlyPotentialSupport(file, rank) {
    // Check adjacent files for a supporting pawn behind
    for (const df of [-1, +1]) {
      const f2 = file + df;
      if (f2 < 0 || f2 > 7) continue;
      if (color === "w") {
        for (let r = rank - 1; r >= 2; r--)
          if (squareHasPawn(game, color, f2, r)) return true;
      } else {
        for (let r = rank + 1; r <= 7; r++)
          if (squareHasPawn(game, color, f2, r)) return true;
      }
    }
    return false;
  }

  let count = 0;
  for (const p of my) {
    const isHalfOpen = filesHalfOpenForColor.has(p.file);
    if (!isHalfOpen) continue;
    if (isBlockedByEnemyAhead(p.file, p.rank)) continue;
    if (!hasFriendlyPotentialSupport(p.file, p.rank)) continue;
    count++;
  }
  return count;
}

// 6) Backward Pawns — lagging, unsupported pawns on open files
function countBackwardPawns(game, color) {
  const my = listPawns(game, color);

  function pawnControls(colorToMap) {
    const ctr = new Set();
    for (const p of listPawns(game, colorToMap)) {
      for (const { df, dr } of pawnCaptureDeltas(colorToMap)) {
        const f = p.file + df;
        const r = p.rank + dr;
        if (isOnBoard(f, r)) ctr.add(squareFromRF(f, r));
      }
    }
    return ctr;
  }
  const myPawnCtrl = pawnControls(color);
  const oppPawnCtrl = pawnControls(enemy(color));

  function canBeSupportedFromBehind(file, rank) {
    for (const df of [-1, +1]) {
      const f2 = file + df;
      if (f2 < 0 || f2 > 7) continue;
      if (color === "w") {
        for (let r = rank - 1; r >= 2; r--)
          if (squareHasPawn(game, color, f2, r)) return true;
      } else {
        for (let r = rank + 1; r <= 7; r++)
          if (squareHasPawn(game, color, f2, r)) return true;
      }
    }
    return false;
  }

  let count = 0;
  for (const p of my) {
    const stopRank = p.rank + forwardStep(color);
    if (!isOnBoard(p.file, stopRank)) continue;
    const stopSq = squareFromRF(p.file, stopRank);
    if (canBeSupportedFromBehind(p.file, p.rank)) continue;
    if (myPawnCtrl.has(stopSq)) continue;
    if (oppPawnCtrl.has(stopSq)) count++;
  }
  return count;
}

// 7–15) Remaining detectors (chains, levers, weak squares, etc.)
// [Implementation unchanged — only documented in your source above.]

// =============================================================
// Caching Infrastructure
// =============================================================
const _pawnTT = new Map();

function computePawnKey(game) {
  const wp = listPawns(game, "w")
    .map((p) => p.square)
    .sort()
    .join(",");
  const bp = listPawns(game, "b")
    .map((p) => p.square)
    .sort()
    .join(",");
  return `P:${wp}|${bp}`;
}

function getCachedPawnStructure(game) {
  return _pawnTT.get(computePawnKey(game));
}

function storePawnStructure(game, data) {
  _pawnTT.set(computePawnKey(game), data);
}

// =============================================================
// Aggregation Function
// =============================================================
function getPawnStructureForColor(game, color) {
  // Check cache first
  const cached = getCachedPawnStructure(game);
  if (cached && typeof cached[color] === "number") {
    return clamp(cached[color]);
  }

  const total = countPawns(game, color) || 1;

  // Collect all submetric counts
  const isolated = countIsolatedPawns(game, color);
  const doubled = countDoubledPawns(game, color);
  const islands = countPawnIslands(game, color);
  const backward = countBackwardPawns(game, color);
  const overAdv = countOverAdvancedPawns(game, color);
  const centralD = countCentralDoubledPawns(game, color);
  const passed = countPassedPawns(game, color);
  const candPassed = countCandidatePassedPawns(game, color);
  const chains = countPawnChains(game, color);
  const bases = detectChainBases(game, color).length;
  const levers = countPawnLevers(game, color);
  const rams = countPawnRams(game);
  const hanging = countHangingPawns(game, color);
  const weakSq = detectWeakSquares(game, color).size;
  const { queensideMajority, kingsideMajority } = detectPawnMajority(
    game,
    color
  );
  const minorities = detectMinority(game, color);
  const weak = countWeakPawns(game, color);

  // Small bonuses/penalties for flank majorities/minorities
  const flankBonus =
    (queensideMajority ? 0.02 : 0) +
    (kingsideMajority ? 0.02 : 0) -
    (minorities.queensideMinority ? 0.02 : 0) -
    (minorities.kingsideMinority ? 0.02 : 0);

  // Weighted aggregation of all features
  let score =
    1 -
    0.4 * (isolated / total) -
    0.55 * (doubled / total) -
    0.25 * (backward / total) -
    0.2 * (overAdv / total) -
    0.2 * (centralD / total) -
    0.1 * (Math.max(0, islands - 1) / 4) -
    0.05 * (bases / total) -
    0.1 * (weak / total) -
    0.1 * (weakSq / 8) -
    0.05 * (hanging / 4) -
    0.1 * (rams / 8) +
    0.4 * (passed / total) +
    0.15 * (candPassed / total) +
    0.1 * (chains / 4) +
    0.05 * (levers / total) +
    flankBonus;

  const result = clamp(score);

  // Cache the computed result
  const prev = getCachedPawnStructure(game) || {};
  storePawnStructure(game, { ...prev, [color]: result });

  return result;
}

export { getPawnStructureForColor };
