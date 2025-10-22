import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import terser from "@rollup/plugin-terser";

export default {
  input: "src/index.js",
  output: [
    {
      file: "dist/index.cjs.js",
      format: "cjs",
      exports: "named", // ✅ add this
    },
    {
      file: "dist/index.esm.js",
      format: "esm",
      exports: "named",
    },
    {
      file: "dist/index.min.js",
      format: "umd",
      name: "ChessKMAPS",
      plugins: [terser()],
      exports: "named",
      globals: { "chess.js": "Chess" }, // ✅ see below
    },
  ],
  external: ["chess.js"],
  plugins: [resolve(), commonjs()],
};
