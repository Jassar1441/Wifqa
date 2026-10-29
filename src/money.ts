// All financial comparisons use integer halalas. Reject fractional halalas,
// allowing only tiny binary floating-point artifacts from ordinary arithmetic.
// This is a fail-closed numeric boundary; future string inputs should be parsed
// as decimal strings rather than rounded.
export function toHalalas(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  const rounded = Math.round(value * 100);
  if (!Number.isSafeInteger(rounded)) return null;
  const canonical = rounded / 100;
  const tolerance = Math.min(1e-11, 4 * Number.EPSILON * Math.max(1, Math.abs(value)));
  return Math.abs(value - canonical) <= tolerance ? rounded : null;
}
