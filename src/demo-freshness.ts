import { verifiedTimestamp } from './evidence-time.ts';

// Demo data is a historical snapshot, not a live quote. Never refresh its age on retrieval.
export function demoDatasetIsStale(updatedAt: string, now = new Date()): boolean {
  const timestamp = verifiedTimestamp(updatedAt);
  return !Number.isFinite(timestamp) || timestamp > now.getTime() ||
    now.getTime() - timestamp > 24 * 60 * 60 * 1000;
}
