# Chess K-MAPS

**Chess K-MAPS** is a lightweight JavaScript library that evaluates a chess position and returns normalized scores for five key strategic factors:

- King Safety
- Material
- Activity
- Pawn Structure
- Space

These metrics provide a quick, explainable overview of a position’s balance without requiring a chess engine.

---

## API

### `computeKMAPS(fen: string): Array<KMapsRow>`

**Input:**

- `fen` — a valid FEN string (e.g., from `new Chess().fen()`).

**Returns:**
An array of five metric objects:

```js
[
  { metric: "Material", White: 0.5, Black: 0.5 },
  { metric: "King Safety", White: 0.69, Black: 0.69 },
  { metric: "Activity", White: 0.1, Black: 0.1 },
  { metric: "Pawn Structure", White: 0.76, Black: 0.76 },
  { metric: "Space", White: 0.0, Black: 0.0 },
];
```

Each score is normalized between **0** (poor) and **1** (excellent).

**Example usage:**

```js
import { Chess } from "chess.js";
import { computeKMAPS } from "chess-kmaps";

const game = new Chess();
const results = computeKMAPS(game.fen());
console.log(results);
```

---

## Running the Example

A simple demo React app is provided under the `example/` folder. It features a drag-and-drop chessboard with live K-MAPS updates.

To run locally:

```bash
cd example
npm install
npm run dev
```

Then open the local URL printed in the console to view the demo.

> The example is excluded from npm releases and is only included in the GitHub repository.

---

## License

MIT © 2025 — Free to use, modify, and distribute.
