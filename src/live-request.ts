import type { Request } from './types.ts';

// One request builder for the live form; keep the customer's alternatives choice.
export function buildLiveRequest(options: {
  city: string;
  priority: Request['priority'];
  allowAlternatives: boolean;
  budget?: number;
  deadlineDays?: number;
}): Request {
  return {
    identity: { model: 'AirPods 4', condition: 'new', quantity: 1 },
    mustHave: { color: { equals: 'white' }, charging: { equals: 'USB-C' }, anc: { equals: 0 } },
    country: 'SA',
    city: options.city,
    currency: 'SAR',
    priority: options.priority,
    allowAlternatives: options.allowAlternatives,
    budget: options.budget,
    deadlineDays: options.deadlineDays,
  };
}
