import type { Request } from './types.ts';
import { isRegion } from './regions.ts';

// One request builder for the live form; keep the customer's alternatives choice.
export function buildLiveRequest(options: {
  city?: string;
  region?: string;
  priority: Request['priority'];
  allowAlternatives: boolean;
  budget?: number;
  deadlineDays?: number;
}): Request {
  if (options.region !== undefined && !isRegion(options.region)) throw new Error('منطقة غير صالحة');
  if (!options.region && !options.city?.trim()) throw new Error('اختر منطقة التوصيل');
  return {
    identity: { model: 'AirPods 4', condition: 'new', quantity: 1 },
    mustHave: { color: { equals: 'white' }, charging: { equals: 'USB-C' }, anc: { equals: 0 } },
    country: 'SA',
    city: options.city ?? options.region!,
    ...(options.region ? {region:options.region} : {}),
    currency: 'SAR',
    priority: options.priority,
    allowAlternatives: options.allowAlternatives,
    budget: options.budget,
    deadlineDays: options.deadlineDays,
  };
}
