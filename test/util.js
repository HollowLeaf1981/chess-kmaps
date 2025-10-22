// Utility to pretty print results
export function printResults(results) {
  for (const r of results) {
    // Write directly to stdout so Jest doesn’t decorate the output
    process.stdout.write(
      `${r.metric.padEnd(15)} | White: ${r.White.toFixed(
        3
      )} | Black: ${r.Black.toFixed(3)}\n`
    );
  }
  process.stdout.write("\n");
}
