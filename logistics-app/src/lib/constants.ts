export const APP_NAME = "ShipTrack MVP";

export const COUNTRIES = [
  "Spain",
  "France",
  "Portugal",
  "Italy",
  "Switzerland",
  "Germany",
  "Netherlands",
  "Belgium",
  "United Kingdom",
  "Norway",
  "Denmark",
  "Poland",
];

export const PRICING_TIERS = {
  B2C: { label: "B2C Standard", ratePerKg: 20 },
  B2B_TIER_1: { label: "B2B Tier 1", ratePerKg: 15 },
  B2B_TIER_2: { label: "B2B Tier 2", ratePerKg: 17 },
  B2B_TIER_3: { label: "B2B Tier 3", ratePerKg: 18.5 },
} as const;

export const MINIMUM_WEIGHT_KG = 20;
export const MIN_RATE_PER_KG = 15;
export const HOME_DELIVERY_FEE = 5;
export const EXPRESS_MULTIPLIER = 1.7;
export const EXPRESS_MAX_DAYS = 6;

export const STATUS_VALUES = {
  CREATED: "CREATED",
  RECEIVED: "RECEIVED",
  IN_TRANSIT: "IN_TRANSIT",
  AT_RELAY_AVAILABLE: "AT_RELAY_AVAILABLE",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
} as const;
