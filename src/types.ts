export type Status = 'confirmed' | 'estimated' | 'unknown' | 'conflicting';
export interface Evidence { status: Status; source: string; checkedAt: string }
export interface Identity { model?: string; size?: string; concentration?: string; condition?: string; quantity?: number }
export interface CouponApplicability {
  offerId: string; amount: number; currency: string; country: string; city: string;
  // offer.price is the merchandise subtotal; shipping/fees do not satisfy a minimum.
  merchandiseSubtotal: number;
  // Required: 0 means explicitly verified no minimum. Missing is not zero.
  minimumMerchandiseSubtotal: number;
  terms: string; conditionsConfirmed: boolean;
  paymentMethods?: 'any' | string[]; memberEligibility?: 'all' | 'members';
}
export interface Coupon { amount: number; verified: boolean; expiresAt?: string; memberOnly?: boolean; paymentMethod?: string; applicability?: CouponApplicability }
export interface Offer {
  id: string; seller: string; title: string; identity: Identity;
  specifications: Record<string, string | number | undefined>;
  currency: string; price: number | null; shippingCost: number | null; taxIncluded: boolean | null;
  tax: number | null; fees: number | null; coupon?: Coupon;
  availability: 'in_stock' | 'out_of_stock' | 'unknown';
  shipping: { available: boolean | null; country: string; city: string };
  delivery: { minDays: number | null; maxDays: number | null; status: Status };
  returns: { days: number | null; cost: number | null; notes: string; status: Status };
  sellerEvidence: { verifiedIdentity: boolean; status: Status };
  evidence: Record<string, Evidence>;
  dataKind: 'synthetic' | 'live'; url?: string;
}
export interface Constraint { equals?: string | number; min?: number; max?: number }
export interface Request {
  identity: Identity; mustHave: Record<string, Constraint>;
  country: string; city: string; currency: string;
  priority: 'cheapest' | 'fastest' | 'balanced'; allowAlternatives: boolean;
  budget?: number; deadlineDays?: number; member?: boolean; paymentMethod?: string;
}
export interface Assessment {
  offer: Offer; state: 'eligible' | 'excluded' | 'needs_verification' | 'separate_variant';
  group: 'exact' | 'alternative'; reasons: string[]; warnings: string[];
  total: number | null; couponApplied: boolean; balanceScore: number | null;
}

