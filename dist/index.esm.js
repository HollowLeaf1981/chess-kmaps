import { Chess } from 'chess.js';

// Common math helpers
const clamp = (x) => Math.max(0, Math.min(1, x));

/**
 * Calculates normalized Material scores for both White and Black.
 */
function getMaterialBoth(game) {
  const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  let w = 0,
    b = 0;

  game
    .board()
    .flat()
    .forEach((sq) => {
      if (!sq) return;
      const v = pieceValues[sq.type] || 0;
      sq.color === "w" ? (w += v) : (b += v);
    });

  const diff = w - b;
  return {
    whiteMaterialScore: clamp((diff + 39) / 78),
    blackMaterialScore: clamp((-diff + 39) / 78),
  };
}

/**
 * Evaluates King Safety for a given color.
 */
function getKingSafety(game, color) {
  const board = game.board();
  let king = null;

  // locate king
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const sq = board[r][f];
      if (sq?.type === "k" && sq.color === color)
        king = { file: f, rank: 8 - r };
    }
  }
  if (!king) return 0.5;

  let score = 0;

  // pawn shield
  const frontRank = color === "w" ? king.rank + 1 : king.rank - 1;
  let shield = 0;
  for (let df = -1; df <= 1; df++) {
    const file = Math.max(0, Math.min(7, king.file + df));
    const sq = `${String.fromCharCode(97 + file)}${frontRank}`;
    const p = game.get(sq);
    if (p?.type === "p" && p.color === color) shield++;
  }
  const shieldScore = shield / 3;
  score += shieldScore * 0.45;

  // castling / placement
  const kingSquare = `${String.fromCharCode(97 + king.file)}${king.rank}`;
  const castled = color === "w" ? ["g1", "c1"] : ["g8", "c8"];
  const isCastled = castled.includes(kingSquare);
  const rankSafety =
    color === "w" ? 1 - (king.rank - 1) / 7 : 1 - (8 - king.rank) / 7;
  let placement = rankSafety * 0.3;
  if (isCastled && shieldScore >= 0.66) placement = 0.35;
  score += placement;

  // mobility
  let mobility = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let df = -1; df <= 1; df++) {
      if (dr === 0 && df === 0) continue;
      const nr = king.rank + dr,
        nf = king.file + df;
      if (nr < 1 || nr > 8 || nf < 0 || nf > 7) continue;
      const sq = `${String.fromCharCode(97 + nf)}${nr}`;
      if (!game.get(sq)) mobility++;
    }
  }
  score += (mobility / 8) * 0.05;

  // enemy pressure
  const enemy = color === "w" ? "b" : "w";
  let pressure = 0;
  for (let dr = -3; dr <= 3; dr++) {
    for (let df = -3; df <= 3; df++) {
      if (dr === 0 && df === 0) continue;
      const nr = king.rank + dr;
      const nf = king.file + df;
      if (nr < 1 || nr > 8 || nf < 0 || nf > 7) continue;
      const sq = `${String.fromCharCode(97 + nf)}${nr}`;
      const p = game.get(sq);
      if (p?.color === enemy) {
        const val = { q: 3, r: 2, b: 1.5, n: 1.2, p: 0.8 }[p.type] || 1;
        pressure += val / (Math.abs(dr) + Math.abs(df));
      }
    }
  }

  score -= Math.min(pressure / 10, 0.25);
  const finalScore = clamp(score);
  return clamp(0.7 * finalScore + 0.3 * finalScore * finalScore);
}

function getPieceActivity(game, color) {
  const fenParts = game.fen().split(" ");
  fenParts[1] = color;
  const temp = new Chess(fenParts.join(" "));

  const moves = temp.moves({ verbose: true });
  const nonPawn = moves.filter((m) => m.piece !== "p").length;
  let score = Math.min(nonPawn / 40, 1);

  game.board().forEach((row, r) =>
    row.forEach((sq, f) => {
      if (!sq || sq.color !== color || sq.type === "p") return;
      const square = `${String.fromCharCode(97 + f)}${8 - r}`;
      if (isCentralSquare(square) && ["n", "b"].includes(sq.type)) score += 0.1;
    })
  );

  return clamp(score);
}

function isCentralSquare(sq) {
  const f = sq.charCodeAt(0) - 97;
  const r = parseInt(sq[1], 10) - 1;
  return f >= 3 && f <= 4 && r >= 3 && r <= 4;
}

/**
 * Evaluates Pawn Structure quality for a given color.
 * Penalizes isolated and doubled pawns, then normalizes the score.
 */
// ===========================
// Pawn Structure: Utilities
// ===========================
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

// Sides & steps
function forwardStep(color) {
  return color === "w" ? 1 : -1;
}
function enemy(color) {
  return color === "w" ? "b" : "w";
}

// Pawn capture offsets (relative)
function pawnCaptureDeltas(color) {
  return color === "w"
    ? [1, -1].map((df) => ({ df, dr: 1 }))
    : [1, -1].map((df) => ({ df, dr: -1 }));
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

// =======================================
// 1) Isolated Pawns
// =======================================
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

// =======================================
// 2) Doubled/Tripled Pawns
// =======================================
function countDoubledPawns(game, color) {
  const pawns = listPawns(game, color);
  const byFile = new Map();
  for (const p of pawns) {
    byFile.set(p.file, (byFile.get(p.file) || 0) + 1);
  }
  let doubled = 0;
  for (const [, n] of byFile) {
    if (n >= 2) doubled += n - 1; // doubles=1, triples=2, etc.
  }
  return doubled;
}

// =======================================
// 3) Pawn Islands
// =======================================
function countPawnIslands(game, color) {
  const files = filesWithPawns(game, color);
  if (files.length === 0) return 0;
  let islands = 1;
  for (let i = 1; i < files.length; i++) {
    if (files[i] !== files[i - 1] + 1) islands++;
  }
  return islands;
}

// =======================================
// 4) Passed Pawns
// Definition: No enemy pawn ahead on same/adjacent files.
// Exclude "back twin" (rear pawn of a doubled file).
// =======================================
function countPassedPawns(game, color) {
  const my = listPawns(game, color);
  const opp = listEnemyPawns(game, color);
  const oppByFile = new Map();
  for (const p of opp) {
    if (!oppByFile.has(p.file)) oppByFile.set(p.file, []);
    oppByFile.get(p.file).push(p.rank);
  }
  for (const ranks of oppByFile.values()) ranks.sort((a, b) => a - b);

  // Helper: is there an enemy pawn in "front span" on file f?
  function enemyPawnAheadOnFile(file, fromRank) {
    const ranks = oppByFile.get(file);
    if (!ranks || ranks.length === 0) return false;
    if (color === "w") return ranks.some((r) => r > fromRank);
    return ranks.some((r) => r < fromRank);
  }

  // Is there a friendly pawn ahead on same file? (to filter "back twin")
  const myByFile = new Map();
  for (const p of my) {
    if (!myByFile.has(p.file)) myByFile.set(p.file, []);
    myByFile.get(p.file).push(p.rank);
  }
  for (const ranks of myByFile.values()) ranks.sort((a, b) => a - b);

  function friendAheadOnFile(file, fromRank) {
    const ranks = myByFile.get(file);
    if (!ranks) return false;
    if (color === "w") return ranks.some((r) => r > fromRank);
    return ranks.some((r) => r < fromRank);
  }

  let passers = 0;
  for (const p of my) {
    // same + adjacent files
    const filesToCheck = [p.file, p.file - 1, p.file + 1].filter(
      (f) => f >= 0 && f <= 7
    );
    const hasEnemyAhead = filesToCheck.some((f) =>
      enemyPawnAheadOnFile(f, p.rank)
    );
    if (hasEnemyAhead) continue;
    // back-twin filter
    if (friendAheadOnFile(p.file, p.rank)) continue;
    passers++;
  }
  return passers;
}

// =======================================
// 5) Candidate Passed Pawns (practical heuristic)
// Heuristic: (a) half-open for color on its file,
//            (b) not blocked by enemy pawn directly ahead,
//            (c) friendly pawn defenders on adjacent files exist or can advance.
// =======================================
function countCandidatePassedPawns(game, color) {
  const my = listPawns(game, color);

  const filesHalfOpenForColor = classifyFiles(game).halfOpen[color];

  // Build quick lookup of enemy pawns by square

  function isBlockedByEnemyAhead(file, rank) {
    const r1 = rank + forwardStep(color);
    if (!isOnBoard(file, r1)) return true; // off-board considered blocked
    const sq = squareFromRF(file, r1);
    const piece = game.get(sq);
    return !!piece; // conservative: any piece blocks (you can refine)
  }

  function hasFriendlyPotentialSupport(file, rank) {
    // Friendly pawn on file±1 that is behind or can step to defend capture squares
    for (const df of [-1, 1]) {
      const f2 = file + df;
      if (f2 < 0 || f2 > 7) continue;
      // any friendly pawn behind that could advance next moves?
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

// =======================================
// 6) Backward Pawns (heuristic)
// Conditions (practical):
//  - No friendly pawn can support it from adjacent file (behind and able to advance).
//  - Stop square (one ahead) not defended by friendly pawn control.
//  - Stop square controlled by enemy pawn (or strongly controlled).
// =======================================
function countBackwardPawns(game, color) {
  const my = listPawns(game, color);

  // Build pawn-control maps (only pawn attacks)
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
    for (const df of [-1, 1]) {
      const f2 = file + df;
      if (f2 < 0 || f2 > 7) continue;
      // friendly pawn behind that can advance up to defend later
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

    // (a) cannot be supported by adjacent friendly pawn from behind
    if (canBeSupportedFromBehind(p.file, p.rank)) continue;

    // (b) stop square NOT defended by friendly pawn
    const stopDefendedByOwnPawn = myPawnCtrl.has(stopSq);

    if (stopDefendedByOwnPawn) continue;

    // (c) stop square controlled by enemy pawn
    const stopControlledByEnemyPawn = oppPawnCtrl.has(stopSq);

    if (stopControlledByEnemyPawn) count++;
  }
  return count;
}

// =======================================
// 7) Hanging Pawns (duo on adjacent files, typically advanced,
//    half-open surroundings; simplified practical rule.)
// =======================================
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

    // Advanced ranks heuristic: White ≥ 4th; Black ≤ 5th (mirror)
    const ranksF = myByFile.get(f);
    const ranksF2 = myByFile.get(f2);
    const advancedPair =
      color === "w"
        ? ranksF.some((r) => r >= 4) && ranksF2.some((r) => r >= 4)
        : ranksF.some((r) => r <= 5) && ranksF2.some((r) => r <= 5);

    if (!advancedPair) continue;

    // Surrounding files half-open for this color helps define "hanging"
    const leftOpen = f - 1 >= 0 ? halfOpenForColor.has(f - 1) : true;
    const rightOpen = f2 + 1 <= 7 ? halfOpenForColor.has(f2 + 1) : true;

    if (leftOpen && rightOpen) count++;
  }
  return count;
}

// =======================================
// 8) Pawn Chains (return array of chains, each is array of pawn squares)
// A pawn q defends a pawn r if r is one step forward-diagonal from q.
// =======================================
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

    // Try to walk forward along defenders
    let expanded = true;
    while (expanded) {
      expanded = false;
      for (const r of my) {
        if (visited.has(r.square)) continue;
        // if last in chain defends r, append
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
  // Base = pawn in a chain that is NOT defended by another pawn of same color
  const chains = getPawnChains(game, color);
  const bases = [];
  for (const chain of chains) {
    // by construction, the first element wasn't defended in our builder
    bases.push(chain[0]);
  }
  return bases;
}

// =======================================
// 9) Pawn Rams (blocked opposing pawns on same file, adjacent ranks)
// =======================================
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

// =======================================
// 10) Pawn Levers (potential captures vs enemy pawns)
// =======================================
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
      if (piece?.type === "p" && piece.color === enemy(color)) {
        levers++;
      }
    }
  }
  return levers;
}

// =======================================
// 11) File Classification: open / half-open / closed
// Returns { open: Set<fileIdx>, halfOpen: { w:Set, b:Set }, closed: Set }
// =======================================
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

// =======================================
// 12) Pawn Majority / Minority (simple flank counts)
// =======================================
function detectPawnMajority(game, color) {
  const my = listPawns(game, color);
  const opp = listEnemyPawns(game, color);

  const myQ = my.filter((p) => p.file <= 2).length; // a..c
  const myK = my.filter((p) => p.file >= 5).length; // f..h
  const opQ = opp.filter((p) => p.file <= 2).length;
  const opK = opp.filter((p) => p.file >= 5).length;

  return {
    queensideMajority: myQ > opQ,
    kingsideMajority: myK > opK,
  };
}

function detectMinority(game, color) {
  const m = detectPawnMajority(game, color);
  return {
    queensideMinority: !m.queensideMajority,
    kingsideMinority: !m.kingsideMajority,
  };
}

// =======================================
// 13) Weak pawns aggregate (isolated + backward + over-advanced)
// =======================================
function countOverAdvancedPawns(game, color) {
  const my = listPawns(game, color);
  let count = 0;
  for (const p of my) {
    const advanced = color === "w" ? p.rank >= 6 : p.rank <= 3;
    if (!advanced) continue;
    // No friendly pawn on adjacent files that can come up to support
    let support = false;
    for (const df of [-1, 1]) {
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

function countWeakPawns(game, color) {
  const isolated = countIsolatedPawns(game, color);
  const backward = countBackwardPawns(game, color);
  const overAdv = countOverAdvancedPawns(game, color);
  return isolated + backward + overAdv;
}

// =======================================
// 14) Central doubled pawns (d/e files)
// =======================================
function countCentralDoubledPawns(game, color) {
  const pawns = listPawns(game, color).filter(
    (p) => p.file === 3 || p.file === 4
  ); // d or e
  const byFile = new Map();
  for (const p of pawns) byFile.set(p.file, (byFile.get(p.file) || 0) + 1);
  let doubled = 0;
  for (const [, n] of byFile) {
    if (n >= 2) doubled += n - 1;
  }
  return doubled;
}

// =======================================
// 15) Weak squares (holes): squares that cannot be defended by a pawn
// Simplified heuristic: within your half, squares for which no friendly pawn
// can ever attack (i.e., no pawn on adjacent file behind that can advance).
// Returns count (or you can return a set if you prefer).
// =======================================
function detectWeakSquares(game, color) {
  const weak = new Set();

  function friendlyPawnCanGuardSquare(file, rank) {
    // A friendly pawn guards (attacks) (file, rank) if it could be on
    // (file±1, rank - forwardStep(color)) and move forward to attack later.
    const step = forwardStep(color);
    for (const df of [-1, 1]) {
      const f2 = file - df; // inverse mapping from target to pawn file
      const r2 = rank - step; // one step behind in pawn direction
      if (!isOnBoard(f2, r2)) continue;
      // Is there (or could there be) a pawn on (f2, <= r2) that might reach?
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

  // Scan your own half; central squares matter most, but we keep general.
  const ranksToScan = color === "w" ? [1, 2, 3, 4] : [8, 7, 6, 5];
  for (const r of ranksToScan) {
    for (let f = 0; f < 8; f++) {
      if (!friendlyPawnCanGuardSquare(f, r)) {
        weak.add(squareFromRF(f, r));
      }
    }
  }
  return weak; // set of squares
}

// =======================================
// 16–18) Pawn Hash infra (lightweight)
// =======================================
const _pawnTT = new Map(); // simple in-memory cache

function computePawnKey(game) {
  // Zobrist would be ideal; here a stable string of pawn locations:
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

// =======================================
// 19) Aggregation: getPawnStructureForColor (extended)
// (You can keep your existing one; this is the "complete" version
//  that uses all detectors' counts ready for weighting.)
// =======================================
function getPawnStructureForColor(game, color) {
  // --- 🧠 Check pawn-structure cache ---
  // Each pawn placement (for both colors) gets one cache key.
  // We store { w: <score>, b: <score> } per pawn layout.
  const cached = getCachedPawnStructure(game);
  if (cached && typeof cached[color] === "number") {
    return clamp(cached[color]);
  }

  const total = countPawns(game, color) || 1;

  // --- Static weaknesses ---
  const isolated = countIsolatedPawns(game, color);
  const doubled = countDoubledPawns(game, color);
  const islands = countPawnIslands(game, color);
  const backward = countBackwardPawns(game, color);
  const overAdv = countOverAdvancedPawns(game, color);
  const centralD = countCentralDoubledPawns(game, color);

  // --- Positives ---
  const passed = countPassedPawns(game, color);
  const candPassed = countCandidatePassedPawns(game, color);
  const chains = countPawnChains(game, color);
  const bases = detectChainBases(game, color).length; // bases usually weakness ⇒ small minus
  const levers = countPawnLevers(game, color);

  // --- Dynamic interactions ---
  const rams = countPawnRams(game);
  const hanging = countHangingPawns(game, color);

  // --- Context / board-wide features ---
  const weakSq = detectWeakSquares(game, color).size;
  const { queensideMajority, kingsideMajority } = detectPawnMajority(
    game,
    color
  );
  const minorities = detectMinority(game, color);
  const weak = countWeakPawns(game, color);

  // --- Derived flank multipliers (small bonuses) ---
  const flankBonus =
    (queensideMajority ? 0.02 : 0) +
    (kingsideMajority ? 0.02 : 0) -
    (minorities.queensideMinority ? 0.02 : 0) -
    (minorities.kingsideMinority ? 0.02 : 0);

  // --- Aggregate scoring ---
  let score =
    1 -
    // Structural weaknesses (penalties)
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
    // Positives
    0.4 * (passed / total) +
    0.15 * (candPassed / total) +
    0.1 * (chains / 4) +
    0.05 * (levers / total) +
    // Contextual
    flankBonus;

  const result = clamp(score);

  // --- 💾 Store computed score in pawn cache ---
  const prev = getCachedPawnStructure(game) || {};
  storePawnStructure(game, { ...prev, [color]: result });

  return result;
}

function getSpaceForColor(game, color) {
  const fenParts = game.fen().split(" ");
  fenParts[1] = color;
  const temp = new Chess(fenParts.join(" "));

  const oppHalfRankMin = color === "w" ? 5 : 1;
  const oppHalfRankMax = color === "w" ? 8 : 4;

  const moves = temp.moves({ verbose: true });
  const reachSquares = new Set(
    moves
      .filter((m) => m.piece !== "k")
      .filter((m) => {
        const r = parseInt(m.to[1], 10);
        return r >= oppHalfRankMin && r <= oppHalfRankMax;
      })
      .map((m) => m.to)
  );
  const reachScore = Math.min(reachSquares.size / 28, 1);

  let presence = 0,
    maxPresence = 0;
  const weights = { p: 1, n: 0.8, b: 0.8, r: 0.6, q: 0.5, k: 0.2 };
  game.board().forEach((row, rankIdx) =>
    row.forEach((sq, fileIdx) => {
      if (!sq || sq.color !== color) return;
      const rank = 8 - rankIdx;
      const inOppHalf = color === "w" ? rank >= 5 : rank <= 4;
      const w = weights[sq.type] || 0.5;
      maxPresence += w;
      if (inOppHalf) presence += w;
    })
  );
  const presenceScore = maxPresence > 0 ? presence / maxPresence : 0;

  const centralFiles = new Set(["c", "d", "e", "f"]);
  let foothold = 0,
    footholdDen = 0;
  game.board().forEach((row, rankIdx) =>
    row.forEach((sq, fileIdx) => {
      if (!sq || sq.color !== color) return;
      const rank = 8 - rankIdx;
      const fileChar = String.fromCharCode(97 + fileIdx);
      const inOppHalf = color === "w" ? rank >= 5 : rank <= 4;
      if (inOppHalf && centralFiles.has(fileChar)) foothold++;
      if (centralFiles.has(fileChar)) footholdDen++;
    })
  );
  const footholdScore = footholdDen > 0 ? foothold / footholdDen : 0;

  return clamp(0.55 * reachScore + 0.3 * presenceScore + 0.15 * footholdScore);
}

/**
 * Compute normalized K-MAPS metrics for both sides.
 */
function computeKMAPS(fen) {
  if (!fen || typeof fen !== "string") return [];

  let game;
  try {
    game = new Chess(fen);
  } catch {
    return [];
  }

  const { whiteMaterialScore, blackMaterialScore } = getMaterialBoth(game);
  const kingW = getKingSafety(game, "w");
  const kingB = getKingSafety(game, "b");
  const actW = getPieceActivity(game, "w");
  const actB = getPieceActivity(game, "b");
  const pawnW = getPawnStructureForColor(game, "w");
  const pawnB = getPawnStructureForColor(game, "b");
  const spaceW = getSpaceForColor(game, "w");
  const spaceB = getSpaceForColor(game, "b");

  return [
    {
      metric: "Material",
      White: whiteMaterialScore,
      Black: blackMaterialScore,
    },
    { metric: "King Safety", White: kingW, Black: kingB },
    { metric: "Activity", White: actW, Black: actB },
    { metric: "Pawn Structure", White: pawnW, Black: pawnB },
    { metric: "Space", White: spaceW, Black: spaceB },
  ];
}

export { computeKMAPS };
