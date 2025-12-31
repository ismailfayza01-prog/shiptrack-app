export type UserRole = "admin" | "staff" | "driver" | "relay";

export type ServiceLevel = "STANDARD" | "EXPRESS";

export type PricingTier = "B2C" | "B2B_TIER_1" | "B2B_TIER_2" | "B2B_TIER_3";

export type ShipmentStatus =
  | "CREATED"
  | "RECEIVED"
  | "IN_TRANSIT"
  | "AT_RELAY_AVAILABLE"
  | "DELIVERED"
  | "CANCELLED";

export interface UserRecord {
  id: string;
  full_name: string;
  phone: string;
  role: UserRole;
  address: string | null;
  active: boolean;
}

export interface UserSession {
  id: string;
  full_name: string;
  phone: string;
  role: UserRole;
  address: string | null;
}

export interface ShipmentRecord {
  id: string;
  tracking_code: string;
  sender_name: string | null;
  sender_phone: string | null;
  sender_address: string | null;
  sender_id_number: string | null;
  receiver_name: string | null;
  receiver_phone: string | null;
  receiver_address: string | null;
  destination_country: string | null;
  weight_kg: number | null;
  pricing_tier: PricingTier | null;
  service_level: ServiceLevel;
  status: ShipmentStatus;
  base_price: number | null;
  final_price: number | null;
  received_at: string | null;
  expected_delivery_at: string | null;
  worst_case_delivery_at: string | null;
  created_at: string | null;
  assigned_driver_id: string | null;
  assigned_relay_id: string | null;
  current_handler_id: string | null;
  current_handler_location: string | null;
  id_photo_url: string | null;
  parcel_photo_url: string | null;
  receiver_id_photo_url: string | null;
  receiver_parcel_photo_url: string | null;
}
