/**
 * Chess K-MAPS Demo
 * -----------------
 * A simple React + Material UI + @nivo/radar example that:
 *  - Displays an interactive chessboard (react-chessboard)
 *  - Tracks game state with chess.js
 *  - Computes K-MAPS metrics (via computeKMAPS)
 *  - Displays results as both a radar chart and a data table
 *
 * This example demonstrates how to use your KMAPS library in a simple web app.
 */

import React, { useEffect, useState } from "react";
import { Chess } from "chess.js"; // ✅ Core chess logic (game state, rules)
import { Chessboard } from "react-chessboard"; // ✅ Interactive visual board
import { ResponsiveRadar } from "@nivo/radar"; // ✅ Radar chart visualization
import {
  Box,
  Grid,
  Typography,
  Button,
  Card,
  CardContent,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material"; // ✅ Material UI layout and components

import { computeKMAPS } from "../../src/index.js"; // ✅ Import your KMAPS library

export default function App() {
  // --- 1️⃣ Initialize game state ---
  const [game, setGame] = useState(new Chess()); // `chess.js` game instance
  const [fen, setFen] = useState(game.fen()); // Current board FEN string
  const [kmaps, setKmaps] = useState([]); // Current computed KMAPS metrics

  // --- 2️⃣ Handle piece moves ---
  function onPieceDrop({ sourceSquare, targetSquare }) {
    // Try to make a legal move on the current game instance
    const move = game.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: "q", // Always promote to queen for simplicity
    });

    if (!move) return false; // Invalid move → ignore

    // ✅ Update the FEN to trigger re-render of board and KMAPS
    setFen(game.fen());
    return true;
  }

  // --- 3️⃣ Handle Undo ---
  function handleUndo() {
    // Undo last move in place (chess.js mutates the instance)
    game.undo();

    // Trigger re-render by updating FEN (keeps history intact)
    setFen(game.fen());
  }

  // --- 4️⃣ Recalculate KMAPS whenever FEN changes ---
  useEffect(() => {
    try {
      const results = computeKMAPS(fen); // Compute K-MAPS metrics for this position
      setKmaps(results);
    } catch (err) {
      console.error("Error computing KMAPS:", err);
      setKmaps([]); // Clear output on error
    }
  }, [fen]); // Depend on FEN — recompute only after legal moves or undo

  // --- 5️⃣ Chessboard display options ---
  const chessboardOptions = {
    position: fen, // Board position to render
    onPieceDrop, // Drag-drop handler
    id: "chessboard-demo", // Unique ID for the board
    animationDuration: 200, // Smooth move animation
    draggable: true, // Enable piece dragging
  };

  // --- 6️⃣ Render layout ---
  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Chess K-MAPS Demo
      </Typography>

      <Grid container spacing={3}>
        {/* LEFT COLUMN — Chessboard */}
        <Grid item xs={12} md={6}>
          <Card elevation={2} sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Chessboard
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {/* Centered responsive board */}
            <Box display="flex" sx={{ mb: 2 }}>
              <Box
                sx={{
                  width: { xs: 280, sm: 360, md: 440, lg: 480 },
                  maxWidth: "100%",
                }}
              >
                <Chessboard options={chessboardOptions} />
              </Box>
            </Box>

            {/* Board controls */}
            <Box display="flex" gap={2}>
              <Button
                variant="contained"
                onClick={() => {
                  // Reset to starting position
                  const newGame = new Chess();
                  setGame(newGame);
                  setFen(newGame.fen());
                }}
              >
                Reset
              </Button>

              <Button variant="contained" onClick={handleUndo}>
                Undo
              </Button>
            </Box>
          </Card>
        </Grid>

        {/* RIGHT COLUMN — KMAPS Analysis */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                K-MAPS Output
              </Typography>
              <Divider sx={{ mb: 2 }} />

              {/* ✅ Only render radar + table when data available */}
              {kmaps.length > 0 ? (
                <Box>
                  {/* --- Radar Chart --- */}
                  <Box sx={{ width: "100%", height: 300, mb: 2 }}>
                    <ResponsiveRadar
                      data={kmaps.map((d) => {
                        // Normalize the data for the radar
                        const shortLabel = d.metric
                          .trim()
                          .charAt(0)
                          .toUpperCase();
                        const total = ["Space", "Material"].includes(d.metric)
                          ? d.White + d.Black
                          : 1;

                        return {
                          metric: shortLabel,
                          White:
                            ["Space", "Material"].includes(d.metric) &&
                            total > 0
                              ? (d.White / total) * 100
                              : d.White * 100,
                          Black:
                            ["Space", "Material"].includes(d.metric) &&
                            total > 0
                              ? (d.Black / total) * 100
                              : d.Black * 100,
                        };
                      })}
                      keys={["White", "Black"]}
                      indexBy="metric"
                      maxValue={100}
                      margin={{ top: 30, right: 40, bottom: 40, left: 40 }}
                      curve="linearClosed"
                      gridLevels={5}
                      gridShape="circular"
                      gridLabelTextColor="#555"
                      gridLabelOffset={20}
                      borderWidth={2}
                      colors={["#42a5f5", "#616161"]}
                      fillOpacity={0.35}
                      blendMode="multiply"
                      isInteractive={false}
                      enableDots={true}
                      dotSize={6}
                      dotBorderWidth={1}
                      dotBorderColor={{ from: "color" }}
                      animate={false}
                    />
                  </Box>

                  {/* --- Data Table --- */}
                  <TableContainer variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Metric</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>
                            White
                          </TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>
                            Black
                          </TableCell>
                        </TableRow>
                      </TableHead>

                      <TableBody>
                        {kmaps.map((r) => {
                          let white = r.White ?? 0.5;
                          let black = r.Black ?? 0.5;

                          // Normalize space/material as proportions
                          if (["Space", "Material"].includes(r.metric)) {
                            const total = white + black;
                            if (total > 0) {
                              white = white / total;
                              black = black / total;
                            }
                          }

                          // Dynamic color based on value
                          const colorValue = (v) =>
                            v > 0.6
                              ? "#4caf50"
                              : v < 0.4
                              ? "#f44336"
                              : "#ff9800";

                          return (
                            <TableRow key={r.metric}>
                              <TableCell sx={{ fontWeight: 500 }}>
                                {r.metric}
                              </TableCell>
                              <TableCell
                                align="center"
                                sx={{
                                  fontWeight: 600,
                                  color: colorValue(white),
                                }}
                              >
                                {Math.round(white * 100)}%
                              </TableCell>
                              <TableCell
                                align="center"
                                sx={{
                                  fontWeight: 600,
                                  color: colorValue(black),
                                }}
                              >
                                {Math.round(black * 100)}%
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              ) : (
                // No data yet
                <Typography color="text.secondary" fontStyle="italic">
                  Make a move on the board to see K-MAPS output.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
