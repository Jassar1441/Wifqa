import type { Assessment } from './types.ts';

// Never mix unverified live offers into the eligible list or present variants as exact.
export function partitionLiveAssessments(assessed: Assessment[]) {
  return {
    exact: assessed.filter(a => a.state === 'eligible' && a.group === 'exact'),
    alternatives: assessed.filter(a => a.state === 'eligible' && a.group === 'alternative'),
    needsVerification: assessed.filter(a => a.state === 'needs_verification'),
  };
}
