import type { Assessment } from './types.ts';

// The engine's ranking is the only source of eligible recommendation order.
// An eligible assessment can be deliberately unranked (e.g. no verified ETA
// when the user prioritizes fastest delivery). Do not promote it to a winner.
export function partitionLiveAssessments(assessed: Assessment[], ranking: Assessment[]) {
  const ranked = new Set(ranking);
  return {
    exact: ranking.filter(a => a.state === 'eligible' && a.group === 'exact'),
    alternatives: ranking.filter(a => a.state === 'eligible' && a.group === 'alternative'),
    needsVerification: assessed.filter(a => a.state === 'needs_verification'),
    unranked: assessed.filter(a => a.state === 'eligible' && !ranked.has(a)),
  };
}
