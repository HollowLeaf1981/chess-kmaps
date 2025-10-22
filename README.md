# Chess K-MAPS

**Chess K-MAPS** is a lightweight JavaScript library that evaluates a chess position and returns normalized scores for five key strategic factors:

- King Safety
- Material
- Activity
- Pawn Structure
- Space

These metrics provide a quick, explainable overview of a position’s balance.

---

## API

### `computeKMAPS(fen: string): Array<KMapsRow>`

**Input:**

- `fen` — a valid FEN string (for example, from `new Chess().fen()`).

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
import { computeKMAPS } from "./src/index.js"; // or from ./dist/index.min.js

const game = new Chess();
const results = computeKMAPS(game.fen());
console.log(results);
```

---

## Using the Library

You can use **Chess K-MAPS** by cloning this repository and importing either:

### Option 1 — From Source

For development and modification:

```bash
git clone https://github.com/toanhoang/chess-kmaps.git
cd chess-kmaps
```

Import directly from the source:

```js
import { computeKMAPS } from "../chess-kmaps/src/index.js";
```

### Option 2 — From Built Distribution

For lightweight use (faster load, no build tools needed):

```js
import { computeKMAPS } from "../chess-kmaps/dist/index.min.js";
```

The `dist/` version is fully self-contained and ready to use in any modern browser or ES module environment.

---

## Running the Example

A demo React app is included under the `example/` folder.
It features a drag-and-drop chessboard with live K-MAPS updates.

To run locally:

```bash
cd example
npm install
npm run dev
```

Then open the local URL printed in the console to view the demo.

> The `example/` folder is for demo
