// -------------------------------------------------------------
// Common Math Helpers
// -------------------------------------------------------------

/**
 * clamp(x)
 * -----------------------------------------
 * Restricts a numeric value to the range [0, 1].
 *
 * Useful for normalizing computed metrics or ensuring
 * values remain within valid percentage bounds.
 *
 * @param {number} x - Input value to be clamped.
 * @returns {number} The input value, limited to the [0, 1] range.
 *
 * Example:
 *   clamp(1.2) → 1
 *   clamp(-0.3) → 0
 *   clamp(0.5) → 0.5
 */
export const clamp = (x) => Math.max(0, Math.min(1, x));
