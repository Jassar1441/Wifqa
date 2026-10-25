import type { Assessment } from './types.ts';

// A live offer may be structurally eligible while its coupon or delivery
// evidence remains uncertain. Do not silently drop those user-facing cautions.
export function liveCardWarnings(assessment: Pick<Assessment, 'reasons' | 'warnings'>): string[] {
  return [...new Set([...assessment.reasons, ...assessment.warnings].filter(message => message.trim().length > 0))];
}
