import {
  EXPRESS_MAX_DAYS,
  EXPRESS_MULTIPLIER,
  HOME_DELIVERY_FEE,
  MINIMUM_WEIGHT_KG,
  MIN_RATE_PER_KG,
  PRICING_TIERS,
} from "./constants";
import type { PricingTier, ServiceLevel } from "./types";

interface PriceInput {
  weightKg: number;
  pricingTier: PricingTier;
  hasHomeDelivery: boolean;
  negotiatedRate?: number | null;
  serviceLevel: ServiceLevel;
}

export const calculatePrice = (input: PriceInput) => {
  const billingWeight = Math.max(input.weightKg || 0, MINIMUM_WEIGHT_KG);
  const tierRate = PRICING_TIERS[input.pricingTier]?.ratePerKg ?? MIN_RATE_PER_KG;
  const negotiated = input.negotiatedRate ?? 0;
  const baseRate = negotiated >= MIN_RATE_PER_KG ? negotiated : tierRate;

  const basePrice = billingWeight * baseRate;
  const serviceMultiplier = input.serviceLevel === "EXPRESS" ? EXPRESS_MULTIPLIER : 1;
  const servicePrice = basePrice * serviceMultiplier;
  const finalPrice = input.hasHomeDelivery ? servicePrice + HOME_DELIVERY_FEE : servicePrice;

  return {
    billingWeight,
    ratePerKg: baseRate,
    basePrice,
    finalPrice,
  };
};

export const computeEta = (receivedAtIso: string | null, serviceLevel: ServiceLevel) => {
  if (!receivedAtIso) {
    return {
      expected: null,
      worstCase: null,
    };
  }

  const receivedAt = new Date(receivedAtIso);
  const expectedDays = serviceLevel === "EXPRESS" ? EXPRESS_MAX_DAYS : 7;
  const expected = addDays(receivedAt, expectedDays);
  const worstCase = serviceLevel === "STANDARD" ? addDays(receivedAt, 9) : null;

  return {
    expected,
    worstCase,
  };
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};
