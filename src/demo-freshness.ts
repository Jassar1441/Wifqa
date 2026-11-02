import { verifiedTimestamp } from './evidence-time.ts';

// Demo data is a historical snapshot, not a live quote. Never refresh its age on retrieval.
export function demoDatasetIsStale(updatedAt: string, now = new Date()): boolean {
  const timestamp = verifiedTimestamp(updatedAt);
  const current = now.getTime();
  return !Number.isFinite(timestamp) || !Number.isFinite(current) || timestamp > current ||
    current - timestamp > 24 * 60 * 60 * 1000;
}
