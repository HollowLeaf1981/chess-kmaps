import { clamp } from "../utils/mathUtils.js";

/**
 * -------------------------------------------------------------
 * Pawn Structure Evaluation
 * -------------------------------------------------------------
 * Evaluates the overall quality of a given side’s pawn structure
 * using a broad set of positional heuristics (19 total features).
 *
 * The system detects both static and dynamic pawn features:
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
  return `${String.fromCharCode(97 + fileIdx)}${rank}`;
}

function listPawns(game, color) {
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

// 1) Isolated Pawns
function countIsolatedPawns(game, color) {
  const pawns = listPawns(game, color);
  const filesSet = new Set(filesWithPawns(game, color));
  let isolated = 0;
  for (const p of pawns) {
    const left = p.file - 1;
    const right = p.file + 1;
    const hasLeft = filesSet.has(left);
    const hasRight = filesSet.has(right);
    if (!hasLeft && !hasRight) isolated++;
  }
  return isolated;
}

// 2) Doubled Pawns
function countDoubledPawns(game, color) {
  const pawns = listPawns(game, color);
  const byFile = new Map();
  for (const p of pawns) {
    byFile.set(p.file, (byFile.get(p.file) || 0) + 1);
  }
  let doubled = 0;
  for (const [, n] of byFile) {
    if (n >= 2) doubled += n - 1;
  }
  return doubled;
}

// 3) Pawn Islands
function countPawnIslands(game, color) {
  const files = filesWithPawns(game, color);
  if (files.length === 0) return 0;
  let islands = 1;
  for (let i = 1; i < files.length; i++) {
    if (files[i] !== files[i - 1] + 1) islands++;
  }
  return islands;
}

// 4) Passed Pawns
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
    if (color === "w") return ranks.some((r) => r > fromRank);
    return ranks.some((r) => r < fromRank);
  }

  function friendAheadOnFile(file, fromRank) {
    const ranks = myByFile.get(file);
    if (!ranks) return false;
    if (color === "w") return ranks.some((r) => r > fromRank);
    return ranks.some((r) => r < fromRank);
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
    if (friendAheadOnFile(p.file, p.rank)) continue;
    passers++;
  }
  return passers;
}

// 5) Candidate Passed Pawns
function countCandidatePassedPawns(game, color) {
  const my = listPawns(game, color);
  const filesHalfOpenForColor = classifyFiles(game).halfOpen[color];

  function isBlockedByEnemyAhead(file, rank) {
    const r1 = rank + forwardStep(color);
    if (!isOnBoard(file, r1)) return true;
    const sq = squareFromRF(file, r1);
    const piece = game.get(sq);
    return !!piece;
  }

  function hasFriendlyPotentialSupport(file, rank) {
    for (const df of [-1, +1]) {
      const f2 = file + df;
      if (f2 < 0 || f2 > 7) continue;
      if (color === "w") {
        for (let r = rank - 1; r >= 2; r--) {
          if (squareHasPawn(game, color, f2, r)) return true;
        }
      } else {
        for (let r = rank + 1; r <= 7; r++) {
          if (squareHasPawn(game, color, f2, r)) return true;
        }
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

// 6) Backward Pawns
function countBackwardPawns(game, color) {
  const my = listPawns(game, color);

  function pawnControls(colorToMap) {
    const ctr = new Set();
    for (const p of listPawns(game, colorToMap)) {
      const deltas = pawnCaptureDeltas(colorToMap);
      for (const { df, dr } of deltas) {
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
        for (let r = rank - 1; r >= 2; r--) {
          if (squareHasPawn(game, color, f2, r)) return true;
        }
      } else {
        for (let r = rank + 1; r <= 7; r++) {
          if (squareHasPawn(game, color, f2, r)) return true;
        }
      }
    }
    return false;
  }

  let count = 0;
  for (const p of my) {
    const stopSq = squareFromRF(p.file, p.rank + forwardStep(color));
    if (!isOnBoard(p.file, p.rank + forwardStep(color))) continue;
    if (canBeSupportedFromBehind(p.file, p.rank)) continue;
    const stopDefendedByOwnPawn = myPawnCtrl.has(stopSq);
    if (stopDefendedByOwnPawn) continue;
    const stopControlledByEnemyPawn = oppPawnCtrl.has(stopSq);
    if (stopControlledByEnemyPawn) count++;
  }
  return count;
}

// 7) Hanging Pawns
function countHangingPawns(game, color) {
  const my = listPawns(game, color);
  const myByFile = new Map();
  for (const p of my) {
    if (!myByFile.has(p.file)) myByFile.set(p.file, []);
    myByFile.get(p.file).push(p.rank);
  }
  for (const arr of myByFile.values()) arr.sort((a, b) => a - b);

  const { halfOpen } = classifyFiles(game);
  const halfOpenForColor = halfOpen[color];

  let count = 0;
  for (let f = 0; f < 7; f++) {
    const f2 = f + 1;
    const hasOnF = !!myByFile.get(f);
    const hasOnF2 = !!myByFile.get(f2);
    if (!hasOnF || !hasOnF2) continue;
    const ranksF = myByFile.get(f);
    const ranksF2 = myByFile.get(f2);
    const advancedPair =
      color === "w"
        ? ranksF.some((r) => r >= 4) && ranksF2.some((r) => r >= 4)
        : ranksF.some((r) => r <= 5) && ranksF2.some((r) => r <= 5);
    if (!advancedPair) continue;
    const leftOpen = f - 1 >= 0 ? halfOpenForColor.has(f - 1) : true;
    const rightOpen = f2 + 1 <= 7 ? halfOpenForColor.has(f2 + 1) : true;
    if (leftOpen && rightOpen) count++;
  }
  return count;
}

// 8) Pawn Chains
function getPawnChains(game, color) {
  const my = listPawns(game, color);
  const visited = new Set();
  function defends(p, q) {
    const df1 = q.file - p.file;
    const dr1 = q.rank - p.rank;
    const drExpected = forwardStep(color);
    return Math.abs(df1) === 1 && dr1 === drExpected;
  }
  const chains = [];
  for (const p of my) {
    if (visited.has(p.square)) continue;
    const chain = [p];
    visited.add(p.square);
    let expanded = true;
    while (expanded) {
      expanded = false;
      for (const r of my) {
        if (visited.has(r.square)) continue;
        if (defends(chain[chain.length - 1], r)) {
          chain.push(r);
          visited.add(r.square);
          expanded = true;
        }
      }
    }
    if (chain.length > 1) chains.push(chain);
  }
  return chains;
}

function countPawnChains(game, color) {
  return getPawnChains(game, color).length;
}

function detectChainBases(game, color) {
  const chains = getPawnChains(game, color);
  const bases = [];
  for (const chain of chains) {
    bases.push(chain[0]);
  }
  return bases;
}

// 9) Pawn Rams
function countPawnRams(game) {
  const white = listPawns(game, "w");
  const blackByFile = new Map();
  for (const p of listPawns(game, "b")) {
    if (!blackByFile.has(p.file)) blackByFile.set(p.file, new Set());
    blackByFile.get(p.file).add(p.rank);
  }
  let rams = 0;
  for (const w of white) {
    const bRanks = blackByFile.get(w.file);
    if (!bRanks) continue;
    if (bRanks.has(w.rank + 1)) rams++;
  }
  return rams;
}

// 10) Pawn Levers
function countPawnLevers(game, color) {
  const my = listPawns(game, color);
  let levers = 0;
  for (const p of my) {
    for (const { df, dr } of pawnCaptureDeltas(color)) {
      const f2 = p.file + df;
      const r2 = p.rank + dr;
      if (!isOnBoard(f2, r2)) continue;
      const sq = squareFromRF(f2, r2);
      const piece = game.get(sq);
      if (piece?.type === "p" && piece.color === enemy(color)) levers++;
    }
  }
  return levers;
}

// 11) File Classification
function classifyFiles(game) {
  const whiteFiles = new Set(filesWithPawns(game, "w"));
  const blackFiles = new Set(filesWithPawns(game, "b"));
  const open = new Set();
  const closed = new Set();
  const halfOpen = { w: new Set(), b: new Set() };
  for (let f = 0; f < 8; f++) {
    const hasW = whiteFiles.has(f);
    const hasB = blackFiles.has(f);
    if (!hasW && !hasB) open.add(f);
    else if (hasW && hasB) closed.add(f);
    else if (hasB && !hasW) halfOpen.w.add(f);
    else if (hasW && !hasB) halfOpen.b.add(f);
  }
  return { open, halfOpen, closed };
}

// 12) Pawn Majorities
function detectPawnMajority(game, color) {
  const my = listPawns(game, color);
  const opp = listEnemyPawns(game, color);
  const myQ = my.filter((p) => p.file <= 2).length;
  const myK = my.filter((p) => p.file >= 5).length;
  const opQ = opp.filter((p) => p.file <= 2).length;
  const opK = opp.filter((p) => p.file >= 5).length;
  return { queensideMajority: myQ > opQ, kingsideMajority: myK > opK };
}

function detectMinority(game, color) {
  const m = detectPawnMajority(game, color);
  return {
    queensideMinority: !m.queensideMajority,
    kingsideMinority: !m.kingsideMajority,
  };
}

// 13) Over-Advanced Pawns
function countOverAdvancedPawns(game, color) {
  const my = listPawns(game, color);
  let count = 0;
  for (const p of my) {
    const advanced = color === "w" ? p.rank >= 6 : p.rank <= 3;
    if (!advanced) continue;
    let support = false;
    for (const df of [-1, +1]) {
      const f2 = p.file + df;
      if (f2 < 0 || f2 > 7) continue;
      if (color === "w") {
        for (let r = p.rank - 1; r >= 2; r--) {
          if (squareHasPawn(game, color, f2, r)) {
            support = true;
            break;
          }
        }
      } else {
        for (let r = p.rank + 1; r <= 7; r++) {
          if (squareHasPawn(game, color, f2, r)) {
            support = true;
            break;
          }
        }
      }
      if (support) break;
    }
    if (!support) count++;
  }
  return count;
}

// 14) Weak Pawns (isolated + backward + over-advanced)
function countWeakPawns(game, color) {
  const isolated = countIsolatedPawns(game, color);
  const backward = countBackwardPawns(game, color);
  const overAdv = countOverAdvancedPawns(game, color);
  return isolated + backward + overAdv;
}

// 15) Central Doubled Pawns
function countCentralDoubledPawns(game, color) {
  const pawns = listPawns(game, color).filter(
    (p) => p.file === 3 || p.file === 4
  );
  const byFile = new Map();
  for (const p of pawns) byFile.set(p.file, (byFile.get(p.file) || 0) + 1);
  let doubled = 0;
  for (const [, n] of byFile) {
    if (n >= 2) doubled += n - 1;
  }
  return doubled;
}

// 16) Weak Squares
function detectWeakSquares(game, color) {
  const weak = new Set();
  function friendlyPawnCanGuardSquare(file, rank) {
    const step = forwardStep(color);
    for (const df of [-1, +1]) {
      const f2 = file - df;
      const r2 = rank - step;
      if (!isOnBoard(f2, r2)) continue;
      if (color === "w") {
        for (let r = r2; r >= 2; r--) {
          if (squareHasPawn(game, color, f2, r)) return true;
        }
      } else {
        for (let r = r2; r <= 7; r++) {
          if (squareHasPawn(game, color, f2, r)) return true;
        }
      }
    }
    return false;
  }
  const ranksToScan = color === "w" ? [1, 2, 3, 4] : [8, 7, 6, 5];
  for (const r of ranksToScan) {
    for (let f = 0; f < 8; f++) {
      if (!friendlyPawnCanGuardSquare(f, r)) weak.add(squareFromRF(f, r));
    }
  }
  return weak;
}

// =============================================================
// Pawn Structure Cache
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
  const k = computePawnKey(game);
  return _pawnTT.get(k);
}

function storePawnStructure(game, data) {
  const k = computePawnKey(game);
  _pawnTT.set(k, data);
}

// =============================================================
// Aggregator
// =============================================================
function getPawnStructureForColor(game, color) {
  const cached = getCachedPawnStructure(game);
  if (cached && typeof cached[color] === "number") {
    return clamp(cached[color]);
  }

  const total = countPawns(game, color) || 1;
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

  const flankBonus =
    (queensideMajority ? 0.02 : 0) +
    (kingsideMajority ? 0.02 : 0) -
    (minorities.queensideMinority ? 0.02 : 0) -
    (minorities.kingsideMinority ? 0.02 : 0);

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
  const prev = getCachedPawnStructure(game) || {};
  storePawnStructure(game, { ...prev, [color]: result });
  return result;
}

export { getPawnStructureForColor };
